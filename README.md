# Stickfront (prototype)

A Stick War 2–style side-scrolling battle game. It's a test build with randomly generated maps (each with its own lane depth, gold layout and sometimes a Shrine to fight over), a castle you can garrison, statues with health and mana, gold mines, miners, five soldier types plus giants, tiered upgrades, and a computer opponent with three difficulty levels.

## Run it
Double-click **`Play Stickfront.bat`**. It opens the game in its own Microsoft Edge app window. If Edge isn't installed, it opens in your default browser. Nothing else needs to be installed.

## Units
| Unit | Cost | Building | Role |
|---|---|---|---|
| Miner | 150 | Miners' Lodge | Mines gold, prays for mana, or pans the castle stream. Fights back weakly |
| Swordwrath | 125 | Barracks | Fast melee. Starts with a club |
| Archer | 160 | Archery Range | Ranged, and can shoot over walls. Fragile up close |
| Spearton | 225 | Spear Hall | Armored front line. Each thrust also hits a second enemy (2 population) |
| Cleric | 175 + 60 mana | Chapel (on the rampart) | Heals the most wounded nearby ally for 20. Never attacks |
| Warlock | 175 + 60 mana | Sanctum (on the rampart) | Ranged bolt for 20 damage |
| Giant | 450 + 120 mana | Giant Pit | 900 hp, heavy club with splash (4 population). Can't be commanded directly |

## Giants
- **Targeting:** a giant always goes for the enemy with the most health, ignoring taunts. Each blow also splashes the 2 enemies beside its target, unless the target is another giant.
- **No direct control:** giants follow the friendly troops around them. The more troops nearby, the more chains they wear and the better they obey. A poorly chained giant may charge off on its own, or stay put when you retreat.
- **Size:** a giant is 3 formation rows wide, so two stand side by side across the lane and any more line up in columns behind them.
- **Archers** (including castle archers) deal 50% extra damage to giants and sometimes confuse them. A confused giant lashes out at whoever is closest.
- **Upgrades (Giant Pit):**
  - **Blinders:** giants obey better, archers confuse them less often (40% of the usual chance) and for half as long, and you can select them for move and hold orders.
  - **Stun Club:** hits knock non-giants back and stun them for 2s.
  - **Protein Diet I–III:** each tier makes giants bigger, tougher and stronger.
- **Statue giant:** each statue holds a giant. When a statue is destroyed, its giant breaks free. It has every upgrade and is one size beyond Protein III. It can't be controlled and attacks relentlessly. Its first blow is a huge sweep that knocks back and stuns everything around it. **To win, destroy the enemy statue and then kill its giant.**

## Formations
Attack together and Advance together march with Spearton in front, Swordwrath behind and archers and mages at the back. When the enemy is close, the Swordwrath leap out from behind the spears to fight while the shield wall holds the line.

## Difficulty
Choose it on the title screen. The pause menu shows the current setting.
- **Easy:** the old distractible opponent. Meant for learning the game.
- **Normal:** a steady economy, a mixed army and tier-1 research. It holds its line in front of its mines, pulls its miners inside when raided, attacks when it has the edge (castle archers count as defenders) and falls back when it is losing. Meant to need some strategy and formations to beat.
- **Hard:** researches everything it uses (all but Masonry, Fortification and Prospecting), uses mana, mages and giants, refits veterans, braces shield walls against archers, and attacks and retreats in formation. Meant to challenge a good player who still wins most of the time.

Both Normal and Hard claim the Shrine when their army is strong enough, and save up for research when they've gone too long without any (unless they're behind). A harder level above Hard is planned.

## Maps
Every map comes from a seed (shown on the title screen). Besides its looks, each map rolls three layout features that change how it plays:
- **Lane depth:** *Narrow pass* (tight ranks, so splash and fireballs hit more), *Open road*, or *Broad field* (room to spread out).
- **Gold layout:** *Scattered gold* (the classic spread), *Gold close to home* (safe but poorer deposits), *Contested frontier* (richer deposits further out), or *Scarce, rich veins* (two big deposits per side). Both sides always get mirror-image deposits with the same gold. Some layouts add a rich vein in the middle.
- **The Shrine** (on about 4 in 10 maps, in place of the middle vein): soldiers near it pull it toward their side while no enemy soldier contests it (more soldiers capture faster, up to 3×; miners don't count). Whoever owns it earns +1.5 gold and +0.75 mana per second. An owned shrine has to be neutralised before it changes hands.

## After the battle
The victory/defeat screen compares both sides (units trained, gold, mana, kills, peak army, upgrades) and has timeline charts for army strength, gold gathered, miners, upgrades and kills. Key moments, like Shrine captures and statues falling, are marked on the charts. It also lists a few plain-language notes on where the battle was won or lost.

## Balance / debug tools
- **F3** toggles the debug overlay. For each side it shows gold/s and mana/s (30s average), bank, population, army value, kills, stance and AI mode, research in progress, and a table of damage per second by unit type (10s average, per unit and in total, castle archers included).
- **F4** (with the overlay on) hands your side to an AI: Easy, Normal, Hard, then back to you. With **T** going up to 8× while the overlay is on, you can watch AI-vs-AI matches.
- **Headless test:** open the browser console (F12) and run `runBalanceTest('hard', 'normal', 6)`. It plays 6 random maps twice each, with each AI on both sides, as fast as your computer can, then prints a table and the win counts. Run it after changing numbers in `config.js`.

## Mages and spells
The Cleric and Warlock are exact opposites. They have the same cost, health, range and heal/damage, and each research pair costs the same. Each spell is unlocked by research:

| Cleric | Warlock | Mana | Cooldown |
|---|---|---|---|
| Healing Pool: heals 10/s for 5s | Blight Pool: 10 damage/s for 5s | 40 | 12s |
| Sanctuary: each ally gets a 60-point shield | Fireball: 60 damage to every enemy in the blast | 80 | 22s |
| Haste: +30% move and attack speed | Hex of Slowness: −30% | 30 | 15s |
| War Blessing: +30% damage | Enfeeble: −30% damage | 35 | 15s |

- **Gap between casts:** each mage must wait 2.5 seconds between any two spells.
- **Auto-cast is on by default:** mages pick good targets and counter enemy spells. They throw Sanctuary over allies an incoming Fireball is aimed at, a Healing Pool onto a Blight Pool, Haste onto slowed allies, and the reverse for Warlocks. Auto keeps 15 mana in reserve.
- **Forcing a spell:** click a spell on the command card (or press 7 / 8 / 9 / 0), then click where to cast it. It works even with auto on. The nearest ready mage walks into range and casts. With both mage types selected, Shift + 7–0 casts the Warlock's spells.
- **L** toggles auto-cast for the selected mages.

## Economy
- **Mining** about 2.3 gold/s per miner. **Praying** at the statue about 2.3 mana/s (4 at a time).
- **Panning:** garrisoned miners (up to 5) kneel at the stream inside the castle and get 1 gold + 1 mana per tick, about 1.1 of each per second. That's half of prayer's mana rate, and it's completely safe.
- The small **New:** toggle in the top bar sets where newly trained miners go: Mine, Pray or Pan.
- The statue earns no passive gold until you buy the **Statue Offerings** / **Golden Idol** castle upgrades.

## Controls
- **Training** is on the bottom-left. The ⚒ next to each unit opens its building's upgrades, and the castle button at the end opens castle upgrades.
- **The command card** on the bottom-right shows upgrades when a building is open. Otherwise it shows orders for whatever units you have selected:
  - Attack together, Advance together, Retreat together: a formation march with Spearton in front, Swordwrath behind and archers and mages at the back, at the pace of the slowest unit (slower still behind a raised shield wall)
  - Defend, Garrison
  - Hold
  - Defend Wall (needs Military Training from the Barracks or Rallying Cry from the Spear Hall): one row of melee troops stands on a wall, and blows against them are split half to the wall
  - Shield Wall
  - Mine, Pray, Pan
  - Build wall, Fortify wall, Replenish
  - Refit
- **Top-right buttons** command the **whole army**: Garrison / Defend / Attack (Q / W / E), **Muster** (G: where newly trained soldiers gather and where the defend line forms), and **Miners** (Z: miners only retreat inside and pan).

| Key | Action |
|---|---|
| Q / W / E | Whole army: Garrison / Defend / Attack |
| Shift + Q / W / E | Selected units only |
| Shift + E / C / Shift + C | Selected units attack / advance / retreat together |
| S / K / X / R | Hold / Defend wall / Shield wall / Refit |
| I / O | Miners: mine / pray |
| B / J / N | Build wall / Fortify wall / Replenish deposit |
| G / Z | Muster point / miners-only retreat |
| 1 – 6, − | Train Miner / Swordwrath / Archer / Spearton / Cleric / Warlock / Giant |
| 7 8 9 0 / L | Cast mage spells / toggle auto-cast |
| U | Cycle upgrade panels |
| A / D, arrows, mouse wheel | Scroll |
| T / P (or Esc) / H | Game speed / Pause menu (restart, new game) / Help |
| F3 / F4 | Debug overlay / Autopilot (an AI plays your side) |
| Double / triple click | Select all of a type / select every attacking unit |

## Code layout (`game/js`)
- `config.js`: balance numbers, unit stats, upgrades and visual themes
- `map.js`: generates the map from a seed (scenery, lane depth, gold layout, Shrine)
- `draw.js`: stick figures and their animations, statues, the castle (with its stream), walls, mines, props, portraits and icons
- `units.js`: unit behaviour (mining, praying, panning, building, combat, wall defense, refit, buffs)
- `game.js`: game state, training, research, walls, castle archers, the Shrine, projectiles
- `giants.js`: giant obedience, targeting, splash, knockback and the statue giant
- `ai.js`: the computer opponents (Easy, Normal, Hard)
- `stats.js`: the battle timeline and end-screen charts, the debug overlay, autopilot and the headless balance test
- `render.js`, `ui.js`, `main.js`: rendering, input, the HUD and command card, and the main loop
