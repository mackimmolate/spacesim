import { GameMode } from './modes';

export interface Needs {
  hunger: number;
  thirst: number;
  fatigue: number;
  stress: number;
  morale: number;
}

const NEED_LIMITS = {
  hunger: { min: 0, max: 100 },
  thirst: { min: 0, max: 100 },
  fatigue: { min: 0, max: 100 },
  stress: { min: 0, max: 100 },
  morale: { min: -50, max: 50 }
};

const NEED_RATES = {
  hunger: 0.35,
  thirst: 0.5,
  fatigue: 0.25,
  stress: 0.12,
  morale: -0.04
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampNeeds(needs: Needs): Needs {
  return {
    hunger: clamp(needs.hunger, NEED_LIMITS.hunger.min, NEED_LIMITS.hunger.max),
    thirst: clamp(needs.thirst, NEED_LIMITS.thirst.min, NEED_LIMITS.thirst.max),
    fatigue: clamp(needs.fatigue, NEED_LIMITS.fatigue.min, NEED_LIMITS.fatigue.max),
    stress: clamp(needs.stress, NEED_LIMITS.stress.min, NEED_LIMITS.stress.max),
    morale: clamp(needs.morale, NEED_LIMITS.morale.min, NEED_LIMITS.morale.max)
  };
}

export function createInitialNeeds(): Needs {
  return {
    hunger: 12,
    thirst: 10,
    fatigue: 18,
    stress: 8,
    morale: 8
  };
}

export function tickNeeds(needs: Needs, dt: number, mode: GameMode): Needs {
  const stressRelief = mode === GameMode.Command ? 0.06 : 0;
  const baseMorale = NEED_RATES.morale - needs.stress * 0.001 + (50 - needs.morale) * 0.0002;

  return clampNeeds({
    hunger: needs.hunger + NEED_RATES.hunger * dt,
    thirst: needs.thirst + NEED_RATES.thirst * dt,
    fatigue: needs.fatigue + NEED_RATES.fatigue * dt,
    stress: needs.stress + (NEED_RATES.stress - stressRelief) * dt,
    morale: needs.morale + baseMorale * dt
  });
}

export function applyNeedDelta(needs: Needs, delta: Partial<Needs>): Needs {
  return clampNeeds({
    hunger: needs.hunger + (delta.hunger ?? 0),
    thirst: needs.thirst + (delta.thirst ?? 0),
    fatigue: needs.fatigue + (delta.fatigue ?? 0),
    stress: needs.stress + (delta.stress ?? 0),
    morale: needs.morale + (delta.morale ?? 0)
  });
}
