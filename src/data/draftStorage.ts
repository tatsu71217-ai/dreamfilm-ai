import type { DreamDraft } from "@/types/draft";

/**
 * 下書き（自動保存）データへのアクセスを抽象化するインターフェース。
 * 保存済みの夢データ (data/dreamRepository.ts) とは完全に別の永続化領域として扱う。
 */
export interface DraftStorage {
  get(key: string): DreamDraft | null;
  set(key: string, draft: DreamDraft): void;
  remove(key: string): void;
}

class LocalStorageDraftStorage implements DraftStorage {
  get(key: string): DreamDraft | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("title" in parsed) ||
        !("body" in parsed)
      ) {
        return null;
      }
      return parsed as DreamDraft;
    } catch (error) {
      console.error("下書きの読み込みに失敗しました。", error);
      return null;
    }
  }

  set(key: string, draft: DreamDraft): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(draft));
    } catch (error) {
      // 下書き保存の失敗は致命的ではないため、ユーザー操作をブロックせずログのみ残す
      console.error("下書きの自動保存に失敗しました。", error);
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error("下書きの削除に失敗しました。", error);
    }
  }
}

export const draftStorage: DraftStorage = new LocalStorageDraftStorage();
