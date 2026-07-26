import { isMockProviderAvailable } from "@/services/video/VideoProviderFactory";
import {
  DEFAULT_POLLINATIONS_VIDEO_MODEL,
  type VideoProviderId,
} from "@/services/video/types";

/**
 * 動画生成プロバイダーの設定。
 * APIキーはユーザー自身が取得したものを、暗号化せずLocalStorageへ保存する
 * （バックエンドを持たない構成のため。詳細はREADMEの「APIキーについて」を参照）。
 */
export interface VideoProviderSettings {
  selectedProvider: VideoProviderId;
  /** Pollinations (gen.pollinations.ai) のAPIキー。未設定の場合は空文字列 */
  pollinationsApiKey: string;
  /** Pollinationsで使用する動画モデルID */
  pollinationsModel: string;
  /** Google AI Studio (Gemini API) のAPIキー。未設定の場合は空文字列 */
  googleVeoApiKey: string;
}

export const DEFAULT_VIDEO_PROVIDER_SETTINGS: VideoProviderSettings = {
  // 無料枠があり、かつバックエンド無しでブラウザから直接呼べる Pollinations を既定にする
  selectedProvider: "pollinations",
  pollinationsApiKey: "",
  pollinationsModel: DEFAULT_POLLINATIONS_VIDEO_MODEL,
  googleVeoApiKey: "",
};

/**
 * UI（設定画面）で選択可能なプロバイダー。
 * Mockは開発ビルドでのみ選択肢に出す。
 */
export const SELECTABLE_VIDEO_PROVIDERS: VideoProviderId[] = isMockProviderAvailable
  ? ["pollinations", "veo", "mock"]
  : ["pollinations", "veo"];

/** LocalStorage 保存キー */
export const VIDEO_PROVIDER_SETTINGS_STORAGE_KEY = "dreamfilm-ai:video-provider-settings";
