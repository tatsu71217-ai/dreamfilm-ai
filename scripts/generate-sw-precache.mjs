// ビルド成果物(dist/assets/*)を列挙し、dist/sw.js の CACHE_VERSION と
// EXTRA_PRECACHE_URLS をビルドごとの実際の値へ書き換える。
// `npm run build` の最終ステップとして実行される（package.json参照）。
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const assetsDir = path.join(distDir, "assets");
const swPath = path.join(distDir, "sw.js");

const PRECACHEABLE_EXTENSIONS = new Set([".js", ".css"]);

function listAssetUrls() {
  return readdirSync(assetsDir)
    .filter((filename) => PRECACHEABLE_EXTENSIONS.has(path.extname(filename)))
    .map((filename) => `/assets/${filename}`);
}

function main() {
  const assetUrls = listAssetUrls();
  const buildId = Date.now().toString(36);

  let sw = readFileSync(swPath, "utf8");

  const versionMarker = 'const CACHE_VERSION = "dev";';
  const precacheMarker = "const EXTRA_PRECACHE_URLS = [];";

  if (!sw.includes(versionMarker)) {
    throw new Error(
      `generate-sw-precache: dist/sw.js に置換対象 ${JSON.stringify(versionMarker)} が見つかりません。sw.jsの構造が変わっていないか確認してください。`,
    );
  }
  if (!sw.includes(precacheMarker)) {
    throw new Error(
      `generate-sw-precache: dist/sw.js に置換対象 ${JSON.stringify(precacheMarker)} が見つかりません。sw.jsの構造が変わっていないか確認してください。`,
    );
  }

  sw = sw.replace(versionMarker, `const CACHE_VERSION = ${JSON.stringify(buildId)};`);
  sw = sw.replace(
    precacheMarker,
    `const EXTRA_PRECACHE_URLS = ${JSON.stringify(assetUrls)};`,
  );

  writeFileSync(swPath, sw, "utf8");

  console.log(
    `[generate-sw-precache] CACHE_VERSION=${buildId} / EXTRA_PRECACHE_URLS: ${assetUrls.length}件を書き込みました。`,
  );
}

main();
