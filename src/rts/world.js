function rand(seed) {
  // simple LCG for reproducibility
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

import { Unit } from './unit.js'
import { createMarineAnimations } from './sprites.js'

export function createWorld({ width, height, tileSize }) {
  const rng = rand(12345)
  const tiles = new Uint8Array(width * height)
  // Generate terrain with water bands at least 4 tiles wide and 7 tiles long
  ;(function generateTerrain() {
    // Start all as grass (0)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles[y * width + x] = 0
      }
    }

    function fillWaterRect(x0, y0, wTiles, hTiles) {
      const x1 = Math.min(width, Math.max(0, x0 + wTiles))
      const y1 = Math.min(height, Math.max(0, y0 + hTiles))
      const xs = Math.max(0, x0)
      const ys = Math.max(0, y0)
      for (let y = ys; y < y1; y++) {
        for (let x = xs; x < x1; x++) {
          tiles[y * width + x] = 2 // water
        }
      }
    }

    const numBands = 10 + Math.floor(rng() * 7) // 10-16 bands
    for (let b = 0; b < numBands; b++) {
      const horizontal = rng() < 0.5
      const thickness = 4 + Math.floor(rng() * 3) // 4-6
      const length = 7 + Math.floor(rng() * Math.floor((horizontal ? width : height) * 0.5)) // >=7
      if (horizontal) {
        const y0 = Math.floor(rng() * (height - thickness))
        let x0 = Math.floor(rng() * (width - length))
        // optional slight shift segments to avoid perfect straightness
        const segments = 3 + Math.floor(rng() * 3)
        const segLen = Math.max(7, Math.floor(length / segments))
        for (let s = 0; s < segments; s++) {
          const wobble = Math.floor((rng() - 0.5) * 3) // -1..1
          const ySeg = Math.max(0, Math.min(height - thickness, y0 + wobble))
          fillWaterRect(x0, ySeg, segLen, thickness)
          x0 += segLen
          if (x0 >= width) break
        }
      } else {
        const x0 = Math.floor(rng() * (width - thickness))
        let y0 = Math.floor(rng() * (height - length))
        const segments = 3 + Math.floor(rng() * 3)
        const segLen = Math.max(7, Math.floor(length / segments))
        for (let s = 0; s < segments; s++) {
          const wobble = Math.floor((rng() - 0.5) * 3)
          const xSeg = Math.max(0, Math.min(width - thickness, x0 + wobble))
          fillWaterRect(xSeg, y0, thickness, segLen)
          y0 += segLen
          if (y0 >= height) break
        }
      }
    }

    // Sprinkle dirt (1) on non-water tiles
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x
        if (tiles[idx] === 2) continue
        tiles[idx] = rng() < 0.4 ? 1 : 0
      }
    }
  })()

  let nextUnitId = 1
  const units = []
  for (let i = 0; i < 20; i++) {
    const u = new Unit({ id: nextUnitId++, x: (width * tileSize / 2) + (i - 10) * 24, y: (height * tileSize / 2) + ((i%5) - 2) * 24, speed: 120, hp: 10, maxHp: 10 })
    u.animations = createMarineAnimations({ base: '#5b94f7' })
    units.push(u)
  }

  // Enemies and projectiles
  let nextEnemyId = 1
  const enemies = []
  const projectiles = []
  const bloodParticles = []
  const bloodSplats = []

  function randomWalkableWorldPosition() {
    for (let tries = 0; tries < 1000; tries++) {
      const tx = Math.floor(rng() * width)
      const ty = Math.floor(rng() * height)
      if (tiles[ty * width + tx] !== 2) {
        return tileToWorldCenter(tx, ty)
      }
    }
    return { x: width * tileSize * 0.5, y: height * tileSize * 0.5 }
  }

  const enemyCount = 34
  for (let i = 0; i < enemyCount; i++) {
    const p = randomWalkableWorldPosition()
    const enemy = new Unit({ id: nextEnemyId++, x: p.x, y: p.y, speed: 90, hp: 3, maxHp: 3, color: '#e11d48', selectedColor: '#ff6b6b' })
    enemy.animations = createMarineAnimations({ base: '#e11d48' })
    enemy.ai = 0
    enemies.push(enemy)
  }

  function tileIndex(tx, ty) { return ty * width + tx }
  function worldToTile(wx, wy) { return { tx: Math.floor(wx / tileSize), ty: Math.floor(wy / tileSize) } }
  function tileToWorldCenter(tx, ty) { return { x: tx * tileSize + tileSize / 2, y: ty * tileSize + tileSize / 2 } }

  function spawnBloodBurst(wx, wy, baseColor = '#b91c1c') {
    // spray particles
    for (let i = 0; i < 18 + Math.floor(Math.random() * 10); i++) {
      const ang = Math.random() * Math.PI * 2
      const spd = 120 + Math.random() * 260
      bloodParticles.push({
        x: wx,
        y: wy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 80,
        ttl: 0.5 + Math.random() * 0.6,
        life: 0.6,
        r: 1 + Math.random() * 2.5,
        color: baseColor
      })
    }
    // ground splats
    for (let i = 0; i < 6 + Math.floor(Math.random() * 6); i++) {
      const ox = (Math.random() - 0.5) * 20
      const oy = (Math.random() - 0.5) * 20
      bloodSplats.push({ x: wx + ox, y: wy + oy, r: 6 + Math.random() * 12, a: 0.55 })
    }
  }

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

  // A* on 8-neighborhood grid with corner checks and octile heuristic
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
    function heuristic(ax, ay, bx, by) {
      const dx = Math.abs(bx - ax)
      const dy = Math.abs(by - ay)
      const D = 1
      const D2 = Math.SQRT2
      return D * (dx + dy) + (D2 - 2 * D) * Math.min(dx, dy)
    }
    fScore[startIdx] = heuristic(startTx, startTy, goalTx, goalTy)
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

    const neighbors = [
      { dx: 1, dy: 0, cost: 1 },
      { dx: -1, dy: 0, cost: 1 },
      { dx: 0, dy: 1, cost: 1 },
      { dx: 0, dy: -1, cost: 1 },
      { dx: 1, dy: 1, cost: Math.SQRT2 },
      { dx: 1, dy: -1, cost: Math.SQRT2 },
      { dx: -1, dy: 1, cost: Math.SQRT2 },
      { dx: -1, dy: -1, cost: Math.SQRT2 }
    ]

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
        const nx = cx + neighbors[k].dx
        const ny = cy + neighbors[k].dy
        if (!isWalkableTile(nx, ny)) continue
        // prevent corner cutting: for diagonal moves require both adjacent orthogonal tiles to be walkable
        if (neighbors[k].dx !== 0 && neighbors[k].dy !== 0) {
          if (!isWalkableTile(cx + neighbors[k].dx, cy) || !isWalkableTile(cx, cy + neighbors[k].dy)) {
            continue
          }
        }
        const nIdx = tileIndex(nx, ny)
        if (closed[nIdx]) continue
        const tentativeG = gScore[current] + neighbors[k].cost
        if (!inOpen[nIdx] || tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = current
          gScore[nIdx] = tentativeG
          fScore[nIdx] = tentativeG + heuristic(nx, ny, goalTx, goalTy)
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
    for (const u of units) { u.update(dt, isWalkable) }

    // Combat: units shoot at enemies
    const unitRange = 220
    const enemyRange = 200
    const projectileSpeed = 600
    const fireCooldown = 0.6

    function findClosestTarget(srcX, srcY, targets) {
      let best = null
      let bestD2 = Infinity
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i]
        if (t.hp !== undefined && t.hp <= 0) continue
        const dx = t.x - srcX
        const dy = t.y - srcY
        const d2 = dx*dx + dy*dy
        if (d2 < bestD2) { bestD2 = d2; best = t }
      }
      return best ? { t: best, d2: bestD2 } : null
    }

    // players fire
    for (const u of units) {
      u.cd = Math.max(0, (u.cd || 0) - dt)
      const found = findClosestTarget(u.x, u.y, enemies)
      if (found && found.d2 <= unitRange * unitRange && u.cd === 0) {
        const t = found.t
        const dx = t.x - u.x
        const dy = t.y - u.y
        const d = Math.hypot(dx, dy) || 1
        const vx = (dx / d) * projectileSpeed
        const vy = (dy / d) * projectileSpeed
        projectiles.push({ x: u.x, y: u.y, vx, vy, ttl: 2.0, dmg: 1, owner: 'player' })
        u.cd = fireCooldown
      }
    }

    // enemies fire back
    for (const e of enemies) {
      if (e.hp <= 0) continue
      e.cd = Math.max(0, (e.cd || 0) - dt)
      const found = findClosestTarget(e.x, e.y, units)
      if (found && found.d2 <= enemyRange * enemyRange && e.cd === 0) {
        const t = found.t
        const dx = t.x - e.x
        const dy = t.y - e.y
        const d = Math.hypot(dx, dy) || 1
        const vx = (dx / d) * projectileSpeed
        const vy = (dy / d) * projectileSpeed
        projectiles.push({ x: e.x, y: e.y, vx, vy, ttl: 2.0, dmg: 1, owner: 'enemy' })
        e.cd = fireCooldown + 0.2
      }
    }

    // Enemy hunting AI: pathfind toward nearest unit and move
    for (const e of enemies) {
      if (e.hp <= 0) continue
      // Repath occasionally to nearest unit
      e.ai = Math.max(0, (e.ai || 0) - dt)
      if (e.ai === 0) {
        const tgt = findClosestTarget(e.x, e.y, units)
        if (tgt) {
          const t = tgt.t
          const path = computeWorldPath(e.x, e.y, t.x, t.y)
          if (path) {
            e.path = path
            const first = path[0]
            e.tx = first.x; e.ty = first.y
          }
        }
        // Stagger next repath a bit
        e.ai = 0.5 + (rng() * 0.7)
      }

      // Movement and animation progression via Unit.update
      e.update(dt, isWalkable)
    }

    // advance projectiles and handle hits
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      p.ttl -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.ttl <= 0) { projectiles.splice(i, 1); continue }
      // remove if hitting water tile to keep visuals tidy
      if (!isWalkable(p.x, p.y)) { projectiles.splice(i, 1); continue }

      const targets = p.owner === 'player' ? enemies : units
      const hitR2 = 10 * 10
      let hitIndex = -1
      for (let j = 0; j < targets.length; j++) {
        const t = targets[j]
        if (t.hp !== undefined && t.hp <= 0) continue
        const dx = t.x - p.x
        const dy = t.y - p.y
        if (dx*dx + dy*dy <= hitR2) { hitIndex = j; break }
      }
      if (hitIndex !== -1) {
        const t = targets[hitIndex]
        if (t.hp === undefined) { projectiles.splice(i, 1); continue }
        t.hp -= p.dmg
        if (t.hp <= 0) {
          spawnBloodBurst(t.x, t.y, '#b91c1c')
          // trigger death animation then remove after duration
          if (typeof t.die === 'function') {
            t.die()
          }
          // schedule removal
          setTimeout(() => {
            if (p.owner === 'player') {
              const idx = enemies.indexOf(t)
              if (idx >= 0) enemies.splice(idx, 1)
            } else {
              const idx = units.indexOf(t)
              if (idx >= 0) units.splice(idx, 1)
            }
          }, 650)
        }
        projectiles.splice(i, 1)
      }
    }

    // update blood particles
    for (let i = bloodParticles.length - 1; i >= 0; i--) {
      const b = bloodParticles[i]
      b.ttl -= dt
      // physics
      b.vx *= 0.9
      b.vy += 900 * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (b.ttl <= 0) {
        bloodSplats.push({ x: b.x, y: b.y, r: b.r + Math.random() * 3, a: 0.6 })
        bloodParticles.splice(i, 1)
      }
    }
  }

  function render(ctx, camera, selectedSet) {
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

    // Draw blood splats (under units)
    for (const s of bloodSplats) {
      const p = camera.worldToScreen(s.x, s.y)
      const r = Math.max(1, s.r * camera.zoom)
      ctx.fillStyle = `rgba(185,28,28,${s.a})`
      ctx.beginPath()
      ctx.arc(Math.floor(p.x)+0.5, Math.floor(p.y)+0.5, r, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw units
    for (const u of units) {
      const isSelected = selectedSet ? selectedSet.has(u.id) : false
      u.render(ctx, camera, isSelected)
    }

    // Draw enemies (as units)
    for (const e of enemies) {
      if (e.hp <= 0) continue
      e.render(ctx, camera, false)
    }

    // Draw blood particles (over units a bit)
    for (const b of bloodParticles) {
      const p = camera.worldToScreen(b.x, b.y)
      const r = Math.max(1, b.r * camera.zoom)
      const alpha = Math.max(0.1, Math.min(0.9, b.ttl / b.life))
      ctx.fillStyle = `rgba(239,68,68,${alpha})`
      ctx.beginPath()
      ctx.arc(Math.floor(p.x)+0.5, Math.floor(p.y)+0.5, r, 0, Math.PI*2)
      ctx.fill()
    }

    // Draw projectiles
    ctx.fillStyle = '#facc15' // amber
    for (const p of projectiles) {
      const { x, y } = camera.worldToScreen(p.x, p.y)
      const r = Math.max(1, 2 * camera.zoom)
      ctx.beginPath()
      ctx.arc(Math.floor(x)+0.5, Math.floor(y)+0.5, r, 0, Math.PI*2)
      ctx.fill()
    }
  }

  return { width, height, tileSize, tiles, units, enemies, projectiles, update, render, issueMove }
}


