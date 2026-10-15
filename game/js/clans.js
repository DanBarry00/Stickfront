'use strict';
// Clans: each side picks one before a skirmish. A clan sets the starting gold, mana and army,
// which upgrades are already researched, which units and upgrades it can't use, cost changes and
// a few general buffs. The Base Clan is the plain game; every other clan is meant to be stronger
// overall, with a weakness to play around.
//
// Fields (all optional except name):
//   gold, mana             starting bank (defaults START_GOLD / 0)
//   army                   starting units beside the statue: [{ type, n, perks: [keys] | 'all', at: 'trench' }]
//   trench                 starts with a finished trench in front of the statue
//   free                   upgrades already researched: { unitType: [keys] }
//   lockUnits              unit types it can't train
//   lockUpgrades           upgrades it can't research: { unitType: [keys] } (later tiers vanish with their first)
//   cost                   unit price changes: { unitType: { gold, mana } } (added to the normal price)
//   pop                    population cap (default POP_CAP)
//   castleArchers          most castle archers it can post (default 3)
//   hp, dmg                health / damage multipliers: { all, unitType }
//   prayer                 mana from praying, multiplier
//   bounty                 share of a killed enemy's gold cost paid to this clan
//   vanishCd               ninja vanish cooldown (default NINJA_VANISH_CD)
//   giantPop               population a giant takes (default 4)
//   kestrelCrit            Kestrels' critical hit chance (default 0)
//   ai                     extra share of the army the computer aims for: { unitType: share }
//   coming                 clan features not in the game yet (listed on the setup screen)

const ALL_UPGRADES = type => UPGRADES[type].map(d => d.key);

const CLANS = {
  base: {
    name: 'Base Clan',
    tagline: 'The standard army. Every unit, every upgrade.',
    army: [{ type: 'miner', n: 2 }, { type: 'sword', n: 1, perks: 'all' }],
    strengths: ['Every unit and upgrade is available', 'Starts with a veteran Swordwrath carrying every sword upgrade'],
    weaknesses: ['No head start and no special perks'],
  },

  archer: {
    name: 'Archer Clan',
    tagline: 'Out-range and out-shoot. Fragile up close.',
    army: [{ type: 'miner', n: 2 }, { type: 'archer', n: 2 }],
    free: { archer: ['bow', 'eye'], ninja: ['vital'], flyer: ['scope'] },
    cost: { archer: { gold: -15 }, flyer: { gold: -15 } },
    castleArchers: 4,
    lockUpgrades: { sword: ['helm'], spear: ['helm', 'shield2'], giant: ['blinders'] },
    ai: { archer: 0.12, flyer: 0.04 },
    strengths: ['Starts with 2 archers, Recurve Bows, Eagle Eye, Vital Points and Long Sights', 'Clan-only tiers: Longbows (range 600), Broadheads, Steady Hands, Spyglass', 'Archers and Kestrels cost 15 gold less', '4 castle archer slots'],
    weaknesses: ['No Iron or Crested Helmets, no Tower Shields', 'Giants can\'t get Blinders'],
  },

  defense: {
    name: 'Defense Clan',
    tagline: 'Dig in behind a trench, then grind the enemy down.',
    army: [{ type: 'miner', n: 2 }, { type: 'spear', n: 1, at: 'trench' }, { type: 'archer', n: 1, at: 'trench' }],
    trench: true,
    free: { miner: ['walls'], spear: ['shield', 'inspire'], sword: ['drill'], archer: ['bow'], castle: ['archer2'] },
    castleArchers: 4,
    lockUnits: ['warlock', 'giant'],
    ai: { spear: 0.12, archer: 0.05 },
    strengths: ['Starts with a trench, held by a Spearton and an archer', 'Earthworks, Shields, Military Training, Rallying Cry, Recurve Bows and a second castle archer', 'Clan-only: Levy II, a free Spearton every minute', '4 castle archer slots'],
    weaknesses: ['No Warlocks and no Giants'],
    coming: ['Ballista siege unit'],
  },

  sword: {
    name: 'Sword Clan',
    tagline: 'A horde of blades. Helpless against the sky.',
    army: [{ type: 'miner', n: 2 }, { type: 'sword', n: 2 }],
    free: { castle: ['levy'], sword: ['drill', 'rage'] },
    pop: 35,
    lockUnits: ['flyer'],
    lockUpgrades: { ninja: ['stars'], archer: ['fire'], miner: ['walls'] },
    ai: { sword: 0.15 },
    strengths: ['Population cap 35', 'Starts with 2 Swordwrath, the Levy, Military Training and Adrenaline', 'Clan-only: Great Swords (damage 25)'],
    weaknesses: ['No Kestrels and no Throwing Stars: only archers and Spearton Javelins hit flyers', 'Archers can\'t get Flaming Arrows', 'Can\'t dig trenches'],
  },

  mercenary: {
    name: 'Mercenary Clan',
    tagline: 'Rich, greedy and paid for every kill.',
    army: [{ type: 'miner', n: 4 }, { type: 'sword', n: 1 }],
    free: { miner: ['bag', 'pick', 'pan1', 'prospect'], castle: ['tithe'] },
    bounty: 0.2,
    prayer: 0.5,
    strengths: ['Starts with 4 miners, Bigger Bags, Steel Pickaxes, Iron Pans, Prospecting and Statue Offerings', 'Every kill pays 20% of the victim\'s gold cost', 'Clan-only: Mule Packs, Diamond Picks, Gilded Statue (4 gold/s)'],
    weaknesses: ['Praying gives half the mana', 'Weakest starting army: one plain Swordwrath'],
  },

  arcane: {
    name: 'Arcane Circle',
    tagline: 'Magic first: cheap mages and a deep mana pool.',
    mana: 150,
    army: [{ type: 'miner', n: 2 }, { type: 'cleric', n: 1 }, { type: 'warlock', n: 1 }],
    free: { cleric: ['pool'], warlock: ['pool'] },
    cost: { cleric: { mana: -25 }, warlock: { mana: -25 } },
    prayer: 1.5,
    hp: { sword: 0.9, spear: 0.9 },
    castleArchers: 1,
    lockUnits: ['giant'],
    ai: { cleric: 0.1, warlock: 0.1 },
    strengths: ['Starts with 150 mana, a Cleric, a Warlock, Healing Pool and Blight Pool', 'Mages cost 35 mana instead of 60', 'Praying gives 50% more mana'],
    weaknesses: ['Swordwrath and Spearton have 10% less health', 'Only 1 castle archer', 'No Giants'],
    coming: ['Spirit Golem: a commandable tank that can Hunker Down'],
  },

  beast: {
    name: 'Beast Clan',
    tagline: 'Giants, and the keepers who tame them.',
    army: [{ type: 'miner', n: 2 }, { type: 'sword', n: 2 }],
    free: { giant: ['blinders'] },
    cost: { giant: { gold: -110, mana: -30 } },
    giantPop: 3,
    lockUnits: ['archer', 'flyer'],
    ai: { giant: 0.08, spear: 0.08 },
    strengths: ['Giants cost 340 gold + 90 mana and take 3 population', 'Blinders already researched'],
    weaknesses: ['No Archers and no Kestrels: only Warlocks reach flyers for now'],
    coming: ['Beastmaster: slinger who hits flyers and does double damage to giants'],
  },

  shadow: {
    name: 'Shadow Clan',
    tagline: 'Glass cannons that strike from nowhere.',
    army: [{ type: 'miner', n: 2 }, { type: 'ninja', n: 2 }],
    free: { ninja: ['stars'] },
    cost: { ninja: { gold: -25 } },
    vanishCd: 3,
    hp: { all: 0.85 },
    dmg: { all: 1.15 },
    lockUnits: ['spear'],
    lockUpgrades: { miner: ['walls'] },
    ai: { ninja: 0.2 },
    strengths: ['Every unit deals 15% more damage', 'Starts with 2 ninjas and Throwing Stars', 'Ninjas cost 125 and vanish again after 3s'],
    weaknesses: ['Every unit has 15% less health', 'No Spearton', 'Can\'t dig trenches'],
    coming: ['Saboteur: wrecks trenches and salts enemy gold mines'],
  },

  sky: {
    name: 'Sky Clan',
    tagline: 'Rule the air; the ground is an afterthought.',
    army: [{ type: 'miner', n: 2 }, { type: 'flyer', n: 2 }],
    cost: { flyer: { gold: -25 } },
    kestrelCrit: 0.1,
    hp: { sword: 0.9, spear: 0.9 },
    lockUnits: ['giant'],
    ai: { flyer: 0.15 },
    strengths: ['Starts with 2 Kestrels', 'Kestrels cost 150 and have a 10% critical hit chance', 'Clan-only: Hawk Eye (20% crit), Spyglass, Barbed Bolts II'],
    weaknesses: ['Swordwrath and Spearton have 10% less health', 'No Giants'],
    coming: ['Firebird bomber'],
  },
};
const CLAN_ORDER = ['base', 'archer', 'defense', 'sword', 'mercenary', 'arcane', 'beast', 'shadow', 'sky'];

// ---------------------------------------------------------------- lookups used by the game

const clanOf = team => CLANS[team.clanKey] || CLANS.base;
const canTrain = (team, type) => !(clanOf(team).lockUnits || []).includes(type);
function upgradeLocked(team, type, key) {
  const locked = (clanOf(team).lockUpgrades || {})[type] || [];
  // a later tier is locked along with the tier it builds on; clan-only tiers belong to their clans
  for (let d = upgradeDef(type, key); d; d = d.requires ? upgradeDef(type, d.requires) : null) {
    if (locked.includes(d.key) || (d.clans && !d.clans.includes(team.clanKey))) return true;
  }
  // castle archer posts beyond the clan's limit
  if (type === 'castle' && /^archer\d$/.test(key) && +key.slice(6) > (clanOf(team).castleArchers || 3)) return true;
  // upgrades for units the clan can't train
  return type !== 'castle' && !canTrain(team, type);
}
function unitCost(team, type) {
  const def = UNIT_TYPES[type], c = (clanOf(team).cost || {})[type] || {};
  return { gold: def.cost + (c.gold || 0), mana: Math.max(0, (def.mana || 0) + (c.mana || 0)) };
}
const popCap = team => clanOf(team).pop || POP_CAP;
const unitPop = (team, type) => (type === 'giant' && clanOf(team).giantPop) || UNIT_TYPES[type].pop;
const clanMul = (team, field, type) => { const m = clanOf(team)[field] || {}; return (m.all || 1) * (m[type] || 1); };

// A skirmish's clans: 'random' picks any clan (the same clan may face itself).
const resolveClan = key => (key === 'random' ? pick(CLAN_ORDER) : key);
