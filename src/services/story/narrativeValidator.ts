/**
 * NarrativeValidator: 組み上げたSceneGraphに、夢の主要な要素が残っているかを検査する。
 *
 * NarrativePlannerは尺に合わせて出来事を統合するため、
 * 「重要な登場人物が1シーンにも出てこない」「冒頭/結末が入れ替わっている」
 * といった取りこぼしが起こりうる。ここではそれを検出し、可能な範囲で再編成する。
 *
 * 方針として、検出した問題は**握りつぶさず issues として返す**。
 * 自動修復できたものは repaired=true とあわせて報告し、
 * 修復できなかったものも呼び出し側が把握できるようにする。
 */

import type { SceneGraph, SceneNode } from "@/types/sceneGraph";
import type { DreamStory, StoryEntity } from "@/types/story";

/** 検出した問題の種類 */
export type NarrativeIssueKind =
  | "uncovered-event"
  | "missing-entity"
  | "missing-turning-point"
  | "anchor-out-of-place";

export interface NarrativeIssue {
  kind: NarrativeIssueKind;
  detail: string;
  /** 自動修復できたか */
  repaired: boolean;
}

export interface ValidateNarrativeResult {
  graph: SceneGraph;
  issues: NarrativeIssue[];
}

/**
 * SceneGraphを検査し、必要なら再編成した新しいSceneGraphを返す。
 * 入力のSceneGraphは変更しない。
 */
export function validateNarrative(graph: SceneGraph, story: DreamStory): ValidateNarrativeResult {
  const issues: NarrativeIssue[] = [];
  // ノードは複製してから直す（呼び出し元の値を書き換えない）
  const nodes: SceneNode[] = graph.nodes.map((node) => ({
    ...node,
    coveredEventIds: [...node.coveredEventIds],
    change: { ...node.change },
  }));

  if (nodes.length === 0) {
    return { graph, issues };
  }

  checkEventCoverage(nodes, story, issues);
  checkKeyEntities(nodes, story, issues);
  checkTurningPoint(nodes, issues);
  checkAnchors(nodes, story, issues);

  return { graph: { nodes, transitions: graph.transitions }, issues };
}

/**
 * すべての出来事がいずれかのシーンに引き受けられているか。
 * 取りこぼしがあれば、時間的に最も近いシーンへ引き受けさせる。
 */
function checkEventCoverage(
  nodes: SceneNode[],
  story: DreamStory,
  issues: NarrativeIssue[],
): void {
  const covered = new Set(nodes.flatMap((node) => node.coveredEventIds));

  for (const event of story.events) {
    if (covered.has(event.id)) continue;

    // 元の並び順が最も近いシーンへ寄せる
    const target = findNearestNodeByEventIndex(nodes, event.index);
    target.coveredEventIds.push(event.id);
    covered.add(event.id);

    issues.push({
      kind: "uncovered-event",
      detail: `出来事「${truncate(event.sourceText)}」がどのシーンにも含まれていなかったため、シーン${target.index + 1}へ統合しました。`,
      repaired: true,
    });
  }
}

/**
 * 夢の主要な登場要素が、いずれかのシーンの「誰が」「どこで」に現れているか。
 * 現れていない場合、その要素が登場する出来事を引き受けているシーンへ割り当てる。
 */
function checkKeyEntities(nodes: SceneNode[], story: DreamStory, issues: NarrativeIssue[]): void {
  for (const entity of collectKeyEntities(story)) {
    const alreadyVisible = nodes.some(
      (node) => node.who?.id === entity.id || node.where?.id === entity.id,
    );
    if (alreadyVisible) continue;

    const host = findNodeCoveringEntity(nodes, story, entity);
    if (!host) {
      issues.push({
        kind: "missing-entity",
        detail: `登場要素「${entity.label}」を配置できるシーンが見つかりませんでした。`,
        repaired: false,
      });
      continue;
    }

    if (entity.role === "place") {
      host.where = entity;
    } else {
      host.who = entity;
    }

    issues.push({
      kind: "missing-entity",
      detail: `登場要素「${entity.label}」がどのシーンにも現れていなかったため、シーン${host.index + 1}へ配置しました。`,
      repaired: true,
    });
  }
}

/** 3シーン以上あるなら、物語の転換点（転）が1つ存在するべき */
function checkTurningPoint(nodes: SceneNode[], issues: NarrativeIssue[]): void {
  if (nodes.length < 3) return;
  if (nodes.some((node) => node.beat === "ten")) return;

  // 中間シーンのうち、最も変化の大きいものを転換点にする
  const middle = nodes.slice(1, -1);
  const turning = middle.reduce((best, node) =>
    node.change.intensity > best.change.intensity ? node : best,
  );
  turning.beat = "ten";

  issues.push({
    kind: "missing-turning-point",
    detail: `転換点が無かったため、シーン${turning.index + 1}を「転」に設定しました。`,
    repaired: true,
  });
}

/**
 * 冒頭シーンが夢の最初の出来事を、結末シーンが最後の出来事を引き受けているか。
 * ここは自動で入れ替えると物語の因果が壊れるため、検出のみ行う。
 */
function checkAnchors(nodes: SceneNode[], story: DreamStory, issues: NarrativeIssue[]): void {
  const firstEvent = story.events[0];
  const lastEvent = story.events[story.events.length - 1];
  if (!firstEvent || !lastEvent) return;

  if (!nodes[0].coveredEventIds.includes(firstEvent.id)) {
    issues.push({
      kind: "anchor-out-of-place",
      detail: "夢の最初の出来事が冒頭シーンに含まれていません。",
      repaired: false,
    });
  }

  const lastNode = nodes[nodes.length - 1];
  if (!lastNode.coveredEventIds.includes(lastEvent.id)) {
    issues.push({
      kind: "anchor-out-of-place",
      detail: "夢の最後の出来事が結末シーンに含まれていません。",
      repaired: false,
    });
  }
}

/**
 * 検査対象とする「主要な」登場要素。
 * 主役と、2回以上言及された要素、および生き物（印象に残りやすい）を対象にする。
 */
function collectKeyEntities(story: DreamStory): StoryEntity[] {
  return story.entities.filter(
    (entity) =>
      entity.id === story.protagonistId ||
      entity.mentionCount >= 2 ||
      entity.role === "creature",
  );
}

/** その要素が登場する出来事を引き受けているシーンを探す */
function findNodeCoveringEntity(
  nodes: SceneNode[],
  story: DreamStory,
  entity: StoryEntity,
): SceneNode | null {
  const relatedEventIds = new Set(
    story.events
      .filter((event) => event.subjectId === entity.id || event.placeId === entity.id)
      .map((event) => event.id),
  );

  const host = nodes.find((node) =>
    node.coveredEventIds.some((eventId) => relatedEventIds.has(eventId)),
  );
  if (host) return host;

  // 関連する出来事が特定できない場合は、初出の位置に最も近いシーンへ寄せる
  return nodes.length > 0 ? findNearestNodeByEventIndex(nodes, entity.firstEventIndex) : null;
}

/** 元の出来事の並び順が最も近いシーンを返す */
function findNearestNodeByEventIndex(nodes: SceneNode[], eventIndex: number): SceneNode {
  return nodes.reduce((best, node) =>
    Math.abs(node.event.index - eventIndex) < Math.abs(best.event.index - eventIndex) ? node : best,
  );
}

function truncate(text: string, maxLength = 16): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
