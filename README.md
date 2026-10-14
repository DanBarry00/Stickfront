# Stickfront (prototype)

A Stick War 2–style side-scrolling battle game. It's a test build with randomly generated maps (each with its own lane depth, gold layout and sometimes a Shrine to fight over), a castle you can garrison, statues with health and mana, gold mines, miners, seven soldier types plus giants (including vanishing ninjas and flying Kestrels), tiered upgrades, and a computer opponent with three difficulty levels.

## Run it
Double-click **`Play Stickfront.bat`**. It opens the game in its own Microsoft Edge app window. If Edge isn't installed, it opens in your default browser. Nothing else needs to be installed.

## Units
| Unit | Cost | Building | Role |
|---|---|---|---|
| Miner | 150 | Miners' Lodge | Mines gold, prays for mana, or pans the castle stream. Fights back weakly |
| Swordwrath | 125 | Barracks | Fast melee. Starts with a club |
| Archer | 160 | Archery Range | Ranged, and can shoot over trenches. Fragile up close. 10% chance to crit for double damage |
| Spearton | 225 | Spear Hall | Armored front line. Each thrust also hits a second enemy (2 population) |
| Cleric | 175 + 60 mana | Chapel (on the rampart) | Heals the most wounded nearby ally for 20. Never attacks |
| Warlock | 175 + 60 mana | Sanctum (on the rampart) | Ranged bolt for 20 damage |
| Giant | 450 + 120 mana | Giant Pit | 900 hp, heavy club with splash (4 population). Can't be commanded directly |
| Ninja | 150 | Dojo (on the rampart) | Fast, fragile assassin. Triple-damage first blow, cuts through armor, can't be targeted while running. Hunts the weakest enemy, archers first |
| Kestrel | 175 | Aerie (on the rampart) | Flies over the battle with a small crossbow. Only ranged attacks can hit it |

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

## Ninjas
75 hp, very fast, 15 damage per quick cut. Trained at the **Dojo** on the rampart; they drop straight down into the castle.
- **Ambush:** the first blow of a fight (after 2.5s without striking), or any blow struck while vanished, deals **triple damage**.
- **Vanish:** while running, a ninja can't be targeted by anything: arrows already in the air miss, and spells can't be aimed at it. Area damage (fireballs, giant splash) still hits. Striking or stopping reveals it, and it can't vanish again for **5 seconds**.
- **Targeting:** it goes for the enemy with the least health nearby, and archers before anyone else. Shield walls still draw it in, unless it has Focus.
- **Native pierce:** its blade ignores 30% of the target's armor.
- **Crits:** 10% chance of a double-damage critical hit.
- **Upgrades (Dojo):**
  - **Serrated Blades:** ignores 65% of armor instead of 30%.
  - **Parry:** every 6s, blocks one attack completely (not area damage) and stuns a melee attacker for 1.5s.
  - **Focus:** ignores taunts.
  - **Throwing Stars:** a ranged attack (range 230, 11 damage) that can hit Kestrels and sometimes disorients giants (15% chance per star, reduced by Blinders). **M** switches the selected ninjas between **Auto** (stars against Kestrels and giants, or when below 35% health; blade otherwise), **Blade** and **Stars**. The ambush only works with the blade.
  - **Vital Points:** crit chance 10% → 20%.

## Kestrels (flyers)
70 hp, 15 damage crossbow bolts at range 300 (an archer does 24 at 380). Trained at the **Aerie** on the rampart; they launch off it and glide down to cruising height.
- **Only ranged attacks can hit them:** archers, warlocks, castle archers, ninja stars and other Kestrels. Spells reach them too, but blight and healing pools on the ground don't. Melee units and giants can't touch them.
- Ranged units treat them like any other target (no special priority). The AI trains extra archers when you field them.
- They fly over trenches.
- **Upgrades (Aerie):**
  - **Feather Fall:** when shot down, the Kestrel glides to the ground and fights on with a knife (45 hp, 6 damage). On the ground anything can hit it.
  - **Long Sights:** range 300 → 400.
  - **Crank Winch:** reload 30% faster.
  - **Barbed Bolts:** damage 15 → 21.

## Critical hits
Archers and ninjas have a 10% chance to land a critical hit for double damage, shown as "Crit!". **Eagle Eye** (Archery Range) and **Vital Points** (Dojo) raise it to 20%. Castle archers don't crit.

## Formations
Attack together and Advance together march with Spearton in front, Swordwrath and ninjas behind, Kestrels overhead and archers and mages at the back. When the enemy is close, the Swordwrath and ninjas leap out from behind the spears to fight while the shield wall holds the line.

The whole formation walks smoothly at the pace of its slowest member: faster troops simply walk slower (their legs slow down to match) instead of hurrying ahead and stopping. Archers, warlocks and Kestrels at the back fire on the move, stopping only for the shot itself and then hurrying back into rank, so their shooting never halts the march. The line only stops when its front-line troops are fighting in melee, or if someone falls far behind.

## Difficulty
Choose it on the title screen. The pause menu shows the current setting.
- **Easy:** the old distractible opponent. Meant for learning the game.
- **Normal:** a steady economy, a mixed army and tier-1 research. It holds its line in front of its mines, pulls its miners inside when raided, attacks when it has the edge (castle archers count as defenders) and falls back when it is losing. Meant to need some strategy and formations to beat.
- **Hard:** researches everything it uses (all but Earthworks, Palisade and Prospecting), uses mana, mages and giants, refits veterans, braces shield walls against archers, and attacks and retreats in formation. Meant to challenge a good player who still wins most of the time.

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

## Defences
- **Trenches** (Earthworks, Miners' Lodge): miners dig a ditch across the lane and pile an earth rampart behind it, with sharpened stakes facing the enemy. Enemies on foot can't pass until they hack it down (Kestrels fly over). 100 gold each, up to 3. **Palisade** adds a row of pointed logs along the top: taller, +800 hp. Builders can **repair** a damaged trench for free: right-click it with them, or press **Y** to send them to the most damaged one. Stakes get knocked out and the earth slumps as a trench takes damage.
- **Castle archers** reach out to just past where an enemy archer has to stand to shoot your statue (assuming the same bow upgrades as yours), so an archer attacking your statue is always under fire. Recurve Bows extend their reach by the same 120 as your archers'.
- **Chasing:** melee troops lunge after a target that backs away during their swing, so they can cut down a slower unit (like a miner) running for the castle.

## Economy
- **Mining** about 2.3 gold/s per miner. **Praying** at the statue about 2.3 mana/s (4 at a time).
- **Panning:** garrisoned miners (up to 5) kneel at the stream inside the castle and get 1 gold + 1 mana per tick, about 1.1 of each per second. That's half of prayer's mana rate, and it's completely safe.
- The small **New:** toggle in the top bar sets where newly trained miners go: Mine, Pray or Pan.
- The statue earns no passive gold until you buy the **Statue Offerings** / **Golden Idol** castle upgrades.

## Controls
- **Training** is on the bottom-left, as small icon buttons staggered over two rows in five colour-coded groups: **Workers** (Miner), **Infantry** (Swordwrath, Spearton, Ninja), **Ranged** (Archer, Kestrel), **Mages** (Cleric, Warlock) and **Giants**. Each group trains **one unit at a time** from a shared queue, in the order you click: a Spearton queued behind a Swordwrath waits for it. Click to train, right-click to cancel one (refunded). The small ⚒ in each button's corner opens its building's upgrades, and the castle button at the end opens castle upgrades.
- **The command card** on the bottom-right shows upgrades when a building is open. Otherwise it shows orders for whatever units you have selected:
  - Attack together, Advance together, Retreat together: a formation march with Spearton in front, Swordwrath behind and archers and mages at the back, at the pace of the slowest unit (slower still behind a raised shield wall)
  - Defend, Garrison
  - Hold
  - Defend Trench (needs Military Training from the Barracks or Rallying Cry from the Spear Hall): one row of melee troops stands on the rampart, and blows against them are split half to the trench
  - Shield Wall
  - Mine, Pray, Pan
  - Dig trench, Palisade, Repair, Replenish
  - Refit
- **Top-right buttons** command the **whole army**: Garrison / Defend / Attack (Q / W / E), **Muster** (G: where newly trained soldiers gather and where the defend line forms), and **Miners** (Z: miners only retreat inside and pan).

| Key | Action |
|---|---|
| Q / W / E | Whole army: Garrison / Defend / Attack |
| Shift + Q / W / E | Selected units only |
| Shift + E / C / Shift + C | Selected units attack / advance / retreat together |
| S / K / X / R | Hold / Defend trench / Shield wall / Refit |
| I / O | Miners: mine / pray |
| B / J / Y / N | Dig trench / Palisade / Repair trenches / Replenish deposit |
| G / Z | Muster point / miners-only retreat |
| 1 – 6, −, =, [ | Train Miner / Swordwrath / Archer / Spearton / Cleric / Warlock / Giant / Ninja / Kestrel |
| M | Ninjas with Throwing Stars: weapon Auto / Blade / Stars |
| 7 8 9 0 / L | Cast mage spells / toggle auto-cast |
| U | Cycle upgrade panels |
| A / D, arrows, mouse wheel | Scroll |
| T / P (or Esc) / H | Game speed / Pause menu (restart, new game) / Help |
| F3 / F4 | Debug overlay / Autopilot (an AI plays your side) |
| Double / triple click | Select all of a type / select every attacking unit |

## Code layout (`game/js`)
- `config.js`: balance numbers, unit stats, upgrades and visual themes
- `map.js`: generates the map from a seed (scenery, lane depth, gold layout, Shrine)
- `draw.js`: stick figures and their animations, statues, the castle (with its stream), trenches, mines, props and icons
- `units.js`: unit behaviour (mining, praying, panning, building, combat, trench defense, refit, buffs)
- `game.js`: game state, training queues, research, trenches, castle archers, the Shrine, projectiles
- `giants.js`: giant obedience, targeting, splash, knockback and the statue giant
- `ai.js`: the computer opponents (Easy, Normal, Hard)
- `stats.js`: the battle timeline and end-screen charts, the debug overlay, autopilot and the headless balance test
- `render.js`, `ui.js`, `main.js`: rendering, input, the HUD and command card, and the main loop
