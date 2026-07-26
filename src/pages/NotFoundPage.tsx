import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FilmStrip } from "@/components/common/FilmStrip";

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <p className="font-display text-5xl font-semibold text-gold">404</p>
        <p className="text-sm text-muted-foreground">
          お探しのページは見つかりませんでした。
        </p>
      </div>
      <FilmStrip className="w-32" />
      <Button asChild>
        <Link to="/home">ホームへ戻る</Link>
      </Button>
    </div>
  );
}
