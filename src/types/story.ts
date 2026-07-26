/**
 * 夢文を「物語」として捉えるための型定義。
 *
 * 【この層が存在する理由】
 * 従来は夢の本文を文単位に切り、そのまま1文=1シーンとして描画していた。
 * そのため「何が起きたか」「誰が出てきたか」「なぜ次の場面へ移るのか」が
 * 映像へ反映されず、シーン数より文が多い場合は後半の文が捨てられていた。
 *
 * StoryEngineはレンダリングの前段として、夢文から
 * 出来事(StoryEvent)・登場要素(StoryEntity)・因果関係(CausalRelation)・
 * 感情変化(EmotionShift) を抽出する。以降の層（NarrativePlanner →
 * NarrativeValidator → sceneSplitter）はこの解析結果だけを根拠に
 * 「何を描くか」を決める。
 */

import type { SceneMood } from "@/types/scene";

/**
 * 出来事の種類。カメラワーク・エフェクト強度・SEの選択根拠になる
 * （演出の都合ではなく「何が起きたか」から決めるため）。
 */
export type EventKind =
  | "appear"
  | "move"
  | "transform"
  | "pursue"
  | "escape"
  | "fall"
  | "rise"
  | "search"
  | "talk"
  | "arrive"
  | "vanish"
  | "observe";

/**
 * 直前の出来事との関係。シーン遷移の理由として保持し、
 * トランジションとSEの選択に使う。
 */
export type CausalRelation = "start" | "then" | "because" | "but" | "suddenly";

/** 登場要素の役割 */
export type EntityRole = "self" | "person" | "creature" | "crowd" | "place" | "object";

/** 夢に登場する要素（人物・生き物・場所など） */
export interface StoryEntity {
  id: string;
  /** 夢文中に現れた語そのもの */
  label: string;
  role: EntityRole;
  /** 何番目の出来事で初めて登場したか */
  firstEventIndex: number;
  /** 本文全体での言及回数。主役の判定に使う */
  mentionCount: number;
}

/** 夢文から抽出した1つの出来事 */
export interface StoryEvent {
  id: string;
  /** 夢文中での並び順 */
  index: number;
  /** 元になった一文 */
  sourceText: string;
  kind: EventKind;
  /** 誰が（主体）。特定できない場合はnull */
  subjectId: string | null;
  /** どこで。特定できない場合はnull */
  placeId: string | null;
  mood: SceneMood;
  /** 直前の出来事からどう繋がるか */
  relationFromPrev: CausalRelation;
  /**
   * 物語上の重要度 0〜1。
   * シーン数が出来事数より少ない場合、どれを残すかの優先順位に使う。
   */
  weight: number;
}

/** 感情が切り替わった箇所 */
export interface EmotionShift {
  /** この出来事で感情が変わった */
  atEventIndex: number;
  from: SceneMood;
  to: SceneMood;
  /** 変化の大きさ 0〜1 */
  magnitude: number;
}

/** 夢文の解析結果一式 */
export interface DreamStory {
  events: StoryEvent[];
  entities: StoryEntity[];
  emotionShifts: EmotionShift[];
  /** 物語の主役。最も多く言及された人物系の要素（なければ「自分」） */
  protagonistId: string;
}
