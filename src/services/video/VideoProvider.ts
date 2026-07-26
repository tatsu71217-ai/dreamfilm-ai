import type {
  VideoProviderId,
  VideoProviderStatusSnapshot,
  VideoRenderInput,
} from "@/services/video/types";

/**
 * 動画生成プロバイダーの抽象インターフェース。最低限 render/cancel/getStatus を持つ。
 *
 * UIおよび services/render/RenderService.ts はこのインターフェースのみに依存し、
 * 具体的な実装（LocalCanvasVideoProvider、PollinationsVideoProvider、GoogleVeoProvider等）
 * を意識しない。services/ai/AIProvider.ts で採用した設計パターンをそのまま踏襲している。
 *
 * プロバイダーの切り替えは services/video/VideoProviderFactory.ts の1箇所を差し替えるだけで完結する。
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
