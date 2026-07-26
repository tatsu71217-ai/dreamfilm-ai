import * as React from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isIOS, isRunningStandalone } from "@/utils/device";

const DISMISSED_STORAGE_KEY = "dreamfilm-ai:install-prompt-dismissed";

/** ブラウザ非標準の beforeinstallprompt イベントの最小限の型定義 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/**
 * ホーム画面への追加を案内するバナー。iPhone/Androidそれぞれで最適な案内を出し分ける。
 *
 * - Android Chrome等: `beforeinstallprompt` イベントを捕捉し、ボタンからネイティブのインストールダイアログを開く
 * - iOS Safari: `beforeinstallprompt` に相当するAPIが存在しないため、
 *   「共有ボタン→ホーム画面に追加」という手順を案内するテキストを表示する
 *
 * 既にホーム画面から起動している場合（スタンドアロン表示）や、
 * 一度閉じた場合は再表示しない。
 */
export function InstallPrompt() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isIOSDevice] = React.useState(() => isIOS());

  React.useEffect(() => {
    if (isRunningStandalone()) return;
    if (window.localStorage.getItem(DISMISSED_STORAGE_KEY)) return;

    if (isIOSDevice) {
      // iOSは beforeinstallprompt が発火しないため、案内バナーを直接表示する
      setIsVisible(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isIOSDevice]);

  const handleDismiss = () => {
    setIsVisible(false);
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-gold">
        <Download className="h-4 w-4" aria-hidden="true" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {isIOSDevice ? (
          <p className="text-sm text-foreground/90">
            ホーム画面に追加すると、アプリのように起動できます。
            <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              共有ボタン
              <Share className="inline h-3.5 w-3.5" aria-hidden="true" />
              から「ホーム画面に追加」
              <SquarePlus className="inline h-3.5 w-3.5" aria-hidden="true" />
              を選択してください。
            </span>
          </p>
        ) : (
          <>
            <p className="text-sm text-foreground/90">
              ホーム画面に追加すると、アプリのように起動できます。
            </p>
            <Button type="button" size="sm" onClick={handleInstallClick} className="self-start">
              ホーム画面に追加
            </Button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="閉じる"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
