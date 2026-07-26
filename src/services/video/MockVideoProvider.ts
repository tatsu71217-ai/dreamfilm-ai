import type { VideoProvider } from "@/services/video/VideoProvider";
import type {
  RenderStatus,
  VideoProviderId,
  VideoProviderStatusSnapshot,
  VideoRenderInput,
} from "@/services/video/types";

/**
 * モック完了時に返すサンプル動画URL。
 * 実際の動画生成は行わないため、公開されている汎用テスト用動画（Big Buck Bunny）を
 * プレースホルダーとして使用する。Sprint8の「動画プレビュー/保存/共有」機能を
 * Mockプロバイダーだけで一通り確認できるようにするために追加した。
 */
const MOCK_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

interface SimulatedJobState {
  status: RenderStatus;
  progress: number;
  outputUrl?: string;
  timeoutHandles: number[];
}

/**
 * 疑似的な進捗ステップ。Waiting(0%)から開始し、Preparing → Rendering(複数段階) → Completed
 * まで、一定時間ごとに状態とProgressを進める。
 */
const SIMULATION_STEPS: ReadonlyArray<{
  delayMs: number;
  status: RenderStatus;
  progress: number;
}> = [
  { delayMs: 400, status: "preparing", progress: 10 },
  { delayMs: 900, status: "rendering", progress: 30 },
  { delayMs: 1500, status: "rendering", progress: 55 },
  { delayMs: 2100, status: "rendering", progress: 80 },
  { delayMs: 2700, status: "completed", progress: 100 },
];

/**
 * 実動画生成は行わないモック実装。
 *
 * WORK_ORDER (Sprint6) の「Waiting→Preparing→Rendering→Completed」という状態遷移と、
 * 「疑似的にProgressが更新されること」という要件に対応する。`VideoProvider` interfaceのみに
 * 依存する形で実装しており、将来 実プロバイダーへ差し替える際は services/video/index.ts の
 * 1行を変更するだけで済む。
 *
 * Sprint8より、完了時に `MOCK_VIDEO_URL`（公開テスト動画）を outputUrl として返すようにし、
 * 動画プレビュー・保存・共有機能をMockのみで動作確認できるようにした。
 */
export class MockVideoProvider implements VideoProvider {
  readonly id: VideoProviderId = "mock";

  private readonly jobs = new Map<string, SimulatedJobState>();

  async render(renderJobId: string, _input: VideoRenderInput): Promise<void> {
    const timeoutHandles: number[] = [];
    this.jobs.set(renderJobId, { status: "waiting", progress: 0, timeoutHandles });

    for (const step of SIMULATION_STEPS) {
      const handle = window.setTimeout(() => {
        const job = this.jobs.get(renderJobId);
        // キャンセル等で既にジョブ情報が削除されている場合は何もしない
        if (!job || job.status === "cancelled") return;
        job.status = step.status;
        job.progress = step.progress;
        if (step.status === "completed") {
          job.outputUrl = MOCK_VIDEO_URL;
        }
      }, step.delayMs);
      timeoutHandles.push(handle);
    }
  }

  async cancel(renderJobId: string): Promise<void> {
    const job = this.jobs.get(renderJobId);
    if (!job) return;
    job.timeoutHandles.forEach((handle) => window.clearTimeout(handle));
    job.status = "cancelled";
  }

  async getStatus(renderJobId: string): Promise<VideoProviderStatusSnapshot> {
    const job = this.jobs.get(renderJobId);
    if (!job) {
      throw new Error("指定されたレンダリングジョブが見つかりませんでした。");
    }
    return { status: job.status, progress: job.progress, outputUrl: job.outputUrl };
  }
}
