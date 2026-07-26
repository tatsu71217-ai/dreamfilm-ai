/**
 * StoryEngine: 夢文を「物語の構成要素」へ分解する。
 *
 * 動画生成AIも言語モデルも使わないため、解析は語彙マッチ＋文の並びから行う。
 * ここで抽出するのは「どう見せるか」ではなく **「何が起きたか」** であり、
 * カメラ・エフェクト・音の判断は一切行わない（それらはDirectorEngine以降の責務）。
 *
 * 抽出するもの:
 *  - 出来事(StoryEvent)   ... 1文=1出来事。種類(EventKind)を語彙から判定する
 *  - 登場要素(StoryEntity) ... 人物・生き物・群衆・場所・物
 *  - 因果関係(CausalRelation) ... 接続表現から、直前の出来事との繋がりを判定する
 *  - 感情変化(EmotionShift) ... 出来事ごとの情感の切り替わり
 */

import { splitSentences } from "@/services/ai/mockHeuristics";
import type { Mood } from "@/types/dream";
import type { SceneMood } from "@/types/scene";
import type {
  CausalRelation,
  DreamStory,
  EmotionShift,
  EntityRole,
  EventKind,
  StoryEntity,
  StoryEvent,
} from "@/types/story";
import { generateId } from "@/utils/id";

/** 夢の気分 → 物語全体の基調となる情感 */
const MOOD_TO_SCENE_MOOD: Record<Mood, SceneMood> = {
  happy: "joyful",
  neutral: "calm",
  mysterious: "mysterious",
  scary: "tense",
  sad: "sad",
};

/** 文中の語からシーン単位で情感を判定する（夢は途中で雰囲気が変わるため） */
const SCENE_MOOD_KEYWORDS: ReadonlyArray<{ mood: SceneMood; words: string[] }> = [
  {
    mood: "tense",
    words: ["怖", "追われ", "追いかけ", "逃げ", "叫", "悲鳴", "焦", "迫っ", "怪物", "襲"],
  },
  { mood: "sad", words: ["悲し", "泣", "涙", "寂し", "別れ", "失っ"] },
  { mood: "joyful", words: ["嬉し", "笑", "楽し", "幸せ"] },
  { mood: "uplifting", words: ["飛", "光", "自由", "駆け", "昇", "浮"] },
  { mood: "mysterious", words: ["不思議", "突然", "急に", "見知らぬ", "消え", "いつの間にか"] },
];

/**
 * 出来事の種類を判定する語彙。**具体的な動作を先に**置く
 * （「見」のような汎用語を先に置くと、すべてobserveになってしまうため）。
 */
const EVENT_KEYWORDS: ReadonlyArray<{ kind: EventKind; words: string[] }> = [
  { kind: "pursue", words: ["追いかけ", "追われ", "追って", "迫っ", "襲"] },
  { kind: "escape", words: ["逃げ", "隠れ", "振り切", "避け"] },
  { kind: "fall", words: ["落ち", "沈", "崩れ", "転げ", "堕ち", "沈ん"] },
  { kind: "rise", words: ["飛ん", "飛び", "飛べ", "昇", "浮い", "浮か", "舞い上が", "登っ"] },
  { kind: "transform", words: ["変わ", "変化", "姿を変え", "溶け", "割れ", "裂け"] },
  { kind: "vanish", words: ["消え", "見失", "いなくな", "途切れ", "失っ"] },
  { kind: "arrive", words: ["着い", "たどり着", "到着", "抜け", "辿り着"] },
  { kind: "appear", words: ["現れ", "出てき", "出会", "会っ", "立ってい", "居た"] },
  { kind: "search", words: ["探し", "見つけ", "求め", "さまよ", "彷徨"] },
  { kind: "talk", words: ["話し", "叫", "呼ん", "言っ", "囁", "尋ね"] },
  { kind: "move", words: ["歩い", "走っ", "進ん", "向か", "移動", "駆け"] },
  { kind: "observe", words: ["見", "眺め", "気づ", "感じ", "思っ"] },
];

/** 演出的に大きな出来事（重要度を底上げする） */
const DRAMATIC_KINDS: ReadonlySet<EventKind> = new Set<EventKind>([
  "pursue",
  "escape",
  "fall",
  "rise",
  "transform",
  "vanish",
]);

/** 文頭の接続表現から、直前の出来事との関係を判定する */
const CAUSAL_KEYWORDS: ReadonlyArray<{ relation: CausalRelation; words: string[] }> = [
  {
    relation: "suddenly",
    words: ["突然", "急に", "いつの間にか", "気づくと", "気付くと", "不意に", "ふと"],
  },
  { relation: "but", words: ["しかし", "でも", "けれど", "ところが", "だが", "なのに"] },
  { relation: "because", words: ["だから", "そのため", "それで", " so", "ので"] },
  { relation: "then", words: ["そして", "やがて", "すると", "その後", "次に", "それから"] },
];

/** 登場要素の語彙。role順に判定し、先に一致したものを採用する */
const ENTITY_KEYWORDS: ReadonlyArray<{ role: EntityRole; words: string[] }> = [
  { role: "self", words: ["自分", "私", "僕", "俺", "わたし"] },
  { role: "crowd", words: ["人々", "大勢", "群衆", "みんな", "同僚たち"] },
  {
    role: "person",
    words: [
      "友人",
      "友達",
      "家族",
      "先生",
      "母",
      "父",
      "子供",
      "同僚",
      "先輩",
      "後輩",
      "知らない人",
      "誰か",
      "男",
      "女",
      "人影",
    ],
  },
  { role: "creature", words: ["怪物", "獣", "生き物", "犬", "猫", "鳥", "龍", "虫", "魚", "影"] },
  {
    role: "place",
    words: [
      "廊下",
      "階段",
      "教室",
      "学校",
      "図書館",
      "校舎",
      "海",
      "波",
      "砂浜",
      "森",
      "林",
      "山",
      "公園",
      "街",
      "町",
      "駅",
      "ビル",
      "道",
      "橋",
      "会社",
      "店",
      "部屋",
      "家",
      "ベッド",
      "病院",
      "空",
      "雲",
      "屋上",
      "草原",
      "野原",
      "庭",
      "丘",
      "川",
      "夜",
      "星",
      "月",
    ],
  },
  { role: "object", words: ["車", "電車", "本", "鏡", "扉", "ドア", "窓", "時計", "花", "手紙"] },
];

/** 主役として優先される役割（言及数が同じならこの順で選ぶ） */
const PROTAGONIST_ROLE_PRIORITY: ReadonlyArray<EntityRole> = [
  "person",
  "creature",
  "crowd",
  "self",
];

export interface AnalyzeDreamStoryInput {
  body: string;
  /** 本文が空・極端に短い場合の補完に使う */
  title: string;
  mood: Mood;
}

/**
 * 夢文を解析して DreamStory を返す。
 * 本文が空でも必ず1件以上の出来事を持つ結果を返す。
 */
export function analyzeDreamStory(input: AnalyzeDreamStoryInput): DreamStory {
  const baseMood = MOOD_TO_SCENE_MOOD[input.mood] ?? "calm";
  const sentences = collectSentences(input.body, input.title);

  // 夢を見た本人は文中に現れないことが多い（日本語では主語が省略される）ため、
  // 既定の主体として常に用意しておく
  const selfEntity: StoryEntity = {
    id: generateId(),
    label: "自分",
    role: "self",
    firstEventIndex: 0,
    mentionCount: 0,
  };

  const entitiesByLabel = new Map<string, StoryEntity>();
  entitiesByLabel.set(selfEntity.label, selfEntity);

  // --- 1回目の走査: 出来事の骨組みと登場要素を集める ---
  const draftEvents = sentences.map((sourceText, index) => {
    const mood = detectSceneMood(sourceText, baseMood);
    const kind = detectEventKind(sourceText);
    const relationFromPrev: CausalRelation =
      index === 0 ? "start" : detectCausalRelation(sourceText);

    const mentioned = collectEntities(sourceText, index, entitiesByLabel);
    const subject = mentioned.find((entity) => entity.role !== "place" && entity.role !== "object");
    const place = mentioned.find((entity) => entity.role === "place");

    // 主体が書かれていない場合は、夢を見た本人の行動とみなす
    const resolvedSubject = subject ?? selfEntity;
    if (!subject) {
      selfEntity.mentionCount += 1;
    }

    return {
      sourceText,
      index,
      kind,
      mood,
      relationFromPrev,
      subjectId: resolvedSubject.id,
      placeId: place?.id ?? null,
      introducesNewEntity: mentioned.some((entity) => entity.firstEventIndex === index),
    };
  });

  // --- 感情変化の抽出 ---
  const emotionShifts = collectEmotionShifts(draftEvents.map((event) => event.mood));
  const shiftIndexes = new Map(emotionShifts.map((shift) => [shift.atEventIndex, shift]));

  // --- 2回目の走査: 物語上の重要度を確定する ---
  const events: StoryEvent[] = draftEvents.map((draft) => {
    const isFirst = draft.index === 0;
    const isLast = draft.index === draftEvents.length - 1;

    let weight = 0.4;
    if (draft.introducesNewEntity) weight += 0.2;
    if (shiftIndexes.has(draft.index)) {
      weight += 0.2 * (shiftIndexes.get(draft.index)?.magnitude ?? 0.5) + 0.1;
    }
    if (draft.relationFromPrev === "suddenly" || draft.relationFromPrev === "but") weight += 0.15;
    if (DRAMATIC_KINDS.has(draft.kind)) weight += 0.1;

    // 冒頭と結末は物語の骨格なので、必ず高い重要度を持たせる
    if (isFirst) weight = Math.max(weight, 0.95);
    if (isLast) weight = Math.max(weight, 0.9);

    return {
      id: generateId(),
      index: draft.index,
      sourceText: draft.sourceText,
      kind: draft.kind,
      subjectId: draft.subjectId,
      placeId: draft.placeId,
      mood: draft.mood,
      relationFromPrev: draft.relationFromPrev,
      weight: clamp01(weight),
    };
  });

  const entities = [...entitiesByLabel.values()].filter(
    // 一度も言及されなかった「自分」は登場要素として数えない
    (entity) => entity.mentionCount > 0,
  );

  return {
    events,
    entities,
    emotionShifts,
    protagonistId: pickProtagonist(entities, selfEntity).id,
  };
}

/**
 * 本文を文へ分割する。空・極端に短い場合でも必ず1件以上返す。
 */
function collectSentences(body: string, title: string): string[] {
  const sentences = splitSentences(body).filter((sentence) => sentence.length > 0);
  if (sentences.length > 0) {
    return sentences;
  }
  const fallbackTitle = title.trim();
  return fallbackTitle.length > 0 ? [fallbackTitle] : ["夢の情景が広がる"];
}

function detectSceneMood(sentence: string, fallback: SceneMood): SceneMood {
  const matched = SCENE_MOOD_KEYWORDS.find((rule) =>
    rule.words.some((word) => sentence.includes(word)),
  );
  return matched?.mood ?? fallback;
}

function detectEventKind(sentence: string): EventKind {
  const matched = EVENT_KEYWORDS.find((rule) => rule.words.some((word) => sentence.includes(word)));
  return matched?.kind ?? "observe";
}

function detectCausalRelation(sentence: string): CausalRelation {
  const matched = CAUSAL_KEYWORDS.find((rule) =>
    rule.words.some((word) => sentence.includes(word)),
  );
  // 接続表現がなければ、単純に時間が進んだものとして扱う
  return matched?.relation ?? "then";
}

/**
 * 1文に登場する要素を集め、レジストリへ登録する。
 * 同じ語は同一の要素として扱い、言及回数だけを増やす。
 */
function collectEntities(
  sentence: string,
  eventIndex: number,
  registry: Map<string, StoryEntity>,
): StoryEntity[] {
  const found: StoryEntity[] = [];

  for (const rule of ENTITY_KEYWORDS) {
    for (const word of rule.words) {
      if (!sentence.includes(word)) continue;

      const existing = registry.get(word);
      if (existing) {
        existing.mentionCount += 1;
        found.push(existing);
      } else {
        const entity: StoryEntity = {
          id: generateId(),
          label: word,
          role: rule.role,
          firstEventIndex: eventIndex,
          mentionCount: 1,
        };
        registry.set(word, entity);
        found.push(entity);
      }
      // 同じ役割で複数の語が当たっても、1文につき1件までにする
      break;
    }
  }

  return found;
}

/** 情感の並びから、切り替わった箇所を拾う */
function collectEmotionShifts(moods: SceneMood[]): EmotionShift[] {
  const shifts: EmotionShift[] = [];

  for (let index = 1; index < moods.length; index += 1) {
    const from = moods[index - 1];
    const to = moods[index];
    if (from === to) continue;

    shifts.push({
      atEventIndex: index,
      from,
      to,
      magnitude: moodDistance(from, to),
    });
  }

  return shifts;
}

/**
 * 情感どうしの隔たり 0〜1。
 * 感情価（快〜不快）の差を距離とみなし、変化の大きさを見積もる。
 */
const MOOD_VALENCE: Record<SceneMood, number> = {
  joyful: 1,
  uplifting: 0.8,
  calm: 0.5,
  mysterious: 0.35,
  sad: 0.15,
  tense: 0,
};

export function moodDistance(from: SceneMood, to: SceneMood): number {
  return clamp01(Math.abs(MOOD_VALENCE[from] - MOOD_VALENCE[to]));
}

/** 最も多く言及された人物系の要素を主役とする */
function pickProtagonist(entities: StoryEntity[], fallback: StoryEntity): StoryEntity {
  const candidates = entities.filter((entity) =>
    PROTAGONIST_ROLE_PRIORITY.includes(entity.role),
  );
  if (candidates.length === 0) {
    return fallback;
  }

  return candidates.reduce((best, entity) => {
    if (entity.mentionCount !== best.mentionCount) {
      return entity.mentionCount > best.mentionCount ? entity : best;
    }
    // 言及数が同じなら、役割の優先順位で決める
    return PROTAGONIST_ROLE_PRIORITY.indexOf(entity.role) <
      PROTAGONIST_ROLE_PRIORITY.indexOf(best.role)
      ? entity
      : best;
  });
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
