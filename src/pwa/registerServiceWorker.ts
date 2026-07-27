/**
 * Service Workerの登録と更新検知を行うモジュール。
 *
 * 新しいSWが待機状態(waiting)になったタイミングで、
 * `dreamfilm-ai:sw-update-available` というカスタムイベントを window へ発火する。
 * UI側（components/common/UpdateAvailableBanner.tsx）はこのイベントを購読し、
 * 「更新する」ボタンから `activateWaitingServiceWorker()` を呼び出すことで反映できる。
 *
 * 【自動リロードをユーザー操作時に限定している理由】
 * `controllerchange` は、更新の適用時だけでなく**初回インストール時**にも発火する
 * （SWのactivateで `clients.claim()` を呼ぶと、それまで未制御だったページが制御下に入るため）。
 * ここで無条件にリロードすると、初回訪問中のユーザーの操作が中断される。
 * 特に動画生成はページ内で実時間をかけて録画するため、リロードされると録画ループごと
 * 失われ、進捗が途中で止まったまま復帰しない。
 * そのため「更新する」を押したときだけリロードする。
 */

export const SW_UPDATE_AVAILABLE_EVENT = "dreamfilm-ai:sw-update-available";

/** ユーザーが「更新する」を押して、待機中のSWの有効化を要求したか */
let isUpdateActivationRequested = false;
let hasReloadedForUpdate = false;

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // 既に load が終わっている場合、load リスナーは二度と発火しないため即座に登録する
  if (document.readyState === "complete") {
    startRegistration();
  } else {
    window.addEventListener("load", startRegistration, { once: true });
  }
}

function startRegistration(): void {
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

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // 初回インストール時のclients.claim()による制御開始では、ページを再読み込みしない
    if (!isUpdateActivationRequested || hasReloadedForUpdate) return;
    hasReloadedForUpdate = true;
    window.location.reload();
  });
}

/** 待機中の新しいService Workerを即座に有効化する（controllerchange経由でページが再読み込みされる） */
export function activateWaitingServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  isUpdateActivationRequested = true;

  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    // 待機中のSWが既に有効化済みの場合はcontrollerchangeが来ないため、そのまま再読み込みする
    if (!hasReloadedForUpdate) {
      hasReloadedForUpdate = true;
      window.location.reload();
    }
  });
}
