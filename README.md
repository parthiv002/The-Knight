# The Knight | The Rescue

**The Knight | The Rescue** is a small dark-fantasy platformer built with HTML5 Canvas and plain JavaScript. The player guides a knight through three chapters, climbs an old tower, defeats enemies and the Warden, and rescues a captive.

## Purpose

This project is an experiment in using AI as a creative programming partner for making a simple game. AI was used to help explore and refine:

- Platformer movement, jumping, and double jumping
- Enemy patrol, chase, attack, and recovery behavior
- Health, damage, potions, checkpoints, and death recovery
- Ladders, teleport circles, traps, and moving platforms
- Multi-chapter progression and boss encounters
- Game interface text, HUD behavior, and visual polish

The project is intentionally small and readable so that new mechanics can be tested quickly. It is a practical example of how a person can direct an AI, review its suggestions, test the result, and iterate toward a playable game.

## Chapters

1. **The First Step**: Learn the basic movement and reach the eastern gate.
2. **The Old Keep**: Climb a ten-floor tower containing patrols, hazards, checkpoints, ladders, and teleport circles.
3. **The Iron Throne**: Fight through the throne hall, defeat the final guardian, and rescue the captive.

Enemies remain defeated after the knight dies. Potions are recovered on death, and a living boss returns at full health so the encounter can be attempted again.

## Controls

| Key | Action |
| --- | --- |
| `A` / `D` | Move left and right |
| `Space` | Jump, double jump, or climb a ladder |
| `W` / `Arrow Up` | Climb ladders |
| `J` | Attack |
| `E` | Use a healing potion |

The knight has 100 maximum health, three potions, and one air double jump. Each potion restores 30 health.

## Run Locally

No build step or package installation is required.

1. Open `index.html` in a modern web browser.
2. Start the run with the controls above.

A local server can also be used if preferred, for example:

```text
python -m http.server
```

Then open `http://localhost:8000/`.

## Project Files

- `index.html`: Game page and HUD structure
- `game.js`: Game state, physics, enemy AI, combat, progression, and rendering
- `styles.css`: Interface styling and dark-fantasy visual theme
- `Theknight/`, `boss/`, `enemies/`, and `cutegirl/`: Animation assets
- `dragonbones/`: DragonBones project and source files for the animations

The animations were created with DragonBones. The included source files can be opened and edited with DragonBones if the artwork needs to be changed.

## Possible Experiments

The game is a useful starting point for trying AI-assisted changes such as:

- Adding new enemy types or attack patterns
- Designing new tower floors
- Adjusting movement and combat balance
- Creating new traps or interactive objects
- Adding sound, dialogue, inventory, or save data
- Improving accessibility and mobile controls

When experimenting, make one focused change at a time, play-test it in the browser, and inspect the code to understand why it works.
