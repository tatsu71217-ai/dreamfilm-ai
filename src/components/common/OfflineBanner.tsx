import * as React from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const RECONNECTED_MESSAGE_DURATION_MS = 3000;

/**
 * オフライン中は常時バナーを表示し、「保存済みのデータのみ閲覧できる」ことを案内する。
 * オフライン→オンラインへ復帰したタイミングでは、一定時間だけ復帰メッセージを表示する。
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = React.useState(false);
  const wasOfflineRef = React.useRef(false);

  React.useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setShowReconnected(false);
      return;
    }

    if (!wasOfflineRef.current) {
      return;
    }
    wasOfflineRef.current = false;
    setShowReconnected(true);
    const timer = window.setTimeout(
      () => setShowReconnected(false),
      RECONNECTED_MESSAGE_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div
        className="mx-auto flex max-w-md items-center justify-center gap-1.5 bg-secondary px-4 py-2 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        オフラインです。保存済みのデータのみ閲覧できます。
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        className="mx-auto flex max-w-md items-center justify-center gap-1.5 bg-gold/15 px-4 py-2 text-xs text-gold"
        role="status"
        aria-live="polite"
      >
        <Wifi className="h-3.5 w-3.5" aria-hidden="true" />
        オンラインに復帰しました
      </div>
    );
  }

  return null;
}
