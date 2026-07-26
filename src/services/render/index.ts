import { videoProviderFactory } from "@/services/video";
import { renderJobRepository } from "@/data/renderJobRepository";
import { videoProviderSettingsRepository } from "@/data/videoProviderSettingsRepository";
import { createRenderService } from "@/services/render/RenderService";

/**
 * アプリ全体で使用する RenderService の単一インスタンス。
 * 固定のVideoProviderではなく `videoProviderFactory` と `videoProviderSettingsRepository` を
 * 渡す構成にすることで、レンダリング開始のたびに現在のProvider設定を反映できるようにしている。
 */
export const renderService = createRenderService(
  videoProviderFactory,
  renderJobRepository,
  videoProviderSettingsRepository,
);

export type { RenderService } from "@/services/render/RenderService";
