import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { DreamsProvider } from "@/hooks/useDreams";
import { RenderJobsProvider } from "@/hooks/useRenderJobs";
import { AppRouter } from "@/router/AppRouter";
import { UpdateAvailableBanner } from "@/components/common/UpdateAvailableBanner";

/**
 * Provider階層:
 *   ThemeProvider     ... 見た目(ダーク/ライト)。DOMのclass操作が必要なため最上位に配置
 *   DreamsProvider    ... 夢データ。将来Supabase Auth導入時はここに AuthProvider を挟む想定
 *   RenderJobsProvider ... レンダリングジョブ（Sprint6で追加)。DreamsProviderより内側に置き、
 *                          RenderJob生成時にDreamデータ（moviePackage等）を参照できるようにしている
 *
 * UpdateAvailableBanner ... PWAの更新検知バナー（Sprint9で追加）。全画面共通で表示されうるため、
 *                            Router の外側、画面遷移とは独立した位置に配置している
 */
function App() {
  return (
    <ThemeProvider>
      <DreamsProvider>
        <RenderJobsProvider>
          <BrowserRouter>
            <UpdateAvailableBanner />
            <AppRouter />
          </BrowserRouter>
        </RenderJobsProvider>
      </DreamsProvider>
    </ThemeProvider>
  );
}

export default App;
