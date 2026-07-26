import type { DreamMoviePackageResult } from "@/services/ai/types";

export type { DreamMovieScene } from "@/services/ai/types";

/** Movie Packageの尺（秒）。現時点では30秒固定（可変長には未対応） */
export const MOVIE_DURATION_SECONDS = 30;

/**
 * Dream Movie Packageの永続化用の形。
 * services/ai/types.ts の DreamMoviePackageResult に、保存日時を付与したもの。
 * 動画生成AIへ入力するための構造化データであり、動画そのものはこの型には含まれない。
 */
export interface DreamMoviePackage extends DreamMoviePackageResult {
  /**
   * Movie Packageの識別子。
   * RenderJob.moviePackageId から参照されるため、保存のたびに新しく発行する
   * （再生成して保存し直した場合は別バージョンとして扱う）。
   */
  id: string;
  /** Movie Packageを保存した日時 (ISO 8601) */
  generatedAt: string;
}
