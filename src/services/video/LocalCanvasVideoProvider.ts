import type { VideoBlobStore } from "@/data/videoBlobStore";
import { videoBlobStore as defaultVideoBlobStore } from "@/data/videoBlobStore";
import { renderScenesToVideo } from "@/services/render/videoRecorder";
import { splitDreamIntoScenes } from "@/services/scene/sceneSplitter";
import type { VideoProvider } from "@/services/video/VideoProvider";
import {
  LOCAL_VIDEO_URL_MARKER,
  type RenderStatus,
  type VideoProviderId,
  type VideoProviderStatusSnapshot,
  type VideoRenderInput,
} from "@/services/video/types";
import { getStylePreset } from "@/types/style";
import { DEFAULT_VIDEO_FPS, DEFAULT_VIDEO_RESOLUTION } from "@/types/videoProject";

interface JobState {
  status: RenderStatus;
  progress: number;
  errorMessage?: string;
}

/**
 * ブラウザ内（Canvas + MediaRecorder）で動画を生成する VideoProvider 実装。
 *
 * 外部APIも課金も不要な既定のプロバイダー。sceneSplitterでシーンへ分解し、
 * videoRecorderで実際に録画する。録画は実時間でしか進まない（15〜30秒の動画は
 * 15〜30秒かかる）ため、進捗はvideoRecorderからのコールバックで報告する。
 */
export class LocalCanvasVideoProvider implements VideoProvider {
  readonly id: VideoProviderId = "local";

  private readonly videoBlobStore: VideoBlobStore;
  private readonly jobs = new Map<string, JobState>();

  constructor(videoBlobStore: VideoBlobStore = defaultVideoBlobStore) {
    this.videoBlobStore = videoBlobStore;
  }

  async render(renderJobId: string, input: VideoRenderInput): Promise<void> {
    if (!input.local) {
      throw new Error("ローカル動画生成には夢の内容・スタイル・尺の指定が必要です。");
    }

    this.jobs.set(renderJobId, { status: "preparing", progress: 0 });
    // 録画は実時間で数十秒かかるため、待たずに開始してgetStatus()側で進捗を報告する
    void this.runGeneration(renderJobId, input.local);
  }

  private async runGeneration(
    renderJobId: string,
    local: NonNullable<VideoRenderInput["local"]>,
  ): Promise<void> {
    try {
      const { scenes, soundEffects } = splitDreamIntoScenes({
        body: local.body,
        title: local.title,
        mood: local.mood,
        styleId: local.styleId,
        durationSeconds: local.durationSeconds,
      });

      this.jobs.set(renderJobId, { status: "rendering", progress: 1 });

      const blob = await renderScenesToVideo(
        scenes,
        DEFAULT_VIDEO_RESOLUTION.width,
        DEFAULT_VIDEO_RESOLUTION.height,
        DEFAULT_VIDEO_FPS,
        (elapsed, total) => {
          if (this.jobs.get(renderJobId)?.status === "cancelled") return;
          const progress = total > 0 ? Math.min(97, Math.round((elapsed / total) * 100)) : 50;
          this.jobs.set(renderJobId, { status: "rendering", progress });
        },
        { profile: getStylePreset(local.styleId).audio, soundEffects },
      );

      if (this.jobs.get(renderJobId)?.status === "cancelled") {
        return;
      }

      await this.videoBlobStore.save(renderJobId, blob);
      this.jobs.set(renderJobId, { status: "completed", progress: 100 });
    } catch (error) {
      if (this.jobs.get(renderJobId)?.status === "cancelled") {
        return;
      }
      this.jobs.set(renderJobId, {
        status: "failed",
        progress: 0,
        errorMessage:
          error instanceof Error ? error.message : "動画生成に失敗しました。時間をおいて再度お試しください。",
      });
    }
  }

  async cancel(renderJobId: string): Promise<void> {
    this.jobs.set(renderJobId, { status: "cancelled", progress: 0 });
    await this.videoBlobStore.remove(renderJobId);
  }

  async getStatus(renderJobId: string): Promise<VideoProviderStatusSnapshot> {
    const job = this.jobs.get(renderJobId);
    if (!job) {
      throw new Error("指定されたレンダリングジョブが見つかりませんでした。");
    }

    if (job.status === "completed") {
      return { status: "completed", progress: 100, outputUrl: LOCAL_VIDEO_URL_MARKER };
    }
    if (job.status === "failed") {
      return { status: "failed", progress: 0, errorMessage: job.errorMessage };
    }
    return { status: job.status, progress: job.progress };
  }
}
