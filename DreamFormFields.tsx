import { MoodSelector } from "@/components/common/MoodSelector";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Mood } from "@/types/dream";
import type { DreamFormErrors } from "@/utils/dream";
import { cn } from "@/utils/cn";

interface DreamFormFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  mood: Mood | null;
  onMoodChange: (mood: Mood) => void;
  errors: DreamFormErrors;
}

/**
 * タイトル・本文・気分の入力欄一式。
 * Dream Record（新規作成）と Dream Edit（編集）の両方から共有される。
 */
export function DreamFormFields({
  title,
  onTitleChange,
  body,
  onBodyChange,
  mood,
  onMoodChange,
  errors,
}: DreamFormFieldsProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="dream-title" className="text-sm font-medium text-foreground">
          タイトル
        </label>
        <Input
          id="dream-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="例: 空を飛んで街を見下ろす夢"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "dream-title-error" : undefined}
          className={cn(errors.title && "border-destructive")}
        />
        {errors.title ? (
          <p id="dream-title-error" className="text-xs text-destructive">
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor="dream-body" className="text-sm font-medium text-foreground">
          見た夢の内容
        </label>
        <Textarea
          id="dream-body"
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder="覚えている夢の内容を書き留めてみましょう。断片的でも大丈夫です。"
          rows={8}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={errors.body ? "dream-body-error" : undefined}
          className={cn("flex-1 resize-none", errors.body && "border-destructive")}
        />
        {errors.body ? (
          <p id="dream-body-error" className="text-xs text-destructive">
            {errors.body}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">気分</span>
        <MoodSelector
          value={mood}
          onChange={onMoodChange}
          aria-invalid={Boolean(errors.mood)}
          aria-describedby={errors.mood ? "dream-mood-error" : undefined}
        />
        {errors.mood ? (
          <p id="dream-mood-error" className="text-xs text-destructive">
            {errors.mood}
          </p>
        ) : null}
      </div>
    </>
  );
}
