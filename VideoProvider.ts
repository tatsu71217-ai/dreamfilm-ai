import type {
  VideoProviderId,
  VideoProviderStatusSnapshot,
  VideoRenderInput,
} from "@/services/video/types";

/**
 * 動画生成プロバイダーの抽象インターフェース。
 *
 * WORK_ORDER (Sprint6) の要件により、最低限 render/cancel/getStatus を持つ。
 * UIおよび services/render/RenderService.ts はこのインターフェースのみに依存し、
 * 具体的な実装（MockVideoProvider、あるいは将来のRunway/Veo/Kling/Pika/Luma等の実プロバイダー）
 * を意識しない。services/ai/AIProvider.ts で採用した設計パターンをそのまま踏襲している。
 *
 * 例）将来の実装イメージ（Sprint6時点では未実装。制約により実API呼び出しは行わない）:
 *
 *   class RunwayVideoProvider implements VideoProvider {
 *     readonly id = "runway" as const;
 *     constructor(private apiKey: string) {}
 *     async render(renderJobId: string, input: VideoRenderInput): Promise<void> {
 *       // Runway APIへジョブを投入する
 *     }
 *     async cancel(renderJobId: string): Promise<void> { ... }
 *     async getStatus(renderJobId: string): Promise<VideoProviderStatusSnapshot> { ... }
 *   }
 *
 * プロバイダーの切り替えは services/video/index.ts の1箇所を差し替えるだけで完結する。
 */
export interface VideoProvider {
  readonly id: VideoProviderId;

  /** レンダリングジョブを開始する。処理の完了を待たずに返る（非同期でバックグラウンド実行される想定） */
  render(renderJobId: string, input: VideoRenderInput): Promise<void>;

  /** 実行中のジョブをキャンセルする */
  cancel(renderJobId: string): Promise<void>;

  /** 現在の状態を取得する（ポーリングで進捗を追跡するために使う） */
  getStatus(renderJobId: string): Promise<VideoProviderStatusSnapshot>;
}
