import * as React from "react";
import { Link } from "react-router-dom";
import { Moon, NotebookPen, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilmStrip } from "@/components/common/FilmStrip";
import { DreamCard } from "@/components/common/DreamCard";
import { DreamListControls } from "@/components/common/DreamListControls";
import { InstallPrompt } from "@/components/common/InstallPrompt";
import { useDreams } from "@/hooks/useDreams";
import type { MoodFilter, SortOrder } from "@/types/dream";
import { formatDateLongJP } from "@/utils/date";
import { filterDreamsByMood, searchDreamsByTitle, sortDreams } from "@/utils/dreamFilters";

export function HomePage() {
  const { dreams, isLoading } = useDreams();
  const today = new Date();

  const [query, setQuery] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("newest");
  const [moodFilter, setMoodFilter] = React.useState<MoodFilter>("all");

  const visibleDreams = React.useMemo(() => {
    const byTitle = searchDreamsByTitle(dreams, query);
    const byMood = filterDreamsByMood(byTitle, moodFilter);
    return sortDreams(byMood, sortOrder);
  }, [dreams, query, moodFilter, sortOrder]);

  const hasAnyDreams = dreams.length > 0;
  const hasActiveFilters = query.trim().length > 0 || moodFilter !== "all";

  const handleClearFilters = () => {
    setQuery("");
    setMoodFilter("all");
  };

  return (
    <div className="flex flex-col gap-8 px-5 pb-6 pt-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{formatDateLongJP(today)}</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">おかえりなさい</h1>
      </header>

      <InstallPrompt />

      <Button asChild size="lg" className="h-16 w-full text-lg">
        <Link to="/record">
          <NotebookPen className="h-5 w-5" aria-hidden="true" />
          夢を記録する
        </Link>
      </Button>

      <FilmStrip />

      <section className="flex flex-col gap-4" aria-labelledby="dream-list-heading">
        <h2 id="dream-list-heading" className="font-display text-lg font-semibold">
          夢の記録
        </h2>

        {hasAnyDreams ? (
          <DreamListControls
            query={query}
            onQueryChange={setQuery}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            moodFilter={moodFilter}
            onMoodFilterChange={setMoodFilter}
          />
        ) : null}

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">読み込み中…</p>
        ) : !hasAnyDreams ? (
          // Empty State (1): 初回利用時の案内。まだ一度も夢を記録していない状態。
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-gold">
              <Moon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">
              まだ記録がありません。
              <br />
              最初の夢を記録してみましょう。
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link to="/record">夢を記録する</Link>
            </Button>
          </div>
        ) : visibleDreams.length === 0 ? (
          // Empty State (2): 検索・フィルターの結果が0件だった状態。
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <SearchX className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted-foreground">
              条件に一致する夢が見つかりませんでした。
            </p>
            {hasActiveFilters ? (
              <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                絞り込みをクリア
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visibleDreams.map((dream) => (
              <DreamCard key={dream.id} dream={dream} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
