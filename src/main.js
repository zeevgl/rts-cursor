import { createEngine } from './rts/engine.js'
import { createWorld } from './rts/world.js'
import { createInput } from './rts/input.js'
import { createCamera } from './rts/camera.js'
import { createSelection } from './rts/selection.js'

const canvas = document.getElementById('game')
const selectionDiv = document.getElementById('selection')

const DPR = Math.min(2, window.devicePixelRatio || 1)

function resizeCanvas() {
  canvas.width = Math.floor(window.innerWidth * DPR)
  canvas.height = Math.floor(window.innerHeight * DPR)
  canvas.style.width = window.innerWidth + 'px'
  canvas.style.height = window.innerHeight + 'px'
}
resizeCanvas()
window.addEventListener('resize', resizeCanvas)

const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

const camera = createCamera({ dpr: DPR })
const world = createWorld({ width: 128, height: 128, tileSize: 32 })
const input = createInput(canvas, selectionDiv, camera)
const selection = createSelection()

const engine = createEngine({
  update(dt) {
    // Camera controls
    const panSpeed = 800
    const zoomDelta = input.consumeZoom()
    if (zoomDelta !== 0) {
      camera.zoomAt({ screenX: input.pointer.x, screenY: input.pointer.y, delta: zoomDelta })
    }
    let vx = 0, vy = 0
    if (input.keys['KeyA']) vx -= 1
    if (input.keys['KeyD']) vx += 1
    if (input.keys['KeyW']) vy -= 1
    if (input.keys['KeyS']) vy += 1
    const speed = panSpeed * dt / camera.zoom
    camera.x += vx * speed
    camera.y += vy * speed

    // Mouse pan
    if (input.middleDown) {
      camera.x -= input.pointer.dx / camera.zoom
      camera.y -= input.pointer.dy / camera.zoom
    }

    // Selection
    if (input.dragging) {
      selection.active = true
      selection.screenRect = input.getDragRect()
    } else if (selection.active && input.justReleased) {
      selection.active = false
      selection.screenRect = null
      // Convert to world rect and select units
      const rect = input.getLastDragRect()
      if (rect) {
        selection.entities.clear()
        for (const unit of world.units) {
          const screen = camera.worldToScreen(unit.x, unit.y)
          if (
            screen.x >= rect.x && screen.x <= rect.x + rect.w &&
            screen.y >= rect.y && screen.y <= rect.y + rect.h
          ) {
            selection.entities.add(unit.id)
          }
        }
      }
    }

    // Right click move command
    if (input.consumeRightClick()) {
      const { x, y } = camera.screenToWorld(input.pointer.x, input.pointer.y)
      world.issueMove(selection.entities, x, y)
    }

    world.update(dt)
  },
  render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render world (terrain, units, enemies, projectiles)
    world.render(ctx, camera, selection.entities)
  }
})

engine.start()


