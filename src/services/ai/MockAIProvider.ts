import type { AIProvider } from "@/services/ai/AIProvider";
import type {
  DreamMoviePackageResult,
  DreamOrganizationInput,
  DreamOrganizationResult,
  MoviePackageGenerationInput,
} from "@/services/ai/types";
import {
  buildSummary,
  buildTitleSuggestion,
  extractCharacters,
  extractEmotion,
  extractKeywords,
  extractPlaces,
} from "@/services/ai/mockHeuristics";
import { buildMoviePackage } from "@/services/ai/movieHeuristics";

/** 実際のAI呼び出しの体感（処理中表示を意味のあるものにするため）を再現する遅延 */
const ORGANIZE_LATENCY_MS = 1200;
/** Movie Package生成はシーン一覧まで組み立てるため、整理よりやや長めの遅延を設定 */
const MOVIE_PACKAGE_LATENCY_MS = 1600;

/**
 * AI未接続のためのモック実装。
 *
 * `AIProvider` interfaceのみに依存する形で実装しており、将来 実プロバイダーへ差し替える際は
 * services/ai/index.ts の1行を変更するだけで済む。
 */
export class MockAIProvider implements AIProvider {
  async organizeDream(input: DreamOrganizationInput): Promise<DreamOrganizationResult> {
    const trimmedBody = input.body.trim();

    if (trimmedBody.length === 0) {
      // 実プロバイダーでも起こりうる入力エラーの一例として、意図的にthrowする
      throw new Error("本文が空のため、AIによる整理を実行できませんでした。");
    }

    await simulateLatency(ORGANIZE_LATENCY_MS);

    return {
      title: buildTitleSuggestion(trimmedBody, input.title),
      summary: buildSummary(trimmedBody),
      keywords: extractKeywords(trimmedBody),
      emotion: extractEmotion(trimmedBody),
      characters: extractCharacters(trimmedBody),
      places: extractPlaces(trimmedBody),
    };
  }

  async generateMoviePackage(
    input: MoviePackageGenerationInput,
  ): Promise<DreamMoviePackageResult> {
    const trimmedBody = input.body.trim();

    if (trimmedBody.length === 0) {
      throw new Error("本文が空のため、Movie Packageを生成できませんでした。");
    }

    await simulateLatency(MOVIE_PACKAGE_LATENCY_MS);

    return buildMoviePackage({
      title: input.title,
      body: trimmedBody,
      organization: input.organization,
    });
  }
}

function simulateLatency(durationMs: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}
