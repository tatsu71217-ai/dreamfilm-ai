/** AIによる夢の整理 (organizeDream) への入力 */
export interface DreamOrganizationInput {
  title: string;
  body: string;
}

/** AIによる夢の整理結果 */
export interface DreamOrganizationResult {
  /** AIが提案するタイトル案 */
  title: string;
  /** 本文の要約（2〜3文程度） */
  summary: string;
  keywords: string[];
  /** 推定される感情（1件） */
  emotion: string;
  characters: string[];
  places: string[];
}

/** Dream Movie Packageの1シーン分のデータ */
export interface DreamMovieScene {
  sceneNumber: number;
  /** シーンの見出し（例: 導入/展開/転機 等） */
  title: string;
  description: string;
  narration: string;
  imagePrompt: string;
  videoPrompt: string;
  estimatedSeconds: number;
}

/** Dream Movie Package生成 (generateMoviePackage) が返す結果 */
export interface DreamMoviePackageResult {
  movieTitle: string;
  genre: string;
  mood: string;
  synopsis: string;
  /** 尺（秒）。WORK_ORDER (Sprint5) により現時点では30秒固定 */
  duration: number;
  scenes: DreamMovieScene[];
}

/** Dream Movie Package生成 (generateMoviePackage) への入力 */
export interface MoviePackageGenerationInput {
  title: string;
  body: string;
  /** AI整理（Sprint4）が完了していれば、その結果をより豊かな入力として利用する */
  organization?: DreamOrganizationResult;
}
