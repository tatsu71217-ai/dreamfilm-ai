import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { DreamsProvider } from "@/hooks/useDreams";
import { RenderJobsProvider } from "@/hooks/useRenderJobs";
import { AppRouter } from "@/router/AppRouter";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { UpdateAvailableBanner } from "@/components/common/UpdateAvailableBanner";

/**
 * Provider階層:
 *   ThemeProvider     ... 見た目(ダーク/ライト)。DOMのclass操作が必要なため最上位に配置
 *   DreamsProvider    ... 夢データ。将来Supabase Auth導入時はここに AuthProvider を挟む想定
 *   RenderJobsProvider ... レンダリングジョブ。DreamsProviderより内側に置き、
 *                          RenderJob生成時にDreamデータ（moviePackage等）を参照できるようにしている
 *
 * UpdateAvailableBanner / OfflineBanner ... 全画面共通のステータスバナー。
 * 画面下部のBottomNavigation（layouts/BottomNavigation.tsx）と競合しないよう、
 * 画面上部に固定した1つのコンテナへまとめて重ねて表示する
 * （Router の外側、画面遷移とは独立した位置に配置している）
 */
function App() {
  return (
    <ThemeProvider>
      <DreamsProvider>
        <RenderJobsProvider>
          <BrowserRouter>
            <div className="safe-top fixed inset-x-0 top-0 z-40 flex flex-col">
              <UpdateAvailableBanner />
              <OfflineBanner />
            </div>
            <AppRouter />
          </BrowserRouter>
        </RenderJobsProvider>
      </DreamsProvider>
    </ThemeProvider>
  );
}

export default App;
