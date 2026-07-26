import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { registerServiceWorker } from "@/pwa/registerServiceWorker";
import "@/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "ルート要素 (#root) が見つかりません。index.html を確認してください。",
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// PWA: Service Workerを登録する。
// 開発時(Vite dev server)ではキャッシュがHMRの妨げになるため、本番ビルド時のみ登録する。
if (import.meta.env.PROD) {
  registerServiceWorker();
}
