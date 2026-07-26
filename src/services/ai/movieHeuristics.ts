import {
  buildSummary,
  buildTitleSuggestion,
  extractCharacters,
  extractEmotion,
  extractPlaces,
  splitSentences,
} from "@/services/ai/mockHeuristics";
import type {
  DreamMoviePackageResult,
  DreamMovieScene,
  DreamOrganizationResult,
} from "@/services/ai/types";
import { distributeEvenly } from "@/utils/math";

/**
 * MockAIProvider.generateMoviePackage が使用する、簡易的な構成ロジック集。
 * mockHeuristics.ts（夢の整理）と同様、本物のAIではなくプレースホルダー実装。
 */

const MOVIE_DURATION_SECONDS = 30;
const MIN_SCENES = 3;
const MAX_SCENES = 6;

const GENRE_BY_EMOTION: Record<string, string> = {
  恐怖: "ホラー",
  喜び: "ヒューマンドラマ",
  悲しみ: "ヒューマンドラマ",
  高揚感: "アドベンチャー",
  驚き: "ミステリー",
  安心: "ファンタジー",
  穏やか: "ファンタジー",
};
const DEFAULT_GENRE = "ファンタジー";

const MOOD_PHRASE_BY_EMOTION: Record<string, string> = {
  恐怖: "緊張感のある不穏な雰囲気",
  喜び: "温かく晴れやかな雰囲気",
  悲しみ: "切なく静かな雰囲気",
  高揚感: "高揚感あふれる開放的な雰囲気",
  驚き: "予測不能で刺激的な雰囲気",
  安心: "穏やかで幻想的な雰囲気",
  穏やか: "穏やかで幻想的な雰囲気",
};
const DEFAULT_MOOD_PHRASE = "穏やかで幻想的な雰囲気";

/** シーンの物語上の役割（起承転結的な流れを表す） */
const SCENE_BEATS = ["導入", "展開", "転機", "クライマックス", "収束", "余韻"] as const;

/** ナレーションの接続詞。シーンごとに変化をつけるために使う */
const NARRATION_CONNECTORS = [
  "夢の中で、",
  "やがて、",
  "次第に、",
  "突然、",
  "そして、",
  "最後に、",
] as const;

interface BuildMoviePackageInput {
  title: string;
  body: string;
  organization?: DreamOrganizationResult;
}

/**
 * 夢の内容（および利用可能であればAI整理結果）から Dream Movie Package を組み立てる。
 * AI整理結果があれば、それを優先的に利用することでより一貫性のある内容を生成する。
 */
export function buildMoviePackage(input: BuildMoviePackageInput): DreamMoviePackageResult {
  const trimmedBody = input.body.trim();

  const emotion = input.organization?.emotion ?? extractEmotion(trimmedBody);
  const places = input.organization?.places ?? extractPlaces(trimmedBody);
  const characters = input.organization?.characters ?? extractCharacters(trimmedBody);
  const synopsis = input.organization?.summary ?? buildSummary(trimmedBody);
  const movieTitle = input.organization?.title ?? buildTitleSuggestion(trimmedBody, input.title);

  const genre = GENRE_BY_EMOTION[emotion] ?? DEFAULT_GENRE;
  const mood = MOOD_PHRASE_BY_EMOTION[emotion] ?? DEFAULT_MOOD_PHRASE;

  const scenes = buildScenes({ body: trimmedBody, places, characters, mood, genre });

  return {
    movieTitle,
    genre,
    mood,
    synopsis,
    duration: MOVIE_DURATION_SECONDS,
    scenes,
  };
}

function buildScenes(params: {
  body: string;
  places: string[];
  characters: string[];
  mood: string;
  genre: string;
}): DreamMovieScene[] {
  const sentences = splitSentences(params.body);
  const sceneCount = Math.min(MAX_SCENES, Math.max(MIN_SCENES, sentences.length || MIN_SCENES));
  const secondsPerScene = distributeSeconds(sceneCount);

  const placeText = params.places.length > 0 ? params.places.join("、") : "どこか幻想的な場所";
  const characterText = params.characters.length > 0 ? params.characters.join("、") : "自分";

  return Array.from({ length: sceneCount }, (_, index) => {
    const beat = SCENE_BEATS[index % SCENE_BEATS.length];
    const connector = NARRATION_CONNECTORS[index % NARRATION_CONNECTORS.length];
    const sentence =
      sentences.length > 0 ? sentences[index % sentences.length] : "夢の情景が広がる";
    const seconds = secondsPerScene[index];

    return {
      sceneNumber: index + 1,
      title: beat,
      description: `${sentence}。`,
      narration: `${connector}${sentence}。`,
      imagePrompt: `${placeText}を舞台に、${characterText}が登場するワンシーン。${sentence}。${params.mood}。${params.genre}調の映像。`,
      videoPrompt: `${placeText}で${characterText}が映る${seconds}秒のカット。${sentence}。カメラはゆっくりと動き、${params.mood}を表現する。`,
      estimatedSeconds: seconds,
    };
  });
}

/** 30秒を均等に分配する（端数は前方のシーンに割り振り、合計が必ず30秒になるようにする） */
function distributeSeconds(sceneCount: number): number[] {
  return distributeEvenly(MOVIE_DURATION_SECONDS, sceneCount);
}
