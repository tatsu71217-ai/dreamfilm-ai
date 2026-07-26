import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: string;
  /** 戻るボタンを表示するか (デフォルト true) */
  showBack?: boolean;
  className?: string;
  right?: ReactNode;
}

export function PageHeader({ title, showBack = true, className, right }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "safe-top sticky top-0 z-10 flex items-center gap-2 border-b border-border/60",
        "bg-background/85 px-3 py-3 backdrop-blur-md",
        className,
      )}
    >
      {showBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="前の画面に戻る"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : (
        <div className="w-10" aria-hidden="true" />
      )}
      <h1 className="flex-1 truncate text-center font-display text-base font-semibold">
        {title}
      </h1>
      <div className="flex w-10 items-center justify-end">{right}</div>
    </header>
  );
}
