/**
 * DirectorEngine: DreamFilm AI全体の演出責任者。
 *
 * 【設計方針】
 * WorldEngine・EmotionEngine・MotionLibrary・CameraEngine・AudioProvider・
 * EffectProvider・Timeline(sceneSplitter)・Subtitleへは、**DirectorEngineだけ**が
 * 命令を送る。RenderPipeline配下の各Provider/後処理ステージ（Background/
 * Character/Effect/Lighting/ColorGrading）は、DirectorEngineが決定した結果
 * （DirectorCue）を読むだけで、他Engineを直接importしない。
 * これにより「各Engine同士が直接依存しない」構成にしている。
 *
 * 決定の順序（DreamScene → SceneMood → WorldStyle → Timeline → Camera →
 * Lighting → Effects → Motion → Subtitle → Audio）は次の2つの実行タイミングに対応する:
 *
 *  - `planTimeline()`: 動画生成の開始時に1回だけ実行する。
 *    夢テキスト(DreamScene the source)→SceneMood→WorldStyle→Timeline
 *    （シーンごとのCamera種別・Effects・Motion種別・Subtitle文言の割り当てを含む）
 *    を services/scene/sceneSplitter.ts (Timeline) に委譲して決定する。
 *  - `planFrame()`: 録画中、毎フレーム実行する。
 *    そのシーンのCamera変換・Lighting・Effects強度・Motionオフセットを決定する。
 *  - `planAudio()`: 動画生成の開始時に1回だけ実行する。Audioを決定し、
 *    唯一の呼び出し元としてAudioProviderへ命令する。
 */

import { providers } from "@/services/providers/registry";
import type { AudioTrackHandle } from "@/services/render/engine/audioEngine";
import {
  applyCameraTransform,
  computeCameraTransform,
  scaleForParallaxBackground,
  scaleTransformIntensity,
  type CameraTransform,
} from "@/services/render/cameraEngine";
import { deriveEmotionProfile } from "@/services/render/engine/emotionEngine";
import { computeMotionOffset, type MotionOffset } from "@/services/render/engine/motionLibrary";
import {
  splitDreamIntoScenes,
  type SplitScenesInput,
  type SplitScenesResult,
} from "@/services/scene/sceneSplitter";
import { getWorldConfig } from "@/services/world/worldEngine";
import type { AudioAsset, CharacterAsset } from "@/types/asset";
import type { DreamScene } from "@/types/scene";
import type { StyleId } from "@/types/style";

export type { CameraTransform } from "@/services/render/cameraEngine";

/** そのフレームで各Providerが「読むだけ」でよいように束ねた演出指示 */
export interface DirectorCue {
  /** キャラクター（前景）レイヤーに適用するカメラ変換 */
  cameraTransform: CameraTransform;
  /** 背景レイヤーに適用するカメラ変換（視差ぶん控えめ） */
  backgroundCameraTransform: CameraTransform;
  lighting: { brightness: number; warmth: number };
  colorGrading: {
    saturation: number;
    tint: string;
    tintStrength: number;
    worldTint: string;
    worldTintStrength: number;
  };
  /** EffectProviderが各エフェクトのintensityに掛ける倍率 */
  effectIntensity: number;
  /** キャラクターごとのモーションオフセットを求める */
  motionFor(character: CharacterAsset): MotionOffset;
}

/**
 * Timeline: 夢テキスト→SceneMood→WorldStyle→シーン列を決定する。
 * カメラ種別・Effects・Motion種別・Subtitle文言・SEの割り当てもここで確定する
 * （実体は services/scene/sceneSplitter.ts。DirectorEngineが唯一の呼び出し元）。
 */
export function planTimeline(input: SplitScenesInput): SplitScenesResult {
  return splitDreamIntoScenes(input);
}

/** そのフレームのCamera→Lighting→Effects→Motionを決定する */
export function planFrame(
  scene: DreamScene,
  progress: number,
  width: number,
  height: number,
): DirectorCue {
  const emotion = deriveEmotionProfile(scene.mood);
  const world = getWorldConfig(scene.styleId);

  const baseCamera = computeCameraTransform(scene.cameraMotion, progress, width, height);
  const cameraTransform = scaleTransformIntensity(baseCamera, emotion.cameraIntensity);
  const backgroundCameraTransform = scaleForParallaxBackground(cameraTransform);

  const lighting = {
    brightness: clamp(-1, 1, emotion.lighting.brightness + world.baseLighting.brightness),
    warmth: clamp(-1, 1, emotion.lighting.warmth + world.baseLighting.warmth),
  };

  const colorGrading = {
    saturation: Math.max(0, emotion.colorGrading.saturation * world.baseColorGrading.saturationMultiplier),
    tint: emotion.colorGrading.tint,
    tintStrength: emotion.colorGrading.tintStrength,
    worldTint: world.baseColorGrading.tint,
    worldTintStrength: Math.max(0, world.baseColorGrading.tintStrengthBias),
  };

  return {
    cameraTransform,
    backgroundCameraTransform,
    lighting,
    colorGrading,
    effectIntensity: emotion.effectIntensity,
    motionFor: (character) => computeMotionOffset(character.motion, progress),
  };
}

/**
 * Audio: スタイルのBGMプロファイルとTimelineが決めたSEから音声トラックを作る。
 * AudioProviderへの唯一の呼び出し元。
 */
export function planAudio(
  styleId: StyleId,
  soundEffects: AudioAsset[],
  totalSeconds: number,
): AudioTrackHandle | null {
  const world = getWorldConfig(styleId);
  return providers.audio.createTrack(world.audio, soundEffects, totalSeconds);
}

/** Canvasへ実際にカメラ変換を適用する（描画の機械的な適用のみで、演出判断は含まない） */
export { applyCameraTransform };

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
