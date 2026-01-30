import type { CrewMember, CrewNeeds } from './types';
import type { GameState } from '../types';
import { pushLog } from '../log';

const NEED_LIMITS = {
  stress: { min: 0, max: 100 },
  morale: { min: -50, max: 50 },
  fatigue: { min: 0, max: 100 },
  loyalty: { min: 0, max: 100 }
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampCrewNeeds(needs: CrewNeeds): CrewNeeds {
  return {
    stress: clamp(needs.stress, NEED_LIMITS.stress.min, NEED_LIMITS.stress.max),
    morale: clamp(needs.morale, NEED_LIMITS.morale.min, NEED_LIMITS.morale.max),
    fatigue: clamp(needs.fatigue, NEED_LIMITS.fatigue.min, NEED_LIMITS.fatigue.max),
    loyalty: clamp(needs.loyalty, NEED_LIMITS.loyalty.min, NEED_LIMITS.loyalty.max)
  };
}

export function tickCrewMember(member: CrewMember, dt: number): CrewMember {
  const stressRate = 0.25;
  const fatigueRate = 0.18;
  const moraleRate = -0.03 - member.needs.stress * 0.0006;
  return {
    ...member,
    needs: clampCrewNeeds({
      stress: member.needs.stress + stressRate * dt,
      fatigue: member.needs.fatigue + fatigueRate * dt,
      morale: member.needs.morale + moraleRate * dt,
      loyalty: member.needs.loyalty + (member.needs.morale > 10 ? 0.02 : -0.01) * dt
    })
  };
}

export function tickCrew(state: GameState, dt: number): GameState {
  if (state.company.crew.length === 0) {
    return state;
  }
  return {
    ...state,
    company: {
      ...state.company,
      crew: state.company.crew.map((member) => tickCrewMember(member, dt))
    }
  };
}

export function computeOpsEfficiency(crew: CrewMember[]): number {
  if (crew.length === 0) {
    return 0.6;
  }
  const totalSkill = crew.reduce((acc, member) => {
    const skill = (member.skills.ops + member.skills.engineering + member.skills.piloting) / 3;
    return acc + skill;
  }, 0);
  const avgSkill = totalSkill / crew.length;
  const avgMorale = crew.reduce((acc, member) => acc + member.needs.morale, 0) / crew.length;
  const avgStress = crew.reduce((acc, member) => acc + member.needs.stress, 0) / crew.length;
  const efficiency = 0.6 + avgSkill * 0.05 + avgMorale * 0.005 - avgStress * 0.004;
  return Math.max(0.5, Math.min(1.5, efficiency));
}

export function applyCrewNeedDelta(
  state: GameState,
  crewId: string,
  delta: Partial<CrewNeeds>
): GameState {
  const crew = state.company.crew.map((member) => {
    if (member.id !== crewId) {
      return member;
    }
    return {
      ...member,
      needs: clampCrewNeeds({
        stress: member.needs.stress + (delta.stress ?? 0),
        morale: member.needs.morale + (delta.morale ?? 0),
        fatigue: member.needs.fatigue + (delta.fatigue ?? 0),
        loyalty: member.needs.loyalty + (delta.loyalty ?? 0)
      })
    };
  });
  return {
    ...state,
    company: { ...state.company, crew }
  };
}

export function applyCrewSleep(state: GameState): GameState {
  if (state.company.crew.length === 0) {
    return state;
  }
  return {
    ...state,
    company: {
      ...state.company,
      crew: state.company.crew.map((member) => ({
        ...member,
        needs: clampCrewNeeds({
          stress: member.needs.stress - 4,
          fatigue: member.needs.fatigue - 20,
          morale: member.needs.morale + 2,
          loyalty: member.needs.loyalty
        })
      }))
    },
    log: pushLog(state.log, 'Crew rested while you slept.')
  };
}
