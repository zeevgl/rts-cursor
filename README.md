# RTS Starter (Vanilla JS + Vite)

A tiny real-time strategy starter written in plain JavaScript. Includes:

- Camera: pan (WASD / middle-drag), smooth zoom at cursor (wheel)
- Input: drag-select with selection rectangle, right-click move command
- World: tile grid with simple terrain and walkability
- Units: selection, basic target-move with simple formation, collision-free walkable check
- Engine: lightweight update/render loop with `requestAnimationFrame`

## Run

```bash
npm install
npm run dev
```

Open the printed local URL (usually http://localhost:5173).

## Controls

- WASD: pan camera
- Mouse wheel: zoom in/out (focus under cursor)
- Left-drag: draw selection rectangle
- Right-click: move selected units
- Middle-drag: pan

## Project Structure

- `index.html`: page and HUD
- `src/main.js`: game bootstrap
- `src/rts/engine.js`: frame loop
- `src/rts/camera.js`: world/screen transforms, zooming
- `src/rts/input.js`: keyboard/mouse handling and selection rectangle
- `src/rts/selection.js`: selected entity set
- `src/rts/world.js`: terrain generation, rendering, and unit updates

## Next Steps

- Add A* pathfinding on the tile grid
- Implement unit behaviors (attack, gather, build)
- Add fog of war and minimap
- Networking (lockstep or server authority)

License: MIT
