/**
 * 生成された動画の実体（MP4バイナリ）を保存するストア。
 *
 * 実プロバイダー（Pollinations / Google Veo）は、認証付きの一時URLや
 * MP4バイナリそのものを返すため、URLをそのまま保存しても後から再生できない
 * （Veoのダウンロードリンクは `x-goog-api-key` ヘッダーが必須で、`<video src>` では
 *  ヘッダーを送れない。Pollinationsはそもそもバイナリを直接返す）。
 *
 * そこで動画の実体をIndexedDBへ保存し、再生時に Object URL を発行する方式にしている。
 * RenderJob等のメタデータは従来通りLocalStorageに置く（バイナリはLocalStorageの
 * 5MB制限・文字列専用という制約で扱えないため、ここだけIndexedDBを使う）。
 *
 * 副次的な利点として、一度生成した動画はオフラインでも再生・保存・共有できる。
 *
 * 【容量管理】
 * 端末のストレージを際限なく消費しないよう、保存件数が MAX_STORED_VIDEOS を超えたら
 * 最も古い動画から自動的に削除する（save()のたびに実行）。保存日時はレコードに
 * 付与するが、本更新より前に保存された値は日時を持たない生のBlobのため、
 * 最も古いものとして扱い削除対象にする（既存データを読めなくすることはない）。
 */

const DB_NAME = "dreamfilm-ai";
const DB_VERSION = 1;
const STORE_NAME = "render-videos";

/** 保存する動画の最大件数。超過分は最も古いものから自動削除する */
const MAX_STORED_VIDEOS = 30;

interface StoredVideoRecord {
  blob: Blob;
  savedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("この端末・ブラウザは動画の保存（IndexedDB）に対応していません。"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("動画ストアを開けませんでした。"));
  });
}

/** 1トランザクションを Promise としてラップする小さなヘルパー */
function runTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = operation(transaction.objectStore(STORE_NAME));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error ?? new Error("動画ストアの操作に失敗しました。"));
        transaction.oncomplete = () => db.close();
      }),
  );
}

/** 保存済みの値からBlobを取り出す。本更新より前に保存された値は生のBlobのまま */
function extractBlob(value: unknown): Blob | null {
  if (value instanceof Blob) return value;
  if (value && typeof value === "object" && (value as StoredVideoRecord).blob instanceof Blob) {
    return (value as StoredVideoRecord).blob;
  }
  return null;
}

/** 保存日時を取り出す。旧形式（生のBlob）は日時を持たないため最古(0)として扱う */
function extractSavedAt(value: unknown): number {
  if (value && typeof value === "object" && typeof (value as StoredVideoRecord).savedAt === "number") {
    return (value as StoredVideoRecord).savedAt;
  }
  return 0;
}

export interface VideoBlobStore {
  /** RenderJob IDに紐づけて動画本体を保存する */
  save(renderJobId: string, blob: Blob): Promise<void>;
  /** 保存済みの動画本体を取得する（無ければ null） */
  get(renderJobId: string): Promise<Blob | null>;
  has(renderJobId: string): Promise<boolean>;
  remove(renderJobId: string): Promise<void>;
}

class IndexedDbVideoBlobStore implements VideoBlobStore {
  async save(renderJobId: string, blob: Blob): Promise<void> {
    try {
      const record: StoredVideoRecord = { blob, savedAt: Date.now() };
      await runTransaction("readwrite", (store) => store.put(record, renderJobId));
    } catch (error) {
      console.error("生成した動画の保存に失敗しました。", error);
      throw new Error(
        "生成した動画を端末に保存できませんでした。ストレージの空き容量をご確認ください。",
      );
    }

    // 保存件数の上限を超えた古い動画の整理は、再生・保存フロー自体をブロックしたくないため
    // 失敗してもログのみ残す
    this.evictOldestBeyondLimit().catch((error) => {
      console.error("古い動画の自動整理に失敗しました。", error);
    });
  }

  async get(renderJobId: string): Promise<Blob | null> {
    try {
      const result = await runTransaction<unknown>("readonly", (store) =>
        store.get(renderJobId),
      );
      return extractBlob(result);
    } catch (error) {
      // 読み出し失敗は致命的ではない（再生できないだけ）ため、ログのみ残して null を返す
      console.error("保存済み動画の読み込みに失敗しました。", error);
      return null;
    }
  }

  async has(renderJobId: string): Promise<boolean> {
    return (await this.get(renderJobId)) !== null;
  }

  async remove(renderJobId: string): Promise<void> {
    try {
      await runTransaction("readwrite", (store) => store.delete(renderJobId));
    } catch (error) {
      // 削除失敗でユーザー操作（履歴削除）をブロックしたくないためログのみ
      console.error("保存済み動画の削除に失敗しました。", error);
    }
  }

  private async evictOldestBeyondLimit(): Promise<void> {
    const [keys, values] = await Promise.all([
      runTransaction<IDBValidKey[]>("readonly", (store) => store.getAllKeys()),
      runTransaction<unknown[]>("readonly", (store) => store.getAll()),
    ]);

    if (keys.length <= MAX_STORED_VIDEOS) return;

    const entries = keys.map((key, index) => ({
      key,
      savedAt: extractSavedAt(values[index]),
    }));
    entries.sort((a, b) => a.savedAt - b.savedAt);

    const overflowCount = entries.length - MAX_STORED_VIDEOS;
    const keysToEvict = entries.slice(0, overflowCount).map((entry) => entry.key);

    for (const key of keysToEvict) {
      await runTransaction("readwrite", (store) => store.delete(key));
    }
  }
}

export const videoBlobStore: VideoBlobStore = new IndexedDbVideoBlobStore();

/** 端末のストレージ使用状況の概算。対応していない環境ではnullを返す */
export async function getStorageUsageEstimate(): Promise<{ usageMB: number; quotaMB: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (usage === undefined || quota === undefined) return null;
    return { usageMB: Math.round(usage / 1e6), quotaMB: Math.round(quota / 1e6) };
  } catch (error) {
    console.error("ストレージ使用状況の取得に失敗しました。", error);
    return null;
  }
}
