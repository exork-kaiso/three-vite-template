# pnpm + Vite + Three.js 環境構築手順

フルスクリーンの canvas 1 枚に WebGL 作品を描く、という形のプロジェクトを新規に
立ち上げるための手順書。2026-09-02_octahedron の構成を、他プロジェクトへ
流用できる形に整理したもの。手順書自体が各プロジェクトへ複製されて回るため、
「このリポジトリ」ではなく手順として読めるように書いてある。

Claude Code / Cursor が読んで実行することを想定している。各手順に「なぜ」を
添えてあるので、状況が違うときはそれを根拠に逸脱してよい。

## 検証済みバージョン

この手順書の記述は次の組み合わせで実際に通して確認したもの。バージョンを固定
せずに使う方針（毎回その時点の最新で組む）のため、腐るのはコードではなく
**この手順書の側**になる。ここからずれたら 10 章の手順で見直す。

| | バージョン |
|---|---|
| 検証日 | 2026-09-04 |
| Node | v24.12.0 |
| pnpm | 10.29.2 |
| create-vite | 9.2.0 |
| vite | 8.2.2 |
| three | 0.185.1 |
| @types/three | 0.185.4 |
| typescript | 6.0.3 |

## 1. 前提

- pnpm がインストール済みであること（`pnpm -v` で確認）
- Node は `^20.19.0 || >=22.12.0`。これは vite の `engines` フィールドの値なので、
  vite が上がったら再確認する（10 章に確認コマンド）。検証は v24.12.0 でのみ
  行っている
- 作るものは「全画面 canvas 1 枚 + Three.js」。React や複数ページを伴う場合、
  この手順の 4 章以降は前提が変わる

## 2. 雛形の生成

雛形は**サブディレクトリに生成してから中身を移す**。

```bash
pnpm create vite _scaffold --template vanilla-ts
```

`pnpm create vite .` のようにカレントディレクトリを直接指定してはいけない。
そこに 1 つでもファイルがあると対話プロンプトが出る。テンプレートリポジトリを
clone した直後や、先に `git init` / `README.md` / `CLAUDE.md` を置いた後は
これに該当する。非対話の環境（CI や AI エージェント）では選択肢に答えられず
`Operation cancelled` となり、**何も生成されないまま正常終了する**ため気付き
にくい。

`_scaffold` は新規で空なのでプロンプトは出ず、リポジトリの既存ファイルにも
触れない。掃除と移動は次章。

生成された `pnpm-lock.yaml` はコミットする。依存の指定はキャレット付き
（`^0.185.1`）なので、ロックファイルが無いと clone した環境で three の
マイナーバージョンが上がる。後述のとおり three はマイナーで破壊的変更を
入れるため、それだけで動かなくなる。

`--template vanilla-ts` を選ぶ理由は、React などのフレームワークを挟むと
「WebGL の描画ループ」と「フレームワークの再描画」という 2 つのライフサイクルを
同期させる必要が生じ、本質でない複雑さが増えるため。canvas 1 枚に描くだけなら
DOM 操作は数行で足りる。

`three` は dependencies、`@types/three` は devDependencies に入る。型定義は
本体とバージョンを揃えること（0.185.x に対して 0.185.x）。three は破壊的変更を
マイナーバージョンで入れるため、ずれると存在しない API の型が通ってしまう。

`pnpm add -D` はキャレット（`^0.185.4`）で書き込む。0.x のキャレットは semver 上
`~` と同じくマイナーを固定する（`0.186.0` は入らない）ので挙動は変わらないが、
「マイナーを固定している」という意図が読み手に伝わらない。`@types/three` だけは
手で `~0.185.4` に直し、下のサンプルと揃えておくこと。

この時点で `package.json` は次のようになる。

```json
{
  "name": "<project-name>",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@types/three": "~0.185.4",
    "typescript": "~6.0.2",
    "vite": "^8.2.2"
  },
  "dependencies": {
    "three": "^0.185.1"
  }
}
```

`build` が `tsc && vite build` である点が重要。Vite は型を見ずに変換するだけ
なので、`tsc` を前置しない限り型エラーはビルドを通過してしまう。

## 3. テンプレートの掃除と移動

不要なサンプルを `_scaffold` の中で消してから、残りをルートへ移す。

```bash
rm -rf _scaffold/src/counter.ts _scaffold/src/assets _scaffold/public
mv _scaffold/.gitignore _scaffold/index.html _scaffold/package.json \
   _scaffold/tsconfig.json _scaffold/src .
rmdir _scaffold
```

`public/` はディレクトリごと消す。中身は Vite ロゴの `favicon.svg` と
`icons.svg` だけでどちらも使わず、自前の favicon は `public/favicon.png` と
して別途置くため（5 章）。ここで消さずに `mv` すると、既に
`public/favicon.png` を持つリポジトリでは移動先が衝突する。また `public/` の
中身は参照の有無に関わらず全部 `dist/` へコピーされるので、残せば使わない
SVG が成果物に混入する。

`mv` で `.gitignore` を明示的に並べているのは、`_scaffold/*` の glob が
ドットファイルにマッチしないため。書き漏らすと `.gitignore` だけが取り残される。
`rmdir` は空でないと失敗するので、その取りこぼしの検出を兼ねている。

> **検証済み**（2026-09-04 / create-vite 9.2.0）: 2026-09-04_01_surface-layer で
> テンプレート生成直後の状態と突き合わせた。生成物は `index.html` /
> `src/{main.ts,style.css,counter.ts,assets/}` / `public/{favicon.svg,icons.svg}` /
> `tsconfig.json` / `.gitignore` で、上の削除対象 3 つで過不足ない。
> `src/vite-env.d.ts` はこのバージョンでは生成されない（`tsconfig.json` の
> `"types": ["vite/client"]` が同じ役割を果たしている）。
> 生成物を決めるのは `vite` 本体ではなく `pnpm create vite` が実行する
> `create-vite` パッケージで、両者はバージョンが独立している。別バージョンを
> 使うときは生成物を確認し、差分があればこの一覧を直すこと。

移動後にルートに残るもの:

- `index.html` — 中身は書き換えるがファイルは使う
- `src/main.ts` — エントリポイント。中身は全面的に書き換える
- `src/style.css` — 同上
- `tsconfig.json` — **そのまま使う**（次章）
- `.gitignore` — Vite が生成した内容をそのまま使う。環境固有のエントリの追加は 8 章

ここまで済んだらルートで依存を入れる。`package.json` を移した後でないと
プロジェクト直下に入らない。

```bash
pnpm add three
pnpm add -D @types/three
```

`pnpm add` が依存の解決とインストールまで行うため、別途 `pnpm install` を
走らせる必要はない。

## 4. 設定ファイルの方針

### tsconfig.json は変更しない

Vite テンプレートの既定値をそのまま使う。特に次の 4 つは Vite の挙動と
対になっているので、意味を理解せずに触ると壊れる。

| 設定 | 意味 |
|---|---|
| `"moduleResolution": "bundler"` | バンドラが解決する前提。`node` にすると `three/examples/jsm/...` の解決が変わる |
| `"allowImportingTsExtensions": true` | `import './scene.ts'` と拡張子付きで書ける。`noEmit` が前提 |
| `"noEmit": true` | 出力は Vite が行い、`tsc` は型チェック専用 |
| `"verbatimModuleSyntax": true` | 型だけの import は `import type` と明示する必要がある |

`"types": ["vite/client"]` も必須。これがないと `import './style.css'` や
`import.meta.env` / `import.meta.hot` が型エラーになる。

残りの `noUnusedLocals` / `noUnusedParameters` / `erasableSyntaxOnly` /
`noFallthroughCasesInSwitch` は型チェックの厳しさの設定で、Vite の挙動とは
独立している。緩めても動くが、`pnpm build` の `tsc` が拾ってくれる範囲が
狭まるだけなので既定のまま使う。`erasableSyntaxOnly` は TypeScript 5.8 以降の
設定で、型を消すだけでは JS にならない構文（`enum`、パラメータプロパティ、
`namespace`）を禁じる。Vite は型を消すだけの変換しか行わないため、これらを
書くと実行時に壊れる。

### vite.config.ts は作らない

デフォルト設定で動くため、最初は作成しない。設定ファイルが存在しないこと自体が
「素の Vite で動いている」という情報になる。

次のいずれかに該当したときだけ新規作成する。

- サブディレクトリへデプロイする（`base` の指定が要る）
- GLSL を別ファイルで書く（`vite-plugin-glsl` 等の導入）
- 開発サーバーを LAN に公開する（`server.host`）
- ビルド出力の分割を制御する

## 5. コードの骨格

4 ファイルで構成する。責務の分け方は、`scene.ts` を DOM とアプリ状態から
独立させ、canvas を 1 つ渡せば動く関数にすること。これが崩れると、HMR を
差し替え型にしたとき（6.1）の後始末が書けなくなる。

### index.html

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WebGL Sketch</title>
  </head>
  <body>
    <canvas id="scene"></canvas>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

canvas は Three.js に生成させず HTML 側に置く。DOM の重ね順（タイトルや
オーバーレイとの前後関係）を CSS だけで決められるようにするため。

favicon は 3 章で `public/` ごと消しているので、`public/favicon.png` を自前で
置く。正方形にすること（Vite の `favicon.svg` は 48×46 で正方形ではなく、
そのまま流用すると縦横比が崩れる）。SVG を使う場合は `type="image/svg+xml"` と
`href="/favicon.svg"` に読み替える。

### src/style.css

```css
html,
body {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: #111;
}

/* canvas は inline 要素扱いだと行ボックスの余白が下に出るため block にする。
   高さは vh ではなく dvh。モバイルのアドレスバー開閉に追従させる。 */
#scene {
  display: block;
  width: 100vw;
  height: 100dvh;
}
```

### src/scene.ts

```ts
// three 本体は名前付き import にし、このファイルが使うクラスを冒頭で一覧できるようにする。
// バンドルサイズのためではない。`import * as THREE` でも Rolldown は未使用クラスを
// 落とし、骨格例では出力がハッシュまで一致した（手順書 6.3）。
import {
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'

// OrbitControls は three 本体ではなく examples/jsm 側の追加モジュール。
// exports の "./examples/jsm/*" はパスをそのまま写すだけで拡張子を補わないため、
// .js まで書く必要がある。
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export function createScene(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  // 高 DPI 端末で描画ピクセル数が跳ね上がるのを防ぐ。3 以上は見た目が変わらず
  // 負荷だけ増えるため 2 で頭打ちにする。
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const scene = new Scene()

  // aspect はこの後の resize() で必ず上書きするので、ここでは仮に 1 を渡す。
  const camera = new PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(2.5, 2, 3.5)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true

  const geometry = new BoxGeometry(1, 1, 1)
  const material = new MeshStandardMaterial({ color: 0x44aa88 })
  const mesh = new Mesh(geometry, material)
  scene.add(mesh)

  // intensity 3 は、白いマテリアルでも Lambert 拡散が 3/π ≈ 0.95 に収まる上限の目安。
  // これより上げるか、環境マップや金属質を足すと、renderer の既定（NoToneMapping）
  // のままでは 1.0 を超えて白飛びする。その場合は ACESFilmicToneMapping を設定する（手順書 6.5）。
  const light = new DirectionalLight(0xffffff, 3)
  light.position.set(2, 3, 4)
  scene.add(light)

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = canvas
    // display:none などで 0 になる瞬間があり、aspect が NaN になるのを避ける。
    if (width === 0 || height === 0) return
    // 第 3 引数 false: canvas の CSS サイズは触らず、描画バッファだけ合わせる。
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
  resize()

  // アドレスバーの開閉など window の resize が発火しない寸法変化も拾うため、
  // イベントではなく canvas 自体を ResizeObserver で監視する。
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  // rAF を直接呼ばず setAnimationLoop を使う。null を渡すだけで確実に止められ、
  // WebXR にもそのまま乗る。
  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene, camera)
  })

  // 生成したものは生成の逆順に破棄する。GPU リソースは GC の対象外なので、
  // dispose() を呼ばない限り解放されない。geometry / material / texture /
  // renderTarget を足したら、ここにも 1 行足すこと。
  function dispose() {
    renderer.setAnimationLoop(null)
    observer.disconnect()
    controls.dispose()
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }

  return { dispose }
}
```

### src/main.ts

```ts
import './style.css'
import { createScene } from './scene.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!

// HMR はフルリロード前提。どのモジュールも import.meta.hot.accept() を
// 呼ばないため、保存するとページごと読み直され、前世代のシーンは
// WebGL コンテキストごと捨てられる。createScene() が返す dispose() は
// ここでは使わない。accept() を足して差し替え型にするなら、
// import.meta.hot.dispose で dispose() を呼ぶこと（手順書 6.1）。
createScene(canvas)
```

## 6. 踏まないと必ず壊れる 5 点

この手順書の核心。いずれも「エラーは出ないが挙動がおかしくなる」種類の問題で、
後から原因を特定するのが難しい。

6.1〜6.3 は 5 章の骨格そのものが対処済みで、崩すと壊れる。対して 6.4 の Sprite と
6.5 の白飛びは、骨格例（立方体 + `DirectionalLight` 1 灯）では再現しない。
表現を足していく過程で初めて踏むものなので、各節に「何を足すと起きるか」を
書いてある。

### 6.1 HMR はフルリロード前提。差し替え型にするなら dispose() を呼ぶ

骨格例では、どのモジュールも `import.meta.hot.accept()` を呼ばない。Vite は
変更を受け取るモジュール（HMR の境界）が見つからないと**ページ全体を
リロードする**ので、`scene.ts` を保存するたびに前世代のシーンは WebGL
コンテキストごと捨てられ、多重化は起きない。`main.ts` で
`import.meta.hot.dispose` を登録しても、フルリロードでは呼ばれないため
意味がない（登録しているだけで一度も実行されないコードになる）。

それでも `createScene()` は `dispose()` を返す形にしておく。リロードせずに
シーンだけ差し替えたくなったら、`main.ts` を次のようにする。

```ts
const { dispose } = createScene(canvas)

if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    dispose()
  })
}
```

この形にしたら `dispose()` は必須になる。呼ばないと保存のたびに WebGL
コンテキストと描画ループが増え、「編集を重ねるうちに動作が重くなる」
「マウス操作の反応が二重になる」「コンソールに `Too many active WebGL contexts`
が出て一番古いものが失われる」といった症状が出る。ブラウザをリロードすると
直るため、原因が HMR だと気づきにくい。DOM 要素やイベントリスナーを
`createScene` の外で足した場合、それらも同じ `dispose` コールバックで取り除く。

### 6.2 リサイズは window ではなく canvas を見る

`window.addEventListener('resize', ...)` と `window.innerWidth/innerHeight` を
使ってはいけない。理由は 2 つ。

- CSS が `100dvh` の場合、モバイルのアドレスバー開閉で canvas の高さは変わるが
  `window.innerHeight` とは一致しない。描画バッファと表示サイズがずれて像が歪む
- canvas がレイアウトの都合で伸縮する構成（サイドバーの開閉など）では、
  window の resize イベント自体が発火しない

`ResizeObserver` で canvas 自身を監視し、`clientWidth/clientHeight` を使う。
`renderer.setSize(w, h, false)` の第 3 引数 `false` を忘れると、Three.js が
canvas の style を上書きして CSS と競合する。

### 6.3 examples/jsm は .js 付きで import する

```ts
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'  // ○
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'     // ×
```

`examples/jsm` 配下は `three` 本体とは別のファイル群で、パッケージの exports は
`"./examples/jsm/*": "./examples/jsm/*"` とパスをそのまま写すだけで拡張子を
補わない。そのため `.js` を省略すると解決に失敗する。
TypeScript のソースに `.js` と書くのは奇妙に見えるが、これが正しい。

three 本体は名前付き import（`import { Mesh, Scene } from 'three'`）で書くが、
これは使っているクラスを冒頭で一覧できるようにするための書き方の統一で、
壊れる話ではない。「`import * as THREE` だと tree-shaking が効かず three 全体が
入る」という説明をよく見るが、Vite 8（Rolldown）には当てはまらない。
2026-09-21 に骨格例の `scene.ts` を名前空間 import に書き換えてビルドしたところ、
出力は名前付き import のときとハッシュまで一致した（540.14 kB）。`THREE.Mesh` の
ようにプロパティとして静的に参照している限り、未使用クラスは落とされる。
`THREE[name]` のような動的なアクセスを書いたときだけ全体が残る。

### 6.4 GPU リソースは自動で解放されない

`geometry` / `material` / `texture` / `renderTarget` / `renderer` は、参照が
切れても GPU 側のメモリは残る。それぞれの `dispose()` を明示的に呼ぶ。

骨格例では `geometry` / `material` / `renderer` の 3 つで足りるが、テクスチャ、
`Sprite`、`LineMaterial`、`WebGLRenderTarget`、`PMREMGenerator` を足したら、
その都度 `dispose()` の側にも 1 行足す。片方だけ書いて忘れるのが典型的な事故。

例外として、`Sprite` のジオメトリは Three.js が全 Sprite で共有する 1 枚の板
なので破棄してはいけない（他の Sprite が壊れる）。Sprite はマテリアルと
テクスチャだけを捨てる。

### 6.5 デフォルトの色空間・トーンマップを把握しておく

`WebGLRenderer` の既定は `outputColorSpace = SRGBColorSpace`、
`toneMapping = NoToneMapping`。

骨格例の `DirectionalLight` 1 灯では輝度が 1.0 を超えないため、この既定のままで
破綻しない。`scene.environment` に環境マップを入れる、光源を増やす、金属
（`metalness` を上げて `roughness` を下げる）にする、のいずれかをやると輝度が
容易に 1.0 を超え、明るい面が真っ白に潰れる。そうなったらトーンマップを設定する。

```ts
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 0.6  // 既定 1.0。飽和するなら絞る
```

自前で生成した `CanvasTexture` を色として使うときは
`texture.colorSpace = SRGBColorSpace` を明示する。データ（法線マップ、
マスク等）として使うテクスチャには設定しない。

## 7. 動作確認

```bash
pnpm dev      # http://localhost:5173 で立方体が表示され、ドラッグで回る
pnpm build    # tsc の型チェックを通り、dist/ が生成される
pnpm preview  # ビルド結果が dev と同じ見た目で動く
```

`pnpm build` で「chunks are larger than 500 kB」の警告が出るが、これは
three 本体のサイズによるもので正常。全画面 1 シーンの作品では分割する意味が
薄いため、そのままでよい。

### HMR の挙動の確認

`pnpm dev` の状態で `scene.ts` を保存し、ページ全体が読み直されることを
確かめる。DevTools のコンソールで「Preserve log」を有効にしておくと、
保存のたびに Vite の `[vite] page reload src/scene.ts` が残る。

6.1 の差し替え型に切り替えた場合は、確認方法が変わる。`dispose()` の先頭に
一時的に `console.log('[dispose] scene torn down')` を入れ、保存 1 回につき
1 行ずつ出ることを見る。1 行も出なければ `import.meta.hot.dispose` の登録漏れか、
`createScene` が `dispose` を返していない。`Too many active WebGL contexts` は
コンテキストが 16 個ほど溜まって初めて出るため、「数回保存して警告が出ない」
ことは何の確認にもならない。確認できたらログは消す。

## 8. 流用時のチェックリスト

- [ ] `package.json` の `name` をプロジェクト名に変更した
- [ ] `pnpm-lock.yaml` をコミットした（three のマイナー更新で壊れるのを防ぐ）
- [ ] `index.html` の `<title>` と `lang` を設定した
- [ ] favicon を差し替えた（3 章で `public/` を削除したうえで、正方形の
      `public/favicon.png` を置き、`index.html` の `<link rel="icon">` の
      `type` と `href` を合わせた）
- [ ] `git status` に現れた環境固有の生成物（`.playwright-mcp/` など）を、
      理由を添えて `.gitignore` に追加した（先回りして足さない。下記）
- [ ] `README.md` を書き直した（雛形の説明が残っていないか）
- [ ] コミットメッセージ規約など、AI 向けのルールを配置した

### .gitignore は「出てから足す」

環境固有のエントリは、想定で先回りして並べず、**実際にそのファイルが
`git status` に現れた時点で、理由を添えて足す**。使う道具は作品ごとに違うため、
先回りすると「なぜこれが要るのか誰も説明できない行」が溜まり、
`.gitignore` から「このプロジェクトで何が生成されるか」を読み取れなくなる。

`.claude/settings.local.json` がこの扱いの典型。マシンによっては
`~/.gitignore_global` 側で無視されているため、リポジトリの `.gitignore` に
無くても手元では `git status` に出ない。グローバル設定は他の環境や他人には
効かないので、リポジトリとして守りたいなら明示するのが確実 —— ただしそれは
**実際に `.claude/settings.local.json` が生成されてからでよい**。

`.claude/` ごと無視してはいけない。共有すべき設定（`.claude/settings.json`、
スキル等）を同じディレクトリに置くため、対象は `settings.local.json` に限る。

## 9. この手順書に含まれないもの

この手順書は環境構築までを対象とし、作品の表現には踏み込まない。
流用元の 2026-09-02_octahedron には以下の実装があるが、いずれもあの作品固有の
表現であり、必要になったら同リポジトリのコードを個別に参照すること。

- SVG のタイトル（`textLength` による字形固定と `document.fonts.ready` 待ち）
- CSS オーバーレイによるフィルムグレイン
- 稜線の発光（`LineSegments2` + 加算合成のハロー層）と頂点の光点
- 面のパターン生成（`patterns.ts`）と切替 UI
- スクロールによる慣性回転（`wheel` のキャプチャ段階での横取り、`deltaMode` の正規化）
- PMREM による環境マップ生成

ただし、これらを足すと 6 章の 5 点に触れる。特に環境マップ（PMREM）と発光の
加算合成は 6.5 の白飛びを、`Sprite` とテクスチャは 6.4 の解放漏れを必ず踏む。

## 10. 手順書の保守

バージョンを固定しない方針のため、この手順書の記述は放っておくと実物とずれる。
雛形の生成が済んだ時点で次を実行し、冒頭の「検証済みバージョン」表と比べる。

```bash
node -p "['three','vite','typescript','@types/three'].map(n=>n+' '+require('./node_modules/'+n+'/package.json').version).join('\n')"
node -v && pnpm -v
```

ずれていた場合、**全章を読み直す必要はない**。下の表で該当する箇所だけを確認する。

| 上がったもの | 見直す箇所 | 確認方法と、ずれたときの壊れ方 |
|---|---|---|
| create-vite | 3 章の生成物一覧 | 生成直後の `_scaffold` の中身と突き合わせる。ファイルが増減すると削除対象がずれ、Vite ロゴや未使用サンプルが残る |
| create-vite | 4 章の tsconfig の表 | 生成された `tsconfig.json` と突き合わせる。既定値が変わると「変更しない」という方針の前提自体が崩れる |
| vite | 1 章の Node 要件 | `node -p "JSON.stringify(require('./node_modules/vite/package.json').engines)"` の値と一致するか |
| three | 6.3 の `.js` 必須 | `node -p "JSON.stringify(require('./node_modules/three/package.json').exports)"` に `"./examples/jsm/*": "./examples/jsm/*"` があるか。このパターンは素通しなので拡張子が補完されない。定義が変われば `.js` の要否も変わる |
| three | 6.5 の既定の色空間・トーンマップ | `grep -n "this.toneMapping = \|_outputColorSpace = " node_modules/three/src/renderers/WebGLRenderer.js`。既定が変わると骨格例の見た目が変わり、白飛びの判断基準もずれる |
| three | 6.4 の Sprite ジオメトリ共有 | three が共有をやめた場合、「破棄してはいけない」が逆になる |
| typescript | 4 章の `erasableSyntaxOnly` | 5.8 以降で使える設定。下限の記述なので、上がる分には影響しない |

three はマイナーバージョンで破壊的変更を入れる。`0.185` から `0.186` へ上がる
だけでも 6 章の前提は変わりうるので、マイナーが動いたら 6.3 / 6.4 / 6.5 は
必ず確認する。

直したら冒頭の「検証済みバージョン」表も同時に更新すること。片方だけ新しいと、
次に読む人がどちらを信じるべきか判断できなくなる。
