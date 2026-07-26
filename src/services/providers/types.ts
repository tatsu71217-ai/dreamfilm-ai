/**
 * Providerアーキテクチャの共通型。
 *
 * 【目的】
 * 現在の描画・音声・素材はすべてブラウザ内のローカル実装だが、将来
 * 「背景を画像素材に差し替える」「BGMを音源ファイルへ差し替える」
 * 「キャラクターをAI生成画像にする」といった置き換えができるよう、
 * 呼び出し側（RenderPipeline / WorldEngine / DirectorEngine）が
 * **具体クラスではなくProviderインターフェースだけを参照する**構造にしている。
 *
 * 現時点では Local*Provider のみを実装し、切替UIも外部サービス接続も持たない。
 * 差し替えは services/providers/registry.ts の1箇所で完結する。
 */

import type { AudioTrackHandle } from "@/services/render/engine/audioEngine";
import type { RenderContext, RenderStage } from "@/services/render/engine/types";
import type { WorldConfig } from "@/services/world/types";
import type {
  AudioAsset,
  BackgroundVariant,
  CharacterVariant,
  EffectAsset,
  SoundEffectVariant,
} from "@/types/asset";
import type { MotionId } from "@/types/motion";
import type { SceneMood } from "@/types/scene";
import type { AudioProfile, StyleId } from "@/types/style";

/**
 * RenderPipelineが実行できる描画単位の共通形。
 * 描画系Providerと、後処理ステージ（Lighting/ColorGrading）が共通で満たす。
 */
export interface RenderUnit {
  readonly id: string;
  readonly stage: RenderStage;
  draw(context: RenderContext): void;
}

/** 背景の描画を担う */
export interface BackgroundProvider extends RenderUnit {
  readonly kind: "background";
}

/** キャラクターの描画を担う */
export interface CharacterProvider extends RenderUnit {
  readonly kind: "character";
}

/** 映像エフェクトの描画を担う */
export interface EffectProvider extends RenderUnit {
  readonly kind: "effect";
}

/** 字幕の描画を担う */
export interface SubtitleProvider extends RenderUnit {
  readonly kind: "subtitle";
}

/** BGM・SEの生成を担う */
export interface AudioProvider {
  readonly kind: "audio";
  readonly id: string;
  /**
   * 録画尺ぶんの音声トラックを作る。
   * 音声を出せない環境では null を返してよい（無音動画として録画が続行される）。
   */
  createTrack(
    profile: AudioProfile,
    soundEffects: AudioAsset[],
    totalSeconds: number,
  ): AudioTrackHandle | null;
}

/** スタイル（世界観）の設定供給を担う */
export interface ThemeProvider {
  readonly kind: "theme";
  readonly id: string;
  getWorldConfig(styleId: StyleId): WorldConfig;
  listStyleIds(): readonly StyleId[];
}

/** 素材（背景/キャラ/モーション/SE/エフェクト）の既定値供給を担う */
export interface AssetProvider {
  readonly kind: "asset";
  readonly id: string;
  getBackgroundFallback(styleId: StyleId): BackgroundVariant;
  getCharacterDefault(styleId: StyleId): CharacterVariant;
  pickCharacterMotion(variant: CharacterVariant, mood: SceneMood): MotionId;
  pickSceneSoundEffect(
    styleId: StyleId,
    mood: SceneMood,
    sceneIndex: number,
    atTime: number,
    /** 物語の遷移理由から決まる音。指定時はスタイルのプールより優先する */
    preferredVariant?: SoundEffectVariant,
  ): AudioAsset;
  buildEffectAssets(styleId: StyleId, mood: SceneMood): EffectAsset[];
}
