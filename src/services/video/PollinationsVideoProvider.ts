import type { VideoBlobStore } from "@/data/videoBlobStore";
import { videoBlobStore as defaultVideoBlobStore } from "@/data/videoBlobStore";
import type { VideoProvider } from "@/services/video/VideoProvider";
import {
  clampDuration,
  DEFAULT_POLLINATIONS_VIDEO_MODEL,
  findPollinationsVideoModel,
  LOCAL_VIDEO_URL_MARKER,
  type RenderStatus,
  type VideoProviderId,
  type VideoProviderStatusSnapshot,
  type VideoRenderInput,
} from "@/services/video/types";

const POLLINATIONS_BASE_URL = "https://gen.pollinations.ai";

/**
 * 1回の生成リクエストのタイムアウト。
 * Pollinationsの動画APIは同期（1本のHTTPリクエストでMP4を返す）で、モデルと尺によっては
 * 数分かかるため長めに設定している。
 */
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

/** 進捗表示の目安に使う「1秒の動画を生成するのに要するおおよその実時間（秒）」 */
const ESTIMATED_SECONDS_PER_VIDEO_SECOND = 4;
/** 実際に完了するまで進捗を100%にしないための上限 */
const MAX_ESTIMATED_PROGRESS = 90;
/** 開始直後は「準備中」として扱う時間 */
const PREPARING_PHASE_MS = 2500;

/** 縦持ちスマートフォンでの視聴を前提としたアスペクト比 */
const ASPECT_RATIO = "9:16";

export interface PollinationsVideoProviderOptions {
  apiKey: string;
  /** 使用する動画モデル。未指定時は無料枠で使える可能性が最も高い nova-reel */
  model?: string;
  videoBlobStore?: VideoBlobStore;
}

interface ActiveGeneration {
  startedAtMs: number;
  /** 丸めた後の実際にリクエストした尺（秒）。進捗の目安算出に使う */
  durationSeconds: number;
  controller: AbortController;
  status: RenderStatus;
  errorMessage?: string;
  outputUrl?: string;
}

/**
 * Pollinations.ai (gen.pollinations.ai) 経由で実際に動画を生成する VideoProvider 実装。
 *
 * 【なぜPollinationsか】
 * - 無料アカウントに日次のPollen付与があり、「無料枠のあるProvider」という要件を満たす
 * - `Access-Control-Allow-Origin: *` を返すため、バックエンドを持たない本アプリから
 *   ブラウザ直接呼び出しができる（Replicate/fal.ai等はCORS不可でプロキシが必須）
 * - Google Veoは公式価格表の全バリアントで無料枠が "Not available" のため、無料要件を満たせない
 *
 * 【同期APIを非同期インターフェースへ適合させている理由】
 * PollinationsのAPIは `GET /video/{prompt}` が完了までブロックしてMP4本体を返す同期方式で、
 * ジョブIDを発行してポーリングする仕組みが無い。一方で本アプリの `VideoProvider` は
 * render/getStatus/cancel の非同期モデルを前提としている（Veo等のジョブ型APIに合わせた設計）。
 * そこで `render()` ではfetchのPromiseを待たずに保持しておき、`getStatus()` では
 * その解決状況と経過時間から状態・進捗を報告する形で両者を橋渡ししている。
 * 進捗率はAPIから取得できないため経過時間ベースの目安値である。
 */
export class PollinationsVideoProvider implements VideoProvider {
  readonly id: VideoProviderId = "pollinations";

  private readonly apiKey: string;
  private readonly model: string;
  private readonly videoBlobStore: VideoBlobStore;
  private readonly generations = new Map<string, ActiveGeneration>();

  constructor(options: PollinationsVideoProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model || DEFAULT_POLLINATIONS_VIDEO_MODEL;
    this.videoBlobStore = options.videoBlobStore ?? defaultVideoBlobStore;
  }

  async render(renderJobId: string, input: VideoRenderInput): Promise<void> {
    if (this.apiKey.trim().length === 0) {
      throw new Error(
        "Pollinations の APIキーが設定されていません。設定画面から登録してください。",
      );
    }

    const modelOption = findPollinationsVideoModel(this.model);
    if (!modelOption) {
      throw new Error(`未対応の動画モデルです: ${this.model}`);
    }

    const durationSeconds = clampDuration(
      input.moviePackage.duration,
      modelOption.duration,
    );
    const controller = new AbortController();

    const generation: ActiveGeneration = {
      startedAtMs: Date.now(),
      durationSeconds,
      controller,
      status: "preparing",
    };
    this.generations.set(renderJobId, generation);

    // 完了を待たずに走らせ、進捗は getStatus() 側で報告する。
    // ここで await しないため、未処理のRejectionにならないよう内部で必ず捕捉する。
    void this.runGeneration(renderJobId, generation, input);
  }

  private async runGeneration(
    renderJobId: string,
    generation: ActiveGeneration,
    input: VideoRenderInput,
  ): Promise<void> {
    const timeoutId = window.setTimeout(
      () => generation.controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const url = this.buildRequestUrl(input, generation.durationSeconds);
      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: generation.controller.signal,
      });

      await assertSuccessfulResponse(response);

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error("生成された動画が空でした。時間をおいて再度お試しください。");
      }

      await this.videoBlobStore.save(renderJobId, blob);

      // キャンセル済みの場合は完了扱いにしない（保存済みの本体は cancel() 側で破棄される）
      if (generation.status === "cancelled") {
        return;
      }

      generation.status = "completed";
      generation.outputUrl = LOCAL_VIDEO_URL_MARKER;
    } catch (error) {
      if (generation.status === "cancelled") {
        return;
      }
      generation.status = "failed";
      generation.errorMessage = toUserFacingErrorMessage(error);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  /** Movie Packageの内容を、Pollinationsに渡す1本のプロンプトとリクエストURLへ組み立てる */
  private buildRequestUrl(input: VideoRenderInput, durationSeconds: number): string {
    const prompt = buildVideoPrompt(input);
    const params = new URLSearchParams({
      model: this.model,
      duration: String(durationSeconds),
      aspectRatio: ASPECT_RATIO,
      // 毎回異なる映像が生成されるようにする（同じ夢を再生成したときの体験のため）
      seed: "-1",
    });

    return `${POLLINATIONS_BASE_URL}/video/${encodeURIComponent(prompt)}?${params.toString()}`;
  }

  async cancel(renderJobId: string): Promise<void> {
    const generation = this.generations.get(renderJobId);
    if (!generation) return;

    generation.status = "cancelled";
    generation.controller.abort();
    // 中断が保存処理と競合して本体だけ残ることがあるため、明示的に破棄する
    await this.videoBlobStore.remove(renderJobId);
  }

  async getStatus(renderJobId: string): Promise<VideoProviderStatusSnapshot> {
    const generation = this.generations.get(renderJobId);
    if (!generation) {
      throw new Error("指定されたレンダリングジョブが見つかりませんでした。");
    }

    if (generation.status === "completed") {
      return { status: "completed", progress: 100, outputUrl: generation.outputUrl };
    }

    if (generation.status === "failed") {
      return {
        status: "failed",
        progress: 0,
        errorMessage: generation.errorMessage,
      };
    }

    if (generation.status === "cancelled") {
      return { status: "cancelled", progress: 0 };
    }

    const elapsedMs = Date.now() - generation.startedAtMs;
    if (elapsedMs < PREPARING_PHASE_MS) {
      return { status: "preparing", progress: 5 };
    }

    return {
      status: "rendering",
      progress: estimateProgress(elapsedMs, generation.durationSeconds),
    };
  }
}

/**
 * Movie Packageから、動画生成AIへ渡す1本のテキストプロンプトを組み立てる。
 * シーンごとの videoPrompt を繋ぐことで、Movie Packageの構成を映像へ反映させる。
 */
function buildVideoPrompt(input: VideoRenderInput): string {
  const { moviePackage } = input;
  const sceneDescriptions = moviePackage.scenes
    .map((scene) => scene.description)
    .join(" ");

  const prompt = [
    `${moviePackage.genre}風のショートフィルム。`,
    `${moviePackage.mood}。`,
    moviePackage.synopsis,
    sceneDescriptions,
    "夢のような映像美。シネマティックな照明。",
  ]
    .filter((part) => part.trim().length > 0)
    .join(" ");

  // URLパスに載せるため、極端に長いプロンプトは切り詰める
  return prompt.slice(0, 1500);
}

/** APIは進捗率を返さないため、経過時間から疑似的な進捗を算出する（実際の進捗とは異なる近似値） */
function estimateProgress(elapsedMs: number, durationSeconds: number): number {
  const estimatedTotalMs =
    durationSeconds * ESTIMATED_SECONDS_PER_VIDEO_SECOND * 1000;
  const ratio = elapsedMs / estimatedTotalMs;
  return Math.min(MAX_ESTIMATED_PROGRESS, Math.max(10, Math.round(ratio * 100)));
}

/**
 * レスポンスがMP4でなければ、内容に応じた日本語のエラーへ変換してthrowする。
 * Pollinationsはエラー時にJSON（status/error.code/error.message）を返す。
 */
async function assertSuccessfulResponse(response: Response): Promise<void> {
  if (response.ok && (response.headers.get("content-type") ?? "").includes("video")) {
    return;
  }

  const detail = await readErrorMessage(response);

  switch (response.status) {
    case 401:
      throw new Error(
        "Pollinations の APIキーが無効です。設定画面のキーをご確認ください。",
      );
    case 402:
      throw new Error(
        "Pollen残高が不足しています。日次の無料付与枠を使い切った可能性があります。時間をおくか、より安価なモデルをお試しください。",
      );
    case 429:
      throw new Error(
        "リクエストが多すぎます。しばらく時間をおいてから再度お試しください。",
      );
    case 400:
      throw new Error(detail ?? "リクエスト内容が不正です。設定をご確認ください。");
    default:
      if (response.ok) {
        // 200だがMP4でない（想定外のレスポンス形式）
        throw new Error(
          detail ?? "動画の取得に失敗しました。時間をおいて再度お試しください。",
        );
      }
      throw new Error(detail ?? `動画生成APIエラー (HTTP ${response.status})`);
  }
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "object" &&
      (data as { error: unknown }).error !== null
    ) {
      const message = (data as { error: { message?: unknown } }).error.message;
      if (typeof message === "string" && message.length > 0) {
        return message;
      }
    }
  } catch {
    // JSONとして解釈できないレスポンス。呼び出し側の既定メッセージに委ねる
  }
  return null;
}

function toUserFacingErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "動画生成がタイムアウトしました。尺を短くするか、時間をおいて再度お試しください。";
  }
  if (error instanceof TypeError) {
    // fetch自体の失敗（オフライン等）はTypeErrorになる
    return "動画生成サービスへの通信に失敗しました。ネットワーク接続をご確認ください。";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "動画生成に失敗しました。時間をおいて再度お試しください。";
}
