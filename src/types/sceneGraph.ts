/**
 * SceneGraph: 「どのシーンで何が起きるか」と「なぜ次のシーンへ移るか」を保持する構造。
 *
 * StoryEngineが抽出した出来事の列を、尺に収まるシーン列へ再構成したもの。
 * レンダリング用の DreamScene（types/scene.ts）とは役割が異なり、
 * こちらは**物語としての情報だけ**を持つ（色・カメラ・エフェクト等は持たない）。
 * sceneSplitter がこのSceneGraphを読んで、初めて描画用のDreamSceneへ変換する。
 */

import type { SceneMood } from "@/types/scene";
import type { CausalRelation, EventKind, StoryEntity, StoryEvent } from "@/types/story";

/** 起承転結。シーンが物語上どの役割を担うか */
export type NarrativeBeat = "ki" | "sho" | "ten" | "ketsu";

/** そのシーンで「どう変化したか」 */
export interface SceneChange {
  moodFrom: SceneMood;
  moodTo: SceneMood;
  /**
   * 変化の強さ 0〜1。
   * カメラの振れ幅・エフェクト強度の根拠になる（演出側で勝手に決めない）。
   */
  intensity: number;
}

/** 1シーン分の物語情報 */
export interface SceneNode {
  id: string;
  index: number;
  beat: NarrativeBeat;
  /** このシーンが表す主たる出来事 */
  event: StoryEvent;
  /** 誰が */
  who: StoryEntity | null;
  /** どこで */
  where: StoryEntity | null;
  /** 何をしたか */
  what: EventKind;
  /** どう変化したか */
  change: SceneChange;
  /**
   * このシーンが引き受けた出来事のID一覧。
   * 出来事の数がシーン数を超えて統合された場合、統合元も含む
   * （NarrativeValidatorが「夢の要素が欠落していないか」を判定する根拠になる）。
   */
  coveredEventIds: string[];
  /**
   * 直前シーンと同じ出来事を引き延ばした継続ショットか。
   * 継続ショットでは字幕を重複表示しない。
   */
  isContinuation: boolean;
  seconds: number;
  startTime: number;
  endTime: number;
}

/** シーン間の遷移と、その理由 */
export interface SceneTransition {
  fromIndex: number;
  toIndex: number;
  /** なぜ次のシーンへ移るのか */
  reason: CausalRelation;
}

export interface SceneGraph {
  nodes: SceneNode[];
  transitions: SceneTransition[];
}
