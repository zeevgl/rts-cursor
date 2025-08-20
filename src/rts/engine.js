export function createEngine({ update, render }) {
  let last = performance.now()
  let running = false

  function frame(now) {
    if (!running) return
    const dt = Math.min(0.033, (now - last) / 1000)
    last = now
    try { update?.(dt) } catch (e) { console.error(e) }
    try { render?.() } catch (e) { console.error(e) }
    requestAnimationFrame(frame)
  }

  return {
    start() {
      if (running) return
      running = true
      last = performance.now()
      requestAnimationFrame(frame)
    },
    stop() { running = false }
  }
}


