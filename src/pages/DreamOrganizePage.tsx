import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { OrganizationResultCard } from "@/components/common/OrganizationResultCard";
import { Button } from "@/components/ui/button";
import { useDreams } from "@/hooks/useDreams";
import { useDreamOrganizer } from "@/hooks/useDreamOrganizer";

export function DreamOrganizePage() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const navigate = useNavigate();
  const { getDreamById, saveOrganization, isLoading } = useDreams();
  const { status, result, errorMessage, organize, reset } = useDreamOrganizer();

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const dream = dreamId ? getDreamById(dreamId) : undefined;

  const handleOrganize = () => {
    if (!dream) return;
    setSaveError(null);
    void organize({ title: dream.title, body: dream.body });
  };

  const handleSave = async () => {
    if (!dream || !result) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveOrganization(dream.id, { ...result, organizedAt: new Date().toISOString() });
      navigate(`/dream/${dream.id}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "AI整理結果の保存に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="AIで整理する" />
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!dream) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="AIで整理する" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            対象の夢が見つかりませんでした。削除されたか、URLが正しくない可能性があります。
          </p>
          <Button asChild variant="secondary">
            <Link to="/home">ホームへ戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 既に整理済みの場合は、フックの結果より保存済みデータを優先して表示する
  // （このページを開き直しただけで前回の結果が見えることを保証するため）
  const displayedResult = result ?? dream.organization ?? null;

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="AIで整理する" />

      <div className="flex flex-1 flex-col gap-6 px-5 py-6">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            「{dream.title}」の内容から、タイトル案・要約・キーワード・感情・登場人物・場所をAIが整理します。
          </p>
          <Button
            type="button"
            onClick={handleOrganize}
            disabled={status === "processing"}
            className="mt-1"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {status === "processing"
              ? "整理中…"
              : dream.organization || result
                ? "もう一度AIで整理する"
                : "AIで整理する"}
          </Button>
        </div>

        {status === "processing" ? (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center"
          >
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            <p className="text-sm text-muted-foreground">AIが夢を整理しています…</p>
          </div>
        ) : null}

        {status === "error" ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
          >
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button type="button" variant="secondary" size="sm" onClick={reset}>
              閉じる
            </Button>
          </div>
        ) : null}

        {displayedResult ? (
          <>
            <OrganizationResultCard
              result={displayedResult}
              title={result ? "整理結果（プレビュー）" : "AI整理結果（保存済み）"}
            />

            {result ? (
              <>
                {saveError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {saveError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? "保存中…" : "この内容を保存する"}
                </Button>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
