export function createGeneratedSpriteSheet({ frameSize = 16, frameCount = 4, baseColor = '#e11d48' }) {
  const w = frameSize * frameCount
  const h = frameSize
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  function drawFrame(ix) {
    const x = ix * frameSize
    // background transparent
    // body
    ctx.save()
    ctx.translate(x + frameSize / 2, frameSize / 2)
    // simple bobbing/leg shift
    const leg = (ix % 2 === 0) ? 2 : -2
    // body
    ctx.fillStyle = baseColor
    ctx.fillRect(-5, -6, 10, 12)
    // head
    ctx.fillStyle = lighten(baseColor, 0.25)
    ctx.fillRect(-4, -10, 8, 4)
    // left leg
    ctx.fillStyle = darken(baseColor, 0.25)
    ctx.fillRect(-4, 6, 3, 4 + leg)
    // right leg
    ctx.fillRect(1, 6, 3, 4 - leg)
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(-4, -5, 8, 2)
    ctx.restore()
  }

  for (let i = 0; i < frameCount; i++) drawFrame(i)

  const image = new Image()
  image.src = canvas.toDataURL()
  return {
    image,
    frameWidth: frameSize,
    frameHeight: frameSize,
    frameCount
  }
}

function hexToRgb(hex) {
  const m = hex.replace('#', '')
  const bigint = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)) }

function toHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.round(r + (255 - r) * clamp01(amt))
  const ng = Math.round(g + (255 - g) * clamp01(amt))
  const nb = Math.round(b + (255 - b) * clamp01(amt))
  return toHex({ r: nr, g: ng, b: nb })
}

function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex)
  const nr = Math.round(r * (1 - clamp01(amt)))
  const ng = Math.round(g * (1 - clamp01(amt)))
  const nb = Math.round(b * (1 - clamp01(amt)))
  return toHex({ r: nr, g: ng, b: nb })
}

// StarCraft-like marine pixel sprite (procedural), side-facing simplified
export function createMarineSpriteSheet({
  frameSize = 20,
  frameCount = 6,
  base = '#5b94f7', // armor base
  shadow = '#2f4a7a', // darker armor/shadows
  visor = '#9be9ff', // visor glow
  accent = '#cbd5e1', // light accents/edge
  ampLeg = 2,
  ampBob = 1,
  ampArm = 1
} = {}) {
  const w = frameSize * frameCount
  const h = frameSize
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  function framePose(i) {
    const t = (i / frameCount) * Math.PI * 2
    const leg = Math.round(Math.sin(t) * ampLeg) // -amp..amp
    const bob = Math.round(Math.sin(t) * ampBob) // subtle body bob
    const arm = Math.round(Math.cos(t) * ampArm)
    return { leg, bob, arm }
  }

  function drawMarine(ix) {
    const { leg, bob, arm } = framePose(ix)
    const x = ix * frameSize
    ctx.save()
    ctx.translate(x, 0)

    // Boots
    ctx.fillStyle = shadow
    ctx.fillRect(5, 16 + bob, 4, 3 + Math.max(0, -leg)) // back boot
    ctx.fillRect(11, 16 + bob, 4, 3 + Math.max(0, leg)) // front boot

    // Legs
    ctx.fillStyle = base
    ctx.fillRect(5, 12 + bob, 4, 4 + Math.max(0, -leg)) // back leg
    ctx.fillRect(11, 12 + bob, 4, 4 + Math.max(0, leg)) // front leg

    // Torso armor
    ctx.fillStyle = base
    ctx.fillRect(4, 7 + bob, 12, 6)
    // Chest plate highlight
    ctx.fillStyle = lighten(base, 0.25)
    ctx.fillRect(5, 8 + bob, 10, 2)

    // Shoulder pads
    ctx.fillStyle = base
    ctx.fillRect(3, 7 + bob, 3, 3) // left
    ctx.fillRect(14, 7 + bob, 3, 3) // right
    ctx.fillStyle = accent
    ctx.fillRect(3, 7 + bob, 3, 1)
    ctx.fillRect(14, 7 + bob, 3, 1)

    // Backpack
    ctx.fillStyle = shadow
    ctx.fillRect(4, 6 + bob, 4, 3)

    // Helmet
    ctx.fillStyle = base
    ctx.fillRect(6, 3 + bob, 8, 4)
    // Visor
    ctx.fillStyle = visor
    ctx.fillRect(9, 4 + bob, 4, 2)

    // Gun (front/right), arm anim
    ctx.fillStyle = shadow
    ctx.fillRect(12, 10 + bob + arm, 7, 2) // barrel
    ctx.fillRect(11, 9 + bob + arm, 2, 3) // grip
    // Front arm
    ctx.fillStyle = base
    ctx.fillRect(10, 9 + bob + arm, 3, 3)

    // Edge highlights
    ctx.fillStyle = accent
    ctx.fillRect(4, 7 + bob, 1, 6)
    ctx.fillRect(15, 7 + bob, 1, 6)

    ctx.restore()
  }

  for (let i = 0; i < frameCount; i++) drawMarine(i)

  const image = new Image()
  image.src = canvas.toDataURL()
  return { image, frameWidth: frameSize, frameHeight: frameSize, frameCount }
}

// Convenience: build idle and walk animations with different amplitudes/frame counts
export function createMarineAnimations(opts = {}) {
  const walk = createMarineSpriteSheet({ ...opts, frameCount: 6, ampLeg: 2, ampBob: 1, ampArm: 1 })
  const idle = createMarineSpriteSheet({ ...opts, frameCount: 4, ampLeg: 0.3, ampBob: 0.5, ampArm: 0.2 })
  return { idle, walk }
}


