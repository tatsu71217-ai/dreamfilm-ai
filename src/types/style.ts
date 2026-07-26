/**
 * 映像スタイルのプリセット定義。
 *
 * 動画生成APIを使わず、ブラウザ内で「素材合成＋演出」によって映像を作るため、
 * スタイルは画像アセットではなく **手続き的に描画するためのパラメータ集合** として定義する。
 * これにより、アセットを一切配布せずに7スタイル分の差別化ができ、オフラインでも動作する。
 */

import type {
  CameraMotion,
  EffectKind,
  ScenePacing,
  TransitionKind,
} from "@/types/scene";

export type StyleId =
  | "anime"
  | "real"
  | "horror"
  | "cute"
  | "beautiful"
  | "manga"
  | "mascot"
  | "fantasy";

/** 手続き描画に使う配色 */
export interface StylePalette {
  /** 背景グラデーションの開始色・終了色 */
  backgroundFrom: string;
  backgroundTo: string;
  /** キャラクター・図形の主色 */
  foreground: string;
  /** 強調色（光・エフェクト等） */
  accent: string;
}

/** 字幕の見た目 */
export interface SubtitleStyle {
  color: string;
  /** 縁取りの色。可読性確保のため背景が明るくても暗くても読めるようにする */
  strokeColor: string;
  strokeWidth: number;
  fontWeight: number;
  /** フォントサイズ（動画高さに対する比率） */
  fontSizeRatio: number;
  fontFamily: string;
  /** 字幕背景の帯の不透明度（0で帯なし） */
  backdropOpacity: number;
  uppercase: boolean;
}

/**
 * 手続き生成BGMのパラメータ。
 * 音源ファイルを持たず WebAudio のオシレーター＋ノイズで生成するため、
 * 「どんな響きにするか」をここで表現する。
 */
export interface AudioProfile {
  /** 基音の周波数(Hz) */
  rootFrequency: number;
  /** 使用する音階（基音からの半音オフセット） */
  scaleSemitones: number[];
  waveform: OscillatorType;
  /** 1分あたりの音符数。体感テンポ */
  tempoBpm: number;
  /** 低音のドローンを重ねるか（ホラー・美しい風で使用） */
  drone: boolean;
  /** ホワイトノイズの混入量 0〜1 */
  noiseLevel: number;
  /** 残響の強さ 0〜1 */
  reverb: number;
  /** 全体音量 0〜1 */
  gain: number;
}

export interface StylePreset {
  id: StyleId;
  label: string;
  description: string;
  palette: StylePalette;
  /** カットの速さの傾向。シーンの尺配分に影響する */
  pacing: ScenePacing;
  /** このスタイルで優先的に使うカメラワーク */
  cameraMotions: CameraMotion[];
  /** このスタイルで優先的に使うトランジション */
  transitions: TransitionKind[];
  /** このスタイルで常時かけるエフェクト */
  effects: EffectKind[];
  subtitle: SubtitleStyle;
  audio: AudioProfile;
}

const SANS_FONT = '"Noto Sans JP", system-ui, sans-serif';
const SERIF_FONT = '"Noto Serif JP", serif';

/**
 * 7スタイルのプリセット。
 * 指示書の「スタイル別の優先演出」に対応する。
 */
export const STYLE_PRESETS: Record<StyleId, StylePreset> = {
  anime: {
    id: "anime",
    label: "アニメ風",
    description: "明瞭な線と明るい色。速めのカット。",
    palette: {
      backgroundFrom: "#4FA8E8",
      backgroundTo: "#FFD98A",
      foreground: "#1B2B44",
      accent: "#FF6B8A",
    },
    pacing: "fast",
    cameraMotions: ["zoom-in", "pan-left", "pan-right", "still"],
    transitions: ["cut", "fade", "flash"],
    effects: ["speed-lines", "sparkle"],
    subtitle: {
      color: "#FFFFFF",
      strokeColor: "#1B2B44",
      strokeWidth: 6,
      fontWeight: 700,
      fontSizeRatio: 0.045,
      fontFamily: SANS_FONT,
      backdropOpacity: 0,
      uppercase: false,
    },
    audio: {
      rootFrequency: 440,
      scaleSemitones: [0, 2, 4, 7, 9],
      waveform: "triangle",
      tempoBpm: 120,
      drone: false,
      noiseLevel: 0.02,
      reverb: 0.25,
      gain: 0.5,
    },
  },

  real: {
    id: "real",
    label: "リアル風",
    description: "写真調。ゆっくりしたカメラと空気感。",
    palette: {
      backgroundFrom: "#2E3A44",
      backgroundTo: "#8C9AA5",
      foreground: "#12181D",
      accent: "#D8C9A8",
    },
    pacing: "slow",
    cameraMotions: ["drift", "zoom-in", "still"],
    transitions: ["crossfade", "fade"],
    effects: ["bokeh", "vignette"],
    subtitle: {
      color: "#F2F2F2",
      strokeColor: "#000000",
      strokeWidth: 3,
      fontWeight: 500,
      fontSizeRatio: 0.038,
      fontFamily: SANS_FONT,
      backdropOpacity: 0.35,
      uppercase: false,
    },
    audio: {
      rootFrequency: 220,
      scaleSemitones: [0, 3, 5, 7, 10],
      waveform: "sine",
      tempoBpm: 60,
      drone: true,
      noiseLevel: 0.08,
      reverb: 0.5,
      gain: 0.38,
    },
  },

  horror: {
    id: "horror",
    label: "ホラー風",
    description: "暗い色、霧、揺れ、ノイズ、低音。",
    palette: {
      backgroundFrom: "#07090C",
      backgroundTo: "#2A1B22",
      foreground: "#05070A",
      accent: "#A23E38",
    },
    pacing: "slow",
    cameraMotions: ["shake", "zoom-in", "still"],
    transitions: ["cut", "flash", "fade"],
    effects: ["fog", "noise", "vignette"],
    subtitle: {
      color: "#E8DCDC",
      strokeColor: "#000000",
      strokeWidth: 5,
      fontWeight: 600,
      fontSizeRatio: 0.04,
      fontFamily: SERIF_FONT,
      backdropOpacity: 0.45,
      uppercase: false,
    },
    audio: {
      rootFrequency: 55,
      scaleSemitones: [0, 1, 6, 8],
      waveform: "sawtooth",
      tempoBpm: 40,
      drone: true,
      noiseLevel: 0.3,
      reverb: 0.7,
      gain: 0.42,
    },
  },

  cute: {
    id: "cute",
    label: "カワイイ風",
    description: "丸み・パステル・ゆるい動き。",
    palette: {
      backgroundFrom: "#FFD9EC",
      backgroundTo: "#CDE8FF",
      foreground: "#7A5A76",
      accent: "#FF8FC5",
    },
    pacing: "normal",
    cameraMotions: ["drift", "zoom-out", "still", "rotate"],
    transitions: ["fade", "crossfade", "slide"],
    effects: ["sparkle", "bokeh"],
    subtitle: {
      color: "#6B4A66",
      strokeColor: "#FFFFFF",
      strokeWidth: 6,
      fontWeight: 700,
      fontSizeRatio: 0.044,
      fontFamily: SANS_FONT,
      backdropOpacity: 0,
      uppercase: false,
    },
    audio: {
      rootFrequency: 523,
      scaleSemitones: [0, 2, 4, 7, 9],
      waveform: "sine",
      tempoBpm: 104,
      drone: false,
      noiseLevel: 0.01,
      reverb: 0.3,
      gain: 0.45,
    },
  },

  beautiful: {
    id: "beautiful",
    label: "美しい風",
    description: "光とグラデーション。ゆっくりズーム、静かなBGM。",
    palette: {
      backgroundFrom: "#1B2A6B",
      backgroundTo: "#E8A87C",
      foreground: "#101733",
      accent: "#FFE9B0",
    },
    pacing: "slow",
    cameraMotions: ["zoom-in", "drift", "pan-up", "parallax"],
    transitions: ["crossfade", "fade"],
    effects: ["light-rays", "bokeh", "sparkle"],
    subtitle: {
      color: "#FFF6E4",
      strokeColor: "#2A1F14",
      strokeWidth: 3,
      fontWeight: 500,
      fontSizeRatio: 0.04,
      fontFamily: SERIF_FONT,
      backdropOpacity: 0.2,
      uppercase: false,
    },
    audio: {
      rootFrequency: 330,
      scaleSemitones: [0, 4, 7, 11, 14],
      waveform: "sine",
      tempoBpm: 50,
      drone: true,
      noiseLevel: 0.03,
      reverb: 0.8,
      gain: 0.4,
    },
  },

  manga: {
    id: "manga",
    label: "漫画風",
    description: "コマ割り感、擬音、強いコントラスト。",
    palette: {
      backgroundFrom: "#FFFFFF",
      backgroundTo: "#C8C8C8",
      foreground: "#000000",
      accent: "#E02020",
    },
    pacing: "fast",
    cameraMotions: ["still", "zoom-in", "shake"],
    transitions: ["cut", "slide", "flash"],
    effects: ["halftone", "speed-lines"],
    subtitle: {
      color: "#000000",
      strokeColor: "#FFFFFF",
      strokeWidth: 7,
      fontWeight: 800,
      fontSizeRatio: 0.05,
      fontFamily: SANS_FONT,
      backdropOpacity: 0,
      uppercase: false,
    },
    audio: {
      rootFrequency: 196,
      scaleSemitones: [0, 3, 5, 7, 10],
      waveform: "square",
      tempoBpm: 132,
      drone: false,
      noiseLevel: 0.05,
      reverb: 0.15,
      gain: 0.4,
    },
  },

  mascot: {
    id: "mascot",
    label: "ゆるキャラ風",
    description: "単純な形、動き少なめ、コミカル。",
    palette: {
      backgroundFrom: "#FFF3C4",
      backgroundTo: "#B9E8B0",
      foreground: "#5C4A2E",
      accent: "#FF9B42",
    },
    pacing: "slow",
    cameraMotions: ["still", "drift"],
    transitions: ["cut", "fade"],
    effects: ["sparkle"],
    subtitle: {
      color: "#4A3A22",
      strokeColor: "#FFFFFF",
      strokeWidth: 6,
      fontWeight: 700,
      fontSizeRatio: 0.046,
      fontFamily: SANS_FONT,
      backdropOpacity: 0,
      uppercase: false,
    },
    audio: {
      rootFrequency: 262,
      scaleSemitones: [0, 2, 5, 7],
      waveform: "triangle",
      tempoBpm: 88,
      drone: false,
      noiseLevel: 0.01,
      reverb: 0.2,
      gain: 0.42,
    },
  },

  fantasy: {
    id: "fantasy",
    label: "ファンタジー風",
    description: "魔法的な光と紫がかった配色。神秘的な浮遊感。",
    palette: {
      backgroundFrom: "#2B1B4D",
      backgroundTo: "#8A5FD1",
      foreground: "#F0E6FF",
      accent: "#FFD36E",
    },
    pacing: "normal",
    cameraMotions: ["drift", "zoom-in", "parallax", "rotate"],
    transitions: ["crossfade", "fade", "zoom-blur"],
    effects: ["sparkle", "particles", "light-rays"],
    subtitle: {
      color: "#F0E6FF",
      strokeColor: "#2B1B4D",
      strokeWidth: 4,
      fontWeight: 600,
      fontSizeRatio: 0.042,
      fontFamily: SERIF_FONT,
      backdropOpacity: 0.15,
      uppercase: false,
    },
    audio: {
      rootFrequency: 392,
      scaleSemitones: [0, 3, 7, 10, 14],
      waveform: "triangle",
      tempoBpm: 72,
      drone: true,
      noiseLevel: 0.02,
      reverb: 0.6,
      gain: 0.45,
    },
  },
};

export const STYLE_IDS = Object.keys(STYLE_PRESETS) as StyleId[];

export const DEFAULT_STYLE_ID: StyleId = "beautiful";

export function getStylePreset(styleId: StyleId): StylePreset {
  return STYLE_PRESETS[styleId] ?? STYLE_PRESETS[DEFAULT_STYLE_ID];
}
