import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { activateWaitingServiceWorker, SW_UPDATE_AVAILABLE_EVENT } from "@/pwa/registerServiceWorker";

/**
 * Service Workerの更新検知に連動するバナー。
 * pwa/registerServiceWorker.ts が発火する `SW_UPDATE_AVAILABLE_EVENT` を購読し、
 * 新しいバージョンが利用可能になったタイミングでのみ表示する。
 */
export function UpdateAvailableBanner() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);

  React.useEffect(() => {
    const handleUpdateAvailable = () => setIsVisible(true);
    window.addEventListener(SW_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
    return () => {
      window.removeEventListener(SW_UPDATE_AVAILABLE_EVENT, handleUpdateAvailable);
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);
    activateWaitingServiceWorker();
    // controllerchange イベントを受けて registerServiceWorker.ts 側が自動的にページを再読み込みする
  };

  if (!isVisible) return null;

  return (
    <div className="safe-top fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 bg-gold px-4 py-2.5 text-[#241905]">
        <p className="flex items-center gap-1.5 text-xs font-medium">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          新しいバージョンが利用可能です
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          disabled={isUpdating}
          className="h-7 px-3 text-xs"
        >
          {isUpdating ? "更新中…" : "更新する"}
        </Button>
      </div>
    </div>
  );
}
