import type {
  DreamMoviePackageResult,
  DreamOrganizationInput,
  DreamOrganizationResult,
  MoviePackageGenerationInput,
} from "@/services/ai/types";

/**
 * AI処理を呼び出すための抽象インターフェース。
 *
 * 【設計意図（将来のAIプロバイダー差し替え）】
 * UI層（pages/hooks/services）はこのインターフェースにのみ依存し、具体的な実装
 * （MockAIProvider、あるいは将来の実プロバイダー）を意識しない。
 * data/dreamRepository.ts で採用した「interface + 差し替え可能な実装」のパターンを
 * AIサービス層にも踏襲している。
 *
 * 例）将来の実装イメージ（現時点では未実装。実API呼び出しは行わない）:
 *
 *   class AnthropicAIProvider implements AIProvider {
 *     constructor(private apiKey: string) {}
 *     async organizeDream(input: DreamOrganizationInput): Promise<DreamOrganizationResult> {
 *       const response = await fetch("https://api.anthropic.com/v1/messages", { ... });
 *       // レスポンスをDreamOrganizationResultへマッピングして返す
 *     }
 *     async generateMoviePackage(input: MoviePackageGenerationInput): Promise<DreamMoviePackageResult> {
 *       // 同様に実APIへ問い合わせ、DreamMoviePackageResultへマッピングして返す
 *     }
 *   }
 *
 * プロバイダーの切り替えは services/ai/index.ts の1箇所を差し替えるだけで完結する。
 */
export interface AIProvider {
  /**
   * 夢のタイトル・本文からタイトル案/要約/キーワード/感情/登場人物/場所を生成する。
   * 通信エラーやAI側のエラーは例外(Error)としてthrowする想定。
   */
  organizeDream(input: DreamOrganizationInput): Promise<DreamOrganizationResult>;

  /**
   * 夢（および可能であればAI整理結果）から Dream Movie Package を生成する。
   * 動画・画像そのものの生成は行わず、動画生成AIへ後日入力するための構造化データ
   * （Movie + Scene一覧）を返す。
   * 通信エラーやAI側のエラーは例外(Error)としてthrowする想定。
   */
  generateMoviePackage(input: MoviePackageGenerationInput): Promise<DreamMoviePackageResult>;
}
