import { cn } from "@/utils/cn";

interface ScoreBarProps {
  label: string;
  value: number;
  className?: string;
}

/**
 * Dream Score の1項目（例: 映画映え）を、ラベル・数値・ゲージで表示する。
 */
export function ScoreBar({ label, value, className }: ScoreBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-display text-sm font-semibold text-gold">{clamped}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold transition-[width] duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
