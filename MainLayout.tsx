import { Outlet } from "react-router-dom";
import { BottomNavigation } from "@/layouts/BottomNavigation";

/**
 * ボトムナビゲーションを持つ画面（ホーム/記録/設定）向けの共通レイアウト。
 * Dream Detail画面のように没入感を優先したい画面はこのレイアウトの外側で定義する。
 */
export function MainLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-4">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  );
}
