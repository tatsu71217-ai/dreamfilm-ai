import * as React from "react";
import { aiProvider } from "@/services/ai";
import type { DreamOrganizationInput, DreamOrganizationResult } from "@/services/ai/types";

export type DreamOrganizerStatus = "idle" | "processing" | "success" | "error";

interface UseDreamOrganizerReturn {
  status: DreamOrganizerStatus;
  result: DreamOrganizationResult | null;
  errorMessage: string | null;
  /** AIによる整理を実行する */
  organize: (input: DreamOrganizationInput) => Promise<void>;
  /** 状態をidleへ戻す（結果・エラーをクリアする） */
  reset: () => void;
}

/**
 * 「AIで整理する」機能のための状態管理フック。
 *
 * UIコンポーネント（pages/DreamOrganizePage.tsx）はこのフックを通じてのみ
 * AIサービス層 (services/ai) とやり取りする。処理中/成功/エラーの状態遷移をここに集約し、
 * ページコンポーネントは表示に専念できるようにしている。
 */
export function useDreamOrganizer(): UseDreamOrganizerReturn {
  const [status, setStatus] = React.useState<DreamOrganizerStatus>("idle");
  const [result, setResult] = React.useState<DreamOrganizationResult | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const organize = React.useCallback(async (input: DreamOrganizationInput) => {
    setStatus("processing");
    setErrorMessage(null);

    try {
      const organized = await aiProvider.organizeDream(input);
      setResult(organized);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "AIによる整理に失敗しました。時間をおいて再度お試しください。",
      );
      setStatus("error");
    }
  }, []);

  const reset = React.useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorMessage(null);
  }, []);

  return { status, result, errorMessage, organize, reset };
}
