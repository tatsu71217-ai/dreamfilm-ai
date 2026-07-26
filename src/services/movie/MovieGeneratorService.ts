import type { AIProvider } from "@/services/ai/AIProvider";
import type { DreamMoviePackageResult, MoviePackageGenerationInput } from "@/services/ai/types";
import type { Dream } from "@/types/dream";

/**
 * Dream → Movie Package生成を担うサービス。
 *
 * WORK_ORDER (Sprint5) の「AI処理はProvider経由で実行すること。UIから直接AIを呼ばないこと。」
 * という要件に対応する。UI層（pages/hooks）はこのサービスのみに依存し、`AIProvider` を
 * 直接importしない。
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
      // AI整理（Sprint4）が完了していれば、その結果をより豊かな入力として利用する
      organization: dream.organization,
    };

    return this.aiProvider.generateMoviePackage(input);
  }
}

export function createMovieGeneratorService(aiProvider: AIProvider): MovieGeneratorService {
  return new DefaultMovieGeneratorService(aiProvider);
}
