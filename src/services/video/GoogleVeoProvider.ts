import type { VideoBlobStore } from "@/data/videoBlobStore";
import { videoBlobStore as defaultVideoBlobStore } from "@/data/videoBlobStore";
import type { VideoProvider } from "@/services/video/VideoProvider";
import {
  clampDuration,
  LOCAL_VIDEO_URL_MARKER,
  type VideoProviderId,
  type VideoProviderStatusSnapshot,
  type VideoRenderInput,
} from "@/services/video/types";

/**
 * Gemini API (Google AI Studio) のベースURL。
 * 参考: https://ai.google.dev/gemini-api/docs/veo
 */
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * 使用するVeoモデルID。
 * 既定は最も安価な Lite ($0.05/秒)。Veo 2 / Veo 3 は2026年6月30日で提供終了しているため、
 * 3.1系のみを対象にしている。
 */
export const VEO_MODEL_IDS = {
  lite: "veo-3.1-lite-generate-preview",
  fast: "veo-3.1-fast-generate-preview",
  standard: "veo-3.1-generate-preview",
} as const;

export type VeoModelId = (typeof VEO_MODEL_IDS)[keyof typeof VEO_MODEL_IDS];

const DEFAULT_VEO_MODEL: VeoModelId = VEO_MODEL_IDS.lite;

/** Veoが受け付ける尺は 4/6/8 秒のみ */
const VEO_DURATION_CONSTRAINT = { min: 4, max: 8, step: 2 } as const;

/** 1リクエストあたりのタイムアウト（ポーリング1回分。生成完了までの総時間ではない） */
const REQUEST_TIMEOUT_MS = 30000;

/** 動画本体のダウンロードは時間がかかるため、別枠で長めのタイムアウトを設ける */
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/** 進捗の疑似算出に使う目安時間（秒）。Veo APIは数値の進捗率を返さないための代替 */
const ESTIMATED_DURATION_SECONDS = 120;

interface GoogleVeoProviderOptions {
  apiKey: string;
  model?: VeoModelId;
  videoBlobStore?: VideoBlobStore;
}

/** Gemini API の長時間実行オペレーションのレスポンス形（必要なフィールドのみ） */
interface VeoOperationResponse {
  name?: string;
  done?: boolean;
  error?: { code?: number; message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
  };
}

/**
 * Google Veo（Gemini API / Google AI Studio経由）に接続する VideoProvider 実装。
 *
 * `predictLongRunning` でレンダリングを開始し、返却された operation name を
 * `getStatus()` でポーリングして完了を待つ、Gemini APIの標準的な非同期パターンを採用している。
 *
 * 【料金についての注意】
 * Veoには無料枠が一切ない（公式価格表で全バリアントが "Not available"）。
 * 既定の Lite でも $0.05/秒、8秒で約 $0.40 かかる。無料で試したい場合は
 * Pollinationsプロバイダーを使うこと。
 *
 * 【既知の制約】
 * - Gemini API の動画生成オペレーションには公式なキャンセル用エンドポイントが存在しないため、
 *   `cancel()` はクライアント側の追跡情報を破棄するのみで、Google側の課金対象処理は止まらない。
 * - 進捗(progress)は Veo API から直接取得できないため、経過時間から疑似的に算出した近似値。
 * - APIキーはこのクラスの外（設定画面 → LocalStorage）で管理される。暗号化は行っていない。
 *   本番運用ではサーバーサイドのプロキシ経由にするなど、APIキーをクライアントに
 *   直接持たせない構成へ見直すことを推奨する。
 */
export class GoogleVeoProvider implements VideoProvider {
  readonly id: VideoProviderId = "veo";

  private readonly apiKey: string;
  private readonly model: VeoModelId;
  private readonly videoBlobStore: VideoBlobStore;
  /** renderJobId → Google側のoperation name */
  private readonly operationNames = new Map<string, string>();
  /** renderJobId → レンダリング開始時刻(ms)。進捗の疑似算出に使用 */
  private readonly startedAtMs = new Map<string, number>();
  /** ダウンロード済みのジョブ。ポーリングのたびに再ダウンロードしないための記録 */
  private readonly downloaded = new Set<string>();

  constructor(options: GoogleVeoProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_VEO_MODEL;
    this.videoBlobStore = options.videoBlobStore ?? defaultVideoBlobStore;
  }

  async render(renderJobId: string, input: VideoRenderInput): Promise<void> {
    if (this.apiKey.trim().length === 0) {
      throw new Error(
        "Google AI Studio の APIキーが設定されていません。設定画面から登録してください。",
      );
    }

    const prompt = buildVeoPrompt(input);
    const durationSeconds = clampDuration(
      input.moviePackage.duration,
      VEO_DURATION_CONSTRAINT,
    );

    const response = await fetchWithTimeout(
      `${GEMINI_API_BASE_URL}/models/${this.model}:predictLongRunning`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { durationSeconds, aspectRatio: "9:16" },
        }),
      },
      REQUEST_TIMEOUT_MS,
    );

    const data = await parseVeoResponse(response);
    const operationName = data?.name;

    if (typeof operationName !== "string" || operationName.length === 0) {
      throw new Error(
        "Google Veo からの応答が不正です（operation nameを取得できませんでした）。",
      );
    }

    this.operationNames.set(renderJobId, operationName);
    this.startedAtMs.set(renderJobId, Date.now());
  }

  async cancel(renderJobId: string): Promise<void> {
    // 上記クラスコメントの通り、公式なキャンセルAPIが確認できないため追跡情報の破棄のみ行う
    this.operationNames.delete(renderJobId);
    this.startedAtMs.delete(renderJobId);
    this.downloaded.delete(renderJobId);
    await this.videoBlobStore.remove(renderJobId);
  }

  async getStatus(renderJobId: string): Promise<VideoProviderStatusSnapshot> {
    if (this.downloaded.has(renderJobId)) {
      return { status: "completed", progress: 100, outputUrl: LOCAL_VIDEO_URL_MARKER };
    }

    const operationName = this.operationNames.get(renderJobId);
    if (!operationName) {
      throw new Error("指定されたレンダリングジョブが見つかりませんでした。");
    }

    const response = await fetchWithTimeout(
      `${GEMINI_API_BASE_URL}/${operationName}`,
      { method: "GET", headers: { "x-goog-api-key": this.apiKey } },
      REQUEST_TIMEOUT_MS,
    );

    const data = await parseVeoResponse(response);

    if (data?.error) {
      return {
        status: "failed",
        progress: 0,
        errorMessage: data.error.message ?? "Google Veo での動画生成に失敗しました。",
      };
    }

    if (data?.done) {
      const uri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) {
        return {
          status: "failed",
          progress: 0,
          errorMessage: "生成された動画のURLを取得できませんでした。",
        };
      }

      // 署名付きURLは `x-goog-api-key` ヘッダーが必須で、<video src> では再生できない。
      // ここでバイナリを取得してIndexedDBへ保存し、再生時にObject URLへ解決する。
      await this.downloadAndStore(renderJobId, uri);
      this.downloaded.add(renderJobId);

      return { status: "completed", progress: 100, outputUrl: LOCAL_VIDEO_URL_MARKER };
    }

    return {
      status: "rendering",
      progress: estimateProgress(this.startedAtMs.get(renderJobId)),
    };
  }

  private async downloadAndStore(renderJobId: string, uri: string): Promise<void> {
    const response = await fetchWithTimeout(
      uri,
      { method: "GET", headers: { "x-goog-api-key": this.apiKey } },
      DOWNLOAD_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error(
        `生成された動画のダウンロードに失敗しました (HTTP ${response.status})。`,
      );
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error("生成された動画が空でした。時間をおいて再度お試しください。");
    }

    await this.videoBlobStore.save(renderJobId, blob);
  }
}

/** Movie Packageの内容から、Veoに渡す1本のテキストプロンプトを組み立てる */
function buildVeoPrompt(input: VideoRenderInput): string {
  const { moviePackage } = input;
  const sceneDescriptions = moviePackage.scenes.map((scene) => scene.description).join(" ");
  const prompt = `${moviePackage.genre}。${moviePackage.mood}。${moviePackage.synopsis} ${sceneDescriptions}`;
  // Gemini APIのプロンプト長制限を考慮し、念のため長さを制限する
  return prompt.slice(0, 2000);
}

/** Veo APIは進捗率を返さないため、経過時間から疑似的な進捗を算出する（実際の進捗とは異なる近似値） */
function estimateProgress(startedAtMs: number | undefined): number {
  if (startedAtMs === undefined) return 10;
  const elapsedSeconds = (Date.now() - startedAtMs) / 1000;
  const estimated = Math.round((elapsedSeconds / ESTIMATED_DURATION_SECONDS) * 90);
  return Math.min(90, Math.max(10, estimated));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Google Veo への通信がタイムアウトしました。しばらくしてから再度お試しください。",
      );
    }
    throw new Error("Google Veo との通信に失敗しました。ネットワーク接続をご確認ください。");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function parseVeoResponse(response: Response): Promise<VeoOperationResponse | null> {
  let data: VeoOperationResponse | null = null;
  try {
    data = (await response.json()) as VeoOperationResponse;
  } catch {
    // JSONとして解釈できないレスポンス。dataはnullのまま以降の処理に委ねる
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Google AI Studio の APIキーが無効です。設定画面をご確認ください。");
    }
    if (response.status === 429) {
      throw new Error(
        "Google Veo のレート制限に達しました。しばらく時間をおいてから再度お試しください。",
      );
    }
    const message = data?.error?.message ?? `Google Veo API エラー (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data;
}
