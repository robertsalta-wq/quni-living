/**
 * pdfjs-dist defaults to @napi-rs/canvas in Node; we use the `canvas` package.
 * Pass the returned class as CanvasFactory so inline XObjects render on the same canvas impl.
 */

/**
 * @param {(w: number, h: number) => import('canvas').Canvas} createCanvas
 */
export function pdfjsNodeCanvasFactory(createCanvas) {
  return class CanvasFactory {
    constructor(_opts = {}) {
      this._createCanvas = createCanvas
    }

    create(width, height) {
      const canvas = this._createCanvas(width, height)
      return { canvas, context: canvas.getContext('2d') }
    }

    reset(canvasAndContext, width, height) {
      canvasAndContext.canvas.width = width
      canvasAndContext.canvas.height = height
    }

    destroy(canvasAndContext) {
      canvasAndContext.canvas.width = 0
      canvasAndContext.canvas.height = 0
    }
  }
}

/**
 * @param {import('pdfjs-dist')} pdfjs
 * @param {Uint8Array} data
 * @param {(w: number, h: number) => import('canvas').Canvas} createCanvas
 */
export function pdfjsGetDocument(pdfjs, data, createCanvas) {
  return pdfjs.getDocument({
    data,
    useSystemFonts: true,
    CanvasFactory: pdfjsNodeCanvasFactory(createCanvas),
  })
}
