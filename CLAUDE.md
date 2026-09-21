# 2026-09-04_01_surface-layer

Vite + TypeScript + Three.js で全画面 canvas 1 枚に描く WebGL 作品。

作品の表現はまだ実装していない。`src/scene.ts` の中身は手順書の骨格例
（緑の立方体）のままなので、これから差し替える前提で読むこと。

## 構成

- `README.md` — 人間向けの説明。技術スタックとバージョン、ビルド方針
- `index.html` — canvas、favicon、エントリスクリプトの読み込み
- `src/main.ts` — エントリポイント。シーンの生成（HMR はフルリロード前提）
- `src/scene.ts` — Three.js シーン本体。`createScene()` が `dispose()` を返す
- `src/style.css` — 全画面 canvas のスタイル
- `vite.config.ts` は存在しない（デフォルト設定のまま）

## コマンド

```bash
pnpm dev      # 開発サーバー (http://localhost:5173)
pnpm build    # tsc の型チェック + 本番ビルド → dist/
pnpm preview  # ビルド結果のプレビュー
```

## 環境構築とその根拠

この構成の作り方、および踏むと壊れる箇所（HMR の前提、ResizeObserver、
three の import 形式、GPU リソースの解放、色空間）は
[docs/webgl-setup-guide.md](docs/webgl-setup-guide.md) にまとめてある。
シーンの初期化・破棄まわりを触る前に読むこと。

表現を足していく過程で `geometry` / `material` / `texture` / `renderTarget` を
増やしたら、その都度 `dispose()` の側にも 1 行足すこと（手順書 6.4）。
片方だけ書いて忘れるのが典型的な事故。

## .gitignore

環境固有のエントリは先回りして足さず、実際に `git status` に現れてから
理由を添えて足す。判断の根拠は手順書 8 章に記載。

## コミットメッセージ

日本語で書く。規約は [.cursor/rules/commit-message.mdc](.cursor/rules/commit-message.mdc)
を参照（Cursor 用の形式だが、内容はこのリポジトリ共通の規約）。

## コメントの方針

「なぜその値・その手段なのか」を書く。特に数値定数は、それが何の実測値から
導かれたか、動かすと何が起きるかを残す。既存コードの水準に合わせること。
