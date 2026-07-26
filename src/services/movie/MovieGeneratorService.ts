import type { AIProvider } from "@/services/ai/AIProvider";
import type { DreamMoviePackageResult, MoviePackageGenerationInput } from "@/services/ai/types";
import type { Dream } from "@/types/dream";

/**
 * Dream → Movie Package生成を担うサービス。
 *
 * AI処理は必ずProvider経由で実行する。UI層（pages/hooks）はこのサービスのみに依存し、
 * `AIProvider` を直接importしない。
 */
export interface MovieGeneratorService {
  generate(dream: Dream): Promise<DreamMoviePackageResult>;
}

class DefaultMovieGeneratorService implements MovieGeneratorService {
  constructor(private readonly aiProvider: AIProvider) {}

  async generate(dream: Dream): Promise<DreamMoviePackageResult> {
    const input: MoviePackageGenerationInput = {
      title: dream.title,
      body: dream.body,
      // AI整理が完了していれば、その結果をより豊かな入力として利用する
      organization: dream.organization,
    };

    return this.aiProvider.generateMoviePackage(input);
  }
}

export function createMovieGeneratorService(aiProvider: AIProvider): MovieGeneratorService {
  return new DefaultMovieGeneratorService(aiProvider);
}
