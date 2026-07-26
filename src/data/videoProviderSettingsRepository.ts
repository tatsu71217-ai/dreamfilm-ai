import { writeJsonOrThrow } from "@/data/localStorageJson";
import { isMockProviderAvailable } from "@/services/video/VideoProviderFactory";
import {
  DEFAULT_VIDEO_PROVIDER_SETTINGS,
  SELECTABLE_VIDEO_PROVIDERS,
  VIDEO_PROVIDER_SETTINGS_STORAGE_KEY,
  type VideoProviderSettings,
} from "@/types/videoProviderSettings";

/**
 * 保存済み設定を、現在のビルドで有効な値へ寄せる。
 *
 * Mockプロバイダーを本番から外したため、以前 "mock" を選んでいたユーザーの設定が
 * そのまま残っていると、動画生成のたびにFactoryがエラーになってしまう。
 * 読み出し時に既定のプロバイダーへ移行させることで、設定画面を触らなくても復帰できるようにする。
 */
function normalizeSettings(settings: VideoProviderSettings): VideoProviderSettings {
  const isSelectable = SELECTABLE_VIDEO_PROVIDERS.includes(settings.selectedProvider);
  if (isSelectable) {
    return settings;
  }

  if (settings.selectedProvider === "mock" && !isMockProviderAvailable) {
    return {
      ...settings,
      selectedProvider: DEFAULT_VIDEO_PROVIDER_SETTINGS.selectedProvider,
    };
  }

  // 過去に型だけ存在した runway/kling/pika/luma 等、現在は解決できない値も既定へ戻す
  return {
    ...settings,
    selectedProvider: DEFAULT_VIDEO_PROVIDER_SETTINGS.selectedProvider,
  };
}

/** Provider設定・APIキー設定へのアクセスを抽象化するリポジトリインターフェース。LocalStorageに保存する。 */
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
      return normalizeSettings({ ...DEFAULT_VIDEO_PROVIDER_SETTINGS, ...parsed });
    } catch (error) {
      console.error("プロバイダー設定の読み込みに失敗しました。", error);
      return { ...DEFAULT_VIDEO_PROVIDER_SETTINGS };
    }
  }

  async save(settings: VideoProviderSettings): Promise<VideoProviderSettings> {
    writeJsonOrThrow(
      this.storageKey,
      settings,
      "プロバイダー設定の保存に失敗しました。",
      "設定を保存できませんでした。ブラウザのストレージ容量やプライベートモード設定をご確認ください。",
    );
    return settings;
  }
}

/**
 * アプリ全体で単一インスタンスを共有するリポジトリ。
 * components/common/VideoProviderSettingsCard.tsx（設定画面）と
 * services/render/RenderService.ts（レンダリング開始時に現在の設定を読む）から利用する。
 */
export const videoProviderSettingsRepository: VideoProviderSettingsRepository =
  new LocalStorageVideoProviderSettingsRepository();
