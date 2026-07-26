import type { DreamMoviePackageResult } from "@/services/ai/types";
import type { Mood } from "@/types/dream";
import type { StyleId } from "@/types/style";
import type { VideoDurationSeconds } from "@/types/videoProject";

/**
 * 動画生成プロバイダーの識別子。
 *
 * - `local`: ブラウザ内でCanvas+MediaRecorderにより生成する（既定。無料・外部API不要）
 * - `pollinations`: Pollinations.ai 経由の実動画生成（無料アカウントの日次付与枠で利用可能）
 * - `veo`: Google Veo (Gemini API) 経由の実動画生成（無料枠なし・従量課金）
 * - `mock`: 開発用のダミー実装。本番ビルドでは選択できない（VideoProviderFactory参照）。
 *   過去に作成されたRenderJobが `provider: "mock"` を保持している場合があるため、
 *   型・表示ラベルとしては残している。
 *
 * Sprint6時点で型だけ定義されていた runway/kling/pika/luma は、実装される見込みがなく
 * Factoryでも一律エラーになるだけの死んだ分岐だったため削除した。
 */
export type VideoProviderId = "local" | "pollinations" | "veo" | "mock";

/**
 * レンダリングジョブの状態。
 * WORK_ORDER (Sprint6) の「Waiting/Preparing/Rendering/Completed/Failed/Cancelled」の
 * 6状態に対応する。TypeScriptの `enum` ではなく文字列リテラルUnion + ラベルMapで管理している
 * （プロジェクト内の DreamStatus 等、既存の状態管理パターンとの一貫性を優先した設計判断）。
 */
export type RenderStatus =
  | "waiting"
  | "preparing"
  | "rendering"
  | "completed"
  | "failed"
  | "cancelled";

/** ローカル生成(LocalCanvasVideoProvider)専用の入力。他のProviderは無視する */
export interface LocalRenderInput {
  title: string;
  body: string;
  mood: Mood;
  styleId: StyleId;
  durationSeconds: VideoDurationSeconds;
}

/** VideoProvider.render() に渡す入力 */
export interface VideoRenderInput {
  moviePackage: DreamMoviePackageResult;
  /** ローカル生成でのみ使用する追加情報 */
  local?: LocalRenderInput;
}

/** VideoProvider.getStatus() が返す、ある時点でのジョブの状態スナップショット */
export interface VideoProviderStatusSnapshot {
  status: RenderStatus;
  /** 0〜100 */
  progress: number;
  errorMessage?: string;
  /**
   * 出力動画の参照先。
   * 実プロバイダーは動画本体を IndexedDB (data/videoBlobStore.ts) へ保存し、
   * ここには `LOCAL_VIDEO_URL_MARKER` を設定する。再生時に
   * services/video/resolvePlayableVideoUrl.ts が Object URL へ解決する。
   */
  outputUrl?: string;
}

/**
 * 動画本体がIndexedDBに保存されていることを示すマーカー。
 * RenderJob.outputUrl には認証付きの一時URLではなくこの値を保存することで、
 * 期限切れURLを永続化してしまう問題を避けている。
 */
export const LOCAL_VIDEO_URL_MARKER = "idb:render-video";

/** 動画モデルが受け付ける尺（秒）の制約 */
export interface VideoDurationConstraint {
  min: number;
  max: number;
  /** 刻み幅。例: nova-reel は6秒単位 */
  step: number;
}

/** 設定画面での提示と、尺・費用の算出に使う動画モデル定義 */
export interface VideoModelOption {
  id: string;
  label: string;
  brand: string;
  /** 動画1秒あたりのPollen消費量（1 Pollen ≈ 1 USD） */
  pollenPerSecond: number;
  duration: VideoDurationConstraint;
  /**
   * Pollinationsが `paid_only` としているモデルかどうか。
   * true の場合、無料アカウントの日次付与枠だけでは利用できない可能性がある。
   */
  requiresPaidBalance: boolean;
  description: string;
}

/**
 * Pollinationsで利用可能な動画モデル。
 * 尺の制約と単価は Pollinations の OpenAPI 定義 (gen.pollinations.ai/openapi.json) と
 * モデル一覧 (gen.pollinations.ai/video/models) に基づく。
 *
 * `nova-reel` のみ `paid_only` が付いていないため、無料アカウントで最初に試すべきモデルとして
 * 既定にしている。
 */
export const POLLINATIONS_VIDEO_MODELS: readonly VideoModelOption[] = [
  {
    id: "nova-reel",
    label: "Nova Reel",
    brand: "Amazon",
    pollenPerSecond: 0.08,
    duration: { min: 6, max: 120, step: 6 },
    requiresPaidBalance: false,
    description: "無料枠で利用できる可能性が最も高いモデル。720p・6秒単位。",
  },
  {
    id: "wan-fast",
    label: "Wan 2.2",
    brand: "Alibaba",
    pollenPerSecond: 0.01,
    duration: { min: 2, max: 15, step: 1 },
    requiresPaidBalance: true,
    description: "最安。480p・音声なしの下書き向け。",
  },
  {
    id: "p-video-720p",
    label: "Pruna p-video",
    brand: "Pruna",
    pollenPerSecond: 0.02,
    duration: { min: 2, max: 10, step: 1 },
    requiresPaidBalance: true,
    description: "低価格で720p。",
  },
  {
    id: "seedance-pro",
    label: "Seedance Pro-Fast",
    brand: "ByteDance",
    pollenPerSecond: 0.025,
    duration: { min: 2, max: 10, step: 1 },
    requiresPaidBalance: true,
    description: "720p。プロンプト追従性が高い。",
  },
  {
    id: "veo",
    label: "Veo 3.1 Fast",
    brand: "Google",
    pollenPerSecond: 0.08,
    duration: { min: 4, max: 8, step: 2 },
    requiresPaidBalance: true,
    description: "高品質・音声付き。4/6/8秒のみ。",
  },
];

export const DEFAULT_POLLINATIONS_VIDEO_MODEL = "nova-reel";

export function findPollinationsVideoModel(modelId: string): VideoModelOption | undefined {
  return POLLINATIONS_VIDEO_MODELS.find((model) => model.id === modelId);
}

/**
 * 希望する尺を、そのモデルが受け付ける値へ丸める。
 * Movie Packageは常に30秒だが、モデルごとに上限や刻みが異なるため
 * （例: Veoは最大8秒、nova-reelは6秒単位）、リクエスト前に必ず通す。
 */
export function clampDuration(
  desiredSeconds: number,
  constraint: VideoDurationConstraint,
): number {
  const bounded = Math.min(constraint.max, Math.max(constraint.min, desiredSeconds));
  const stepped = Math.round(bounded / constraint.step) * constraint.step;
  // 丸めで下限を割り込む/上限を超える場合に備えて、最後にもう一度収める
  return Math.min(constraint.max, Math.max(constraint.min, stepped));
}
