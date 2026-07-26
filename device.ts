/**
 * iOS端末（iPhone/iPad）かどうかを判定する。
 * 保存機能（utils/videoActions.ts）で、iOS Safari特有の制約に対応するために使用する。
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;

  const isClassicIOS = /iP(hone|od|ad)/.test(navigator.userAgent);
  // iPadOS 13以降はUser AgentがMacとして報告されるため、タッチ対応の有無で判定する
  const isModernIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isClassicIOS || isModernIPadOS;
}

/**
 * PWAとして（ホーム画面から起動する形で）既に実行中かどうかを判定する。
 * インストール案内バナー（components/common/InstallPrompt.tsx）を、
 * 既にインストール済みのユーザーには表示しないようにするために使用する。
 */
export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const iosStandaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
  const isIOSStandalone = iosStandaloneNavigator.standalone === true;
  const isDisplayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return isIOSStandalone || isDisplayModeStandalone;
}
