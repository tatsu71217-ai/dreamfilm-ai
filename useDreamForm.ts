import * as React from "react";
import { draftStorage } from "@/data/draftStorage";
import type { Mood } from "@/types/dream";
import { validateDreamForm, type DreamFormErrors } from "@/utils/dream";

const AUTO_SAVE_DEBOUNCE_MS = 600;

export interface DreamFormInitialValues {
  title: string;
  body: string;
  mood: Mood | null;
}

interface UseDreamFormOptions {
  /** このフォームインスタンスの下書き保存キー（新規作成/編集で別キーにすること） */
  draftKey: string;
  /** 下書きが無かった場合に使う初期値（編集時は元データ、新規作成時は空） */
  initialValues: DreamFormInitialValues;
}

/**
 * Dream Record / Dream Edit 画面で共有するフォーム状態管理フック。
 *
 * 責務:
 *  - タイトル/本文/気分の入力State管理
 *  - 入力チェック（utils/dream.ts の validateDreamForm に委譲）
 *  - 自動保存（下書き）: 入力停止から一定時間後にLocalStorageへ保存し、
 *    次回このフォームを開いたときに復元する。保存済みデータ (dreamRepository) とは
 *    別のストレージ領域 (data/draftStorage.ts) を使うことで区別している。
 */
export function useDreamForm({ draftKey, initialValues }: UseDreamFormOptions) {
  const [title, setTitle] = React.useState(initialValues.title);
  const [body, setBody] = React.useState(initialValues.body);
  const [mood, setMood] = React.useState<Mood | null>(initialValues.mood);
  const [errors, setErrors] = React.useState<DreamFormErrors>({});
  const [isDraftRestored, setIsDraftRestored] = React.useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = React.useState<string | null>(null);

  // 下書きが存在すればフォームの初期値より優先して復元する（マウント時に一度だけ実行）
  const hasCheckedDraftRef = React.useRef(false);
  React.useEffect(() => {
    if (hasCheckedDraftRef.current) return;
    hasCheckedDraftRef.current = true;

    const draft = draftStorage.get(draftKey);
    if (draft) {
      setTitle(draft.title);
      setBody(draft.body);
      setMood(draft.mood);
      setIsDraftRestored(true);
      setLastAutoSavedAt(draft.savedAt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // 入力が落ち着いてから自動保存する（デバウンス）。
  // 下書きチェック前に空値で上書き保存してしまわないよう、チェック完了後のみ動作させる。
  React.useEffect(() => {
    if (!hasCheckedDraftRef.current) return;
    if (title.length === 0 && body.length === 0 && mood === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      draftStorage.set(draftKey, { title, body, mood, savedAt });
      setLastAutoSavedAt(savedAt);
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draftKey, title, body, mood]);

  const clearDraft = React.useCallback(() => {
    draftStorage.remove(draftKey);
    setLastAutoSavedAt(null);
    setIsDraftRestored(false);
  }, [draftKey]);

  const validate = React.useCallback(() => {
    const validationErrors = validateDreamForm({ title, body, mood });
    setErrors(validationErrors);
    return validationErrors;
  }, [title, body, mood]);

  return {
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
  };
}
