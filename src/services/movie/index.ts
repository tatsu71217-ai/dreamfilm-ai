import { aiProvider } from "@/services/ai";
import { createMovieGeneratorService } from "@/services/movie/MovieGeneratorService";

/**
 * アプリ全体で使用する MovieGeneratorService の単一インスタンス。
 * hooks/useMovieGenerator.ts からのみ利用する想定。
 */
export const movieGeneratorService = createMovieGeneratorService(aiProvider);

export type { MovieGeneratorService } from "@/services/movie/MovieGeneratorService";
