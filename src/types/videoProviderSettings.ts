import type { VideoProviderId } from "@/services/video/types";

/**
 * 動画生成プロバイダーの設定。WORK_ORDER (Sprint7) の要件に対応する。
 * Google AI Studio の APIキーは、指示により暗号化せずそのまま保存する。
 */
export interface VideoProviderSettings {
  selectedProvider: VideoProviderId;
  /** Google AI Studio (Gemini API) のAPIキー。未設定の場合は空文字列 */
  googleVeoApiKey: string;
}

export const DEFAULT_VIDEO_PROVIDER_SETTINGS: VideoProviderSettings = {
  selectedProvider: "mock",
  googleVeoApiKey: "",
};

/** UI（設定画面）で選択可能なプロバイダー。型全体(VideoProviderId)のうち実装済みのものだけを提示する */
export const SELECTABLE_VIDEO_PROVIDERS: VideoProviderId[] = ["mock", "veo"];

/** LocalStorage 保存キー */
export const VIDEO_PROVIDER_SETTINGS_STORAGE_KEY = "dreamfilm-ai:video-provider-settings";
