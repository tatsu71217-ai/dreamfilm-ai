/**
 * DreamFilm AI Service Worker
 *
 *  - アプリシェルキャッシュ / 静的ファイルキャッシュ / オフライン起動
 *  - 更新検知（新しいSWが待機中になったらクライアントへ通知できるようにする）
 *
 * CACHE_VERSION と EXTRA_PRECACHE_URLS は `npm run build` の scripts/generate-sw-precache.mjs
 * によって、ビルドごとに実際のハッシュ付きJS/CSSバンドル一覧と一意なビルドIDへ書き換えられる
 * （このファイル自体は書き換え前でも有効なJSとして動作し、その場合は従来通りランタイム
 *  キャッシュのみに委ねる）。ハッシュ付きバンドルも事前キャッシュすることで、デプロイ直後の
 * 初回インストール時点から、そのビルドのオフライン起動が可能になる。
 */

const CACHE_VERSION = "dev";
const SHELL_CACHE = `dreamfilm-ai-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `dreamfilm-ai-runtime-${CACHE_VERSION}`;

/** ビルドで変化しない、経路が固定されたファイルのみを事前キャッシュする */
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

/** ビルドごとにファイル名が変わるJS/CSSバンドル。generate-sw-precache.mjsが書き換える */
const EXTRA_PRECACHE_URLS = [];

/** ランタイムキャッシュの対象とするオリジン（自ドメイン + Googleフォント） */
const RUNTIME_CACHEABLE_ORIGINS = [
  self.location.origin,
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

/** 動的なAPI通信は絶対にキャッシュしない（Google Veo等、常に最新のレスポンスが必要なもの） */
const NEVER_CACHE_HOSTNAMES = ["generativelanguage.googleapis.com"];

// 初回インストール時は待機中のSWが無いため、ここでskipWaiting()を呼ばなくても即座に有効化される。
// 逆に更新時は、利用者が「更新する」を押すまで待機させたい
// （勝手に新しいSWへ切り替えると、生成中の動画などページ内の作業が失われるため）。
// 切り替えの指示は下の message ハンドラで SKIP_WAITING を受け取ったときだけ行う。
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS.concat(EXTRA_PRECACHE_URLS)))
      .catch((error) => {
        console.error("[SW] アプリシェルの事前キャッシュに失敗しました。", error);
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/** クライアント側から SKIP_WAITING を受け取ったら即座に新しいSWへ切り替える（更新検知フローの一部） */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isNeverCacheHost(url) {
  return NEVER_CACHE_HOSTNAMES.some((hostname) => url.hostname.includes(hostname));
}

function isRuntimeCacheableOrigin(url) {
  return RUNTIME_CACHEABLE_ORIGINS.includes(url.origin);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (isNeverCacheHost(url)) {
    // Google Veo等の動的API呼び出しはService Workerが介在せず、常にネットワークへ流す
    return;
  }

  // ナビゲーションリクエスト（画面遷移・URL直接アクセス）:
  // ネットワークを優先し、失敗時（オフライン時）はキャッシュ済みのシェルへフォールバックする
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/index.html", responseClone));
          return response;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then((cached) => cached || caches.match("/") || Response.error()),
        ),
    );
    return;
  }

  if (!isRuntimeCacheableOrigin(url)) {
    return;
  }

  // 静的アセット（JS/CSS/フォント/画像等）: キャッシュ優先、キャッシュになければネットワークから取得して保存する
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then((response) => {
          // クロスオリジン（Googleフォント等）のレスポンスは type: "opaque" となり ok が false になるため、
          // ok または opaque のいずれかであればキャッシュ対象とする
          if (response.ok || response.type === "opaque") {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
