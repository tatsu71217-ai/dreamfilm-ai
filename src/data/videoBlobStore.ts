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
 */

const DB_NAME = "dreamfilm-ai";
const DB_VERSION = 1;
const STORE_NAME = "render-videos";

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
      await runTransaction("readwrite", (store) => store.put(blob, renderJobId));
    } catch (error) {
      console.error("生成した動画の保存に失敗しました。", error);
      throw new Error(
        "生成した動画を端末に保存できませんでした。ストレージの空き容量をご確認ください。",
      );
    }
  }

  async get(renderJobId: string): Promise<Blob | null> {
    try {
      const result = await runTransaction<Blob | undefined>("readonly", (store) =>
        store.get(renderJobId),
      );
      return result instanceof Blob ? result : null;
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
}

export const videoBlobStore: VideoBlobStore = new IndexedDbVideoBlobStore();
