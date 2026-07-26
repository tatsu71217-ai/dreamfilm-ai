/**
 * WorldEngine: スタイル単位で「世界観」を統括するファサード。
 *
 * 実際の設定データは ThemeProvider が持ち、WorldEngineはそこへの単一の入口を
 * 提供するだけに徹する（具体クラスは参照しない）。呼び出し側（DirectorEngine）は
 * 「スタイルIDだけ渡せば、そのスタイルの世界観に沿った Background/Character/
 * Camera/Lighting/Color/Effects/Audio の設定一式が得られる」。
 */

import { providers } from "@/services/providers/registry";
import type { StyleId } from "@/types/style";

export type {
  WorldColorBias,
  WorldConfig,
  WorldLightingBias,
} from "@/services/world/types";

/** スタイルIDから、そのスタイルの世界観設定一式を取得する（WorldEngineの唯一の入口） */
export function getWorldConfig(styleId: StyleId) {
  return providers.theme.getWorldConfig(styleId);
}
