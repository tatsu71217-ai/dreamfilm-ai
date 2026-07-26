# SPRINT_REPORT.md

# Sprint情報

- **Sprint番号**: Sprint 9（Phase 2 / PWA対応）
- **実装目的**: DreamFilm AIをPWA化し、iPhone・Android両方でホーム画面に追加できるアプリとして利用可能にする。MVPの機能を維持したまま、ネイティブアプリに近い操作性を実現する。
- **実装概要**: WORK_ORDER_Sprint09.md に基づき、Web App Manifest・Service Worker（アプリシェル/静的ファイルのキャッシュ、オフライン起動、更新検知）・アイコン一式（192/512/Maskable/Apple Touch Icon）・インストール案内バナー（iOS/Android別UI）を実装した。ビルド時にファイル名が変化するJS/CSSバンドルを事前キャッシュに含めない「ランタイムキャッシュ方式」を採用し、ビルドツール追加（vite-plugin-pwa等のnpm新規インストール）なしで実現した。

---

# 実装内容

## 1. Provider設定 → 該当なし（Sprint7の内容。Sprint9はPWA対応）

## 1. PWA設定

- `public/manifest.json` を新規作成: name/short_name/description/theme_color/background_color/display: standalone/start_url/orientation/icons一式を定義
- `index.html` に `<link rel="manifest">`、Apple関連メタタグ（`apple-mobile-web-app-capable` 等）、favicon/apple-touch-iconのlinkを追加

## 2. Service Worker

- `public/sw.js` を新規作成
- アプリシェル（`/`, `/index.html`, `/manifest.json`, アイコン群）を`install`時に事前キャッシュ
- JS/CSSバンドル等、ビルドごとにファイル名が変わる静的ファイルは、初回アクセス時に取得したものをランタイムキャッシュへ保存する方式で対応
- ナビゲーションリクエストはネットワーク優先、失敗時はキャッシュ済み`index.html`にフォールバック（オフライン起動に対応）
- `activate`時に旧バージョンのキャッシュを破棄
- `message`イベントで`SKIP_WAITING`を受け取り、新しいSWへ即座に切り替え可能

## 3. ホーム画面追加

- Web App Manifest・Apple関連メタタグ・アイコン一式により、iPhone Safari・Android Chromeそれぞれの「ホーム画面に追加」機能の要件を満たす構成にした（実機確認は未実施。TODO参照）

## 4. オフライン対応

- UI（アプリシェル）・アイコン・CSS・JavaScript・フォント（Google Fonts）をキャッシュ対象に含めた
- Google Veo等の動的API通信（`generativelanguage.googleapis.com`）は明示的にキャッシュ対象から除外し、常に最新のネットワークリクエストとなるようにした

## 5. アイコン

- `sharp`（画像処理ライブラリ）を用いて、アプリのブランドを反映したフィルムリール意匠のアイコンをSVGから生成
- 192×192・512×512（通常用途）、192×192・512×512（Maskable、セーフゾーンを考慮した余白広めのデザイン）、Apple Touch Icon（180×180）、favicon（32×32, 16×16）を実際に生成し`public/icons/`に配置

## 6. Splash Screen

- Android Chromeは、Manifestの`background_color`・`icons`から起動時のスプラッシュ画面を自動生成する仕様のため、追加の実装は不要（Manifest側の設定で対応済み）
- iOS Safariは同様の自動生成に対応していないため、既存の `pages/SplashPage.tsx`（アプリ起動直後に表示される画面）がコンテンツ面でのスプラッシュ体験を担う構成とした

## 7. インストール案内

- `components/common/InstallPrompt.tsx` を新規作成し、Home画面に表示
- Android等 `beforeinstallprompt` に対応するブラウザ: イベントを捕捉し、ボタンからネイティブインストールダイアログを開く
- iOS Safari: 「共有ボタン→ホーム画面に追加」の手順を案内するテキストを表示（iOSには`beforeinstallprompt`相当のAPIが存在しないため）
- 既にスタンドアロン起動している場合や、一度閉じた場合は再表示しない

## 8〜10. Lighthouse / 動作確認 / 品質確認

- 静的解析（構文チェック・import整合性チェック・manifest/sw.jsの構文検証）は実施した。実機・実ブラウザでのLighthouse計測、インストール・オフライン・動画再生等の動作確認は、本サンドボックス環境の制約により実施できていない（詳細はTODO・懸念事項を参照）

---

# フォルダ構成

## 構成ツリー（Sprint9時点、変更箇所に★）

```
dreamfilm-ai/
├── SPRINT_REPORT.md
├── index.html                                  ★ manifestリンク・PWA関連メタタグを追加
└── public/                                      ★ 新規ディレクトリ
    ├── manifest.json                            ★ 新規
    ├── sw.js                                    ★ 新規（Service Worker）
    └── icons/                                   ★ 新規（生成したアイコン一式）
        ├── icon-192.png / icon-512.png
        ├── icon-maskable-192.png / icon-maskable-512.png
        ├── apple-touch-icon.png
        └── favicon-32.png / favicon-16.png
└── src/
    ├── main.tsx                                 ★ Service Worker登録を追加（本番ビルド時のみ）
    ├── App.tsx                                  ★ UpdateAvailableBannerを追加
    ├── pwa/
    │   └── registerServiceWorker.ts             ★ 新規
    ├── pages/
    │   ├── HomePage.tsx                         ★ InstallPromptを追加
    │   └── （その他は変更なし）
    ├── components/common/
    │   ├── InstallPrompt.tsx                    ★ 新規
    │   ├── UpdateAvailableBanner.tsx             ★ 新規
    │   └── （その他は変更なし）
    └── utils/
        ├── device.ts                            ★ isRunningStandalone を追加
        └── （その他は変更なし）
```

## 主要ファイル説明（Sprint9で追加・変更したもの）

| ファイル | 役割 |
|---|---|
| `public/sw.js` | アプリシェル/静的ファイルのキャッシュとオフライン起動を担う、本Sprintの中核 |
| `src/pwa/registerServiceWorker.ts` | SWのライフサイクル（登録・更新検知・新バージョンへの切り替え）を管理 |
| `src/components/common/InstallPrompt.tsx` | iOS/Androidで挙動が大きく異なる「インストール導線」をプラットフォームごとに出し分け |

---

# 変更履歴

## 追加

- `public/manifest.json`, `public/sw.js`, `public/icons/*`（7ファイル）
- `src/pwa/registerServiceWorker.ts`
- `components/common/InstallPrompt.tsx`, `UpdateAvailableBanner.tsx`
- `utils/device.ts`: `isRunningStandalone`

## 修正

- `index.html`: `<link rel="manifest">`、Apple関連メタタグ、favicon/apple-touch-iconのlinkを追加
- `main.tsx`: 本番ビルド時のみ Service Worker を登録するよう変更（開発時のHMR阻害を回避するため）
- `App.tsx`: `UpdateAvailableBanner` をルーター外側の共通領域に追加
- `pages/HomePage.tsx`: ヘッダー直下に `InstallPrompt` を追加

## 削除

- なし

---

# TODO

## High

- [ ] `npm install` 後の実機ビルド確認（`npm run build` / `npm run lint`）。本サンドボックス環境はネットワークアクセスが無効化されており、Sprint1〜9を通じて実機でのコンパイル検証ができていない（詳細は品質レビュー参照）
- [ ] **実機確認が必須（最重要）**: 本Sprintの完了条件（iPhone/Androidでのホーム画面追加、オフライン起動、Standalone起動、Service Worker動作）はいずれも実際のiOS Safari / Android Chromeでのみ検証可能である。本サンドボックス環境はブラウザ実行自体ができないため、**一切未検証**。`npm run build && npm run preview` 等でビルドしたものを実機（またはローカルネットワーク経由でスマートフォン）から開き、(1) ホーム画面に追加、(2) 機内モードでの再起動、(3) Service Workerの登録状況（開発者ツール）を確認すること
- [ ] **Lighthouse計測が未実施**: WORK_ORDERの目標値（PWA:100, Accessibility:95+, Best Practices:95+, Performance:90+）に対する実測は、本サンドボックス環境でLighthouse CLI/Chrome DevToolsを実行できないため未実施。ビルド後、Chrome DevToolsのLighthouseタブで計測することを強く推奨する
- [ ] **PM確認事項**: Service Workerは「ビルドごとにファイル名が変わるJS/CSSバンドルをランタイムキャッシュで扱う」方式を採用した（vite-plugin-pwa等の追加パッケージがネットワーク制約によりインストールできなかったため）。この方式では「一度もオンラインで開いたことがない状態からの完全オフライン起動」はできない（PWAとして一般的な制約だが、要件解釈の確認のため記載する）

## Medium

- [ ] Splash Screenについて、iOS Safari向けの `apple-touch-startup-image`（画面サイズごとの専用スプラッシュ画像）は実装していない。既存の`SplashPage.tsx`によるコンテンツ面での代替に留めた。より作り込んだ起動体験が必要な場合は次Sprint以降で検討する
- [ ] `InstallPrompt`はHomePageにのみ配置しており、Splash画面や初回起動直後には表示されない（Home到達後に表示される）。「初回利用時」の解釈として妥当か確認したい
- [ ] Service Workerの`fetch`ハンドラは、Google Fonts以外のクロスオリジンリソースを一律キャッシュ対象外としている。将来的に他の外部リソースを追加する場合は`RUNTIME_CACHEABLE_ORIGINS`への追加が必要

## Low

- [ ] PWAアイコンは独自生成のフィルムリール意匠（`sharp`によるSVG→PNG変換）。デザインレビューを経ていないプレースホルダーに近い扱いとして捉えていただきたい
- [ ] Service Workerのキャッシュバージョン管理は単純な文字列定数（`CACHE_VERSION = "v1"`）。将来的にビルドプロセスと連動した自動バージョニングを検討する余地がある

---

# 品質レビュー

## TypeScript

- Sprint1〜8と同じ制約により、本サンドボックス環境で `tsc --noEmit` を用いた実機の型検証は実施できなかった。
- 代替として以下を実施し、問題は検出されなかった:
  - TypeScriptコンパイラAPI (`ts.transpileModule`) による全src配下ファイルの構文チェック → エラーなし
  - 全ファイルの `@/` パスエイリアスimportについて、参照先ファイルの存在およびnamed/default exportとの整合性を静的スクリプトで自動照合 → 不整合なし
  - `public/manifest.json` のJSON構文検証（`JSON.parse`） → 正常
  - `public/sw.js` のJavaScript構文検証（`node --check`） → 正常（本ファイルはTypeScriptのビルド対象外のためESLint/tscの対象にもならないが、構文自体は別途検証した）
  - `beforeinstallprompt` / `navigator.standalone` 等、標準のTypeScript DOM libに含まれない可能性のあるAPIについて、ローカルな型定義（`BeforeInstallPromptEvent`等）を用いて型エラーを回避
- **未検証事項（High TODOに記載済み）**: 開発者側で `npm install && npx tsc --noEmit` を実行し、型定義パッケージを含めた完全な型チェックを行うことを推奨する。

## ESLint

- 同様の理由で実機実行は未実施。設定ファイルはSprint1から変更なし。
- `public/sw.js` は拡張子が`.js`のため、`eslint . --ext ts,tsx` の対象外であることを確認済み（意図的にビルド非対象としている）。
- 未使用importのヒューリスティック検査を全ファイルに対して再実行し、問題は検出されなかった。
- 開発者側で `npm install && npm run lint` の実行を推奨する。

## Build Success / PWA Build Success

- Vite標準の `public/` ディレクトリ機構を利用しており、`vite.config.ts` の変更は不要（`public/`配下のファイルはビルド時にそのままdistルートへコピーされる）。
- ただし実際に `npm run build` を実行してのビルド成功確認は、本サンドボックス環境でのnpmインストール不可のため未実施（TODO参照）。

## UI

- `InstallPrompt` / `UpdateAvailableBanner` は既存のデザイントークン（`border-gold`, `bg-gold`等）のみを使用し、既存画面との統一感を保っている。
- アイコンはアプリのブランドカラー（黒基調+ゴールド）に沿ったフィルムリール意匠で統一した。

## UX

- インストール案内はiOS/Androidで文言・操作方法を出し分け、それぞれの端末で実際に迷わず操作できるよう配慮した。
- 更新検知バナーは画面最上部に控えめに表示し、「更新する」を押すまでは通常利用を妨げない設計にした。

## 保守性

- Service Workerのキャッシュ戦略（ナビゲーション/静的アセット/APIの3分岐）をコメント付きで明示し、将来のキャッシュ対象追加が`RUNTIME_CACHEABLE_ORIGINS`等の定数変更で完結するようにした。
- PWA関連のロジック（登録・更新検知）を`src/pwa/`という専用ディレクトリに切り出し、既存の`services/`（AI・動画関連）とは責務を分離した。

## 拡張性

- 将来的にビルドプロセス側でprecacheリストを自動生成する仕組み（vite-plugin-pwa等）を導入する場合も、`public/sw.js`のキャッシュ戦略部分（fetchハンドラ）はそのまま流用しやすい構成にしている。

## セキュリティ

- Service WorkerはGoogle Veo等の動的API（`generativelanguage.googleapis.com`）を明示的にキャッシュ対象から除外しており、APIキーを含むリクエスト/レスポンスがキャッシュに残る心配はない。
- Service Workerのスコープはデフォルト（ルート`/`）のままとし、意図しない範囲までの介入を防いでいる。

## パフォーマンス

- ランタイムキャッシュにより、2回目以降の訪問では静的アセットの再ダウンロードが不要になり、体感速度の向上が期待できる（実測は未実施）。
- Service Worker自体の処理はキャッシュの読み書きのみで、追加の重い処理は行っていない。

---

# 懸念事項

- 本サンドボックス環境のネットワーク制限・ブラウザ実行不可という制約により、Sprint1〜9を通じて実機・実ブラウザでの検証が一切できていない。**特にSprint9はPWAという性質上、実機での「インストール」「オフライン起動」「Service Worker登録」の確認なしには完了を主張できない**。MVPおよびPWA対応を正式にリリースする前に、iPhone実機のSafari、Android実機のChromeそれぞれでの動作確認を最優先事項として実施すること。
- Lighthouseスコアの目標値（PWA:100等）についても同様に実測できていない。ビルド後、Chrome DevToolsまたは`npx lighthouse`（開発者手元の環境）で計測することを推奨する。
- vite-plugin-pwa等のビルド支援ツールを使わず手動でService Workerを実装したため、Viteのハッシュ付きバンドルファイルを厳密に事前キャッシュすることができていない（ランタイムキャッシュ方式で代替）。将来的な保守性・キャッシュ精度の観点では、ネットワーク環境が使える開発環境で改めてvite-plugin-pwa等の導入を検討する価値がある。
- アイコンデザインは正式なブランドガイドラインに基づくものではなく、既存のFilmStripコンポーネント等と統一感を持たせた暫定デザインである。
