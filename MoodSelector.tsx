import { MOOD_OPTIONS, type Mood } from "@/types/dream";
import { cn } from "@/utils/cn";

interface MoodSelectorProps {
  value: Mood | null;
  onChange: (mood: Mood) => void;
  /** aria-describedby等で使うエラーメッセージID */
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * 気分を1つ選択するチップ形式のセレクター。
 * Sprint2 WORK_ORDER の「気分選択」要件に対応。
 */
export function MoodSelector({
  value,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: MoodSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="気分を選択"
      aria-describedby={describedBy}
      aria-invalid={invalid}
      className="flex flex-wrap gap-2"
    >
      {MOOD_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected
                ? "border-gold bg-gold/15 text-gold"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-gold/40 hover:text-foreground",
            )}
          >
            <span aria-hidden="true">{option.emoji}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
