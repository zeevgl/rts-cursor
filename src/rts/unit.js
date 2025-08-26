export class Unit {
  constructor({ id, x, y, speed = 120, hp = 10, maxHp = 10, color = '#e11d48', selectedColor = '#ff6b6b' }) {
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
    this.color = color
    this.selectedColor = selectedColor
    this.anim = { time: 0, frame: 0 }
    this.sprite = null
  }

  update(dt, isWalkable) {
    // advance animation time
    this.anim.time += dt
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
    const size = Math.max(16, 24 * camera.zoom)
    if (this.sprite && (this.sprite.image.complete || this.sprite.image.naturalWidth > 0)) {
      // animate at 8 fps when moving, 4 fps idle
      const moving = this.tx != null
      const fps = moving ? 8 : 4
      this.anim.frame = Math.floor(this.anim.time * fps) % this.sprite.frameCount
      const sx = this.anim.frame * this.sprite.frameWidth
      const sy = 0
      const dw = size
      const dh = size
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(this.sprite.image, sx, sy, this.sprite.frameWidth, this.sprite.frameHeight,
        Math.floor(p.x - dw/2), Math.floor(p.y - dh/2), Math.ceil(dw), Math.ceil(dh))
    } else {
      ctx.fillStyle = isSelected ? this.selectedColor : this.color
      ctx.fillRect(Math.floor(p.x - size/2), Math.floor(p.y - size/2), Math.ceil(size), Math.ceil(size))
    }
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


