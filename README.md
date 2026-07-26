# DreamFilm AI

見た夢を記録し、AIで整理し、Movie Package（映画化用の構造化データ）を経て、
ショートムービーとして生成・確認・保存・共有できるアプリです。
React + TypeScript + Vite + Tailwind CSS + shadcn/ui で構築された、
PWA対応のモバイルファーストWebアプリです。

## 主な機能

- 夢の記録・編集・削除・検索・並び替え・気分フィルター（LocalStorage永続化）
- AIによる夢の整理（タイトル案・要約・キーワード・感情・登場人物・場所の抽出）
- Movie Package生成（映画タイトル・ジャンル・雰囲気・あらすじ・シーン構成・各種Prompt）
- 実際のショートムービー生成（Render Pipeline）: Pollinations / Google Veo を切り替え可能
- 動画プレビュー・端末への保存・共有シート連携
- Renderジョブの履歴管理・失敗時の再試行
- PWA対応（ホーム画面への追加・オフライン起動・Service Worker）

## 技術スタック

- React / TypeScript / Vite
- Tailwind CSS / shadcn/ui
- React Router
- ESLint / Prettier

## セットアップ

```bash
npm install
npm run dev
```

### その他のコマンド

```bash
npm run build     # 本番ビルド
npm run preview   # ビルド結果のプレビュー
npm run lint      # ESLint実行
npm run format    # Prettierによる自動整形
```

## 動画生成の設定（APIキー）

動画生成には外部APIを使用します。アプリ内の「設定 → 動画生成」からプロバイダーを選び、
APIキーを入力してください。**キーはユーザーごとに各自で取得します。**

### Pollinations（既定・無料枠あり）

1. <https://enter.pollinations.ai> でアカウントを作成し、APIキーを発行する
2. アプリの「設定 → 動画生成 → Pollinations API Key」に貼り付けて保存

登録すると日次で無料のPollen（生成クレジット）が付与されます。1 Pollen ≒ $1 で、
使い切った場合は追加購入するか翌日の付与を待つ形になります。

| モデル | 単価 | 尺の制約 | 備考 |
|---|---|---|---|
| Nova Reel (Amazon) | 0.08 Pollen/秒 | 6〜120秒（6秒単位） | `paid_only` 指定がなく、無料枠で使える可能性が最も高い。**既定** |
| Wan 2.2 (Alibaba) | 0.01 Pollen/秒 | 2〜15秒 | 最安。480p・音声なし |
| Pruna p-video | 0.02 Pollen/秒 | 2〜10秒 | 低価格で720p |
| Seedance Pro-Fast | 0.025 Pollen/秒 | 2〜10秒 | 720p |
| Veo 3.1 Fast (Google) | 0.08 Pollen/秒 | 4/6/8秒 | 高品質・音声付き |

Nova Reel 以外は Pollinations 側で `paid_only` とされているため、無料の日次付与枠だけでは
利用できない場合があります。まずは既定の Nova Reel でお試しください。

### Google Veo（無料枠なし）

<https://aistudio.google.com/apikey> で発行したキーを設定します。
**Veoには無料枠が一切ありません**（公式価格表で全バリアントが "Not available"）。
最安の Veo 3.1 Lite でも $0.05/秒で、8秒の生成に約 $0.40 かかります。

### セキュリティ上の注意

本アプリはバックエンドを持たない構成のため、APIキーはブラウザのLocalStorageへ
**暗号化せずに**保存され、クライアントから直接APIへリクエストを送信します。
個人利用・プロトタイプとしての想定です。共有端末では入力しないでください。
不特定多数へ公開する場合は、APIキーをサーバーサイド（プロキシ経由）で管理する構成への
変更を強く推奨します。

### 生成した動画の保存先

生成された動画の実体（MP4）はブラウザの IndexedDB に保存されます。
そのため一度生成した動画は、リロード後やオフラインでも再生・保存・共有できます。
レンダリング履歴から削除すると、動画本体も併せて破棄されます。

### Mockプロバイダーについて

APIキーや課金なしでRenderパイプラインを動作確認するためのダミー実装は、
**開発ビルド（`npm run dev`）でのみ**選択できます。本番ビルドでは選択肢に現れず、
バンドルからも除外されます。

## アーキテクチャ概要

```
src/
├── pages/       # 画面単位のコンポーネント（ルーティング対象）
├── components/  # 再利用可能なUIコンポーネント（ui/ は shadcn/ui 準拠の基礎部品）
├── layouts/     # 共通レイアウト（ボトムナビゲーション等）
├── hooks/       # Reactカスタムフック（Context Provider含む）
├── services/    # AI・動画生成・レンダリングなど、外部/非同期処理のサービス層
├── data/        # LocalStorageを用いたリポジトリ層（永続化）
├── types/       # ドメイン型定義
└── utils/       # 汎用ユーティリティ関数
```

データ永続化層（`data/`）とAI/動画生成サービス層（`services/`）は、いずれも
インターフェースと実装を分離した設計になっており、将来的にSupabase等のバックエンドや
実際の動画生成APIへ差し替える際も、呼び出し側のコードを変更せずに対応できることを意図しています。

## 開発の背景

本プロジェクトはSprintベースで段階的に開発されました。各Sprintの実装内容・設計判断・既知の懸念事項は、
開発時に作成された `SPRINT_REPORT.md`（最新Sprintの内容を反映）を参照してください。

## ライセンス

未定
