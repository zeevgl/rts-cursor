function rand(seed) {
  // simple LCG for reproducibility
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export function createWorld({ width, height, tileSize }) {
  const rng = rand(12345)
  const tiles = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = rng()
      tiles[y * width + x] = n < 0.12 ? 2 : n < 0.5 ? 1 : 0 // 0 grass, 1 dirt, 2 water
    }
  }

  let nextUnitId = 1
  const units = []
  for (let i = 0; i < 20; i++) {
    units.push({ id: nextUnitId++, x: (width * tileSize / 2) + (i - 10) * 24, y: (height * tileSize / 2) + ((i%5) - 2) * 24, tx: null, ty: null, speed: 120, path: null })
  }

  function tileIndex(tx, ty) { return ty * width + tx }
  function worldToTile(wx, wy) { return { tx: Math.floor(wx / tileSize), ty: Math.floor(wy / tileSize) } }
  function tileToWorldCenter(tx, ty) { return { x: tx * tileSize + tileSize / 2, y: ty * tileSize + tileSize / 2 } }

  function isWalkable(wx, wy) {
    const tx = Math.floor(wx / tileSize)
    const ty = Math.floor(wy / tileSize)
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false
    const t = tiles[ty * width + tx]
    return t !== 2 // water is blocked
  }

  function isWalkableTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false
    const t = tiles[tileIndex(tx, ty)]
    return t !== 2
  }

  function findNearestWalkable(tx, ty, maxR = 6) {
    if (isWalkableTile(tx, ty)) return { tx, ty }
    for (let r = 1; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
          const nx = tx + dx, ny = ty + dy
          if (isWalkableTile(nx, ny)) return { tx: nx, ty: ny }
        }
      }
    }
    return null
  }

  // A* on 4-neighborhood grid
  function findPath(startTx, startTy, goalTx, goalTy) {
    if (!isWalkableTile(goalTx, goalTy)) {
      const near = findNearestWalkable(goalTx, goalTy, 8)
      if (!near) return null
      goalTx = near.tx; goalTy = near.ty
    }
    if (!isWalkableTile(startTx, startTy)) {
      const nearS = findNearestWalkable(startTx, startTy, 8)
      if (!nearS) return null
      startTx = nearS.tx; startTy = nearS.ty
    }

    const total = width * height
    const open = [] // indices
    const inOpen = new Uint8Array(total)
    const closed = new Uint8Array(total)
    const gScore = new Float32Array(total)
    const fScore = new Float32Array(total)
    const cameFrom = new Int32Array(total)
    cameFrom.fill(-1)

    const startIdx = tileIndex(startTx, startTy)
    const goalIdx = tileIndex(goalTx, goalTy)
    gScore[startIdx] = 0
    fScore[startIdx] = Math.abs(goalTx - startTx) + Math.abs(goalTy - startTy)
    open.push(startIdx)
    inOpen[startIdx] = 1

    function pushOpen(idx) { open.push(idx); inOpen[idx] = 1 }
    function popBest() {
      let bestI = 0
      let best = fScore[open[0]]
      for (let i = 1; i < open.length; i++) {
        const f = fScore[open[i]]
        if (f < best) { best = f; bestI = i }
      }
      const idx = open[bestI]
      open.splice(bestI, 1)
      inOpen[idx] = 0
      return idx
    }

    const neighbors = [[1,0],[ -1,0],[0,1],[0,-1]]

    while (open.length) {
      const current = popBest()
      if (current === goalIdx) {
        // reconstruct
        const pathTiles = []
        let cur = current
        while (cur !== -1) {
          const ty = Math.floor(cur / width)
          const tx = cur - ty * width
          pathTiles.push([tx, ty])
          cur = cameFrom[cur]
        }
        pathTiles.reverse()
        return pathTiles
      }
      closed[current] = 1

      const cy = Math.floor(current / width)
      const cx = current - cy * width
      for (let k = 0; k < neighbors.length; k++) {
        const nx = cx + neighbors[k][0]
        const ny = cy + neighbors[k][1]
        if (!isWalkableTile(nx, ny)) continue
        const nIdx = tileIndex(nx, ny)
        if (closed[nIdx]) continue
        const tentativeG = gScore[current] + 1
        if (!inOpen[nIdx] || tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = current
          gScore[nIdx] = tentativeG
          fScore[nIdx] = tentativeG + Math.abs(goalTx - nx) + Math.abs(goalTy - ny)
          if (!inOpen[nIdx]) pushOpen(nIdx)
        }
      }
    }

    return null
  }

  function computeWorldPath(fromWx, fromWy, toWx, toWy) {
    const { tx: sx, ty: sy } = worldToTile(fromWx, fromWy)
    const { tx: gx, ty: gy } = worldToTile(toWx, toWy)
    const tilesPath = findPath(sx, sy, gx, gy)
    if (!tilesPath || tilesPath.length === 0) return null
    // convert to world positions (tile centers)
    const wp = tilesPath.map(([tx, ty]) => tileToWorldCenter(tx, ty))
    return wp
  }

  function issueMove(ids, wx, wy) {
    if (!ids || ids.size === 0) return
    // simple formation: spread around target
    const spread = 18
    let i = 0
    for (const id of ids) {
      const u = units.find(u => u.id === id)
      if (!u) continue
      const angle = (i / Math.max(1, ids.size)) * Math.PI * 2
      const tx = wx + Math.cos(angle) * spread * (1 + (i%3))
      const ty = wy + Math.sin(angle) * spread * (1 + (i%3))
      const path = computeWorldPath(u.x, u.y, tx, ty)
      if (path) {
        u.path = path
        const first = path[0]
        u.tx = first.x; u.ty = first.y
      } else {
        // try direct if no path found
        if (isWalkable(tx, ty)) { u.tx = tx; u.ty = ty; u.path = null } else { u.tx = wx; u.ty = wy; u.path = null }
      }
      i++
    }
  }

  function update(dt) {
    for (const u of units) {
      if (u.tx == null && u.path && u.path.length) {
        const next = u.path[0]
        u.tx = next.x; u.ty = next.y
      }
      if (u.tx == null) continue
      const dx = u.tx - u.x
      const dy = u.ty - u.y
      const dist = Math.hypot(dx, dy)
      if (dist < 2) {
        // reached waypoint
        if (u.path && u.path.length) {
          u.path.shift()
          if (u.path.length) { u.tx = u.path[0].x; u.ty = u.path[0].y } else { u.tx = u.ty = null; u.path = null }
        } else {
          u.tx = u.ty = null
        }
        continue
      }
      const step = u.speed * dt
      const nx = u.x + (dx / dist) * step
      const ny = u.y + (dy / dist) * step
      if (isWalkable(nx, ny)) { u.x = nx; u.y = ny } else { u.tx = u.ty = null; u.path = null }
    }
  }

  function render(ctx, camera) {
    // draw visible tiles only
    const { x: wx0, y: wy0 } = camera.screenToWorld(0, 0)
    const { x: wx1, y: wy1 } = camera.screenToWorld(innerWidth, innerHeight)
    const tx0 = Math.max(0, Math.floor(wx0 / tileSize) - 1)
    const ty0 = Math.max(0, Math.floor(wy0 / tileSize) - 1)
    const tx1 = Math.min(width - 1, Math.floor(wx1 / tileSize) + 1)
    const ty1 = Math.min(height - 1, Math.floor(wy1 / tileSize) + 1)

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = tiles[ty * width + tx]
        const wx = tx * tileSize
        const wy = ty * tileSize
        const s = camera.worldToScreen(wx, wy)
        const size = tileSize * camera.zoom
        // grass, dirt, water colors
        ctx.fillStyle = t === 2 ? '#1f6feb' : t === 1 ? '#6b4f2a' : '#238636'
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), Math.ceil(size), Math.ceil(size))
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'
        ctx.strokeRect(Math.floor(s.x) + 0.5, Math.floor(s.y) + 0.5, Math.ceil(size), Math.ceil(size))
      }
    }
  }

  return { width, height, tileSize, tiles, units, update, render, issueMove }
}


