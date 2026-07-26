import type { VideoProvider } from "@/services/video/VideoProvider";
import type {
  VideoProviderId,
  VideoProviderStatusSnapshot,
  VideoRenderInput,
} from "@/services/video/types";

/**
 * Gemini API (Google AI Studio) のベースURL。無料枠のAPIキーで利用できるエンドポイント。
 * 参考: https://ai.google.dev/gemini-api/docs/veo
 */
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * 使用するVeoモデルID。
 * TODO: Google AI Studioで発行したAPIキーによって利用可能なモデルが異なる場合があるため、
 * 実際に接続する際は利用可能なモデルIDを確認し、必要であれば設定可能にすることを検討する。
 */
const VEO_MODEL_ID = "veo-3.1-generate-preview";

/** 1リクエストあたりのタイムアウト */
const REQUEST_TIMEOUT_MS = 15000;

/** 進捗の疑似算出に使う目安時間（秒）。Veo APIは数値の進捗率を返さないための代替 */
const ESTIMATED_DURATION_SECONDS = 120;

interface GoogleVeoProviderOptions {
  apiKey: string;
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
 * WORK_ORDER (Sprint7) の要件に従い、`VideoProvider` interfaceに準拠する。
 * `predictLongRunning` でレンダリングを開始し、返却された operation name を
 * `getStatus()` でポーリングして完了を待つ、Gemini APIの標準的な非同期パターンを採用している。
 *
 * 【既知の制約】
 * - Gemini API (Google AI Studio経由) の動画生成オペレーションには、Sprint7時点で確認できる
 *   公式なキャンセル用エンドポイントが存在しない。そのため `cancel()` はクライアント側の
 *   追跡情報を破棄するのみで、Google側の処理自体を停止できない可能性がある。
 * - 進捗(progress)は Veo API から直接取得できないため、経過時間から疑似的に算出した近似値。
 * - APIキーはこのクラスの外（設定画面 → LocalStorage）で管理される。暗号化は行っていない
 *   （WORK_ORDER Sprint7の指示通り）。本番運用ではサーバーサイドのプロキシ経由にするなど、
 *   APIキーをクライアントに直接持たせない構成へ見直すことを強く推奨する
 *   （詳細はSPRINT_REPORT.mdの懸念事項を参照）。
 */
export class GoogleVeoProvider implements VideoProvider {
  readonly id: VideoProviderId = "veo";

  private readonly apiKey: string;
  /** renderJobId → Google側のoperation name */
  private readonly operationNames = new Map<string, string>();
  /** renderJobId → レンダリング開始時刻(ms)。進捗の疑似算出に使用 */
  private readonly startedAtMs = new Map<string, number>();

  constructor(options: GoogleVeoProviderOptions) {
    this.apiKey = options.apiKey;
  }

  async render(renderJobId: string, input: VideoRenderInput): Promise<void> {
    if (this.apiKey.trim().length === 0) {
      throw new Error(
        "Google AI Studio の APIキーが設定されていません。設定画面から登録してください。",
      );
    }

    const prompt = buildVeoPrompt(input);

    const response = await fetchWithTimeout(
      `${GEMINI_API_BASE_URL}/models/${VEO_MODEL_ID}:predictLongRunning`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instances: [{ prompt }] }),
      },
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
  }

  async getStatus(renderJobId: string): Promise<VideoProviderStatusSnapshot> {
    const operationName = this.operationNames.get(renderJobId);
    if (!operationName) {
      throw new Error("指定されたレンダリングジョブが見つかりませんでした。");
    }

    const response = await fetchWithTimeout(`${GEMINI_API_BASE_URL}/${operationName}`, {
      method: "GET",
      headers: { "x-goog-api-key": this.apiKey },
    });

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
      return {
        status: "completed",
        progress: 100,
        outputUrl: uri,
      };
    }

    return {
      status: "rendering",
      progress: estimateProgress(this.startedAtMs.get(renderJobId)),
    };
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

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
    const message = data?.error?.message ?? `Google Veo API エラー (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data;
}
