import { CheckCircle2 } from "lucide-react";

interface AutoSaveIndicatorProps {
  lastAutoSavedAt: string | null;
}

const TIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * 自動保存された「下書き」の状態を示すインジケーター。
 * 「保存する」ボタンによる本保存とは明確に区別し、あくまで一時的な下書きであることを伝える。
 */
export function AutoSaveIndicator({ lastAutoSavedAt }: AutoSaveIndicatorProps) {
  if (!lastAutoSavedAt) {
    return null;
  }

  const time = TIME_FORMATTER.format(new Date(lastAutoSavedAt));

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      下書きを自動保存しました（{time}）
    </p>
  );
}
