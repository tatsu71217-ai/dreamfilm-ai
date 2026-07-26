/**
 * 夢テキストを「レンダリング可能なシーン列」へ分解するエンジン（指示書 方針A）。
 *
 * 動画生成AIを使わないため、ここでの分割は言語モデルではなく
 * 文分割＋語彙マッチによるヒューリスティックで行う。
 * services/ai/mockHeuristics.ts と同じ考え方だが、あちらが「創作テキストを作る」ためのものなのに対し、
 * こちらは「画面に何を描くかを決める」ためのものである点が異なる。
 */

import { providers } from "@/services/providers/registry";
import { splitSentences } from "@/services/ai/mockHeuristics";
import type {
  AudioAsset,
  BackgroundAsset,
  BackgroundVariant,
  CharacterAsset,
  CharacterVariant,
} from "@/types/asset";
import type { Mood } from "@/types/dream";
import type {
  CameraMotion,
  DreamScene,
  SceneMood,
  SubtitleCue,
  SubtitleTrack,
  TransitionKind,
} from "@/types/scene";
import { getStylePreset, type StyleId, type StylePreset } from "@/types/style";
import {
  SCENE_COUNT_RANGE,
  type VideoDurationSeconds,
} from "@/types/videoProject";
import { parseHexColor, type RgbColor } from "@/utils/color";
import { generateId } from "@/utils/id";
import { distributeEvenly } from "@/utils/math";

/** 1シーンの最短・最長（指示書「1シーン 2〜6秒程度」） */
const MIN_SCENE_SECONDS = 2;
const MAX_SCENE_SECONDS = 6;

/** 字幕は読み切れる長さに切り詰める */
const SUBTITLE_MAX_LENGTH = 34;

/**
 * 背景を決めるための語彙。先に一致したものが優先される。
 * 具体的な語（教室・廊下）を、抽象的な語（学校）より先に置いている。
 */
const BACKGROUND_KEYWORDS: ReadonlyArray<{
  variant: BackgroundVariant;
  words: string[];
}> = [
  { variant: "corridor", words: ["廊下", "通路"] },
  { variant: "stairs", words: ["階段", "段"] },
  { variant: "school", words: ["学校", "教室", "校舎", "図書館"] },
  { variant: "sea", words: ["海", "波", "浜", "砂浜", "水面"] },
  { variant: "forest", words: ["森", "林", "木々", "山", "公園"] },
  { variant: "city", words: ["街", "町", "駅", "ビル", "道", "橋", "会社", "店"] },
  { variant: "room", words: ["部屋", "家", "室内", "ベッド", "病院"] },
  { variant: "night-sky", words: ["夜", "星", "月", "暗闇", "闇"] },
  { variant: "sky", words: ["空", "雲", "飛", "青空", "屋上"] },
  { variant: "field", words: ["草原", "花", "野原", "庭", "丘"] },
];

/** キャラクターを決めるための語彙 */
const CHARACTER_KEYWORDS: ReadonlyArray<{
  variant: CharacterVariant;
  words: string[];
}> = [
  { variant: "crowd", words: ["人々", "大勢", "群衆", "みんな", "同僚"] },
  { variant: "creature", words: ["怪物", "獣", "生き物", "影", "何か"] },
  {
    variant: "figure",
    words: ["友人", "友達", "家族", "先生", "母", "父", "子供", "先輩", "後輩"],
  },
  { variant: "silhouette", words: ["誰か", "知らない人", "人影", "立って"] },
];

/** 夢の気分 → シーンの情感 */
const MOOD_TO_SCENE_MOOD: Record<Mood, SceneMood> = {
  happy: "joyful",
  neutral: "calm",
  mysterious: "mysterious",
  scary: "tense",
  sad: "sad",
};

/** 文中の語からシーン単位で情感を上書きする（夢は途中で雰囲気が変わるため） */
const SCENE_MOOD_KEYWORDS: ReadonlyArray<{ mood: SceneMood; words: string[] }> = [
  { mood: "tense", words: ["怖", "追われ", "逃げ", "叫", "悲鳴", "焦"] },
  { mood: "sad", words: ["悲し", "泣", "涙", "寂し", "別れ"] },
  { mood: "joyful", words: ["嬉し", "笑", "楽し", "幸せ"] },
  { mood: "uplifting", words: ["飛", "光", "自由", "駆け", "昇"] },
  { mood: "mysterious", words: ["不思議", "突然", "急に", "見知らぬ", "消え"] },
];

/** 情感ごとの色調補正。スタイルの配色を壊さない範囲で明度・彩度を寄せる */
const MOOD_TINT: Record<SceneMood, { lighten: number; accentMix: number }> = {
  calm: { lighten: 0, accentMix: 0.1 },
  joyful: { lighten: 0.12, accentMix: 0.25 },
  mysterious: { lighten: -0.06, accentMix: 0.3 },
  tense: { lighten: -0.18, accentMix: 0.35 },
  sad: { lighten: -0.1, accentMix: 0.15 },
  uplifting: { lighten: 0.15, accentMix: 0.3 },
};

export interface SplitScenesInput {
  /** 夢の本文 */
  body: string;
  /** 夢のタイトル。本文が極端に短い場合の補完に使う */
  title: string;
  mood: Mood;
  styleId: StyleId;
  durationSeconds: VideoDurationSeconds;
}

export interface SplitScenesResult {
  scenes: DreamScene[];
  subtitleTrack: SubtitleTrack;
  soundEffects: AudioAsset[];
}

/**
 * 夢テキストをシーン列へ分解する。
 *
 * 分解の流れ:
 *  1. 本文を文単位に分割する
 *  2. 動画尺とスタイルのpacingからシーン数を決める（尺ごとの範囲は SCENE_COUNT_RANGE）
 *  3. 各シーンへ秒数を配分する（合計が必ず尺と一致し、各シーンは2〜6秒に収まる）
 *  4. 文ごとに背景・キャラ・情感を語彙マッチで決定し、スタイルの演出を割り当てる
 */
export function splitDreamIntoScenes(input: SplitScenesInput): SplitScenesResult {
  const style = getStylePreset(input.styleId);
  const sentences = collectSentences(input.body, input.title);
  const sceneCount = decideSceneCount(sentences.length, input.durationSeconds, style);
  const durations = distributeSceneSeconds(input.durationSeconds, sceneCount);

  const baseMood = MOOD_TO_SCENE_MOOD[input.mood] ?? "calm";
  const scenes: DreamScene[] = [];
  const cues: SubtitleCue[] = [];
  const soundEffects: AudioAsset[] = [];

  let cursor = 0;
  for (let index = 0; index < sceneCount; index += 1) {
    const sourceText = sentences[index % sentences.length];
    const seconds = durations[index];
    const startTime = cursor;
    const endTime = cursor + seconds;
    cursor = endTime;

    const sceneMood = detectSceneMood(sourceText, baseMood);
    const subtitle = buildSubtitleCue(sourceText, startTime, endTime);

    scenes.push({
      sceneId: generateId(),
      styleId: style.id,
      index,
      startTime,
      endTime,
      background: buildBackground(sourceText, style, sceneMood),
      characters: buildCharacters(sourceText, style, sceneMood),
      effects: providers.asset.buildEffectAssets(style.id, sceneMood),
      cameraMotion: pickCameraMotion(style, sceneMood, index),
      // 先頭シーンは必ずフェードイン。以降はスタイルの傾向から選ぶ
      transitionIn: index === 0 ? "fade" : pickTransition(style, index),
      subtitle,
      mood: sceneMood,
      sourceText,
    });

    if (subtitle) {
      cues.push(subtitle);
    }
    // シーン切り替えのタイミングでSEを鳴らす（先頭シーンは無音で始める）
    if (index > 0) {
      soundEffects.push(providers.asset.pickSceneSoundEffect(style.id, sceneMood, index, startTime));
    }
  }

  return { scenes, subtitleTrack: { cues }, soundEffects };
}

/**
 * 本文を文へ分割する。空だったり極端に短い場合でも、
 * 必ず1つ以上の文が返るようにフォールバックする。
 */
function collectSentences(body: string, title: string): string[] {
  const sentences = splitSentences(body).filter((s) => s.length > 0);
  if (sentences.length > 0) {
    return sentences;
  }
  const fallbackTitle = title.trim();
  return fallbackTitle.length > 0 ? [fallbackTitle] : ["夢の情景が広がる"];
}

/**
 * シーン数を決める。
 * 尺ごとの範囲内で、文の数とスタイルのpacing（速いカットほど多いシーン）から選ぶ。
 */
function decideSceneCount(
  sentenceCount: number,
  duration: VideoDurationSeconds,
  style: StylePreset,
): number {
  const { min, max } = SCENE_COUNT_RANGE[duration];

  // pacingの傾向で範囲内の狙い目を決める
  const preferred = style.pacing === "fast" ? max : style.pacing === "slow" ? min : Math.round((min + max) / 2);

  // 文が少ないときは無理に増やさない（同じ文の使い回しを減らす）
  const bounded = Math.min(preferred, Math.max(min, sentenceCount));
  return Math.min(max, Math.max(min, bounded));
}

/**
 * 尺をシーンへ配分する。
 * 合計が必ず `totalSeconds` と一致し、かつ各シーンが MIN〜MAX に収まることを保証する。
 */
export function distributeSceneSeconds(
  totalSeconds: number,
  sceneCount: number,
): number[] {
  // 端数は前方のシーンへ1秒ずつ配る（後半が間延びしないように）
  const seconds = distributeEvenly(totalSeconds, sceneCount);
  return clampSecondsPreservingTotal(seconds, totalSeconds);
}

/**
 * 各シーンを MIN〜MAX 秒へ収めつつ、合計を維持する。
 * 上限超過分を、余裕のあるシーンへ移すことで辻褄を合わせる。
 */
function clampSecondsPreservingTotal(seconds: number[], totalSeconds: number): number[] {
  const result = [...seconds];

  // 上限を超えている分を回収する
  let surplus = 0;
  for (let i = 0; i < result.length; i += 1) {
    if (result[i] > MAX_SCENE_SECONDS) {
      surplus += result[i] - MAX_SCENE_SECONDS;
      result[i] = MAX_SCENE_SECONDS;
    }
  }

  // 下限を割っている分を補填する（不足はこの後の再分配で相殺する）
  let deficit = 0;
  for (let i = 0; i < result.length; i += 1) {
    if (result[i] < MIN_SCENE_SECONDS) {
      deficit += MIN_SCENE_SECONDS - result[i];
      result[i] = MIN_SCENE_SECONDS;
    }
  }

  // 余剰を、まだ上限に達していないシーンへ配る
  let toDistribute = surplus - deficit;
  while (toDistribute > 0) {
    const target = result.findIndex((value) => value < MAX_SCENE_SECONDS);
    if (target === -1) break;
    result[target] += 1;
    toDistribute -= 1;
  }
  // 逆に足りない場合は、下限に余裕のあるシーンから削る
  while (toDistribute < 0) {
    const target = result.findIndex((value) => value > MIN_SCENE_SECONDS);
    if (target === -1) break;
    result[target] -= 1;
    toDistribute += 1;
  }

  // 丸め誤差の最終調整（合計を必ず一致させる）
  const diff = totalSeconds - result.reduce((sum, value) => sum + value, 0);
  if (diff !== 0) {
    const target = result.findIndex((value) =>
      diff > 0 ? value < MAX_SCENE_SECONDS : value > MIN_SCENE_SECONDS,
    );
    if (target !== -1) {
      result[target] += diff;
    }
  }

  return result;
}

function detectSceneMood(sentence: string, fallback: SceneMood): SceneMood {
  const matched = SCENE_MOOD_KEYWORDS.find((rule) =>
    rule.words.some((word) => sentence.includes(word)),
  );
  return matched?.mood ?? fallback;
}

function buildBackground(
  sentence: string,
  style: StylePreset,
  mood: SceneMood,
): BackgroundAsset {
  const matched = BACKGROUND_KEYWORDS.find((rule) =>
    rule.words.some((word) => sentence.includes(word)),
  );
  const variant: BackgroundVariant = matched?.variant ?? providers.asset.getBackgroundFallback(style.id);
  const tint = MOOD_TINT[mood];

  return {
    id: generateId(),
    kind: "background",
    label: variant,
    variant,
    colorFrom: adjustColor(style.palette.backgroundFrom, tint.lighten),
    colorTo: mixColors(
      adjustColor(style.palette.backgroundTo, tint.lighten),
      style.palette.accent,
      tint.accentMix,
    ),
    horizonRatio: horizonRatioFor(variant),
  };
}

function horizonRatioFor(variant: BackgroundVariant): number {
  switch (variant) {
    case "sky":
    case "night-sky":
      return 0.82;
    case "sea":
      return 0.62;
    case "field":
      return 0.7;
    case "city":
    case "forest":
      return 0.68;
    case "corridor":
    case "school":
    case "room":
    case "stairs":
      return 0.75;
    default:
      return 0.72;
  }
}

function buildCharacters(
  sentence: string,
  style: StylePreset,
  mood: SceneMood,
): CharacterAsset[] {
  const matched = CHARACTER_KEYWORDS.find((rule) =>
    rule.words.some((word) => sentence.includes(word)),
  );

  const variant: CharacterVariant = matched?.variant ?? providers.asset.getCharacterDefault(style.id);

  if (variant === "none") {
    return [];
  }

  const color = mood === "tense" ? "#000000" : style.palette.foreground;
  const motion = providers.asset.pickCharacterMotion(variant, mood);

  if (variant === "crowd") {
    // 群衆は複数体を散らして配置する
    return [0.25, 0.5, 0.75].map((xRatio, i) => ({
      id: generateId(),
      kind: "character" as const,
      label: "crowd",
      variant: "silhouette" as const,
      xRatio,
      scale: 0.22 - i * 0.02,
      color,
      flipped: i % 2 === 1,
      motion,
    }));
  }

  return [
    {
      id: generateId(),
      kind: "character",
      label: variant,
      variant,
      xRatio: 0.5,
      scale: variant === "creature" ? 0.34 : 0.28,
      color,
      flipped: false,
      motion,
    },
  ];
}

/** スタイルの候補から、シーンごとに変化をつけて選ぶ */
function pickCameraMotion(
  style: StylePreset,
  mood: SceneMood,
  index: number,
): CameraMotion {
  // 緊張感のあるシーンでは、スタイルが揺れを持っていれば優先する
  if (mood === "tense" && style.cameraMotions.includes("shake")) {
    return "shake";
  }
  return style.cameraMotions[index % style.cameraMotions.length];
}

function pickTransition(style: StylePreset, index: number): TransitionKind {
  return style.transitions[index % style.transitions.length];
}

function buildSubtitleCue(
  sentence: string,
  startTime: number,
  endTime: number,
): SubtitleCue | null {
  const text = sentence.trim();
  if (text.length === 0) {
    return null;
  }

  return {
    text:
      text.length > SUBTITLE_MAX_LENGTH
        ? `${text.slice(0, SUBTITLE_MAX_LENGTH)}…`
        : text,
    startTime,
    endTime,
  };
}

/* ------------------------------------------------------------------ */
/* 色ユーティリティ                                                      */
/* CSSに頼らずCanvasへ直接描くため、色の調整も自前で行う                    */
/* ------------------------------------------------------------------ */

function toHex({ r, g, b }: RgbColor): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** amount > 0 で明るく、< 0 で暗くする */
export function adjustColor(hex: string, amount: number): string {
  const { r, g, b } = parseHexColor(hex);
  const shift = 255 * amount;
  return toHex({ r: r + shift, g: g + shift, b: b + shift });
}

/** 2色を ratio(0〜1) で混ぜる */
export function mixColors(hexA: string, hexB: string, ratio: number): string {
  const a = parseHexColor(hexA);
  const b = parseHexColor(hexB);
  const t = Math.max(0, Math.min(1, ratio));
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}
