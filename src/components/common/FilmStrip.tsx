import { cn } from "@/utils/cn";

interface FilmStripProps {
  className?: string;
}

/**
 * DreamFilm AI のシグネチャー装飾要素。
 * 35mmフィルムのパーフォレーション（送り穴）を模した点列で、
 * 「記録された夢が、いつかフィルムになる」という世界観を静かに示す。
 * Splash / Home / Detail の区切り線として、控えめに繰り返し使用する。
 */
export function FilmStrip({ className }: FilmStripProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-3 w-full bg-repeat-x opacity-70", className)}
      style={{
        backgroundImage:
          "radial-gradient(circle, hsl(var(--muted-foreground) / 0.55) 1.4px, transparent 1.6px)",
        backgroundSize: "16px 16px",
        backgroundPosition: "center",
      }}
    />
  );
}
