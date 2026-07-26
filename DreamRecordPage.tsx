import * as React from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { DreamFormFields } from "@/components/common/DreamFormFields";
import { AutoSaveIndicator } from "@/components/common/AutoSaveIndicator";
import { Button } from "@/components/ui/button";
import { useDreams } from "@/hooks/useDreams";
import { useDreamForm } from "@/hooks/useDreamForm";
import { newDreamDraftKey } from "@/types/draft";
import { isDreamFormValid, toCreateDreamInput } from "@/utils/dream";

export function DreamRecordPage() {
  const navigate = useNavigate();
  const { addDream } = useDreams();

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
    draftKey: newDreamDraftKey(),
    initialValues: { title: "", body: "", mood: null },
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
      await addDream(toCreateDreamInput(values));
      clearDraft();
      navigate("/home");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "夢の保存に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <PageHeader title="夢を記録する" />

      <form onSubmit={handleSave} noValidate className="flex flex-1 flex-col gap-6 px-5 py-6">
        {isDraftRestored ? (
          <p className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
            前回入力を中断した内容を復元しました。続きから記録できます。
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
          {isSaving ? "保存中…" : "保存する"}
        </Button>
      </form>
    </div>
  );
}
