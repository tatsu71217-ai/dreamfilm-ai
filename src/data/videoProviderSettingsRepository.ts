import {
  DEFAULT_VIDEO_PROVIDER_SETTINGS,
  VIDEO_PROVIDER_SETTINGS_STORAGE_KEY,
  type VideoProviderSettings,
} from "@/types/videoProviderSettings";

/**
 * Provider設定・APIキー設定へのアクセスを抽象化するリポジトリインターフェース。
 * WORK_ORDER (Sprint7) の「保存対象: Provider設定, APIキー設定。LocalStorage対応」に対応する。
 */
export interface VideoProviderSettingsRepository {
  get(): Promise<VideoProviderSettings>;
  save(settings: VideoProviderSettings): Promise<VideoProviderSettings>;
}

class LocalStorageVideoProviderSettingsRepository implements VideoProviderSettingsRepository {
  private readonly storageKey = VIDEO_PROVIDER_SETTINGS_STORAGE_KEY;

  async get(): Promise<VideoProviderSettings> {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return { ...DEFAULT_VIDEO_PROVIDER_SETTINGS };
      }
      const parsed = JSON.parse(raw) as Partial<VideoProviderSettings>;
      // 将来フィールドが増えた場合でも、欠けている項目はデフォルト値で補う
      return { ...DEFAULT_VIDEO_PROVIDER_SETTINGS, ...parsed };
    } catch (error) {
      console.error("プロバイダー設定の読み込みに失敗しました。", error);
      return { ...DEFAULT_VIDEO_PROVIDER_SETTINGS };
    }
  }

  async save(settings: VideoProviderSettings): Promise<VideoProviderSettings> {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(settings));
      return settings;
    } catch (error) {
      console.error("プロバイダー設定の保存に失敗しました。", error);
      throw new Error(
        "設定を保存できませんでした。ブラウザのストレージ容量やプライベートモード設定をご確認ください。",
      );
    }
  }
}

/**
 * アプリ全体で単一インスタンスを共有するリポジトリ。
 * components/common/VideoProviderSettingsCard.tsx（設定画面）と
 * services/render/RenderService.ts（レンダリング開始時に現在の設定を読む）から利用する。
 */
export const videoProviderSettingsRepository: VideoProviderSettingsRepository =
  new LocalStorageVideoProviderSettingsRepository();
