import type { RenderJobRepository } from "@/data/renderJobRepository";
import type { VideoProviderSettingsRepository } from "@/data/videoProviderSettingsRepository";
import type { VideoProvider } from "@/services/video/VideoProvider";
import type { VideoProviderFactory } from "@/services/video/VideoProviderFactory";
import type { LocalRenderInput } from "@/services/video/types";
import type { Dream } from "@/types/dream";
import type { DreamMoviePackage } from "@/types/movie";
import type { RenderJob } from "@/types/render";

/** VideoProvider.getStatus() をポーリングする間隔 */
const POLL_INTERVAL_MS = 400;

/** ポーリングが連続でエラーになった場合、この回数を超えたらジョブを失敗扱いにする */
const MAX_CONSECUTIVE_POLL_FAILURES = 3;

interface StartRenderParams {
  dream: Dream;
  moviePackage: DreamMoviePackage;
  /** ジョブの状態が更新されるたびに呼び出されるコールバック（UIへのpush用） */
  onUpdate?: (job: RenderJob) => void;
  /** ローカル生成（LocalCanvasVideoProvider）選択時にのみ使用するスタイル・尺の指定 */
  localOptions?: { styleId: LocalRenderInput["styleId"]; durationSeconds: LocalRenderInput["durationSeconds"] };
}

interface ActivePoll {
  provider: VideoProvider;
  intervalId: number;
  consecutiveFailures: number;
}

/**
 * Movie Package → Render Job生成 → VideoProvider実行 → Status更新 → Repository経由での保存、
 * という一連のパイプラインを担うサービス。
 *
 * WORK_ORDER (Sprint7) により、レンダリング開始のたびに現在のProvider設定
 * (data/videoProviderSettingsRepository.ts) を読み取り、`VideoProviderFactory` を通じて
 * Mock/Google Veoいずれかの `VideoProvider` を生成する構成に変更した。
 * UI層は本サービスのみに依存し、`VideoProvider` や `VideoProviderFactory` を直接importしない。
 */
export interface RenderService {
  startRender(params: StartRenderParams): Promise<RenderJob>;
  cancelRender(jobId: string): Promise<RenderJob>;
}

class DefaultRenderService implements RenderService {
  /** 実行中ジョブのポーリング状態を追跡する（キャンセル・エラー集計のため） */
  private readonly activePolls = new Map<string, ActivePoll>();

  constructor(
    private readonly videoProviderFactory: VideoProviderFactory,
    private readonly renderJobRepository: RenderJobRepository,
    private readonly videoProviderSettingsRepository: VideoProviderSettingsRepository,
  ) {}

  async startRender({
    dream,
    moviePackage,
    onUpdate,
    localOptions,
  }: StartRenderParams): Promise<RenderJob> {
    const settings = await this.videoProviderSettingsRepository.get();
    const provider = this.videoProviderFactory.create(settings.selectedProvider, {
      googleVeoApiKey: settings.googleVeoApiKey,
      pollinationsApiKey: settings.pollinationsApiKey,
      pollinationsModel: settings.pollinationsModel,
    });

    const now = new Date().toISOString();
    let job = await this.renderJobRepository.create({
      dreamId: dream.id,
      moviePackageId: moviePackage.id,
      provider: provider.id,
      status: "waiting",
      progress: 0,
      createdAt: now,
      updatedAt: now,
    });

    onUpdate?.(job);

    try {
      await provider.render(job.id, {
        moviePackage,
        local: localOptions
          ? {
              title: dream.title,
              body: dream.body,
              mood: dream.mood,
              styleId: localOptions.styleId,
              durationSeconds: localOptions.durationSeconds,
            }
          : undefined,
      });
      this.pollStatus(provider, job.id, onUpdate);
    } catch (error) {
      // APIキー未設定・通信失敗・Timeout等、開始時点で判明したエラーは即座に失敗として保存する
      job = await this.markFailed(job.id, error);
      onUpdate?.(job);
    }

    return job;
  }

  async cancelRender(jobId: string): Promise<RenderJob> {
    const active = this.activePolls.get(jobId);
    const now = new Date().toISOString();

    if (active) {
      await active.provider.cancel(jobId);
      window.clearInterval(active.intervalId);
      this.activePolls.delete(jobId);

      return this.renderJobRepository.update(jobId, {
        status: "cancelled",
        updatedAt: now,
        completedAt: now,
      });
    }

    // 何らかの理由でポーリング情報が残っていない場合でも、状態だけは更新しておく
    return this.renderJobRepository.update(jobId, {
      status: "cancelled",
      updatedAt: now,
      completedAt: now,
    });
  }

  private pollStatus(
    provider: VideoProvider,
    jobId: string,
    onUpdate?: (job: RenderJob) => void,
  ): void {
    const intervalId = window.setInterval(async () => {
      const active = this.activePolls.get(jobId);

      try {
        const snapshot = await provider.getStatus(jobId);
        const current = await this.renderJobRepository.getById(jobId);

        if (!current) {
          this.stopPolling(jobId);
          return;
        }

        const hasStarted = current.status === "waiting" && snapshot.status !== "waiting";
        const isTerminal =
          snapshot.status === "completed" ||
          snapshot.status === "failed" ||
          snapshot.status === "cancelled";
        const now = new Date().toISOString();

        const updated = await this.renderJobRepository.update(jobId, {
          status: snapshot.status,
          progress: snapshot.progress,
          errorMessage: snapshot.errorMessage,
          outputUrl: snapshot.outputUrl,
          updatedAt: now,
          ...(hasStarted ? { startedAt: now } : {}),
          ...(isTerminal ? { completedAt: now } : {}),
        });

        if (active) {
          active.consecutiveFailures = 0;
        }

        onUpdate?.(updated);

        if (isTerminal) {
          this.stopPolling(jobId);
        }
      } catch (error) {
        // 通信失敗・Timeout等、ポーリング中のエラーは一定回数まではリトライに任せる。
        // 連続で失敗し続ける場合はユーザーへエラーとして明示する（WORK_ORDER Sprint7の要件）。
        console.error("レンダリング状況の取得に失敗しました。", error);

        if (!active) return;
        active.consecutiveFailures += 1;

        if (active.consecutiveFailures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          const failed = await this.markFailed(jobId, error);
          this.stopPolling(jobId);
          onUpdate?.(failed);
        }
      }
    }, POLL_INTERVAL_MS);

    this.activePolls.set(jobId, { provider, intervalId, consecutiveFailures: 0 });
  }

  private stopPolling(jobId: string): void {
    const active = this.activePolls.get(jobId);
    if (active) {
      window.clearInterval(active.intervalId);
      this.activePolls.delete(jobId);
    }
  }

  private async markFailed(jobId: string, error: unknown): Promise<RenderJob> {
    const now = new Date().toISOString();
    const message =
      error instanceof Error
        ? error.message
        : "動画生成に失敗しました。時間をおいて再度お試しください。";

    return this.renderJobRepository.update(jobId, {
      status: "failed",
      errorMessage: message,
      updatedAt: now,
      completedAt: now,
    });
  }
}

export function createRenderService(
  videoProviderFactory: VideoProviderFactory,
  renderJobRepository: RenderJobRepository,
  videoProviderSettingsRepository: VideoProviderSettingsRepository,
): RenderService {
  return new DefaultRenderService(
    videoProviderFactory,
    renderJobRepository,
    videoProviderSettingsRepository,
  );
}
