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
