export function createInput(canvas, selectionDiv, camera) {
  const state = {
    pointer: { x: 0, y: 0, lastX: 0, lastY: 0, dx: 0, dy: 0 },
    keys: {},
    dragging: false,
    justReleased: false,
    dragStart: null,
    dragEnd: null,
    wheelDelta: 0,
    rightClicked: false,
    middleDown: false
  }

  function updatePointer(e) {
    state.pointer.lastX = state.pointer.x
    state.pointer.lastY = state.pointer.y
    state.pointer.x = e.clientX
    state.pointer.y = e.clientY
    state.pointer.dx = state.pointer.x - state.pointer.lastX
    state.pointer.dy = state.pointer.y - state.pointer.lastY
  }

  canvas.addEventListener('mousemove', (e) => {
    updatePointer(e)
    if (state.dragging && state.dragStart) {
      const rect = getDragRect()
      selectionDiv.style.display = 'block'
      selectionDiv.style.left = rect.x + 'px'
      selectionDiv.style.top = rect.y + 'px'
      selectionDiv.style.width = rect.w + 'px'
      selectionDiv.style.height = rect.h + 'px'
    }
  })

  canvas.addEventListener('mousedown', (e) => {
    updatePointer(e)
    state.justReleased = false
    if (e.button === 0) {
      state.dragging = true
      state.dragStart = { x: e.clientX, y: e.clientY }
      state.dragEnd = { x: e.clientX, y: e.clientY }
      selectionDiv.style.display = 'block'
      selectionDiv.style.left = e.clientX + 'px'
      selectionDiv.style.top = e.clientY + 'px'
      selectionDiv.style.width = '0px'
      selectionDiv.style.height = '0px'
    } else if (e.button === 1) {
      state.middleDown = true
    }
  })

  window.addEventListener('mouseup', (e) => {
    updatePointer(e)
    if (e.button === 0) {
      state.dragging = false
      state.justReleased = true
      state.dragEnd = { x: e.clientX, y: e.clientY }
      selectionDiv.style.display = 'none'
    } else if (e.button === 1) {
      state.middleDown = false
    } else if (e.button === 2) {
      state.rightClicked = true
    }
  })

  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  window.addEventListener('wheel', (e) => {
    state.wheelDelta += e.deltaY
  }, { passive: true })

  window.addEventListener('keydown', (e) => { state.keys[e.code] = true })
  window.addEventListener('keyup', (e) => { state.keys[e.code] = false })

  function getDragRect() {
    if (!state.dragStart) return null
    const x1 = Math.min(state.dragStart.x, state.pointer.x)
    const y1 = Math.min(state.dragStart.y, state.pointer.y)
    const x2 = Math.max(state.dragStart.x, state.pointer.x)
    const y2 = Math.max(state.dragStart.y, state.pointer.y)
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
  }

  return {
    pointer: state.pointer,
    keys: state.keys,
    getDragRect,
    getLastDragRect() { return state.dragStart && state.dragEnd ? {
      x: Math.min(state.dragStart.x, state.dragEnd.x),
      y: Math.min(state.dragStart.y, state.dragEnd.y),
      w: Math.abs(state.dragEnd.x - state.dragStart.x),
      h: Math.abs(state.dragEnd.y - state.dragStart.y)
    } : null },
    consumeZoom() { const d = state.wheelDelta; state.wheelDelta = 0; return d },
    consumeRightClick() { const r = state.rightClicked; state.rightClicked = false; return r },
    get dragging() { return state.dragging },
    get justReleased() { const jr = state.justReleased; state.justReleased = false; return jr },
    get middleDown() { return state.middleDown }
  }
}


