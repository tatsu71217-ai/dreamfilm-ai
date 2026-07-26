import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Film } from "lucide-react";
import { FilmStrip } from "@/components/common/FilmStrip";

const SPLASH_DURATION_MS = 2200;

export function SplashPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate("/home", { replace: true });
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="flex animate-fade-in flex-col items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-secondary/60">
          <Film className="h-9 w-9 text-gold" strokeWidth={1.6} aria-hidden="true" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-wide text-foreground">
            DreamFilm AI
          </h1>
          <p className="text-sm text-muted-foreground">夢を、記録する。いつか映画のように。</p>
        </div>
        <FilmStrip className="mt-2 w-40" />
      </div>
    </div>
  );
}
