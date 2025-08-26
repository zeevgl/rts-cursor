export class Unit {
  constructor({ id, x, y, speed = 120, hp = 10, maxHp = 10 }) {
    this.id = id
    this.x = x
    this.y = y
    this.tx = null
    this.ty = null
    this.speed = speed
    this.path = null
    this.cd = 0
    this.hp = hp
    this.maxHp = maxHp
  }

  update(dt, isWalkable) {
    if (this.tx == null && this.path && this.path.length) {
      const next = this.path[0]
      this.tx = next.x; this.ty = next.y
    }
    if (this.tx == null) return
    const dx = this.tx - this.x
    const dy = this.ty - this.y
    const dist = Math.hypot(dx, dy)
    if (dist < 2) {
      if (this.path && this.path.length) {
        this.path.shift()
        if (this.path.length) { this.tx = this.path[0].x; this.ty = this.path[0].y } else { this.tx = this.ty = null; this.path = null }
      } else {
        this.tx = this.ty = null
      }
      return
    }
    const step = this.speed * dt
    const nx = this.x + (dx / dist) * step
    const ny = this.y + (dy / dist) * step
    if (isWalkable(nx, ny)) { this.x = nx; this.y = ny } else { this.tx = this.ty = null; this.path = null }
  }

  render(ctx, camera, isSelected = false) {
    const p = camera.worldToScreen(this.x, this.y)
    const size = Math.max(2, 12 * camera.zoom)
    ctx.fillStyle = isSelected ? '#ff6b6b' : '#e11d48'
    ctx.fillRect(Math.floor(p.x - size/2), Math.floor(p.y - size/2), Math.ceil(size), Math.ceil(size))
    if (this.maxHp != null && this.hp != null) {
      const barW = Math.max(10, 16 * camera.zoom)
      const barH = Math.max(2, 3 * camera.zoom)
      const pct = Math.max(0, Math.min(1, this.hp / this.maxHp))
      const bx = Math.floor(p.x - barW/2)
      const by = Math.floor(p.y - size/2 - 6 * camera.zoom)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(bx, by, Math.ceil(barW), Math.ceil(barH))
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(bx, by, Math.ceil(barW * pct), Math.ceil(barH))
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.strokeRect(bx + 0.5, by + 0.5, Math.ceil(barW), Math.ceil(barH))
    }
  }
}


