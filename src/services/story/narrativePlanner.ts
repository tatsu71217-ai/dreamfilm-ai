/**
 * NarrativePlanner: StoryEngineが抽出した出来事を、尺に収まるシーン列（SceneGraph）へ並べ直す。
 *
 * 【従来の問題】
 * 以前は `sentences[index % sentences.length]` で文を先頭から順に割り当てていたため、
 * 文の数がシーン数を超えると**後半の文が一度も使われず捨てられていた**。
 * （例: 8文の夢を4シーンにすると、後半4文が映像に現れない）
 *
 * ここでは代わりに、
 *  - 出来事が多すぎる場合 … 重要度の低い隣接ペアから**統合**する（捨てずに引き受ける）
 *  - 出来事が少なすぎる場合 … 重要な出来事を**継続ショットとして引き延ばす**
 * ことで、尺に合わせつつ夢の内容を取りこぼさないようにしている。
 */

import { moodDistance } from "@/services/story/storyEngine";
import type { NarrativeBeat, SceneGraph, SceneNode, SceneTransition } from "@/types/sceneGraph";
import type { ScenePacing } from "@/types/scene";
import type { DreamStory, StoryEntity, StoryEvent } from "@/types/story";
import { SCENE_COUNT_RANGE, type VideoDurationSeconds } from "@/types/videoProject";
import { generateId } from "@/utils/id";
import { distributeEvenly } from "@/utils/math";

/** 1シーンの最短・最長（1シーン2〜6秒程度に収める） */
const MIN_SCENE_SECONDS = 2;
const MAX_SCENE_SECONDS = 6;

/** 字幕を読み切るために確保したい1シーンの長さ。シーン数の上限を決めるのに使う */
const MIN_READABLE_SCENE_SECONDS = 3;

/** 出来事の種類のうち、変化が大きいもの */
const DRAMATIC_KINDS = new Set(["pursue", "escape", "fall", "rise", "transform", "vanish"]);

export interface PlanNarrativeInput {
  story: DreamStory;
  durationSeconds: VideoDurationSeconds;
  /** スタイルのカットの速さ。同じ尺でも速いスタイルほどシーンを多く割る */
  pacing: ScenePacing;
}

/** 統合・引き延ばしの途中経過を表す作業用の構造 */
interface DraftNode {
  event: StoryEvent;
  coveredEventIds: string[];
  isContinuation: boolean;
}

/**
 * 出来事の列を SceneGraph へ変換する。
 * 返り値の各シーンの秒数の合計は、必ず `totalSeconds` と一致する。
 */
export function planNarrative(input: PlanNarrativeInput): SceneGraph {
  const { story } = input;
  const totalSeconds = input.durationSeconds;
  const sceneCount = decideSceneCount(story.events.length, input.durationSeconds, input.pacing);

  const drafts = fitEventsToSceneCount(story.events, sceneCount);
  const durations = distributeSceneSeconds(totalSeconds, drafts.length);
  const beats = assignBeats(drafts);

  const entityById = new Map(story.entities.map((entity) => [entity.id, entity]));
  const nodes: SceneNode[] = [];
  let cursor = 0;
  // 場所が書かれていない文は、直前の場所が続いているものとして扱う
  // （「廊下に立っていた。突然、怪物が追いかけてきた」の2文目も廊下で起きている）
  let lastPlace: StoryEntity | null = null;

  drafts.forEach((draft, index) => {
    const seconds = durations[index];
    const startTime = cursor;
    const endTime = cursor + seconds;
    cursor = endTime;

    const previousMood = index === 0 ? draft.event.mood : drafts[index - 1].event.mood;
    const place = resolveEntity(draft.event.placeId, entityById) ?? lastPlace;
    lastPlace = place;

    nodes.push({
      id: generateId(),
      index,
      beat: beats[index],
      event: draft.event,
      who: resolveEntity(draft.event.subjectId, entityById),
      where: place,
      what: draft.event.kind,
      change: {
        moodFrom: previousMood,
        moodTo: draft.event.mood,
        intensity: computeChangeIntensity(draft, previousMood, beats[index]),
      },
      coveredEventIds: draft.coveredEventIds,
      isContinuation: draft.isContinuation,
      seconds,
      startTime,
      endTime,
    });
  });

  return { nodes, transitions: buildTransitions(nodes) };
}

/**
 * シーン数を決める。
 *
 * 基本はスタイルのpacing（速いカットほど多いシーン）で決めるが、
 * 出来事がそれより多い場合は**字幕を読み切れる長さを保てる範囲でシーンを増やす**。
 * こうすることで、長い尺を選んだときほど夢の内容が多く映像に現れる
 * （それでも収まらない分は統合して引き受ける）。
 */
function decideSceneCount(
  eventCount: number,
  duration: VideoDurationSeconds,
  pacing: ScenePacing,
): number {
  const { min, max } = SCENE_COUNT_RANGE[duration];
  const preferred = pacing === "fast" ? max : pacing === "slow" ? min : Math.round((min + max) / 2);

  // 1シーンが短すぎると字幕を読めないため、これを超えてシーンを増やさない
  const readableMax = Math.max(min, Math.floor(duration / MIN_READABLE_SCENE_SECONDS));

  // 出来事が少ないときは無理に増やさない（同じ場面の引き延ばしを減らす）
  const target = Math.max(preferred, Math.min(eventCount, readableMax));
  return Math.max(min, Math.min(readableMax, target));
}

/**
 * 出来事の数を目標シーン数へ合わせる。
 * 多い場合は統合し、少ない場合は継続ショットで引き延ばす。
 */
function fitEventsToSceneCount(events: StoryEvent[], sceneCount: number): DraftNode[] {
  let drafts: DraftNode[] = events.map((event) => ({
    event,
    coveredEventIds: [event.id],
    isContinuation: false,
  }));

  while (drafts.length > sceneCount) {
    drafts = mergeWeakestAdjacentPair(drafts);
  }
  while (drafts.length < sceneCount) {
    drafts = extendStrongestEvent(drafts);
  }

  return drafts;
}

/**
 * 重要度の合計が最も低い隣接ペアを1つにまとめる。
 * representativeには重要度の高い側を残し、もう一方は coveredEventIds として引き継ぐ
 * （＝夢の要素を捨てずに、どのシーンが引き受けたかを追跡できるようにする）。
 */
function mergeWeakestAdjacentPair(drafts: DraftNode[]): DraftNode[] {
  if (drafts.length <= 1) return drafts;

  let bestIndex = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < drafts.length - 1; index += 1) {
    const score = drafts[index].event.weight + drafts[index + 1].event.weight;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  const left = drafts[bestIndex];
  const right = drafts[bestIndex + 1];
  const representative = right.event.weight > left.event.weight ? right : left;

  const merged: DraftNode = {
    event: representative.event,
    coveredEventIds: [...left.coveredEventIds, ...right.coveredEventIds],
    // 統合結果は独立したシーンなので、継続ショット扱いにはしない
    isContinuation: false,
  };

  return [...drafts.slice(0, bestIndex), merged, ...drafts.slice(bestIndex + 2)];
}

/**
 * 最も重要な出来事を、継続ショットとして次のシーンへ引き延ばす。
 * 既に引き延ばし済みのものは避け、同じ場面が延々続かないようにする。
 */
function extendStrongestEvent(drafts: DraftNode[]): DraftNode[] {
  let targetIndex = 0;
  let bestWeight = Number.NEGATIVE_INFINITY;

  drafts.forEach((draft, index) => {
    // 既に継続ショットを持つ出来事は後回しにする
    const alreadyExtended = drafts[index + 1]?.isContinuation ?? false;
    const weight = draft.event.weight - (alreadyExtended ? 1 : 0);
    if (weight > bestWeight) {
      bestWeight = weight;
      targetIndex = index;
    }
  });

  const target = drafts[targetIndex];
  const continuation: DraftNode = {
    event: target.event,
    // 出来事そのものは元シーンが引き受け済みなので、二重に数えない
    coveredEventIds: [],
    isContinuation: true,
  };

  return [...drafts.slice(0, targetIndex + 1), continuation, ...drafts.slice(targetIndex + 1)];
}

/**
 * 起承転結を割り当てる。
 * 冒頭を「起」、結末を「結」とし、中間で最も変化の大きい場面を「転」とする。
 */
function assignBeats(drafts: DraftNode[]): NarrativeBeat[] {
  const count = drafts.length;
  if (count === 1) return ["ki"];
  if (count === 2) return ["ki", "ketsu"];
  if (count === 3) return ["ki", "ten", "ketsu"];

  const beats: NarrativeBeat[] = drafts.map(() => "sho");
  beats[0] = "ki";
  beats[count - 1] = "ketsu";

  let turningIndex = 1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 1; index < count - 1; index += 1) {
    const draft = drafts[index];
    const previousMood = drafts[index - 1].event.mood;
    const score =
      draft.event.weight +
      moodDistance(previousMood, draft.event.mood) +
      (DRAMATIC_KINDS.has(draft.event.kind) ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      turningIndex = index;
    }
  }
  beats[turningIndex] = "ten";

  return beats;
}

/**
 * そのシーンの変化の強さを求める。
 * 情感の振れ幅を主軸に、出来事の性質と物語上の位置で補正する。
 */
function computeChangeIntensity(
  draft: DraftNode,
  previousMood: SceneNode["change"]["moodFrom"],
  beat: NarrativeBeat,
): number {
  let intensity = 0.25 + moodDistance(previousMood, draft.event.mood) * 0.5;

  if (DRAMATIC_KINDS.has(draft.event.kind)) intensity += 0.2;
  if (draft.event.relationFromPrev === "suddenly" || draft.event.relationFromPrev === "but") {
    intensity += 0.2;
  }
  if (beat === "ten") intensity += 0.15;
  // 継続ショットは前のシーンの余韻なので、変化としては弱める
  if (draft.isContinuation) intensity *= 0.5;

  return Math.max(0, Math.min(1, intensity));
}

function buildTransitions(nodes: SceneNode[]): SceneTransition[] {
  const transitions: SceneTransition[] = [];

  for (let index = 1; index < nodes.length; index += 1) {
    transitions.push({
      fromIndex: index - 1,
      toIndex: index,
      // 継続ショットは同じ出来事の続きなので、単純な時間経過として扱う
      reason: nodes[index].isContinuation ? "then" : nodes[index].event.relationFromPrev,
    });
  }

  return transitions;
}

function resolveEntity(
  entityId: string | null,
  entityById: Map<string, StoryEntity>,
): StoryEntity | null {
  if (!entityId) return null;
  return entityById.get(entityId) ?? null;
}

/**
 * 尺をシーンへ配分する。
 * 合計が必ず `totalSeconds` と一致し、かつ各シーンが MIN〜MAX に収まることを保証する。
 */
export function distributeSceneSeconds(totalSeconds: number, sceneCount: number): number[] {
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
