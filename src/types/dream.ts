import type { DreamMoviePackage } from "@/types/movie";
import type { DreamOrganizationResult } from "@/services/ai/types";

/** LocalStorage 保存キー（夢データ一覧） */
export const DREAMS_STORAGE_KEY = "dreamfilm-ai:dreams";

export type Mood = "happy" | "neutral" | "mysterious" | "scary" | "sad";

export const MOOD_OPTIONS: ReadonlyArray<{ value: Mood; label: string; emoji: string }> = [
  { value: "happy", label: "嬉しい", emoji: "😊" },
  { value: "neutral", label: "穏やか", emoji: "😌" },
  { value: "mysterious", label: "不思議", emoji: "🌙" },
  { value: "scary", label: "怖い", emoji: "😱" },
  { value: "sad", label: "悲しい", emoji: "😢" },
];

export const MOOD_LABEL: Record<Mood, string> = {
  happy: "嬉しい",
  neutral: "穏やか",
  mysterious: "不思議",
  scary: "怖い",
  sad: "悲しい",
};

export const MOOD_EMOJI: Record<Mood, string> = {
  happy: "😊",
  neutral: "😌",
  mysterious: "🌙",
  scary: "😱",
  sad: "😢",
};

/** Home画面の気分フィルター。"all" は全件表示を意味する */
export type MoodFilter = "all" | Mood;

export const MOOD_FILTER_LABEL: Record<MoodFilter, string> = {
  all: "すべて",
  ...MOOD_LABEL,
};

/** Home画面の並び替え順 */
export type SortOrder = "newest" | "oldest";

export const SORT_ORDER_LABEL: Record<SortOrder, string> = {
  newest: "新しい順",
  oldest: "古い順",
};

/**
 * 夢の状態。
 * - recorded: 記録直後（AI整理・映画化前）
 * - scored: Dream Scoreが確定した状態
 * - queued: 動画生成（Render）のキューに入っている状態
 */
export type DreamStatus = "recorded" | "scored" | "queued";

export const DREAM_STATUS_LABEL: Record<DreamStatus, string> = {
  recorded: "記録済み",
  scored: "スコア済み",
  queued: "生成待ち",
};

/** Dream Score（DreamDetailPageで表示する4項目、0〜100） */
export interface DreamScore {
  /** 映画映え */
  cinematic: number;
  /** 感情 */
  emotion: number;
  /** ストーリー性 */
  story: number;
  /** 不思議度 */
  wonder: number;
}

/**
 * AIによる夢の整理結果（保存済み）。
 * services/ai/types.ts の DreamOrganizationResult に、保存日時を付与したもの。
 */
export interface DreamOrganization extends DreamOrganizationResult {
  /** AIによる整理を実行した日時 (ISO 8601) */
  organizedAt: string;
}

/** 夢データ本体 */
export interface Dream {
  id: string;
  title: string;
  body: string;
  mood: Mood;
  status: DreamStatus;
  score: DreamScore;
  createdAt: string;
  updatedAt?: string;
  /** AIによる整理結果（未整理の場合は未設定） */
  organization?: DreamOrganization;
  /** Dream Movie Package（未生成の場合は未設定） */
  moviePackage?: DreamMoviePackage;
}

/** 夢の新規作成時に必要な入力値 */
export interface CreateDreamInput {
  title: string;
  body: string;
  mood: Mood;
}

/** 夢の編集時に必要な入力値 */
export type UpdateDreamInput = CreateDreamInput;
