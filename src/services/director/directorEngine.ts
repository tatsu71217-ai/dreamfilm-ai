/**
 * DirectorEngine: DreamFilm AI全体の演出責任者。
 *
 * 【設計方針】
 * StoryEngine・NarrativePlanner・NarrativeValidator・WorldEngine・EmotionEngine・
 * MotionLibrary・CameraEngine・AudioProvider・EffectProvider・sceneSplitter へは、
 * **DirectorEngineだけ**が命令を送る。RenderPipeline配下の各Provider/後処理ステージ
 * （Background/Character/Effect/Lighting/ColorGrading）は、DirectorEngineが決定した
 * 結果（DirectorCue）を読むだけで、他Engineを直接importしない。
 * これにより「各Engine同士が直接依存しない」構成にしている。
 *
 * 【演出より先に「何が起きるか」を決める】
 * カメラ・エフェクト・音は、スタイルの都合ではなく StoryEngine が抽出した
 * 出来事の種類・変化の強さ・遷移理由に従う。そのため planTimeline() は
 * 物語（Story → Narrative → 検査）を先に確定させ、そのあとで描画用の素材へ変換する。
 *
 *  - `planTimeline()`: 動画生成の開始時に1回だけ実行する。
 *    夢テキスト→StoryEngine→NarrativePlanner→NarrativeValidator→sceneSplitter の順に
 *    シーン列を決定する（Camera種別・Effects強度・Motion種別・Subtitle文言・SEの割り当てを含む）。
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
import { buildScenesFromGraph } from "@/services/scene/sceneSplitter";
import { planNarrative } from "@/services/story/narrativePlanner";
import { validateNarrative, type NarrativeIssue } from "@/services/story/narrativeValidator";
import { analyzeDreamStory } from "@/services/story/storyEngine";
import { getWorldConfig } from "@/services/world/worldEngine";
import type { AudioAsset, CharacterAsset } from "@/types/asset";
import type { Mood } from "@/types/dream";
import type { DreamScene, SubtitleTrack } from "@/types/scene";
import type { DreamStory } from "@/types/story";
import type { StyleId } from "@/types/style";
import { getStylePreset } from "@/types/style";
import type { VideoDurationSeconds } from "@/types/videoProject";

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

export interface PlanTimelineInput {
  /** 夢の本文 */
  body: string;
  /** 夢のタイトル。本文が極端に短い場合の補完に使う */
  title: string;
  mood: Mood;
  styleId: StyleId;
  durationSeconds: VideoDurationSeconds;
}

export interface PlanTimelineResult {
  scenes: DreamScene[];
  subtitleTrack: SubtitleTrack;
  soundEffects: AudioAsset[];
  /** 元になった物語の解析結果 */
  story: DreamStory;
  /** NarrativeValidatorが検出した問題（自動修復済みのものを含む） */
  narrativeIssues: NarrativeIssue[];
}

/**
 * Timeline: 夢テキストからシーン列を決定する。
 *
 * 「何が起きるか」を先に確定させ、そのあとで「どう見せるか」を決める:
 *   1. StoryEngine        … 出来事・登場要素・因果関係・感情変化を抽出する
 *   2. NarrativePlanner   … 起承転結として並べ、尺に応じてシーン数を調整する
 *   3. NarrativeValidator … 夢の主要要素の欠落を検査し、必要なら再編成する
 *   4. sceneSplitter      … 確定した物語を描画用の素材へ変換する
 */
export function planTimeline(input: PlanTimelineInput): PlanTimelineResult {
  const style = getStylePreset(input.styleId);

  const story = analyzeDreamStory({
    body: input.body,
    title: input.title,
    mood: input.mood,
  });

  const plannedGraph = planNarrative({
    story,
    durationSeconds: input.durationSeconds,
    pacing: style.pacing,
  });

  const { graph, issues } = validateNarrative(plannedGraph, story);
  const built = buildScenesFromGraph(graph, style.id);

  return {
    scenes: built.scenes,
    subtitleTrack: built.subtitleTrack,
    soundEffects: built.soundEffects,
    story,
    narrativeIssues: issues,
  };
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
  // カメラの振れ幅は、そのシーンで「どれだけ大きな変化が起きたか」に従う
  // （0.7〜1.3倍。エフェクトの強度は素材側で既に物語に応じて調整済み）
  const storyIntensity = 0.7 + scene.story.changeIntensity * 0.6;
  const cameraTransform = scaleTransformIntensity(
    baseCamera,
    emotion.cameraIntensity * storyIntensity,
  );
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
