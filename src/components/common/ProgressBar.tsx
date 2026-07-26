import { cn } from "@/utils/cn";

interface ProgressBarProps {
  /** 0〜100 */
  value: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * 汎用的なプログレスバー。RenderJobの進捗表示など、0〜100のパーセンテージを扱う箇所で使用する。
 */
export function ProgressBar({ value, className, "aria-label": ariaLabel }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold transition-[width] duration-500 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
