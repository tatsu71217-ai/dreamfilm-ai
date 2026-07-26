import * as React from "react";
import { movieGeneratorService } from "@/services/movie";
import type { DreamMoviePackageResult } from "@/services/ai/types";
import type { Dream } from "@/types/dream";

export type MovieGeneratorStatus = "idle" | "processing" | "success" | "error";

interface UseMovieGeneratorReturn {
  status: MovieGeneratorStatus;
  result: DreamMoviePackageResult | null;
  errorMessage: string | null;
  /** Dream Movie Packageの生成を実行する */
  generate: (dream: Dream) => Promise<void>;
  /** 状態をidleへ戻す（結果・エラーをクリアする） */
  reset: () => void;
}

/**
 * 「映画化する」機能のための状態管理フック。
 *
 * UIコンポーネント（pages/DreamMoviePage.tsx）はこのフックを通じてのみ
 * services/movie とやり取りする（AIProviderを直接呼び出さない）。
 * hooks/useDreamOrganizer.ts と同じ設計パターンを踏襲している。
 */
export function useMovieGenerator(): UseMovieGeneratorReturn {
  const [status, setStatus] = React.useState<MovieGeneratorStatus>("idle");
  const [result, setResult] = React.useState<DreamMoviePackageResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const generate = React.useCallback(async (dream: Dream) => {
    setStatus("processing");
    setErrorMessage(null);

    try {
      const generated = await movieGeneratorService.generate(dream);
      setResult(generated);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "映画化に失敗しました。時間をおいて再度お試しください。",
      );
      setStatus("error");
    }
  }, []);

  const reset = React.useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return { status, result, errorMessage, generate, reset };
}
