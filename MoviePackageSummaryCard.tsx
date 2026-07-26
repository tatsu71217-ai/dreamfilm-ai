import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DreamMoviePackage } from "@/types/movie";

interface MoviePackageSummaryCardProps {
  moviePackage: DreamMoviePackage;
  dreamId: string;
}

/**
 * Dream Detail画面用の、Movie Packageの簡易表示。
 * 全シーンの詳細（Prompt含む）はDetail画面には表示しきれないため、
 * 要点のみを見せて詳細ページ (/dream/:id/movie) へ誘導する。
 */
export function MoviePackageSummaryCard({ moviePackage, dreamId }: MoviePackageSummaryCardProps) {
  return (
    <Link
      to={`/dream/${dreamId}/movie`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="transition-colors hover:border-gold/50">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <CardTitle>{moviePackage.movieTitle}</CardTitle>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="gold">{moviePackage.genre}</Badge>
            <Badge variant="curtain">{moviePackage.mood}</Badge>
            <Badge variant="outline">{moviePackage.scenes.length}シーン</Badge>
          </div>
          <p className="line-clamp-2 text-sm text-muted-foreground">{moviePackage.synopsis}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
