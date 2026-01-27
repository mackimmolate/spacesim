import { hashSeedToUint32, nextRng } from '../rng';
import type { Candidate, CrewBackground, CrewRole, CrewSkills } from './types';

const ROLE_BASE: Record<CrewRole, CrewSkills> = {
  pilot: { piloting: 7, engineering: 3, ops: 5, medical: 1, social: 4 },
  engineer: { piloting: 2, engineering: 8, ops: 4, medical: 2, social: 3 },
  tech: { piloting: 3, engineering: 5, ops: 7, medical: 2, social: 3 },
  medic: { piloting: 2, engineering: 3, ops: 4, medical: 8, social: 5 },
  security: { piloting: 4, engineering: 3, ops: 4, medical: 3, social: 4 },
  generalist: { piloting: 4, engineering: 4, ops: 4, medical: 4, social: 4 }
};

const FIRST_NAMES = ['Aria', 'Cal', 'Mira', 'Jax', 'Talia', 'Ren', 'Soren', 'Vale', 'Iris', 'Kei'];
const LAST_NAMES = ['Kade', 'Voss', 'Ivers', 'Sol', 'Myers', 'Tenn', 'Wren', 'Hale', 'Quill', 'Rook'];
const ORIGINS = ['Lumen Reach', 'Rim Belt', 'Nadir Port', 'Vesta Haven', 'Kestral Colony', 'Helios Arc'];
const EMPLOYERS = ['Argent Lines', 'Union Freight', 'Cobalt Syndicate', 'Orion Labs', 'Prospect Guild'];
const INCIDENTS = [
  'survived a reactor breach',
  'smuggled relief supplies past a blockade',
  'rebuilt a ship after a pirate raid',
  'organized a strike for safer shifts',
  'mapped a dangerous drift lane'
];
const GOALS = [
  'pay off a family debt',
  'find a missing sibling',
  'earn command of a ship',
  'start a quiet outpost farm',
  'rebuild their reputation'
];
const REASONS = [
  'seeking steadier work',
  'following a trusted contact',
  'pursuing a personal project',
  'escaping old obligations'
];
const TRAITS = [
  { id: 'disciplined', pros: 'steady under pressure', cons: 'rigid about protocol' },
  { id: 'greedy', pros: 'pushes for lucrative deals', cons: 'argues about bonuses' },
  { id: 'nervous', pros: 'cautious planner', cons: 'stress spikes easily' },
  { id: 'union_ties', pros: 'organizer and advocate', cons: 'pushy about rules' },
  { id: 'ex_pirate', pros: 'knows shady routes', cons: 'bad reputation' },
  { id: 'empathetic', pros: 'good with crew', cons: 'takes criticism personally' },
  { id: 'scrappy', pros: 'resourceful fixer', cons: 'cuts corners' },
  { id: 'stoic', pros: 'steady in crises', cons: 'hard to read' }
];
const CONTACTS = [
  { relationship: 'ally', hook: 'knows a customs officer' },
  { relationship: 'rival', hook: 'owes money to a scav boss' },
  { relationship: 'debtor', hook: 'keeps a tab with a repair dock' },
  { relationship: 'ally', hook: 'has a cousin in port authority' },
  { relationship: 'rival', hook: 'burned a bridge with a cartel broker' }
];

function nextInt(rngState: number, max: number): { value: number; nextState: number } {
  const roll = nextRng(rngState);
  return { value: Math.floor(roll.value * max), nextState: roll.nextState };
}

function nextBetween(rngState: number, min: number, max: number): { value: number; nextState: number } {
  const roll = nextRng(rngState);
  return { value: Math.floor(roll.value * (max - min + 1)) + min, nextState: roll.nextState };
}

function pick<T>(rngState: number, list: T[]): { value: T; nextState: number } {
  const roll = nextInt(rngState, list.length);
  return { value: list[roll.value], nextState: roll.nextState };
}

function jitterSkills(base: CrewSkills, rngState: number): { skills: CrewSkills; nextState: number } {
  let next = rngState;
  const skills = { ...base };
  (Object.keys(skills) as Array<keyof CrewSkills>).forEach((key) => {
    const roll = nextBetween(next, -2, 2);
    next = roll.nextState;
    skills[key] = Math.max(0, Math.min(10, skills[key] + roll.value));
  });
  return { skills, nextState: next };
}

function selectTraits(rngState: number): { traits: string[]; nextState: number } {
  let next = rngState;
  const traitCountRoll = nextBetween(next, 2, 4);
  next = traitCountRoll.nextState;
  const traits: string[] = [];
  while (traits.length < traitCountRoll.value) {
    const pickTrait = pick(next, TRAITS);
    next = pickTrait.nextState;
    if (!traits.includes(pickTrait.value.id)) {
      traits.push(pickTrait.value.id);
    }
  }
  return { traits, nextState: next };
}

function buildBackground(
  rngState: number,
  name: string,
  role: CrewRole,
  traits: string[]
): { background: CrewBackground; nextState: number } {
  let next = rngState;
  const originPick = pick(next, ORIGINS);
  next = originPick.nextState;
  const employerPick = pick(next, EMPLOYERS);
  next = employerPick.nextState;
  const incidentPick = pick(next, INCIDENTS);
  next = incidentPick.nextState;
  const goalPick = pick(next, GOALS);
  next = goalPick.nextState;
  const reasonPick = pick(next, REASONS);
  next = reasonPick.nextState;
  const contactRoll = nextBetween(next, 0, 1);
  next = contactRoll.nextState;
  const contacts = [];
  if (contactRoll.value === 1) {
    const contactPick = pick(next, CONTACTS);
    next = contactPick.nextState;
    const contactFirst = pick(next, FIRST_NAMES);
    next = contactFirst.nextState;
    const contactLast = pick(next, LAST_NAMES);
    next = contactLast.nextState;
    contacts.push({
      name: `${contactFirst.value} ${contactLast.value}`,
      relationship: contactPick.value.relationship as 'ally' | 'rival' | 'debtor',
      hook: contactPick.value.hook
    });
  }

  const traitLine = traits.length
    ? `Known for being ${traits.slice(0, 2).join(' and ')}.`
    : '';
  const summary = `${name} is a ${role} from ${originPick.value} who once ${incidentPick.value}. ` +
    `They left ${employerPick.value} ${reasonPick.value} and now aim to ${goalPick.value}. ` +
    traitLine;

  return {
    background: {
      origin: originPick.value,
      formerEmployer: employerPick.value,
      notableEvent: incidentPick.value,
      reasonForHiring: reasonPick.value,
      personalGoal: goalPick.value,
      contacts,
      summary
    },
    nextState: next
  };
}

export function generateCandidates(seed: string, count: number): Candidate[] {
  let rngState = hashSeedToUint32(seed);
  const candidates: Candidate[] = [];

  for (let i = 0; i < count; i += 1) {
    const rolePick = pick(rngState, Object.keys(ROLE_BASE) as CrewRole[]);
    rngState = rolePick.nextState;
    const firstPick = pick(rngState, FIRST_NAMES);
    rngState = firstPick.nextState;
    const lastPick = pick(rngState, LAST_NAMES);
    rngState = lastPick.nextState;
    const agePick = nextBetween(rngState, 22, 54);
    rngState = agePick.nextState;
    const traitPick = selectTraits(rngState);
    rngState = traitPick.nextState;
    const skillsPick = jitterSkills(ROLE_BASE[rolePick.value], rngState);
    rngState = skillsPick.nextState;
    const bgPick = buildBackground(rngState, `${firstPick.value} ${lastPick.value}`, rolePick.value, traitPick.traits);
    rngState = bgPick.nextState;
    const payBase = 140 + Object.values(skillsPick.skills).reduce((a, b) => a + b, 0) * 4;

    const portraitSeed = nextRng(rngState);
    rngState = portraitSeed.nextState;

    candidates.push({
      id: `${seed}-${i}`,
      name: `${firstPick.value} ${lastPick.value}`,
      portraitSeed: Math.floor(portraitSeed.value * 100000),
      age: agePick.value,
      role: rolePick.value,
      skills: skillsPick.skills,
      traits: traitPick.traits,
      background: bgPick.background,
      needs: {
        stress: 10 + i * 2,
        morale: 5,
        fatigue: 12,
        loyalty: 55
      },
      payRate: Math.round(payBase / 10) * 10,
      signOnBonus: 120 + i * 25
    });
  }

  return candidates;
}
