import { localAssetProvider } from "@/services/providers/local/LocalAssetProvider";
import { localAudioProvider } from "@/services/providers/local/LocalAudioProvider";
import { localBackgroundProvider } from "@/services/providers/local/LocalBackgroundProvider";
import { localCharacterProvider } from "@/services/providers/local/LocalCharacterProvider";
import { localEffectProvider } from "@/services/providers/local/LocalEffectProvider";
import { localSubtitleProvider } from "@/services/providers/local/LocalSubtitleProvider";
import { localThemeProvider } from "@/services/providers/local/LocalThemeProvider";
import type {
  AssetProvider,
  AudioProvider,
  BackgroundProvider,
  CharacterProvider,
  EffectProvider,
  SubtitleProvider,
  ThemeProvider,
} from "@/services/providers/types";

export interface ProviderRegistry {
  background: BackgroundProvider;
  character: CharacterProvider;
  effect: EffectProvider;
  subtitle: SubtitleProvider;
  audio: AudioProvider;
  theme: ThemeProvider;
  asset: AssetProvider;
}

/**
 * アプリ全体で使用するProviderの一覧。
 *
 * 将来、素材やAI生成サービスへ差し替える場合はここを書き換えるだけでよく、
 * RenderPipeline / WorldEngine / DirectorEngine 側の変更は不要。
 * 現時点ではローカル実装のみで、切替UIも外部サービス接続も持たない。
 */
export const providers: ProviderRegistry = {
  background: localBackgroundProvider,
  character: localCharacterProvider,
  effect: localEffectProvider,
  subtitle: localSubtitleProvider,
  audio: localAudioProvider,
  theme: localThemeProvider,
  asset: localAssetProvider,
};
