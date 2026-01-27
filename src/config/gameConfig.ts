/**
 * Game Configuration
 * 
 * Centralized location for all game constants, speeds, rates, and tunable values.
 * This makes balancing and tweaking gameplay much easier.
 */

export const CONFIG = {
  // Core Engine Settings
  ENGINE: {
    TICKS_PER_SECOND: 60,
    SPEED_MULTIPLIERS: [1, 2, 4] as const,
  },

  // Camera Controls
  CAMERA: {
    SPEED: 220,
    ZOOM_SPEED: 0.7,
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 2.0,
  },

  // Ship Physics
  SHIP: {
    IMPULSE_SCALE: 0.4,
    DRIFT_ACCEL: 0.12,
    MAX_SPEED: 2.5,
    BASE_TRAVEL_SPEED: 12,
    TOW_SPEED_MODIFIER: 0.6,
  },

  // Player Movement
  PLAYER: {
    MOVE_INTERVAL: 0.18,
  },

  // Needs System
  NEEDS: {
    RATES: {
      HUNGER: 0.35,
      THIRST: 0.5,
      FATIGUE: 0.25,
      STRESS: 0.12,
      MORALE: -0.04,
    },
    LIMITS: {
      HUNGER: { MIN: 0, MAX: 100 },
      THIRST: { MIN: 0, MAX: 100 },
      FATIGUE: { MIN: 0, MAX: 100 },
      STRESS: { MIN: 0, MAX: 100 },
      MORALE: { MIN: -50, MAX: 50 },
    },
    COMMAND_MODE_STRESS_RELIEF: 0.06,
  },

  // Crew System
  CREW: {
    RATES: {
      STRESS: 0.25,
      FATIGUE: 0.18,
      MORALE_BASE: -0.03,
      MORALE_STRESS_FACTOR: -0.0006,
      LOYALTY_POSITIVE: 0.02,
      LOYALTY_NEGATIVE: -0.01,
    },
    LIMITS: {
      STRESS: { MIN: 0, MAX: 100 },
      MORALE: { MIN: -50, MAX: 50 },
      FATIGUE: { MIN: 0, MAX: 100 },
      LOYALTY: { MIN: 0, MAX: 100 },
    },
    MAX_CANDIDATES: 4,
    BASE_EFFICIENCY: 0.6,
    EFFICIENCY_SKILL_FACTOR: 0.05,
    EFFICIENCY_MORALE_FACTOR: 0.005,
    EFFICIENCY_STRESS_FACTOR: -0.004,
  },

  // Company & Economy
  COMPANY: {
    STARTING_CREDITS: 1500,
    PAYROLL_CYCLE_DAYS: 1,
    PAYROLL_MISSED_MORALE_PENALTY: -6,
    PAYROLL_MISSED_STRESS_PENALTY: 6,
    PAYROLL_MISSED_LOYALTY_PENALTY: -4,
    PAYROLL_PAID_MORALE_BONUS: 2,
    PAYROLL_PAID_STRESS_RELIEF: -3,
  },

  // Events System
  EVENTS: {
    INTERVAL_TICKS: 60 * 20, // 20 minutes at 60 ticks/second
  },

  // Contracts
  CONTRACTS: {
    TICKS_PER_DAY: 60 * 60 * 24,
    BASE_REWARD_MIN: 250,
    BASE_REWARD_RANGE: 200,
    HIGH_REP_BONUS: 1.2,
    LOW_REP_PENALTY: 0.9,
    BASE_REPUTATION_DELTA: 5,
    LOW_REP_REPUTATION_DELTA: 3,
    CONTRACTS_PER_STATION_MIN: 2,
    CONTRACTS_PER_STATION_RANGE: 3,
  },

  // Ship Stats
  SHIP_STATS: {
    FUEL_MAX: 120,
    HULL_MAX: 100,
    TOW_CAPACITY: 80,
    SALVAGE_RIG_LEVEL: 1,
    SCANNER_KITS: 2,
    FUEL_BURN_NORMAL: 0.8,
    FUEL_BURN_TOWING: 1.2,
  },

  // Travel & Contracts
  TRAVEL: {
    TOW_RISK_BASE: 0.015,
    TOW_RISK_EFFICIENCY_FACTOR: 0.03,
    TOW_RISK_HULL_FACTOR: 0.04,
    TOW_MIN_HULL_PERCENT: 0.3,
    SALVAGE_RISK_BASE: 0.03,
    SALVAGE_RISK_EFFICIENCY_FACTOR: 0.04,
    SALVAGE_RISK_CHECK_INTERVAL: 300,
    SALVAGE_HULL_DAMAGE: 6,
  },

  // Sector Map
  SECTOR: {
    NODE_COUNT: 12,
    MAP_RADIUS: 80,
    MIN_EDGE_DISTANCE: 10,
  },

  // Interior Map
  INTERIOR: {
    MAP_WIDTH: 24,
    MAP_HEIGHT: 16,
    TILE_SIZE: 16,
    SLEEP_TIME_BONUS: 60 * 10, // 10 minutes
    SLEEP_FATIGUE_RELIEF: -35,
    SLEEP_STRESS_RELIEF: -8,
    SLEEP_MORALE_BONUS: 4,
    EAT_HUNGER_RELIEF: -28,
    EAT_MORALE_BONUS: 3,
    DRINK_THIRST_RELIEF: -30,
    DRINK_MORALE_BONUS: 1,
  },

  // Rendering
  RENDER: {
    BASE_SCALE: 20,
    CHUNK_SIZE: 64,
    NODE_RADIUS: 4,
    PICK_RADIUS: 10, // NODE_RADIUS + 6
    FRAME_PADDING: 12,
  },

  // UI
  UI: {
    LOG_LIMIT: 8,
  },

  // Storage Keys
  STORAGE: {
    SAVE_KEY: 'spacesim-save',
  },
} as const;

/**
 * Skill weights for different crew roles
 */
export const ROLE_SKILL_WEIGHTS = {
  pilot: { piloting: 7, engineering: 3, ops: 5, medical: 1, social: 4 },
  engineer: { piloting: 2, engineering: 8, ops: 4, medical: 2, social: 3 },
  tech: { piloting: 3, engineering: 5, ops: 7, medical: 2, social: 3 },
  medic: { piloting: 2, engineering: 3, ops: 4, medical: 8, social: 5 },
  security: { piloting: 4, engineering: 3, ops: 4, medical: 3, social: 4 },
  generalist: { piloting: 4, engineering: 4, ops: 4, medical: 4, social: 4 },
} as const;

/**
 * Type helper to get valid speed multipliers
 */
export type SpeedMultiplier = (typeof CONFIG.ENGINE.SPEED_MULTIPLIERS)[number];

/**
 * Type helper for crew roles
 */
export type CrewRole = keyof typeof ROLE_SKILL_WEIGHTS;
