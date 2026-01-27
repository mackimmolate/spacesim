import type { GameState } from '../types';
import { generateCandidates } from './generate';
import type { CrewMember } from './types';
import { pushLog } from '../log';

const CANDIDATE_COUNT = 4;

export function regenerateCandidates(state: GameState): GameState {
  const nextSeed = state.company.hiringSeed + 1;
  const candidates = generateCandidates(`${state.seed}|hire|${nextSeed}`, CANDIDATE_COUNT);
  return {
    ...state,
    company: {
      ...state.company,
      hiringSeed: nextSeed,
      candidates
    },
    log: pushLog(state.log, 'Generated a new set of crew candidates.')
  };
}

export function ensureCandidates(state: GameState): GameState {
  if (state.company.candidates.length > 0) {
    return state;
  }
  return regenerateCandidates(state);
}

export function hireCandidate(state: GameState, candidateId: string): GameState {
  const candidate = state.company.candidates.find((entry) => entry.id === candidateId);
  if (!candidate) {
    return state;
  }
  if (state.company.crew.length >= state.company.maxCrew) {
    return {
      ...state,
      log: pushLog(state.log, 'Crew quarters are full.')
    };
  }
  if (state.company.credits < candidate.signOnBonus) {
    return {
      ...state,
      log: pushLog(state.log, 'Not enough credits for the sign-on bonus.')
    };
  }
  const hiree: CrewMember = {
    ...candidate
  };
  const nextCandidates = state.company.candidates.filter((entry) => entry.id !== candidateId);
  return {
    ...state,
    company: {
      ...state.company,
      credits: state.company.credits - candidate.signOnBonus,
      crew: [...state.company.crew, hiree],
      candidates: nextCandidates
    },
    log: pushLog(state.log, `Hired ${candidate.name} as ${candidate.role}.`)
  };
}
