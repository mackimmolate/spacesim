import { describe, expect, it } from 'vitest';
import { generateCandidates } from './generate';
import { createInitialState } from '../state';
import { hireCandidate } from './hiring';
import { advanceState } from '../tick';
import { pickEvent } from '../events/events';

const FIXED_DT = 1 / 60;
const EMPTY_INPUT = {
  impulse: { x: 0, y: 0 },
  cameraPan: { x: 0, y: 0 },
  zoomIn: false,
  zoomOut: false,
  resetCamera: false,
  move: { x: 0, y: 0 },
  interact: false,
  exitCommand: false
};

describe('crew candidate determinism', () => {
  it('generates the same candidates for the same seed', () => {
    const listA = generateCandidates('seed-crew', 3);
    const listB = generateCandidates('seed-crew', 3);
    expect(JSON.stringify(listA)).toEqual(JSON.stringify(listB));
  });
});

describe('hiring flow', () => {
  it('reduces credits and adds crew on hire', () => {
    let state = createInitialState('hire-seed');
    const candidate = state.company.candidates[0];
    if (!candidate) throw new Error('Missing candidate');
    state = hireCandidate(state, candidate.id);
    expect(state.company.crew.length).toBe(1);
    expect(state.company.credits).toBe(1500 - candidate.signOnBonus);
    expect(state.company.candidates.find((entry) => entry.id === candidate.id)).toBeUndefined();
  });
});

describe('payroll effects', () => {
  it('missing payroll reduces morale compared to paying', () => {
    const base = createInitialState('pay-seed');
    const candidate = base.company.candidates[0];
    if (!candidate) throw new Error('Missing candidate');
    const hired = hireCandidate(base, candidate.id);
    const payReady = {
      ...hired,
      time: 10,
      company: {
        ...hired.company,
        credits: 500,
        payrollDueTime: 10
      }
    };
    const missReady = {
      ...hired,
      time: 10,
      company: {
        ...hired.company,
        credits: 0,
        payrollDueTime: 10
      }
    };

    const paid = advanceState(payReady, FIXED_DT, EMPTY_INPUT);
    const missed = advanceState(missReady, FIXED_DT, EMPTY_INPUT);

    if (!paid.company.crew[0] || !missed.company.crew[0]) throw new Error('Missing crew');
    const paidMorale = paid.company.crew[0].needs.morale;
    const missedMorale = missed.company.crew[0].needs.morale;
    expect(missedMorale).toBeLessThan(paidMorale - 4);
  });
});

describe('event determinism', () => {
  it('returns the same event for the same seed and tick', () => {
    let state = createInitialState('event-seed');
    const candidate = state.company.candidates[0];
    if (!candidate) throw new Error('Missing candidate');
    state = hireCandidate(state, candidate.id);
    state = {
      ...state,
      tick: 1200
    };
    const eventA = pickEvent(state);
    const eventB = pickEvent(state);
    expect(eventA?.id).toEqual(eventB?.id);
  });
});
