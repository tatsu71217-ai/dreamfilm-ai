import type { Dream, MoodFilter, SortOrder } from "@/types/dream";

/**
 * タイトルによるリアルタイム絞り込み。
 * 大文字/小文字・全角/半角の違いを吸収するため、比較前に正規化する。
 */
export function searchDreamsByTitle(dreams: Dream[], query: string): Dream[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length === 0) {
    return dreams;
  }
  return dreams.filter((dream) => normalize(dream.title).includes(normalizedQuery));
}

export function filterDreamsByMood(dreams: Dream[], moodFilter: MoodFilter): Dream[] {
  if (moodFilter === "all") {
    return dreams;
  }
  return dreams.filter((dream) => dream.mood === moodFilter);
}

export function sortDreams(dreams: Dream[], order: SortOrder): Dream[] {
  const sorted = [...dreams].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return order === "oldest" ? sorted : sorted.reverse();
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
