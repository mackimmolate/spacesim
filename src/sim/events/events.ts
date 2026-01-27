import { hashSeedToUint32, nextRng } from '../rng';
import type { GameState } from '../types';
import type { EventChoiceId, EventInstance } from './types';
import { pushLog } from '../log';
import { applyCrewNeedDelta } from '../crew/crew';

const EVENT_INTERVAL_TICKS = 60 * 20;

interface WeightedEvent {
  id: string;
  weight: number;
  build: (state: GameState) => EventInstance | null;
  resolve: (state: GameState, choice: EventChoiceId) => GameState;
}

const EVENT_DEFS: WeightedEvent[] = [
  {
    id: 'old_rival_spotted',
    weight: 1.1,
    build: (state) => {
      const crew = state.company.crew.find((member) =>
        member.background.contacts.some((contact) => contact.relationship === 'rival')
      );
      if (!crew) {
        return null;
      }
      return {
        id: 'old_rival_spotted',
        title: 'Old Rival Spotted',
        description: `${crew.name} spots a rival tied to their past. The tension is palpable on the comms.`,
        crewId: crew.id,
        choices: [
          { id: 'A', label: 'Ignore and keep course' },
          { id: 'B', label: 'Confront and clear the air' }
        ]
      };
    },
    resolve: (state, choice) => {
      if (!state.company.pendingEvent?.crewId) {
        return state;
      }
      if (choice === 'A') {
        return applyCrewNeedDelta(state, state.company.pendingEvent.crewId, { stress: 8, morale: -3 });
      }
      return applyCrewNeedDelta(state, state.company.pendingEvent.crewId, { stress: -4, morale: 5 });
    }
  },
  {
    id: 'union_complaint',
    weight: 0.9,
    build: (state) => {
      const crew = state.company.crew.find((member) => member.traits.includes('union_ties'));
      if (!crew) {
        return null;
      }
      return {
        id: 'union_complaint',
        title: 'Union Complaint',
        description: `${crew.name} forwards a union complaint about overtime conditions.`,
        crewId: crew.id,
        choices: [
          { id: 'A', label: 'Pay a small stipend' },
          { id: 'B', label: 'Dismiss it as noise' }
        ]
      };
    },
    resolve: (state, choice) => {
      if (!state.company.pendingEvent?.crewId) {
        return state;
      }
      if (choice === 'A') {
        const credits = Math.max(0, state.company.credits - 120);
        const withCrew = applyCrewNeedDelta(state, state.company.pendingEvent.crewId, {
          morale: 6,
          stress: -3,
          loyalty: 4
        });
        return {
          ...withCrew,
          company: { ...withCrew.company, credits }
        };
      }
      return applyCrewNeedDelta(state, state.company.pendingEvent.crewId, { morale: -6, stress: 5 });
    }
  },
  {
    id: 'pirate_past',
    weight: 0.8,
    build: (state) => {
      const crew = state.company.crew.find((member) => member.traits.includes('ex_pirate'));
      if (!crew) {
        return null;
      }
      return {
        id: 'pirate_past',
        title: 'Pirate Past',
        description: `${crew.name}'s pirate past surfaces. A black market contact offers a shortcut.`,
        crewId: crew.id,
        choices: [
          { id: 'A', label: 'Accept the shady offer' },
          { id: 'B', label: 'Keep it clean' }
        ]
      };
    },
    resolve: (state, choice) => {
      if (choice === 'A') {
        const credits = state.company.credits + 250;
        return {
          ...state,
          company: { ...state.company, credits }
        };
      }
      if (!state.company.pendingEvent?.crewId) {
        return state;
      }
      return applyCrewNeedDelta(state, state.company.pendingEvent.crewId, { morale: 2, stress: -2 });
    }
  },
  {
    id: 'panic_attack',
    weight: 1.0,
    build: (state) => {
      const crew = state.company.crew.find((member) => member.traits.includes('nervous'));
      if (!crew) {
        return null;
      }
      return {
        id: 'panic_attack',
        title: 'Panic Attack',
        description: `${crew.name} struggles with a panic attack during a routine check.`,
        crewId: crew.id,
        choices: [
          { id: 'A', label: 'Let the medic or calm crew assist' },
          { id: 'B', label: 'Push through the shift' }
        ]
      };
    },
    resolve: (state, choice) => {
      const target = state.company.crew.find((member) => member.id === state.company.pendingEvent?.crewId);
      if (!target) {
        return state;
      }
      const supportSkill = state.company.crew.reduce((max, member) => {
        return Math.max(max, member.skills.medical, member.skills.social);
      }, 0);
      if (choice === 'A') {
        const relief = supportSkill >= 6 ? -8 : -4;
        return applyCrewNeedDelta(state, target.id, { stress: relief, fatigue: -2, morale: 3 });
      }
      return applyCrewNeedDelta(state, target.id, { stress: 6, fatigue: 5, morale: -4 });
    }
  },
  {
    id: 'heroic_fix',
    weight: 0.7,
    build: (state) => {
      const crew = state.company.crew.find((member) => member.skills.engineering >= 8);
      if (!crew) {
        return null;
      }
      return {
        id: 'heroic_fix',
        title: 'Heroic Fix',
        description: `${crew.name} patches a failing conduit with a clever workaround.`,
        crewId: crew.id,
        choices: [
          { id: 'A', label: 'Reward the ingenuity' },
          { id: 'B', label: 'Save the praise for later' }
        ]
      };
    },
    resolve: (state, choice) => {
      if (choice === 'A' && state.company.pendingEvent?.crewId) {
        const credits = Math.max(0, state.company.credits - 80);
        const withCrew = applyCrewNeedDelta(state, state.company.pendingEvent.crewId, {
          morale: 6,
          stress: -2,
          loyalty: 3
        });
        return {
          ...withCrew,
          company: { ...withCrew.company, credits }
        };
      }
      return applyCrewNeedDelta(state, state.company.pendingEvent?.crewId ?? '', { morale: 2 });
    }
  },
  {
    id: 'homesick',
    weight: 1.0,
    build: (state) => {
      const crew = state.company.crew[0];
      if (!crew) {
        return null;
      }
      return {
        id: 'homesick',
        title: 'Homesick',
        description: `${crew.name} feels distant from ${crew.background.origin} and wants a comfort item.`,
        crewId: crew.id,
        choices: [
          { id: 'A', label: 'Buy a comfort item' },
          { id: 'B', label: 'Offer words of support' }
        ]
      };
    },
    resolve: (state, choice) => {
      if (!state.company.pendingEvent?.crewId) {
        return state;
      }
      if (choice === 'A') {
        const credits = Math.max(0, state.company.credits - 90);
        const withCrew = applyCrewNeedDelta(state, state.company.pendingEvent.crewId, {
          morale: 5,
          stress: -3
        });
        return {
          ...withCrew,
          company: { ...withCrew.company, credits }
        };
      }
      return applyCrewNeedDelta(state, state.company.pendingEvent.crewId, { morale: 2 });
    }
  }
];

export function shouldRollEvent(state: GameState): boolean {
  return state.tick > 0 && state.tick % EVENT_INTERVAL_TICKS === 0;
}

export function pickEvent(state: GameState): EventInstance | null {
  if (state.company.crew.length === 0) {
    return null;
  }
  const crewKey = state.company.crew.map((member) => member.id).join(',');
  const seed = hashSeedToUint32(`${state.seed}|event|${state.tick}|${crewKey}`);
  let rng = seed;
  const picks: WeightedEvent[] = [];
  EVENT_DEFS.forEach((event) => {
    const built = event.build(state);
    if (built) {
      picks.push(event);
    }
  });
  if (picks.length === 0) {
    return null;
  }
  let totalWeight = 0;
  picks.forEach((event) => {
    totalWeight += event.weight;
  });
  const roll = nextRng(rng);
  rng = roll.nextState;
  let threshold = roll.value * totalWeight;
  const chosen = picks.find((event) => {
    threshold -= event.weight;
    return threshold <= 0;
  }) ?? picks[0];
  return chosen.build(state);
}

export function resolveEvent(state: GameState, choice: EventChoiceId): GameState {
  const eventId = state.company.pendingEvent?.id;
  if (!eventId) {
    return state;
  }
  const def = EVENT_DEFS.find((entry) => entry.id === eventId);
  if (!def) {
    return state;
  }
  const applied = def.resolve(state, choice);
  return {
    ...applied,
    company: { ...applied.company, pendingEvent: null },
    log: pushLog(applied.log, `Event resolved: ${state.company.pendingEvent?.title}.`)
  };
}

export function queueEvent(state: GameState, instance: EventInstance): GameState {
  return {
    ...state,
    company: { ...state.company, pendingEvent: instance },
    log: pushLog(state.log, `Event: ${instance.title}.`)
  };
}
