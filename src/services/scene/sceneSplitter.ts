/**
 * SceneGraph（物語）をレンダリング可能なシーン列（DreamScene）へ変換する。
 *
 * 【責務の境界】
 * 「何が起きるか」は既に StoryEngine → NarrativePlanner → NarrativeValidator が
 * 決めている。このファイルは決定済みの物語を受け取り、**それを描くための素材**
 * （背景・キャラクター・エフェクト・カメラ・字幕・SE）へ落とし込むだけに徹する。
 *
 * カメラ・エフェクト強度・SEは、スタイルの都合ではなく
 * SceneNodeが持つ出来事の種類・変化の強さ・遷移理由から決まる。
 */

import { providers } from "@/services/providers/registry";
import type {
  AudioAsset,
  BackgroundAsset,
  BackgroundVariant,
  CharacterAsset,
  CharacterVariant,
  SoundEffectVariant,
} from "@/types/asset";
import type { SceneGraph, SceneNode } from "@/types/sceneGraph";
import type {
  CameraMotion,
  DreamScene,
  SceneMood,
  SubtitleCue,
  SubtitleTrack,
  TransitionKind,
} from "@/types/scene";
import type { CausalRelation, EntityRole, EventKind } from "@/types/story";
import { getStylePreset, type StyleId, type StylePreset } from "@/types/style";
import { parseHexColor, type RgbColor } from "@/utils/color";
import { generateId } from "@/utils/id";

/** 字幕は読み切れる長さに切り詰める */
const SUBTITLE_MAX_LENGTH = 34;

/**
 * 場所を表す語 → 背景の種類。
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

/** 登場要素の役割 → キャラクターの描き分け */
const ROLE_TO_CHARACTER: Partial<Record<EntityRole, CharacterVariant>> = {
  crowd: "crowd",
  creature: "creature",
  person: "figure",
};

/**
 * 出来事の種類 → 望ましいカメラワーク（優先順）。
 * スタイルが対応していればそれを使い、対応が無くても先頭の候補を採る
 * （＝演出の都合より「何が起きたか」を優先する）。
 * observe は手がかりが弱いため、スタイル側の傾向に任せる。
 */
const EVENT_CAMERA_PREFERENCE: Record<EventKind, CameraMotion[]> = {
  appear: ["zoom-in", "still"],
  move: ["parallax", "pan-right"],
  transform: ["rotate", "zoom-in"],
  pursue: ["shake", "zoom-in"],
  escape: ["shake", "pan-left"],
  fall: ["pan-down", "zoom-in"],
  rise: ["pan-up", "zoom-out"],
  search: ["pan-left", "drift"],
  talk: ["zoom-in", "still"],
  arrive: ["zoom-out", "drift"],
  vanish: ["zoom-out", "drift"],
  observe: [],
};

/**
 * 遷移理由 → シーンの入りのトランジション。
 * 「突然」なら断ち切るように、「しかし」なら切り替わりを見せる。
 */
const REASON_TRANSITION: Partial<Record<CausalRelation, TransitionKind>> = {
  suddenly: "flash",
  but: "slide",
  because: "crossfade",
};

/** 遷移理由 → 鳴らすSE。理由が弱いものはスタイルの音に任せる */
const REASON_SOUND: Partial<Record<CausalRelation, SoundEffectVariant>> = {
  suddenly: "impact",
  but: "whoosh",
};

/** 情感ごとの色調補正。スタイルの配色を壊さない範囲で明度・彩度を寄せる */
const MOOD_TINT: Record<SceneMood, { lighten: number; accentMix: number }> = {
  calm: { lighten: 0, accentMix: 0.1 },
  joyful: { lighten: 0.12, accentMix: 0.25 },
  mysterious: { lighten: -0.06, accentMix: 0.3 },
  tense: { lighten: -0.18, accentMix: 0.35 },
  sad: { lighten: -0.1, accentMix: 0.15 },
  uplifting: { lighten: 0.15, accentMix: 0.3 },
};

export interface BuildScenesResult {
  scenes: DreamScene[];
  subtitleTrack: SubtitleTrack;
  soundEffects: AudioAsset[];
}

/**
 * SceneGraphを描画用のシーン列へ変換する。
 * 各シーンの尺・並び順は SceneGraph が既に確定させているため、ここでは変更しない。
 */
export function buildScenesFromGraph(graph: SceneGraph, styleId: StyleId): BuildScenesResult {
  const style = getStylePreset(styleId);
  const scenes: DreamScene[] = [];
  const cues: SubtitleCue[] = [];
  const soundEffects: AudioAsset[] = [];

  graph.nodes.forEach((node) => {
    const mood = node.change.moodTo;
    const subtitle = buildSubtitleCue(node);

    scenes.push({
      sceneId: node.id,
      styleId: style.id,
      index: node.index,
      startTime: node.startTime,
      endTime: node.endTime,
      background: buildBackground(node, style, mood),
      characters: buildCharacters(node, style, mood),
      effects: buildEffects(node, style.id, mood),
      cameraMotion: pickCameraMotion(node, style),
      // 先頭シーンは必ずフェードイン。以降は遷移理由から選ぶ
      transitionIn: node.index === 0 ? "fade" : pickTransition(node, style),
      subtitle,
      mood,
      sourceText: node.event.sourceText,
      story: {
        beat: node.beat,
        eventKind: node.what,
        who: node.who?.label ?? null,
        where: node.where?.label ?? null,
        changeIntensity: node.change.intensity,
        transitionReason: node.event.relationFromPrev,
      },
    });

    if (subtitle) {
      cues.push(subtitle);
    }
    // シーン切り替えのタイミングでSEを鳴らす（先頭シーンは無音で始める）
    if (node.index > 0) {
      soundEffects.push(pickSoundEffect(node, style.id, mood));
    }
  });

  return { scenes, subtitleTrack: { cues }, soundEffects };
}

/**
 * カメラワークを決める。
 *
 * 出来事の種類が分かっている場合は、スタイルが同じ動きを持つかに関わらず
 * その出来事に最も合う動きを採る（落下なら下へパン、飛翔なら上へパン）。
 * スタイルの好みでこれを上書きすると「何が起きたか」が伝わらなくなるため。
 * 手がかりが無い observe のときだけ、スタイルの傾向に従う。
 */
function pickCameraMotion(node: SceneNode, style: StylePreset): CameraMotion {
  const preferences = EVENT_CAMERA_PREFERENCE[node.what];

  if (preferences.length > 0) {
    return preferences[0];
  }

  return style.cameraMotions[node.index % style.cameraMotions.length];
}

function pickTransition(node: SceneNode, style: StylePreset): TransitionKind {
  const byReason = REASON_TRANSITION[node.event.relationFromPrev];
  if (byReason && style.transitions.includes(byReason)) {
    return byReason;
  }
  return byReason ?? style.transitions[node.index % style.transitions.length];
}

/** 遷移理由に対応するSEがあればそれを、なければスタイルの音を鳴らす */
function pickSoundEffect(node: SceneNode, styleId: StyleId, mood: SceneMood): AudioAsset {
  return providers.asset.pickSceneSoundEffect(
    styleId,
    mood,
    node.index,
    node.startTime,
    REASON_SOUND[node.event.relationFromPrev],
  );
}

/**
 * エフェクトを組み立てる。
 * スタイルが持つ効果の強度を、そのシーンの変化の大きさで増減させる。
 */
function buildEffects(node: SceneNode, styleId: StyleId, mood: SceneMood) {
  const assets = providers.asset.buildEffectAssets(styleId, mood);
  // 変化が小さい場面では控えめに、大きい場面では強く出す
  const scale = 0.6 + node.change.intensity * 0.8;

  return assets.map((asset) => ({
    ...asset,
    intensity: Math.max(0, Math.min(1, asset.intensity * scale)),
  }));
}

function buildBackground(
  node: SceneNode,
  style: StylePreset,
  mood: SceneMood,
): BackgroundAsset {
  // 物語が場所を特定できていればそれを使い、できていなければ本文から拾う
  const searchText = node.where?.label ?? node.event.sourceText;
  const matched = BACKGROUND_KEYWORDS.find((rule) =>
    rule.words.some((word) => searchText.includes(word)),
  );
  const variant: BackgroundVariant =
    matched?.variant ?? providers.asset.getBackgroundFallback(style.id);
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

/**
 * 登場人物を組み立てる。
 * 物語が「誰が」を特定していればその役割で描き分け、
 * 特定できていない場合のみスタイルの既定に従う。
 */
function buildCharacters(
  node: SceneNode,
  style: StylePreset,
  mood: SceneMood,
): CharacterAsset[] {
  const role = node.who?.role;
  const variant: CharacterVariant =
    (role ? ROLE_TO_CHARACTER[role] : undefined) ?? providers.asset.getCharacterDefault(style.id);

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
      label: node.who?.label ?? variant,
      variant,
      xRatio: 0.5,
      scale: variant === "creature" ? 0.34 : 0.28,
      color,
      flipped: false,
      motion,
    },
  ];
}

/**
 * 字幕を作る。
 * 継続ショット（同じ出来事の引き延ばし）では、同じ文を二重に出さない。
 */
function buildSubtitleCue(node: SceneNode): SubtitleCue | null {
  if (node.isContinuation) {
    return null;
  }

  const text = node.event.sourceText.trim();
  if (text.length === 0) {
    return null;
  }

  return {
    text: text.length > SUBTITLE_MAX_LENGTH ? `${text.slice(0, SUBTITLE_MAX_LENGTH)}…` : text,
    startTime: node.startTime,
    endTime: node.endTime,
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
