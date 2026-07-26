# DreamFilm AI

見た夢を記録し、AIで整理し、Movie Package（映画化用の構造化データ）を経て、
ショートムービーとして生成・確認・保存・共有できるアプリです。
React + TypeScript + Vite + Tailwind CSS + shadcn/ui で構築された、
PWA対応のモバイルファーストWebアプリです。

## 主な機能

- 夢の記録・編集・削除・検索・並び替え・気分フィルター（LocalStorage永続化）
- AIによる夢の整理（タイトル案・要約・キーワード・感情・登場人物・場所の抽出）
- Movie Package生成（映画タイトル・ジャンル・雰囲気・あらすじ・シーン構成・各種Prompt）
- 動画生成（Render Pipeline）: Mock / Google Veo（Google AI Studio）を切り替え可能
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

## 環境変数・APIキーについて

Google Veo（Google AI Studio）を利用する場合、アプリ内の「設定」画面からAPIキーを入力してください。
このキーはブラウザのLocalStorageに**暗号化せずに**保存され、クライアントから直接Google APIへ
リクエストを送信する構成になっています。個人利用・プロトタイプとしての想定であり、
本番運用する場合はAPIキーをサーバーサイド（プロキシ経由）で管理する構成への変更を推奨します。

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
