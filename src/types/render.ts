import type { RenderStatus, VideoProviderId } from "@/services/video/types";

export type { RenderStatus } from "@/services/video/types";

/** UI表示用のステータスラベル */
export const RENDER_STATUS_LABEL: Record<RenderStatus, string> = {
  waiting: "待機中",
  preparing: "準備中",
  rendering: "生成中",
  completed: "完了",
  failed: "失敗",
  cancelled: "キャンセル済み",
};

/**
 * UI表示用のプロバイダーラベル。
 * "mock" は本番では選択できないが、過去に作成された履歴の表示に必要なため残している。
 */
export const VIDEO_PROVIDER_LABEL: Record<VideoProviderId, string> = {
  pollinations: "Pollinations",
  veo: "Google Veo",
  mock: "Mock Provider（開発用）",
};

/** LocalStorage 保存キー（RenderJob一覧。Render履歴画面もこのデータを一覧表示する） */
export const RENDER_JOBS_STORAGE_KEY = "dreamfilm-ai:render-jobs";

/**
 * 動画生成（レンダリング）ジョブ1件分のデータ構造。
 * WORK_ORDER (Sprint6) の RenderJob モデル要件に対応する。
 */
export interface RenderJob {
  id: string;
  dreamId: string;
  moviePackageId: string;
  provider: VideoProviderId;
  status: RenderStatus;
  /** 0〜100 */
  progress: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  /** 出力動画のURL。Sprint6では実際の動画生成を行わないため未使用 */
  outputUrl?: string;
}

/** RenderJob新規作成時に必要な入力値（idはリポジトリ側で発行する） */
export type CreateRenderJobInput = Pick<
  RenderJob,
  "dreamId" | "moviePackageId" | "provider" | "status" | "progress" | "createdAt" | "updatedAt"
>;
