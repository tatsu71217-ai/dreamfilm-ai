/**
 * MockAIProvider が使用する、簡易的なテキスト解析ヒューリスティック集。
 *
 * ここでの実装は本物のAI/NLPではなく、あくまで「AIサービス層のインターフェースが
 * 正しく機能することを示すためのプレースホルダー」である。
 * 実プロバイダーに差し替える際、このファイルごと不要になる想定。
 */

const PLACE_VOCABULARY = [
  "空",
  "海",
  "山",
  "街",
  "家",
  "学校",
  "教室",
  "図書館",
  "公園",
  "駅",
  "道",
  "部屋",
  "森",
  "川",
  "橋",
  "屋上",
  "病院",
  "会社",
  "店",
  "廊下",
  "階段",
  "庭",
] as const;

const CHARACTER_VOCABULARY = [
  "友人",
  "友達",
  "家族",
  "先生",
  "母",
  "父",
  "知らない人",
  "子供",
  "同僚",
  "先輩",
  "後輩",
  "誰か",
] as const;

const EMOTION_RULES: ReadonlyArray<{ emotion: string; triggers: string[] }> = [
  { emotion: "恐怖", triggers: ["怖い", "追われる", "逃げる", "叫", "悲鳴"] },
  { emotion: "喜び", triggers: ["嬉しい", "笑", "楽しい", "幸せ"] },
  { emotion: "悲しみ", triggers: ["悲しい", "泣", "涙", "寂しい"] },
  { emotion: "高揚感", triggers: ["飛", "空を", "光", "自由"] },
  { emotion: "驚き", triggers: ["驚", "突然", "急に"] },
  { emotion: "安心", triggers: ["安心", "落ち着", "穏やか"] },
];

const DEFAULT_EMOTION = "穏やか";
const TITLE_MAX_LENGTH = 24;
const SUMMARY_MAX_SENTENCES = 3;
const KEYWORDS_MAX_COUNT = 5;

export function splitSentences(text: string): string[] {
  return text
    .split(/[。！？\n]/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/** 本文の最初の一文から、タイトル案を生成する */
export function buildTitleSuggestion(body: string, fallbackTitle: string): string {
  const [firstSentence] = splitSentences(body);
  if (!firstSentence) {
    return fallbackTitle;
  }
  return firstSentence.length > TITLE_MAX_LENGTH
    ? `${firstSentence.slice(0, TITLE_MAX_LENGTH)}…`
    : firstSentence;
}

/** 本文の先頭2〜3文をつなげて要約とする */
export function buildSummary(body: string): string {
  const sentences = splitSentences(body).slice(0, SUMMARY_MAX_SENTENCES);
  if (sentences.length === 0) {
    return body.trim();
  }
  return `${sentences.join("。")}。`;
}

/** 語彙リストとの部分一致で、本文からキーワード候補を抽出する（最大5件） */
export function extractKeywords(body: string): string[] {
  const matched = PLACE_VOCABULARY.filter((word) => body.includes(word));
  const extraCandidates = ["夢", "記憶", "光", "声", "音楽", "影", "時間"].filter((word) =>
    body.includes(word),
  );
  const combined = Array.from(new Set([...matched, ...extraCandidates]));
  return combined.slice(0, KEYWORDS_MAX_COUNT);
}

/** 語彙リストとの部分一致で、登場人物を抽出する。見つからない場合は本人のみとみなす */
export function extractCharacters(body: string): string[] {
  const matched = CHARACTER_VOCABULARY.filter((word) => body.includes(word));
  return matched.length > 0 ? matched : ["自分"];
}

/** 語彙リストとの部分一致で、場所を抽出する。見つからない場合は空配列を返す */
export function extractPlaces(body: string): string[] {
  return PLACE_VOCABULARY.filter((word) => body.includes(word));
}

/** キーワードルールとの部分一致で、感情を1件推定する */
export function extractEmotion(body: string): string {
  const matchedRule = EMOTION_RULES.find((rule) =>
    rule.triggers.some((trigger) => body.includes(trigger)),
  );
  return matchedRule?.emotion ?? DEFAULT_EMOTION;
}
