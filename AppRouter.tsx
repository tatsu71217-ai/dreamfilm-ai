import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { SplashPage } from "@/pages/SplashPage";
import { HomePage } from "@/pages/HomePage";
import { DreamRecordPage } from "@/pages/DreamRecordPage";
import { DreamDetailPage } from "@/pages/DreamDetailPage";
import { DreamEditPage } from "@/pages/DreamEditPage";
import { DreamOrganizePage } from "@/pages/DreamOrganizePage";
import { DreamMoviePage } from "@/pages/DreamMoviePage";
import { RenderPage } from "@/pages/RenderPage";
import { RenderHistoryPage } from "@/pages/RenderHistoryPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * アプリ全体のルーティング定義。
 *
 * - "/"                起動時のSplash（ボトムナビなし）
 * - "/home" "/record" "/settings"  MainLayout配下（ボトムナビあり）
 * - "/dream/:dreamId"           Dream Detail（没入表示のためボトムナビなし）
 * - "/dream/:dreamId/edit"      Dream Edit（Detailからの一連の操作として、同様にボトムナビなし）
 * - "/dream/:dreamId/organize"  AIで整理する（Detailからの一連の操作として、同様にボトムナビなし）
 * - "/dream/:dreamId/movie"     映画化する（Detailからの一連の操作として、同様にボトムナビなし）
 * - "/render/:jobId"            動画生成（Render）の状況表示（同様にボトムナビなし）
 * - "/render-history"           レンダリング履歴一覧（設定画面から遷移。同様にボトムナビなし）
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />

      <Route element={<MainLayout />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/record" element={<DreamRecordPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/dream/:dreamId" element={<DreamDetailPage />} />
      <Route path="/dream/:dreamId/edit" element={<DreamEditPage />} />
      <Route path="/dream/:dreamId/organize" element={<DreamOrganizePage />} />
      <Route path="/dream/:dreamId/movie" element={<DreamMoviePage />} />
      <Route path="/render/:jobId" element={<RenderPage />} />
      <Route path="/render-history" element={<RenderHistoryPage />} />

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
