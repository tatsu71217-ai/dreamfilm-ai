/**
 * 映像素材（アセット）の型定義。
 *
 * 【設計方針】
 * 画像・動画・音声のバイナリは一切同梱せず、すべて **Canvas / WebAudio で手続き的に描画・合成する**。
 * そのため各Assetは「何を描くか」を表すパラメータの集合であり、ファイル参照を持たない。
 *
 * この方式を選んだ理由:
 *  - 外部APIも有料サービスも使わずに、7スタイル×複数種類の素材を用意できる
 *  - アプリのバンドルサイズが増えず、オフラインでも完全に動作する（PWA要件と相性が良い）
 *  - 素材の色・強度をスタイルやシーンの情感に応じて連続的に変えられる
 */

import type { EffectKind } from "@/types/scene";

export type AssetKind = "background" | "character" | "effect" | "audio";

interface AssetBase {
  id: string;
  kind: AssetKind;
  label: string;
}

/**
 * 背景の種類。夢文のキーワードから選ばれる。
 * それぞれ Canvas 上での描画手続きに対応する。
 */
export type BackgroundVariant =
  | "sky"
  | "night-sky"
  | "sea"
  | "forest"
  | "city"
  | "school"
  | "corridor"
  | "room"
  | "stairs"
  | "field"
  | "void";

export interface BackgroundAsset extends AssetBase {
  kind: "background";
  variant: BackgroundVariant;
  /** グラデーションの開始色・終了色。スタイルの配色を情感に応じて調整した結果 */
  colorFrom: string;
  colorTo: string;
  /** 地平線の高さ（0=上端, 1=下端）。variantごとの既定を情感で微調整する */
  horizonRatio: number;
}

/**
 * キャラクターの種類。
 * 人物の詳細な描き分けはせず、シルエットや簡易図形で「誰かがいる」ことを表現する。
 */
export type CharacterVariant =
  | "none"
  | "silhouette"
  | "figure"
  | "crowd"
  | "creature"
  | "mascot";

export interface CharacterAsset extends AssetBase {
  kind: "character";
  variant: CharacterVariant;
  /** 画面幅に対する水平位置 0〜1 */
  xRatio: number;
  /** 画面高さに対する大きさ 0〜1 */
  scale: number;
  color: string;
  /** 左右反転して描くか */
  flipped: boolean;
}

export interface EffectAsset extends AssetBase {
  kind: "effect";
  variant: EffectKind;
  /** 効果の強さ 0〜1 */
  intensity: number;
  color: string;
}

/**
 * 効果音。BGMと同じく WebAudio で合成するため、音源ファイルは持たない。
 * シーンの切り替わりなど、特定のタイミングで鳴らす。
 */
export type SoundEffectVariant = "whoosh" | "impact" | "chime" | "heartbeat" | "pop";

export interface AudioAsset extends AssetBase {
  kind: "audio";
  variant: SoundEffectVariant;
  /** 動画先頭からの再生位置（秒） */
  atTime: number;
  gain: number;
}
