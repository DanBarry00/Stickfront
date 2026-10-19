# Stickfront (prototype)

A Stick War 2–style side-scrolling battle game. It's a test build with randomly generated maps (each with its own lane depth, gold layout and sometimes a Monolith to fight over), nine clans to choose from, a castle you can garrison, statues with health and mana, gold mines, miners, seven soldier types plus giants (including vanishing ninjas and flying Kestrels), tiered upgrades, and a computer opponent with four difficulty levels.

## Install (Windows)
Download **[StickfrontSetup.bat](https://github.com/DanBarry00/Stickfront/raw/main/installer/StickfrontSetup.bat)** and double-click it. The setup wizard:
1. checks for Git, and offers to install it (with winget) if it's missing,
2. downloads the game from this repository into `%LOCALAPPDATA%\Programs\Stickfront` (or a folder you pick),
3. puts a **Stickfront** shortcut on your desktop.

Every time you start the game from the shortcut, it checks GitHub for a newer version. If there is one, it lists what changed and asks whether to update; **Yes** runs a `git pull`, then the game starts. Offline, it just starts the game. Running the setup again on an existing install updates it and recreates the shortcut. Windows may warn about a downloaded script the first time; choose **More info → Run anyway**.

The installer takes the `main` branch (set `$Branch` near the top of the file to give testers another one). For testing the setup itself, `SF_UNATTENDED=1` answers every question with Yes, and `SF_DIR`, `SF_DESKTOP`, `SF_REPO` and `SF_BRANCH` override the folder, the shortcut's location, the repository and the branch. `launcher\launch.ps1 -CheckOnly` prints how many updates are waiting.

## Run it
Use the desktop shortcut, or double-click **`Play Stickfront.bat`** in the game folder (it does the same update check). It opens the game in its own Microsoft Edge app window, or your default browser if Edge isn't installed. With a plain copy of the files (no Git), it skips the update check and just starts the game.

## Starting a skirmish
The setup screen lets you choose **your clan** and the **enemy clan** (or **Random** for either; random clans are revealed when the battle begins, and both sides can draw the same clan), the opponent's **difficulty**, whether there is a **Monolith**, how much **gold** the deposits hold, and the map **seed**. The map behind the menu is a live preview of your choices. Your settings are remembered. Restart and Rematch keep the same clans and map.

## Clans
Each clan sets your starting gold, mana and army, which upgrades are already researched, which units and upgrades you can't use, some price changes and a few general buffs. The Base Clan is the standard game; every other clan is meant to be stronger overall, with a weakness to play around. Units your clan can't train are left off the training bar, and upgrades it can't research are left out of the building panels. Definitions live in `game/js/clans.js`.

| Clan | Start | Strengths | Weaknesses |
|---|---|---|---|
| **Base** | 750 gold; 2 miners, a veteran Swordwrath with every sword upgrade, an archer, an Architect and a Quartermaster | Every unit and upgrade; the way to learn the game | No special perks |
| **Archer** | 2 miners, 2 archers | Recurve Bows, Eagle Eye, Vital Points, Long Sights; archers and Kestrels 15 gold cheaper; 4 castle archer slots; clan-only Longbows (range 600), Broadheads (damage 40), Steady Hands (reload 15% faster), Spyglass (Kestrel range 480) | No Iron/Crested Helmets or Tower Shields; giants can't get Blinders |
| **Defense** | 2 miners and an Architect; a trench held by a Spearton and an archer, an archer tower behind it with an archer posted, and a tar pit and a mine in front of it | Clan unit: the **Ballista**; Earthworks, Shields, Military Training, Rallying Cry, Recurve Bows, a second castle archer; 4 castle archer slots; clan-only Levy II (a free Spearton every minute too) | No Warlocks or Giants |
| **Sword** | 2 miners, 2 Swordwrath | Population 35; Levy, Military Training, Adrenaline; clan-only Great Swords (damage 25, 10% slower swing) | No Kestrels or Throwing Stars (only archers and Gladiator javelins hit flyers); no Flaming Arrows; no trenches |
| **Mercenary** | 4 miners, 1 plain Swordwrath, a Quartermaster | Bigger Bags, Steel Pickaxes, Iron Pans, Statue Offerings; every kill pays 20% of the victim's gold cost; clan-only Mule Packs (carry 100), Diamond Picks (17 per swing), Gilded Statue (4 gold/s) | Praying gives half the mana; troops (not miners) −10% health; weakest starting army |
| **Arcane Circle** | 150 mana; 2 miners, a Cleric and a Warlock | Clan unit: the **Spirit Golem**; Healing Pool and Blight Pool; mages cost 35 mana; praying gives 50% more | Swordwrath and Spearton −10% health; 1 castle archer; no Giants |
| **Beast** | 2 miners, a giant and a Beastmaster | Clan unit: the **Beastmaster**; giants cost 220 gold + 150 mana, take 3 population and have 30% more health; Thick Hide (archers get no bonus damage against its giants); Beastmasters cost 120; Blinders researched | No Archers or Kestrels (only Beastmasters, Warlocks and Gladiator javelins reach flyers) |
| **Shadow** | 2 miners, 3 ninjas | Clan unit: the **Saboteur**; all units +25% damage; ninjas cost 100, vanish again after 3s; Throwing Stars, Vital Points and Parry researched | All units −10% health; no Spearton; no trenches |
| **Sky** | 2 miners, 3 Kestrels | Clan unit: the **Firebird**; Kestrels cost 140, deal 30% more damage, have 25% more health and crit 10% of the time; Long Sights and clan-only Hawk Eye (20% crit) researched; clan-only Spyglass (range 480), Barbed Bolts II (damage 26) | Swordwrath and Spearton −10% health; no Giants |

The Base Clan now starts with an archer, an Architect, a Quartermaster and 250 extra gold, which puts it on about the level of the other clans: it's still the plain game, the one to learn on. With the Hard AI playing both sides and random play styles (`runClanTest(clan, 'base', 2)`), the other clans won 8 of 16 games against it.

Clan-only upgrades and units appear only for their clan. The setup screen lists these as "coming soon" for each clan.

## Units
Every unit trains in its class's building, which also holds all of that class's upgrades: the **Workers' Lodge** (workers), **Barracks** (infantry), **Archery Range** (ranged), **Mage Tower** (mages) and **Giant Pit** (giants; the Arcane Circle's is a Golem Forge).

| Unit | Cost | Building | Role |
|---|---|---|---|
| Miner | 150 | Workers' Lodge | Mines gold, prays for mana, or pans the castle stream. Fights back weakly |
| Architect | 175 | Workers' Lodge | Digs trenches, lays traps, builds archer towers, repairs and rebuilds. Researches upgrade discounts while idle |
| Quartermaster | 200 | Workers' Lodge | Support, up to 2: heals and refits troops for free, restocks Gladiators, cheers miners on, restores gold deposits, brings Architects materials for free traps. Stays out of fights |
| Swordwrath | 125 | Barracks | Fast melee. Starts with a club |
| Spearton | 225 | Barracks | Armored front line. Each thrust also hits a second enemy (2 population) |
| Gladiator | 200 | Barracks | Lone-wolf melee: a javelin (hits flyers) and a net to throw once each, grows stronger with every kill and hits harder the fewer friends are near. Never marches in formation |
| Ninja | 150 | Barracks | Fast, fragile assassin. Triple-damage first blow, cuts through armor, can't be targeted while running. Hunts the weakest enemy, archers first |
| Archer | 160 | Archery Range | Ranged, and can shoot over trenches. Fragile up close. 10% chance to crit for double damage |
| Kestrel | 175 | Archery Range | Flies over the battle with a small crossbow. Only ranged attacks can hit it |
| Cleric | 175 + 60 mana | Mage Tower | Heals the most wounded nearby ally for 20, and each heal briefly quickens and blesses it. Never attacks. Inspires: troops nearby take 15% less damage |
| Warlock | 175 + 60 mana | Mage Tower | Ranged bolt for 20 damage that briefly slows and weakens its target. Empowers: troops nearby deal 15% more damage |
| Necromancer | 175 + 75 mana | Mage Tower | Raises and leads up to 6 zombies (weak, slow, half damage from shots; whoever they kill rises as one). Never attacks itself |
| Giant | 450 + 120 mana | Giant Pit | 900 hp, heavy club with splash (4 population). Can't be commanded directly |
| Ballista | 250 + 50 mana | Archery Range (Defense Clan only) | Long-range siege engine that wrecks trenches and statues; helpless up close (2 population). Needs an Architect alive to build |
| Spirit Golem | 150 + 250 mana | Golem Forge (Arcane Circle only) | Commandable 700 hp tank; Hunker Down to soak damage and draw attacks; half damage from Warlock magic (3 population) |
| Beastmaster | 140 | Archery Range (Beast Clan only) | Slinger: hits flyers, double damage to giants, tames nearby friendly giants |
| Saboteur | 150 + 25 mana | Barracks (Shadow Clan only) | Fast infiltrator that vanishes while running; triple damage to trenches; salts enemy gold deposits |
| Firebird | 200 + 50 mana | Archery Range (Sky Clan only) | Flying bomber: drops fire pots on ground units below; only ranged attacks reach it (2 population) |

## Giants
- **Targeting:** a giant goes for the closest enemy it can reach, ignoring taunts. Each blow also splashes the 2 enemies beside its target, unless the target is another giant.
- **No direct control:** giants follow the friendly troops around them, taking their place at the front of the line (with the spears in a formation or on the defend line). Beastmasters drive them from behind: they never count as the front, and when attacking they keep behind the last giant. The more troops nearby, the more chains they wear and the better they obey. A poorly chained giant may charge off on its own, or stay put when you retreat.
- **Size:** a giant is 3 formation rows wide, so two stand side by side across the lane and any more line up in columns behind them.
- **The statue:** a giant that reaches the enemy statue keeps pounding it (it still smashes anything in arm's reach first). Only a Blinders move order pulls it away.
- **No garrison:** giants are too big for the castle. The Garrison button doesn't show for them, and when the army garrisons they wait outside the gate.
- **Archers** (including castle archers) deal 10% extra damage to giants and sometimes confuse them. A confused giant lashes out at whoever is closest.
- **Arm up:** a giant pelted hard by arrows, bolts, stones or stars (more than 6% of its health in quick succession) raises its free forearm across its face for 4 seconds: projectiles do 30% less damage, but it swings 35% slower.
- **Upgrades (Giant Pit):**
  - **Blinders:** giants obey better, archers confuse them less often (40% of the usual chance) and for half as long, and you can select them for move and hold orders.
  - **Stun Club:** hits knock non-giants back and stun them for 2s.
  - **Protein Diet I–III:** each tier makes giants bigger, tougher and stronger. At Protein Diet III a giant stands tall enough to swat flyers out of the air (so does the statue giant).
- **Statue giant:** each statue holds a giant. When a statue is destroyed, its giant breaks free. It has every upgrade and is one size beyond Protein III. It can't be controlled and attacks relentlessly. For its first 3 seconds it can't be hurt (it glows while it's untouchable). Its first blow reaches further than usual and is a huge sweep (240 all round) that hurls everything back and stuns it for 3 seconds. **To win, destroy the enemy statue and then kill its giant.**

## Ninjas
75 hp, very fast, 15 damage per quick cut. Trained at the **Barracks**.
- **Ambush:** the first blow of a fight (after 2.5s without striking), or any blow struck while vanished, deals **triple damage**.
- **Vanish:** while running, a ninja can't be targeted by anything: arrows already in the air miss, and spells can't be aimed at it. Area damage (fireballs, giant splash) still hits. An enemy it brushes past (within 40) can still spot and strike it, which shakes it out of hiding. Striking or stopping reveals it, and it can't vanish again for **5 seconds**.
- **Targeting:** it goes for the enemy with the least health nearby, and archers before anyone else. Shield walls still draw it in, unless it has Focus.
- **Native pierce:** its blade ignores 30% of the target's armor.
- **Crits:** 10% chance of a double-damage critical hit.
- **Upgrades (Barracks):**
  - **Serrated Blades:** ignores 65% of armor instead of 30%.
  - **Parry:** every 6s, blocks one attack completely (not area damage, and never a giant's club) and stuns a melee attacker for 1.5s.
  - **Focus:** ignores taunts.
  - **Throwing Stars:** a ranged attack (range 230, 11 damage) that can hit Kestrels and sometimes disorients giants (15% chance per star, reduced by Blinders). **M** switches the selected ninjas between **Auto** (stars against Kestrels and giants, or when below 35% health; blade otherwise), **Blade** and **Stars**. The ambush only works with the blade.
  - **Vital Points:** crit chance 10% → 20%.

## Kestrels (flyers)
70 hp, 15 damage crossbow bolts at range 300 (an archer does 24 at 380). Trained at the **Archery Range**; they launch off the timber perch on the rampart and glide down to cruising height.
- **Only ranged attacks can hit them:** archers, warlocks, castle archers, ninja stars and other Kestrels. Spells reach them too, but blight and healing pools on the ground don't. Melee units and giants can't touch them.
- Ranged units treat them like any other target (no special priority). The AI trains extra archers when you field them.
- They fly over trenches.
- **Upgrades (Archery Range):**
  - **Feather Fall:** when shot down, the Kestrel glides to the ground and fights on with a knife (45 hp, 6 damage). On the ground anything can hit it.
  - **Long Sights:** range 300 → 400.
  - **Crank Winch:** reload 30% faster.
  - **Barbed Bolts:** damage 15 → 21.

## Critical hits
Archers and ninjas have a 10% chance to land a critical hit for double damage, shown as "Crit!". **Eagle Eye** (Archery Range) and **Vital Points** (Barracks) raise it to 20%. Castle archers don't crit.

## Formations
Attack together and Advance together march with Spearton in front, Swordwrath and ninjas behind, Kestrels overhead and archers and mages at the back. When the enemy is close, the Swordwrath and ninjas leap out from behind the spears to fight while the shield wall holds the line.

The whole formation walks smoothly at the pace of its slowest member: faster troops simply walk slower (their legs slow down to match) instead of hurrying ahead and stopping. Archers, warlocks and Kestrels at the back fire on the move, stopping only for the shot itself and then hurrying back into rank, so their shooting never halts the march. The line only stops when its front-line troops are fighting in melee, or if someone falls far behind.

## Difficulty
Choose it on the setup screen. The pause menu shows the current setting. The computer plays whichever clan it was given, using only that clan's units and upgrades and leaning toward its strengths.
- **Easy:** the old distractible opponent. Meant for learning the game.
- **Normal:** a steady economy, a mixed army and tier-1 research. It holds its line in front of its mines, pulls its miners inside when raided, attacks when it has the edge (castle archers count as defenders), marching out in step with Advance and keeping the formation through the fight, sends a wave every 2½–3 minutes when the armies are even, raids exposed miners with a pair of quick troops, and falls back when it is losing. Meant to need some strategy and formations to beat.
- **Hard:** researches everything it uses (all but Earthworks and Palisade), builds an archer tower and lays a couple of traps, uses mana, mages and giants, refits veterans, braces shield walls against archers, attacks and retreats in formation, sends a wave every 1½–2 minutes once its army is close to yours, and keeps raiding exposed miners with up to three quick troops (Kestrels, ninjas, Swordwrath). It cheats a little: +3 gold and +0.6 mana per second on top of its mining, and it starts with one random boost (below). Meant to challenge a good player who still wins most of the time.
- **Very Hard:** Hard, sharper: it decides faster, trains more at once, attacks every minute or so, raids with up to four troops, takes the Monolith at 55% of your strength, keeps two Architects with up to two towers and four traps, and earns +5.5 gold and +1.3 mana per second on top of its mining. Its soldiers have 12% more health and deal 8% more damage. It also gets a head start: four upgrades already 25% cheaper, three traps laid in front of its castle, and three random boosts. A real challenge.

**Boosts** (Hard gets one, Very Hard three, picked at random to suit its clan): a veteran squad (three extra soldiers), two upgrades already researched, two extra miners, traps laid in front of its castle, an archer tower with an archer posted, a war chest (+300 gold, +120 mana), or three upgrades 25% cheaper.

### Play styles
Every game the computer (Normal and up) picks a play style at random, never the one it played last game and leaning toward what suits its clan, and rolls its own timings, so no two games go the same way. Each style runs in phases and changes course when a phase has run its course. The end screen tells you which plan it played and how it unfolded.
- **Early rush:** few miners and cheap troops, attacking with four or more as early as it can and coming straight back after each setback. After two failed pushes (or about five minutes) it falls back, builds up its economy, towers and traps, and comes again with an all-out assault of 13–17 soldiers, then rebuilds for the next.
- **Economy first:** three extra miners and economy research first, holding the line for three to four and a half minutes. Then many small pushes: a party of four to six marches out in step while the rest holds, and comes home when outmatched, halved or after a while; raids go out every 30–45 seconds. Once its army reaches 17–21 it makes one big push.
- **Fortress:** towers (up to three), extra traps, two Architects and castle archer upgrades first, teching up behind them. It never attacks until it has a big, upgraded army (or about eight to ten minutes in), then makes one overwhelming push, and fortifies again.
- **Raider:** quick troops (ninjas, Kestrels, saboteurs) and constant raids on your miners, every 16–28 seconds with two more raiders than usual, alongside its normal attacks. After six to eight minutes it switches to an all-out assault.
- **Forward line:** pushes its defend line up to the middle of the map as soon as it can contest it (with a tower and traps there) to take the Monolith and starve your miners, and lays patient sieges.
- **Tech timing:** researches a set of power upgrades first and attacks when five to seven of them are done and it has 8–11 soldiers, then techs up for the next timing push.
- **Balanced:** the all-round game: it holds its line in front of its mines, attacks when it has the edge and sends waves on a timer.

Whatever the style, a computer that's building up still attacks when it's far ahead (eight or more soldiers and nearly twice your strength).

**Sieges:** a push that reaches the edge of your castle archers' reach stops there instead of walking into the arrows. It fights whatever comes out to it (and any miners in reach) and only storms the statue once it's strong enough to beat your castle archers, tower archers and garrison together (sooner when the statue is badly hurt). After 75 seconds it storms if the odds are close, and otherwise falls back. A push also falls back when it's badly outmatched where it stands, not just when it's losing overall.

All of them march out in an Advance formation and keep it for the whole push. They never attack with fewer than 5 soldiers (4 during an early rush). They weigh armies by what the units cost (hurt units count for less, giants for 60%) and count each enemy castle archer as 300 more defence. Their giants march with the army instead of waiting at the muster point, and formations wait for giants that fall behind.

All three make the Monolith their first priority: they stand on it (or go to take it back) as soon as their army can contest it (Very Hard with 3 soldiers at 55% of your army's strength, Hard with 3 at 60%, Normal with 5 at 90%). Their miners never dig on your half of the map. A miner with nothing safe to dig (no deposit, an empty one, or one where your army holds the ground) pans the castle stream first, then prays; their Quartermasters restore the worked-out deposits (they train one straight away when the gold on their half runs low). When the gold on their half runs low they stop training miners, so the late game never stalls with miners wandering back and forth. They also save up for research when they've gone too long without any (unless they're behind).

They also fight smarter:
- **Home defence:** when clearly outmatched at home they pull everyone into the castle, where troops heal and the castle archers shoot faster, and sally out as soon as you hit the statue or the odds even up (then stay out for a while rather than running in and out).
- **The statue giant:** once your statue falls, they don't fight its giant under your castle archers; they hold a line just out of the archers' reach until the giant charges out, then fall on it in the open.
- **The wounded** slip back into the castle to heal between fights and rejoin when mended.
- **Counter-picks:** they field more Spearton against blades (and, with Shields, against arrows), more shooters against Spearton and giants, and more ninjas against archers and mages.

With the Base Clan on both sides and random play styles, each level beats the one below: Normal beats Easy 4–0, Hard beats Normal 4–0, Very Hard beats Hard 4–0.

## Maps
Every map comes from a seed (shown on the setup screen; you can type one in). Besides its looks, each map has these layout features:
- **Lane depth:** *Narrow pass* (tight ranks, so splash and fireballs hit more), *Open road*, or *Broad field* (room to spread out).
- **Gold layout:** *Scattered gold* (the classic spread), *Gold close to home* (safe but poorer deposits), *Contested frontier* (richer deposits further out), or *Scarce, rich veins* (two big deposits per side). Both sides always get mirror-image deposits with the same gold. Some layouts add a rich vein in the middle.
- **Gold amount** (setup option): *Scarce* (40% less in every deposit), *Normal*, *Rich* (60% more) or *Random*.
- **The Monolith** (setup option: Off, On or Random, which puts it on about 4 in 10 maps), in place of the middle vein: soldiers near it pull it toward their side while no enemy soldier contests it (more soldiers capture faster, up to 3×; miners don't count). Whoever owns it earns +1.5 gold and +0.75 mana per second. An owned Monolith has to be neutralised before it changes hands.

## After the battle
The victory/defeat screen compares both sides (units trained, gold, mana, kills, peak army, upgrades) and has timeline charts for army strength, gold gathered, miners, upgrades and kills. Key moments, like Shrine captures and statues falling, are marked on the charts. It also lists a few plain-language notes on where the battle was won or lost.

## Balance / debug tools
- **F3** toggles the debug overlay. For each side it shows gold/s and mana/s (30s average), bank, population, army value, kills, stance and AI mode, research in progress, and a table of damage per second by unit type (10s average, per unit and in total, castle archers included).
- **F4** (with the overlay on) hands your side to an AI: Easy, Normal, Hard, Very Hard, then back to you. With **T** going up to 8× while the overlay is on, you can watch AI-vs-AI matches.
- **Headless tests:** open the browser console (F12). `runBalanceTest('hard', 'normal', 6)` plays 6 random maps twice each, with each AI on both sides (both on the Base Clan), as fast as your computer can, then prints a table and the win counts. `runClanTest('sword', 'archer', 6)` does the same for two clans, both played by the Hard AI (pass `'normal'` or `'easy'` as a 4th argument to change that). `runUnitDuel('sword', 'archer', 4, 4)` sets two squads loose on open ground (no AI, no upgrades) and reports the winner, survivors, the first blow and how long units stood idle with an enemy in reach; `runUnitMatrix(['sword', 'spear', 'archer'])` runs every pair. `runStyleTest('veryhard', 'rush', 'hard', 'fortress', 4)` makes the computer play one style (here an Early rush on Very Hard) against an AI opponent (Hard playing Fortress; leave the style out for a random one) on 4 random maps and lists how each plan unfolded. Run them after changing numbers in `config.js` or `clans.js`.

## Mages and spells
The Cleric and Warlock are exact opposites. They have the same cost, health, range and heal/damage, and each research pair costs the same.
- **The staff:** a Cleric's heal also quickens and blesses whoever it heals (25% faster and 25% harder-hitting), and a Warlock's bolt slows and weakens whoever it hits by as much, each for as long as the mage takes to strike again. The two cancel out.
- **Staff upgrades:** Blessed Staff / Cursed Staff (heal or bolt 20 → 28), then Saint's Staff / Bone Staff (28 → 36, and 40 more reach).
- **Hope / Fear:** with Hope, every friend within a Cleric's range attacks 15% faster and takes 10% less damage; with Fear, every enemy within a Warlock's range attacks 15% slower and takes 10% more damage (one stack each).

Two spells each, unlocked by research:

| Cleric | Warlock | Mana | Cooldown |
|---|---|---|---|
| Healing Pool: heals 10/s for 5s | Blight Pool: 10 damage/s for 5s | 40 | 12s |
| Sanctuary: each ally gets a 60-point shield | Fireball: 60 damage to every enemy in the blast | 80 | 22s |

- **On the move:** a mage told to go somewhere (a move order, garrisoning, a retreat, a marching formation) keeps going and only heals or casts once it has stopped.
- **Gap between casts:** each mage must wait 2.5 seconds between any two spells.
- **Auto-cast is on by default:** mages pick good targets and counter enemy spells. They throw Sanctuary over allies an incoming Fireball is aimed at and a Healing Pool onto a Blight Pool, and the reverse for Warlocks. Auto keeps 15 mana in reserve.
- **Forcing a spell:** click a spell on the command card (or press 7 / 8), then click where to cast it. It works even with auto on. The nearest ready mage walks into range and casts. With both mage types selected, Shift + 7 / 8 casts the Warlock's spells.
- **L** toggles auto-cast for the selected mages.

## Ballista (Defense Clan)
A crewed bolt-thrower, trained in the Ranged group (hotkey `]`). 250 gold + 50 mana, 2 population, 160 hp, slow (speed 40). It rolls out by the gate.
- **Range 550**, longer than any archer's. One heavy bolt every 4 seconds for 45 damage, which punches through into the next ground unit behind the target for 60% of that.
- **Siege:** double damage to trenches and statues.
- **Weaknesses:** it can't hit flyers, and it can't shoot anything closer than 120. It backs away to get a clear shot, but it's slow, so melee troops and Kestrels that reach it can pick it apart. It prefers targets it can actually shoot.
- **Upgrades (Siege Workshop, opened from the ⚒ on its button):** Torsion Springs (range 650), Iron-tipped Bolts (damage 60), Mantlet (+60 hp and 20% armor).

## Spirit Golem (Arcane Circle)
A lumbering heap of rounded, rune-bound stones, trained in the Giants group (hotkey `\`) at the Golem Forge, the pit outside the gate. 150 gold + 250 mana, 3 population, 700 hp, 30 damage per slam, slow.
- **You command it directly**, unlike a giant: move, hold, attack and stance orders all work. It stands at the front of formations.
- **No splash:** it hits one target at a time.
- **Half damage from Warlock magic** (bolts, Blight Pools and Fireballs).
- **Hunker Down (X):** it crouches behind crossed arms at half speed, takes 60% less damage, and enemies prefer to hit it (like Tower Shields), but it stops attacking. It costs **1 mana per second**; when your mana runs out it stands up again, and it can't hunker down with none. It's the clan's only real tank. The computer hunkers its golems down when three or more enemies close in, or when one is badly hurt in a fight, as long as it has the mana.
- **Upgrades (Golem Forge):** Runic Plating (+20% armor) and Mana Core (heals 3 hp per second).

## Beastmaster (Beast Clan)
A slinger in a wolf-pelt hood, trained in the Ranged group (hotkey `'`). It comes out of the pit beside the giants. 140 gold, 90 hp.
- **Sling:** range 260, 14 damage. Its stones **can hit flyers**, which makes it the Beast Clan's main answer to the sky.
- **Giant-killer:** double damage to enemy giants.
- **Giant-tamer:** each Beastmaster near a friendly giant counts as 3 troops (1 plus 2 extra) toward the giant's obedience, so it wears more chains and listens better.
- **Giant-driver:** Beastmasters rank up behind your giants. When a giant in sling range sulks, is confused or stands idle with enemies about while the army is attacking, a Beastmaster slings a stone into its back (2 damage, at most every 5s) and the giant charges at the enemy for 4 seconds. Giants holding a defend line aren't prodded out of it.
- **Upgrades (Beast Pen, from the ⚒ on its button):** Heavy Stones (damage 20) and Beast Lore (counts as 5 troops instead of 3).
- The computer playing the Beast Clan saves its gold and mana for its giants.

## Saboteur (Shadow Clan)
A hooded infiltrator with a satchel of salt, trained in the Infantry group (hotkey `;`). It comes out of the Barracks. 150 gold + 25 mana, 60 hp, very fast, and weak in a fight (6 damage).
- **Vanishes while running**, exactly like a ninja, so it can slip past the enemy line.
- **Undermines trenches:** triple damage to them.
- **Salt the Mine:** right-click a gold deposit (or use the Salt mine button and click one). The saboteur sneaks over, kneels to salt it for 2.5 seconds, then waits there. For 30 seconds, enemy miners keep only half the gold they dig from it; the rest is spoiled. A salted deposit shows a white crust and a countdown. Kneeling reveals the saboteur.
- **Upgrades (Hideout, from the ⚒ on its button):** Sappers' Picks (5× trench damage) and Brine (salt lasts 50 seconds).
- The computer playing the Shadow Clan keeps a saboteur or two busy salting the deposits your miners are working, one per deposit, and sends them at your trenches otherwise.

## Firebird (Sky Clan)
A rider under big flame-membraned da Vinci wings, trained in the Ranged group (hotkey `/`). It launches off the rampart. 200 gold + 50 mana, 2 population, 90 hp.
- **Flies like a Kestrel:** only ranged attacks (archers, warlocks, castle archers, ninja stars, Beastmasters, Gladiator javelins, Kestrels) can reach it, and it glides over trenches.
- **Fire pots:** every 3 seconds it drops a pot on the ground units directly below it. The pot bursts for 20 damage on every enemy within 45, sets them burning for 3 seconds, and does half damage to trenches and the statue.
- **It can't hit flyers.**
- **Upgrades (Archery Range):** Pitch Pots (radius 65, 5 seconds of burning) and Quick Fuse (a pot every 2.2 seconds).

## Quartermaster (Workers' Lodge, every clan)
200 gold, hotkey `,`, as fast as a Swordwrath; you can have two. It never fights and backs away from any enemy that comes close.
- **Always busy, in this order:** restock Gladiators with a new net and javelin; refit veterans on the spot for free, soldiers and workers alike (one at a time, 1.2 seconds each; a miner stops work while it's kitted out); patch up the wounded (20 hp a bandage every second, 30 with Healing Salves); restore worked-out gold deposits on your half (it's the only prospector: right-click a deposit with it, or press N); bring an Architect materials for a free trap every 60 seconds (35 with Supply Wagon; the Architect lays a random trap ahead of the line on its own); and cheer the miners on. It re-thinks every second, so something more urgent always comes first, and with nothing to do it makes the rounds between the miners and the army. It calls whoever it's about to tend to a halt, so it can catch a soldier on the move, but it leaves soldiers in the thick of a fight alone.
- **Cheering:** every miner within earshot is fired up for 30 seconds: it walks 50% faster and mines, pans and prays twice as fast. The Quartermaster tops them up before it wears off, so one Quartermaster keeps a group of miners going nearly all the time.
- **Two Quartermasters:** the first looks after the troops (restocking, refits, healing), the second the workers (refits, deposits, materials, cheering); each lends a hand with the other's work when it has nothing of its own. A sign over his head shows what he's doing (a bandage, tools with a ring that fills as he refits, a net, a horn, a crate or a pick).
- **Upgrades:** Healing Salves, Supply Wagon.

## Gladiator (Barracks, every clan)
200 gold, hotkey `9`. 170 hp, quick sword.
- **Javelin:** thrown once at a flyer in reach (it's how clans without good ranged units answer the sky), or at an enemy closing in (30 damage).
- **Net:** thrown once at the nearest enemy fighter about to reach him (not giants or flyers): it's pinned for 3 seconds (5 with Weighted Nets), unable to move or fight.
- Both are restocked when he garrisons or a Quartermaster brings new ones.
- **Glory (a snowball):** every kill gives him 15 more health (healed by as much) and 4% more damage, up to 25 kills (Crowd Favorite: each kill counts twice). A star badge over his head and a growing golden glow show his glory, the computer's units go after a glorious Gladiator first, and you get a warning when an enemy one is on a rampage.
- **Alone:** he hits 8% harder for every friend fewer than 5 within reach of him.
- **No formations:** told to attack or advance with others, he charges on ahead; told to retreat, he runs home.
- **Upgrades:** Manica (20% less damage), Weighted Nets, Crowd Favorite.

## Necromancer (Mage Tower, every clan)
175 gold + 75 mana, hotkey `0`. It never attacks; it raises the dead.
- **Raising:** every 6 seconds (4 with Quick Rites), for 5 mana, a zombie claws its way up beside it, up to 6 at a time (8 with Bigger Horde, 10 with Endless Horde). Zombies don't count toward your population. A skull badge over it shows the pack and its souls.
- **Zombies:** 60 hp, slow (Spearton pace), weak claws. Arrows, bolts and other shots do half damage to them, but holy light burns them: an enemy Healing Pool does five times its healing to them as damage (enough to wipe out a pack), and a Cleric with nobody to heal smites the nearest zombie for three times its heal. An enemy a zombie kills gets up as another zombie while there's room in the pack (giants and flyers don't).
- **Leading:** zombies can't be selected and never march in formation. While their side holds, they mill about in front of the Necromancer and claw anything that comes near them; once their side attacks they just run forward, attacking whatever they meet on the way to the enemy statue (or whatever you order the Necromancer to attack), and the Necromancer marches up behind them. On a retreat they come back. If the Necromancer dies, its zombies just lurch off to attack the enemy. Nothing heals zombies or buffs them (no auras, Hope, shields, inspiration or home ground).
- **Souls (a snowball):** every kill the pack makes gives the Necromancer a soul (up to 25): one more zombie in the pack for every 4 souls (up to 5 more), and its zombies rise 3% stronger and 2% faster per soul. You get a warning when an enemy horde grows; the computer answers with Clerics, Healing Pools and Fireballs, and goes for the Necromancer.
- **Upgrades:** Bigger Horde, Endless Horde, Grave Dirt (zombies +50% health), Quick Rites.

## Defences
- **Trenches** (Earthworks, Workers' Lodge): Architects dig a ditch across the lane and pile an earth rampart behind it, with sharpened stakes facing the enemy. Enemies on foot can't pass until they hack it down (Kestrels fly over). 100 gold each, up to 3. **Palisade** adds a row of pointed logs along the top: taller, +800 hp. Architects can **repair** a damaged trench or tower for free: right-click it with them, or press **Y** to send them to the most damaged one. Stakes get knocked out and the earth slumps as a trench takes damage.
- **Ruins:** a destroyed trench or tower leaves a ruin that still counts toward the limit. Right-click it with Architects to rebuild it for 30% of the price.
- **Archer towers** (Architects, Shift+Y, 150 gold, up to 3, not past the middle): towers always stand at the back of the lane so they never block the view. Right-click one with an archer to post it there. A posted archer reaches 120 further, takes 75% less damage from arrows, bolts and stones, can't be stunned or knocked back, and enemies pick other targets before it, but if melee troops tear the tower down, the archer dies with it. Workers' Lodge upgrades: **Reinforced Towers** (+60% health, towers already standing included) and **Watchtowers** (another 60 range).
- **The Monolith tower:** every map with a Monolith has a stone tower built around it, the obelisk rising through its middle, that belongs to no one. It's stronger than anything you can build (1400 health, +240 range, 85% less damage from arrows, bolts and stones) and holds **two** archers. It starts manned by **two neutral archers** who shoot at both sides (16 damage, 500 reach). Shoot them down or tear the tower down with melee troops (they fall with it), then post up to two archers of your own there. Either side can rebuild its ruin for 120.
- **Home ground:** troops take up to 20% less damage the closer they fight to their own castle (the full 20% within the castle archers' reach, fading to nothing at the middle of the map). Attacking takes a stronger army than defending.
- **The statue mends:** a statue with no enemy soldier within 900 for 15 seconds regains 6 health a second.
- **Rally:** when your army falls below 55% of the enemy's (once theirs is worth 700 or more), your side rallies until it's back to 80%: units train 35% faster, the castle archers shoot 25% faster and the castle pays 1.5 gold a second. A lost fight isn't a lost game.
- **Traps** (Architects): a **tar pit** (Shift+B, 40 gold) is a hole hidden under a thatched cover; whoever steps onto the thatch drops it into a wide pool of tar that halves the speed of anyone in it for 25 seconds. A **mine** (Shift+N, 60 gold) is a pressure plate over a bundle of dynamite that blasts everyone nearby for 50 and knocks them back. Each kind has its own cooldown. Traps are hidden from the enemy, and ninjas, saboteurs and flyers never set them off. They can't go past the middle of the map or in the middle stretch, can't sit too close together, and no more than 3 can stand in a line across the lane. The Arcane Circle's traps are magic: the tar burns and the mine hits 50% harder. **Trapmaker** makes traps a third cheaper and halves their cooldown. Saboteurs spot enemy traps up close and dig them up. Each map also has a few neutral traps on both halves that spring on anyone.
- **Taunts hold:** while a Spearton behind a raised shield wall or a hunkered Spirit Golem is guarding a target, your other troops can't be ordered to attack past it. Ninjas with Focus are the exception.
- **Architect research:** an idle Architect (faster when garrisoned) works out a 10% discount on an upgrade every 30 seconds, up to 40% off. Click the book in the top corner of an upgrade's button to have them study that one (click it again to stop); otherwise they pick at random. Discounted prices show in the upgrade panels.
- **Archers on the rampart:** garrisoned archers climb onto the walkway behind the castle archers, one row of up to six, and keep shooting from there, out of reach like the castle archers. The rest wait inside.
- **Castle archers** reach out to just past where an enemy archer has to stand to shoot your statue (assuming the same bow upgrades as yours), so an archer attacking your statue is always under fire. Recurve Bows extend their reach by the same 120 as your archers'. They stay on the wall and keep firing after the statue falls, covering the giant that rises from it.
- **Chasing:** melee troops lunge after a target that backs away during their swing, so they can cut down a slower unit (like a miner) running for the castle.
- **Covering fire:** archers, Beastmasters and other shooters step up to shoot whatever is hitting a friend nearby (Kestrels pelting a giant, say), even past the defend line (up to 400 beyond it, or a short step out of a formation). A giant pelted by something it can't reach falls back toward its castle archers unless friendly shooters nearby are fighting back. In an Advance formation, while the line is halted in a fight, the ranks behind lunge at enemies close to their place and then step back into line.
- **Under fire:** a melee soldier being shot by an enemy it can reach (an archer standing beyond the defend line, say) charges the shooter instead of standing there, whether it's defending, holding or walking to the muster point. They give up the chase once the shooter is more than 400 past their defend line or hold spot, so a lone archer can't lure them into the enemy army. Spearton behind a raised shield wall hold their ground.
- **Nobody stands there being shot:** any soldier that's been hit and has done nothing about it for a moment makes a change. If it can reach the attacker (and it's within about 520), it goes after it; if it can't (a melee soldier under a Kestrel, a shooter that's outranged), it falls back out of reach toward its castle. Afterwards it returns to what it was doing; one told to hold a spot holds the safe one instead. A soldier in a formation only makes a short sortie (300) and then rejoins the line.

## Economy
- **Mining** about 2.3 gold/s per miner. **Praying** at the statue about 2.3 mana/s (4 at a time).
- **Panning:** garrisoned miners (up to 5) kneel on the quay over the stream that winds along the front of the castle and get 1 gold + 1 mana per tick, about 1.1 of each per second. That's half of prayer's mana rate, and it's completely safe. The **Sifter** castle upgrade sets a wooden sluice in the stream: 1.6 gold a tick instead of 1.
- The small **New:** toggle in the top bar sets where newly trained miners go: Mine, Pray or Pan.
- The statue earns no passive gold until you buy the **Statue Offerings** / **Golden Idol** castle upgrades.

## Controls
- **Training** is on the bottom-left, as small icon buttons staggered over two rows in five colour-coded groups, one per building: **Workers** (Miner, Architect, Quartermaster), **Infantry** (Swordwrath, Spearton, Gladiator, Ninja), **Ranged** (Archer, Kestrel), **Mages** (Cleric, Warlock, Necromancer) and **Giants**. Each group trains **one unit at a time** from a shared queue, in the order you click: a Spearton queued behind a Swordwrath waits for it. Click to train, right-click to cancel one (refunded). The small ⚒ in each button's corner opens its building's upgrades (every unit of the class, a row each), and the castle button at the end opens castle upgrades. Clicking a building in the castle does the same.
- **Moving:** right-click the ground to move the selected units there. It's an attack-move: troops stop to fight any enemy in range on the way, then carry on. Ninjas and saboteurs move straight there instead, so they can slip past and pick their own targets (right-click an enemy to attack it directly).
- **Range:** selecting a ranged unit shows its reach as a dotted ring (and a ballista's dead zone). Selected mages show how far they can cast, with a fainter ring for their staff.
- **The command card** on the bottom-right shows upgrades when a building is open. Otherwise it shows orders for whatever units you have selected:
  - Attack together, Advance together, Retreat together: a formation march with Spearton in front, Swordwrath behind and archers and mages at the back, at the pace of the slowest unit (slower still behind a raised shield wall)
  - Defend, Garrison (Garrison & pan when only miners are selected; giants can't garrison)
  - Hold
  - Defend Trench (needs Military Training or Rallying Cry from the Barracks): one row of melee troops stands on the rampart, and blows against them are split half to the trench
  - Shield Wall
  - Mine, Pray, Pan
  - Dig trench, Palisade, Repair, Tar pit, Mine, Archer tower, Replenish
  - Refit
- **Top-right buttons** command the **whole army**: Garrison / Defend / Attack (Q / W / E), **Muster** (G: where newly trained soldiers gather and where the defend line forms; on the way there they stop to fight any enemy in range), **Miners** (Z: miners only retreat inside and pan), and **Siege** (Shift+Z: a toggle; while it's on, miners take shelter in the castle on their own whenever enemies they can't handle come near, and go back to work once it's clear. Pressing Z yourself turns it off).

| Key | Action |
|---|---|
| Q / W / E | Whole army: Garrison / Defend / Attack |
| Shift + Q / W / E | Selected units only |
| Shift + E / C / Shift + C | Selected units attack / advance / retreat together |
| S / K / X / R | Hold / Defend trench / Shield wall / Refit |
| I / O | Miners: mine / pray |
| B / J / Y / N | Dig trench / Palisade / Repair trenches and towers / Replenish deposit |
| Shift + B / N / Y | Architects: tar pit / mine / archer tower |
| G / Z / Shift+Z | Muster point / miners-only retreat / siege mode (miners shelter automatically) |
| `, 1 – 6, comma, 9, 0, −, =, [ | Train Architect / Miner / Swordwrath / Archer / Spearton / Cleric / Warlock / Quartermaster / Gladiator / Necromancer / Giant / Ninja / Kestrel |
| M | Ninjas with Throwing Stars: weapon Auto / Blade / Stars |
| 7 8 / L | Cast mage spells / toggle auto-cast |
| U | Cycle upgrade panels |
| A / D, arrows, mouse wheel | Scroll |
| T / P (or Esc) / H | Game speed / Pause menu (restart, new game) / Help |
| F3 / F4 | Debug overlay / Autopilot (an AI plays your side) |
| Double / triple click | Select all of a type / select every attacking unit |

## Code layout (`game/js`)
- `config.js`: balance numbers, unit stats, upgrades and visual themes
- `map.js`: generates the map from a seed (scenery, lane depth, gold layout and amount, Monolith)
- `draw.js`: stick figures and their animations (gear comes from upgrades, never chance), giants, the da Vinci wings, the two-man ballista, statues, the weathered castle and its winding stream, trenches, mines, props and icons
- `light.js`: the lighting pass (the day's shade, gloomy keeps, and torches, braziers, crystals, lamps, fire and spells as light sources)
- `units.js`: unit behaviour (mining, praying, panning, building, combat, trench defense, refit, buffs)
- `game.js`: game state, training queues, research, trenches, castle archers, the Monolith, projectiles
- `giants.js`: giant obedience, targeting, splash, knockback and the statue giant
- `build.js`: the Architect: traps, archer towers, ruins and rebuilding, repairs and upgrade research (random or the one you pick)
- `quartermaster.js`, `gladiator.js`, `necromancer.js`: the Quartermaster's jobs, the Gladiator's throws and glory, and the Necromancer and its zombies
- `ai.js`: the computer opponents (Easy, Normal, Hard, Very Hard)
- `clans.js`: the clans (starting armies, free and locked upgrades, prices, buffs) and the helpers the game uses to apply them
- `../launcher/launch.ps1`, `../installer/StickfrontSetup.bat`: the update-checking launcher (the desktop shortcut runs it) and the Windows setup wizard
- `stats.js`: the battle timeline and end-screen charts, the debug overlay, autopilot and the headless balance and clan tests
- `render.js`, `ui.js`, `main.js`: rendering, input, the HUD and command card, and the main loop
