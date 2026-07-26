import type { Mood } from "@/types/dream";

/**
 * 記録/編集フォームの自動保存下書き。
 * 保存済みデータと混同しないよう、`Dream` とは別の型・別のLocalStorageキー空間で管理する。
 */
export interface DreamDraft {
  title: string;
  body: string;
  mood: Mood | null;
  /** 最後に自動保存された日時 (ISO 8601) */
  savedAt: string;
}

const DRAFT_STORAGE_PREFIX = "dreamfilm-ai:draft:";

/** 新規作成フォーム用の下書きキー（常に1つだけ存在する） */
export function newDreamDraftKey(): string {
  return `${DRAFT_STORAGE_PREFIX}new`;
}

/** 編集フォーム用の下書きキー。夢ごとに個別のキーを持つ */
export function editDreamDraftKey(dreamId: string): string {
  return `${DRAFT_STORAGE_PREFIX}edit:${dreamId}`;
}
