import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { DreamFormFields } from "@/components/common/DreamFormFields";
import { AutoSaveIndicator } from "@/components/common/AutoSaveIndicator";
import { Button } from "@/components/ui/button";
import { useDreams } from "@/hooks/useDreams";
import { useDreamForm } from "@/hooks/useDreamForm";
import { editDreamDraftKey } from "@/types/draft";
import type { Mood } from "@/types/dream";
import { isDreamFormValid, toCreateDreamInput } from "@/utils/dream";

export function DreamEditPage() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const navigate = useNavigate();
  const { getDreamById, updateDream, isLoading } = useDreams();

  const dream = dreamId ? getDreamById(dreamId) : undefined;

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="夢を編集する" />
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">読み込み中…</p>
      </div>
    );
  }

  if (!dream) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PageHeader title="夢を編集する" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            編集対象の夢が見つかりませんでした。削除されたか、URLが正しくない可能性があります。
          </p>
          <Button asChild variant="secondary">
            <Link to="/home">ホームへ戻る</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DreamEditForm
      key={dream.id}
      dreamId={dream.id}
      initialTitle={dream.title}
      initialBody={dream.body}
      initialMood={dream.mood}
      onSaved={() => navigate(`/dream/${dream.id}`)}
      updateDream={updateDream}
    />
  );
}

interface DreamEditFormProps {
  dreamId: string;
  initialTitle: string;
  initialBody: string;
  initialMood: Mood;
  onSaved: () => void;
  updateDream: ReturnType<typeof useDreams>["updateDream"];
}

/**
 * フォーム部分を別コンポーネントに分離している理由:
 * useDreamForm はマウント時に一度だけ下書きチェックを行うため、
 * 対象の夢(id)が変わった場合はフックを再初期化させたい。
 * 親側で `key={dream.id}` を指定してこのコンポーネントごと再マウントすることで実現している。
 */
function DreamEditForm({
  dreamId,
  initialTitle,
  initialBody,
  initialMood,
  onSaved,
  updateDream,
}: DreamEditFormProps) {
  const {
    title,
    setTitle,
    body,
    setBody,
    mood,
    setMood,
    errors,
    validate,
    isDraftRestored,
    lastAutoSavedAt,
    clearDraft,
  } = useDreamForm({
    draftKey: editDreamDraftKey(dreamId),
    initialValues: { title: initialTitle, body: initialBody, mood: initialMood },
  });

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaveError(null);

    const values = { title, body, mood };
    validate();
    if (!isDreamFormValid(values)) {
      return;
    }

    setIsSaving(true);
    try {
      await updateDream(dreamId, toCreateDreamInput(values));
      clearDraft();
      onSaved();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "夢の更新に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="夢を編集する" />

      <form onSubmit={handleSave} noValidate className="flex flex-1 flex-col gap-6 px-5 py-6">
        {isDraftRestored ? (
          <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
            前回編集を中断した内容を復元しました。続きから編集できます。
          </p>
        ) : null}

        <DreamFormFields
          title={title}
          onTitleChange={setTitle}
          body={body}
          onBodyChange={setBody}
          mood={mood}
          onMoodChange={setMood}
          errors={errors}
        />

        <AutoSaveIndicator lastAutoSavedAt={lastAutoSavedAt} />

        {saveError ? (
          <p role="alert" className="text-sm text-destructive">
            {saveError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isSaving} className="w-full">
          {isSaving ? "更新中…" : "更新を保存する"}
        </Button>
      </form>
    </div>
  );
}
