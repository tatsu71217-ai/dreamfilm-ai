import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MOOD_EMOJI, MOOD_LABEL, type Dream } from "@/types/dream";
import { formatDateShortJP } from "@/utils/date";
import { truncateText } from "@/utils/text";

interface DreamCardProps {
  dream: Dream;
}

const EXCERPT_MAX_LENGTH = 48;

export function DreamCard({ dream }: DreamCardProps) {
  return (
    <Link
      to={`/dream/${dream.id}`}
      aria-label={`${dream.title} の詳細を見る`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="flex items-start gap-3 p-4 transition-colors hover:border-gold/50 active:bg-secondary/40">
        <span
          aria-label={`気分: ${MOOD_LABEL[dream.mood]}`}
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-lg"
        >
          {MOOD_EMOJI[dream.mood]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="truncate font-display text-base font-medium text-foreground">
              {dream.title}
            </h3>
            <time
              dateTime={dream.createdAt}
              className="shrink-0 text-xs text-muted-foreground"
            >
              {formatDateShortJP(dream.createdAt)}
            </time>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {truncateText(dream.body, EXCERPT_MAX_LENGTH)}
          </p>
        </div>
        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </Card>
    </Link>
  );
}
