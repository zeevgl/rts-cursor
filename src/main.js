import { createEngine } from './rts/engine.js'
import { createWorld } from './rts/world.js'
import { createInput } from './rts/input.js'
import { createCamera } from './rts/camera.js'
import { createSelection } from './rts/selection.js'
import { createMinimap } from './rts/minimap.js'

const canvas = document.getElementById('game')
const selectionDiv = document.getElementById('selection')
const minimapCanvas = document.getElementById('minimap')

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

const camera = createCamera({ dpr: DPR, zoom: 0.5 })
const world = createWorld({ width: 128, height: 128, tileSize: 32 })
const input = createInput(canvas, selectionDiv, camera)
const selection = createSelection()
const minimap = createMinimap(minimapCanvas, world, camera)

function clampCameraToWorld() {
  const worldW = world.width * world.tileSize
  const worldH = world.height * world.tileSize
  const halfW = (innerWidth / 2) / camera.zoom
  const halfH = (innerHeight / 2) / camera.zoom
  if (worldW <= halfW * 2) {
    camera.x = worldW / 2
  } else {
    if (camera.x < halfW) camera.x = halfW
    if (camera.x > worldW - halfW) camera.x = worldW - halfW
  }
  if (worldH <= halfH * 2) {
    camera.y = worldH / 2
  } else {
    if (camera.y < halfH) camera.y = halfH
    if (camera.y > worldH - halfH) camera.y = worldH - halfH
  }
}

function pointerOverMinimap(px, py) {
  if (!minimapCanvas) return false
  const r = minimapCanvas.getBoundingClientRect()
  return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom
}

// Center camera on player units at start
if (world.units && world.units.length) {
  let sx = 0, sy = 0
  for (const u of world.units) { sx += u.x; sy += u.y }
  camera.x = sx / world.units.length
  camera.y = sy / world.units.length
}

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

    // Edge scroll (avoid when interacting with minimap)
    if (!pointerOverMinimap(input.pointer.x, input.pointer.y)) {
      const edge = 24
      let ex = 0, ey = 0
      if (input.pointer.x <= edge) ex = - (1 - (input.pointer.x / Math.max(1, edge)))
      else if (input.pointer.x >= innerWidth - edge) ex = (1 - ((innerWidth - input.pointer.x) / Math.max(1, edge)))
      if (input.pointer.y <= edge) ey = - (1 - (input.pointer.y / Math.max(1, edge)))
      else if (input.pointer.y >= innerHeight - edge) ey = (1 - ((innerHeight - input.pointer.y) / Math.max(1, edge)))
      if (ex !== 0 || ey !== 0) {
        const edgeSpeed = panSpeed * 0.8 * dt / camera.zoom
        camera.x += ex * edgeSpeed
        camera.y += ey * edgeSpeed
      }
    }

    clampCameraToWorld()

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
    minimap.draw()
  }
})

engine.start()


