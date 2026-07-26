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
 * 実動画生成は行わないモック実装。**開発専用。**
 *
 * 実プロバイダー（Pollinations / Google Veo）の導入に伴い、本番ビルドでは提供しない。
 * `VideoProviderFactory.isMockProviderAvailable` (= `import.meta.env.DEV`) でガードしており、
 * 本番バンドルからはこのファイルごとツリーシェイクされる。
 *
 * 開発時にAPIキーや課金なしでRenderパイプライン全体（状態遷移・進捗・プレビュー・保存・共有）を
 * 動かすために残している。完了時は `MOCK_VIDEO_URL`（公開テスト動画）を outputUrl として返す。
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
