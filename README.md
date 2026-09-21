# three-vite-template

Vite + TypeScript + Three.js で全画面 canvas 1 枚に描く WebGL 作品を作るためのテンプレート

**現在は環境構築のみが完了した状態で、作品の表現はまだ実装していない。**
画面に出るのは手順書の骨格例（緑の立方体がドラッグで回る）そのままで、
`src/scene.ts` の中身はこれから差し替える。

## 技術スタック

| 種別 | パッケージ | バージョン |
|---|---|---|
| ビルドツール | vite | ^8.2.2 |
| 言語 | typescript | ~6.0.2 |
| 3D ライブラリ | three | ^0.185.1 |
| 型定義 | @types/three | ~0.185.4 |

`@types/three` だけキャレットではなくチルダで固定している。three は破壊的変更を
マイナーバージョンで入れるため、本体（0.185.x）と型定義のマイナーがずれると
存在しない API の型が通ってしまう。

## コマンド

```bash
pnpm install   # 依存パッケージのインストール
pnpm dev       # 開発サーバー起動 (http://localhost:5173)
pnpm build     # 型チェック + 本番ビルド → dist/
pnpm preview   # ビルド結果のプレビュー
```

`build` が `tsc && vite build` である点が重要。Vite は型を見ずに変換するだけ
なので、`tsc` を前置しない限り型エラーがビルドを通過する。

`pnpm build` で「chunks are larger than 500 kB」の警告が出るが、これは three 本体の
サイズによるもので正常。全画面 1 シーンの作品では分割する意味が薄い。

## ディレクトリ構成

```
index.html          canvas と favicon、エントリスクリプトの読み込み
tsconfig.json       TypeScript 設定（Vite テンプレートの既定のまま）
package.json
pnpm-lock.yaml
public/
  favicon.png       32×32
src/
  main.ts           エントリポイント（シーン生成。HMR はフルリロード前提）
  scene.ts          Three.js シーン本体。createScene() が dispose() を返す
  style.css         全画面 canvas のスタイル
docs/
  webgl-setup-guide.md   この構成を立ち上げ・流用するための手順書
.cursor/rules/      AI 向けのルール（コミットメッセージ規約、手順書への導線）
```

`vite.config.ts` は存在しない。デフォルト設定で動くため作っていない。
設定ファイルが無いこと自体が「素の Vite で動いている」という情報になる。

## 実装上の注意

シーンの初期化・破棄まわりには、エラーが出ないまま挙動だけ壊れる箇所がいくつかある
（HMR の前提と `dispose()`、canvas の `ResizeObserver` 監視、three の import 形式、
GPU リソースの明示的な解放、色空間とトーンマップ）。

理由も含めて [docs/webgl-setup-guide.md](docs/webgl-setup-guide.md) の 6 章に
まとめてあるので、`src/scene.ts` を触る前に読むこと。
