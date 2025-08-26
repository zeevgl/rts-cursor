export function createMinimap(canvas, world, camera) {
  const ctx = canvas.getContext('2d')
  const mm = {
    dragging: false,
    scaleX: canvas.width / (world.width * world.tileSize),
    scaleY: canvas.height / (world.height * world.tileSize)
  }

  function worldToMini(wx, wy) {
    return { x: Math.floor(wx * mm.scaleX), y: Math.floor(wy * mm.scaleY) }
  }

  function miniToWorld(mx, my) {
    return { x: mx / mm.scaleX, y: my / mm.scaleY }
  }

  function draw() {
    // tiles
    const { tiles, width, height, tileSize } = world
    const sX = tileSize * mm.scaleX
    const sY = tileSize * mm.scaleY
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const t = tiles[ty * width + tx]
        ctx.fillStyle = t === 2 ? '#1f6feb' : t === 1 ? '#6b4f2a' : '#238636'
        ctx.fillRect(Math.floor(tx * sX), Math.floor(ty * sY), Math.ceil(sX), Math.ceil(sY))
      }
    }
    // units
    ctx.fillStyle = '#e11d48'
    for (const u of world.units) {
      const p = worldToMini(u.x, u.y)
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
    }
    // enemies
    ctx.fillStyle = '#38bdf8'
    for (const e of world.enemies) {
      const p = worldToMini(e.x, e.y)
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
    }
    // viewport
    const topLeft = worldToMini(camera.x - innerWidth / 2 / camera.zoom, camera.y - innerHeight / 2 / camera.zoom)
    const bottomRight = worldToMini(camera.x + innerWidth / 2 / camera.zoom, camera.y + innerHeight / 2 / camera.zoom)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.strokeRect(topLeft.x + 0.5, topLeft.y + 0.5, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
  }

  function handleNavigate(clientX, clientY) {
    const rect = canvas.getBoundingClientRect()
    const mx = Math.max(0, Math.min(canvas.width, clientX - rect.left))
    const my = Math.max(0, Math.min(canvas.height, clientY - rect.top))
    const w = miniToWorld(mx, my)
    camera.x = w.x
    camera.y = w.y
  }

  canvas.addEventListener('mousedown', (e) => { mm.dragging = true; handleNavigate(e.clientX, e.clientY) })
  window.addEventListener('mousemove', (e) => { if (mm.dragging) handleNavigate(e.clientX, e.clientY) })
  window.addEventListener('mouseup', () => { mm.dragging = false })

  return { draw }
}


