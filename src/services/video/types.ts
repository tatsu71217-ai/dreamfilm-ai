import type { DreamMoviePackageResult } from "@/services/ai/types";

/**
 * 動画生成プロバイダーの識別子。
 * WORK_ORDER (Sprint6) で名前が挙がったプロバイダーを型として列挙している。
 * Sprint7で "veo" (Google Veo / Google AI Studio) を実装した。それ以外（runway/kling/pika/luma）は
 * 将来の接続先を型レベルで示すためのプレースホルダーであり、実際のAPI呼び出しは行わない
 * （制約により未実装。UI上も選択肢としては表示しない）。
 */
export type VideoProviderId = "mock" | "runway" | "veo" | "kling" | "pika" | "luma";

/**
 * レンダリングジョブの状態。
 * WORK_ORDER (Sprint6) の「Waiting/Preparing/Rendering/Completed/Failed/Cancelled」の
 * 6状態に対応する。TypeScriptの `enum` ではなく文字列リテラルUnion + ラベルMapで管理している
 * （プロジェクト内の DreamStatus 等、既存の状態管理パターンとの一貫性を優先した設計判断。
 *  詳細は SPRINT_REPORT.md の TODO を参照）。
 */
export type RenderStatus =
  | "waiting"
  | "preparing"
  | "rendering"
  | "completed"
  | "failed"
  | "cancelled";

/** VideoProvider.render() に渡す入力 */
export interface VideoRenderInput {
  moviePackage: DreamMoviePackageResult;
}

/** VideoProvider.getStatus() が返す、ある時点でのジョブの状態スナップショット */
export interface VideoProviderStatusSnapshot {
  status: RenderStatus;
  /** 0〜100 */
  progress: number;
  errorMessage?: string;
  /** 出力動画のURL。Sprint6では実際の動画生成を行わないため常に未設定 */
  outputUrl?: string;
}
