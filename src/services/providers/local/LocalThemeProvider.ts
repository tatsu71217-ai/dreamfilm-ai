import { localAssetProvider } from "@/services/providers/local/LocalAssetProvider";
import type { ThemeProvider } from "@/services/providers/types";
import type { WorldColorBias, WorldConfig, WorldLightingBias } from "@/services/world/types";
import { getStylePreset, STYLE_IDS, type StyleId } from "@/types/style";

/**
 * スタイルの世界観としての基調照明。
 * 「同じ気分でも、ホラー風は常に暗め・美しい風は常に明るめ」という土台を作る。
 */
const BASE_LIGHTING: Record<StyleId, WorldLightingBias> = {
  anime: { brightness: 0.05, warmth: 0.05 },
  real: { brightness: 0, warmth: 0 },
  horror: { brightness: -0.2, warmth: -0.1 },
  cute: { brightness: 0.12, warmth: 0.08 },
  beautiful: { brightness: 0.1, warmth: 0.1 },
  manga: { brightness: 0, warmth: -0.05 },
  mascot: { brightness: 0.08, warmth: 0.05 },
  fantasy: { brightness: -0.05, warmth: 0.02 },
};

const BASE_COLOR_GRADING: Record<StyleId, WorldColorBias> = {
  anime: { saturationMultiplier: 1.1, tint: "#4fa8e8", tintStrengthBias: 0.02 },
  real: { saturationMultiplier: 0.95, tint: "#888888", tintStrengthBias: 0 },
  horror: { saturationMultiplier: 0.8, tint: "#2a1b22", tintStrengthBias: 0.08 },
  cute: { saturationMultiplier: 1.15, tint: "#ff8fc5", tintStrengthBias: 0.03 },
  beautiful: { saturationMultiplier: 1.05, tint: "#ffe9b0", tintStrengthBias: 0.05 },
  manga: { saturationMultiplier: 0.7, tint: "#000000", tintStrengthBias: 0.05 },
  mascot: { saturationMultiplier: 1.1, tint: "#ff9b42", tintStrengthBias: 0.02 },
  fantasy: { saturationMultiplier: 1.1, tint: "#8a5fd1", tintStrengthBias: 0.08 },
};

/**
 * WorldConfigはフレームごと（Lighting/ColorGradingの各ステージ）に参照されるため、
 * 毎回オブジェクトを組み立て直さないようスタイル単位でキャッシュする。
 * 内容はビルド時に固定の静的データなので、キャッシュが古くなることはない。
 */
const cache = new Map<StyleId, WorldConfig>();

/** スタイルごとの世界観設定を供給する既定実装 */
export const localThemeProvider: ThemeProvider = {
  kind: "theme",
  id: "local-theme",

  getWorldConfig(styleId: StyleId): WorldConfig {
    const cached = cache.get(styleId);
    if (cached) return cached;

    const style = getStylePreset(styleId);
    const config: WorldConfig = {
      styleId: style.id,
      label: style.label,
      palette: style.palette,
      pacing: style.pacing,
      cameraMotions: style.cameraMotions,
      transitions: style.transitions,
      effects: style.effects,
      subtitle: style.subtitle,
      audio: style.audio,
      backgroundFallback: localAssetProvider.getBackgroundFallback(style.id),
      characterDefault: localAssetProvider.getCharacterDefault(style.id),
      baseLighting: BASE_LIGHTING[style.id],
      baseColorGrading: BASE_COLOR_GRADING[style.id],
    };

    cache.set(styleId, config);
    return config;
  },

  listStyleIds() {
    return STYLE_IDS;
  },
};
