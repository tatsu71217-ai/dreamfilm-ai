import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  MOOD_FILTER_LABEL,
  MOOD_OPTIONS,
  type MoodFilter,
  type SortOrder,
  SORT_ORDER_LABEL,
} from "@/types/dream";
import { cn } from "@/utils/cn";

const MOOD_FILTER_VALUES: MoodFilter[] = [
  "all",
  ...MOOD_OPTIONS.map((option) => option.value),
];

const SORT_ORDER_VALUES: SortOrder[] = ["newest", "oldest"];

interface DreamListControlsProps {
  query: string;
  onQueryChange: (value: string) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  moodFilter: MoodFilter;
  onMoodFilterChange: (value: MoodFilter) => void;
}

export function DreamListControls({
  query,
  onQueryChange,
  sortOrder,
  onSortOrderChange,
  moodFilter,
  onMoodFilterChange,
}: DreamListControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="タイトルで検索"
          aria-label="タイトルで検索"
          className="pl-10"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="並び替え"
          className="inline-flex overflow-hidden rounded-lg border border-border"
        >
          {SORT_ORDER_VALUES.map((value) => {
            const isActive = sortOrder === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSortOrderChange(value)}
                className={cn(
                  "px-3 py-1.5 text-xs transition-colors",
                  isActive
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {SORT_ORDER_LABEL[value]}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label="気分で絞り込み"
        className="flex flex-wrap gap-2"
      >
        {MOOD_FILTER_VALUES.map((value) => {
          const isActive = moodFilter === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onMoodFilterChange(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition-colors",
                isActive
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border bg-secondary/40 text-muted-foreground hover:border-gold/40 hover:text-foreground",
              )}
            >
              {MOOD_FILTER_LABEL[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
