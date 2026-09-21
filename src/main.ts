import './style.css'
import { createScene } from './scene.ts'

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!

// HMR はフルリロード前提。どのモジュールも import.meta.hot.accept() を
// 呼ばないため、保存するとページごと読み直され、前世代のシーンは
// WebGL コンテキストごと捨てられる。createScene() が返す dispose() は
// ここでは使わない。accept() を足して差し替え型にするなら、
// import.meta.hot.dispose で dispose() を呼ぶこと（手順書 6.1）。
createScene(canvas)
