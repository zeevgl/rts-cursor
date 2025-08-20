export function createCamera({ dpr = 1, x = 0, y = 0, zoom = 1 }) {
  const MIN_ZOOM = 0.25
  const MAX_ZOOM = 4

  return {
    dpr,
    x,
    y,
    zoom,
    worldToScreen(wx, wy) {
      return { x: (wx - this.x) * this.zoom + (innerWidth / 2), y: (wy - this.y) * this.zoom + (innerHeight / 2) }
    },
    screenToWorld(sx, sy) {
      return { x: (sx - innerWidth / 2) / this.zoom + this.x, y: (sy - innerHeight / 2) / this.zoom + this.y }
    },
    zoomAt({ screenX, screenY, delta }) {
      const before = this.screenToWorld(screenX, screenY)
      const zoomFactor = Math.exp(-delta * 0.0015)
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom * zoomFactor))
      this.zoom = newZoom
      const after = this.screenToWorld(screenX, screenY)
      this.x += before.x - after.x
      this.y += before.y - after.y
    }
  }
}


