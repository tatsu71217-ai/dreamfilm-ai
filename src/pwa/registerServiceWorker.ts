/**
 * Service Workerの登録と更新検知を行うモジュール。
 *
 * 新しいSWが待機状態(waiting)になったタイミングで、
 * `dreamfilm-ai:sw-update-available` というカスタムイベントを window へ発火する。
 * UI側（components/common/UpdateAvailableBanner.tsx）はこのイベントを購読し、
 * 「更新する」ボタンから `activateWaitingServiceWorker()` を呼び出すことで反映できる。
 */

export const SW_UPDATE_AVAILABLE_EVENT = "dreamfilm-ai:sw-update-available";

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // 登録直後、既に新しいSWが待機中のケース（前回訪問時にインストール済みだった場合等）
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent(SW_UPDATE_AVAILABLE_EVENT));
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            const isUpdateForExistingInstall =
              installingWorker.state === "installed" && navigator.serviceWorker.controller;

            if (isUpdateForExistingInstall) {
              window.dispatchEvent(new CustomEvent(SW_UPDATE_AVAILABLE_EVENT));
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service Workerの登録に失敗しました。", error);
      });

    let hasReloadedForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloadedForUpdate) return;
      hasReloadedForUpdate = true;
      window.location.reload();
    });
  });
}

/** 待機中の新しいService Workerを即座に有効化する（controllerchange経由でページが再読み込みされる） */
export function activateWaitingServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.getRegistration().then((registration) => {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
  });
}
