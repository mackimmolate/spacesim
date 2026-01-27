import type { GameState, SaveState } from './types';
import { parseJSON, SaveError, type Result, failure, success } from '../utils/errors';

/**
 * Serializes the game state to a JSON string
 * 
 * @param state - The game state to serialize
 * @returns Result containing the serialized state or an error
 */
export function serializeSaveState(state: GameState): Result<string, SaveError> {
  try {
    const payload: SaveState = {
      version: 1,
      state
    };
    return success(JSON.stringify(payload, null, 2));
  } catch (error) {
    return failure(
      new SaveError('Failed to serialize game state', error)
    );
  }
}

/**
 * Validates that a parsed save state has the correct structure
 */
function validateSaveState(parsed: unknown): parsed is SaveState {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }
  
  const candidate = parsed as Partial<SaveState>;
  
  // Check version
  if (candidate.version !== 1) {
    return false;
  }
  
  // Check that state exists and has required fields
  if (!candidate.state || typeof candidate.state !== 'object') {
    return false;
  }
  
  const state = candidate.state as Partial<GameState>;
  
  // Validate critical fields
  const requiredFields: (keyof GameState)[] = [
    'seed',
    'tick',
    'time',
    'mode',
    'player',
    'needs',
    'company',
    'sector',
    'shipStats',
  ];
  
  return requiredFields.every(field => field in state);
}

/**
 * Deserializes a JSON string to a game state
 * 
 * @param raw - The JSON string to deserialize
 * @returns Result containing the deserialized state or an error
 */
export function deserializeSaveState(raw: string): Result<GameState, SaveError> {
  const parseResult = parseJSON<unknown>(raw, 'Invalid save data format');
  
  if (!parseResult.success) {
    return parseResult;
  }
  
  const parsed = parseResult.value;
  
  if (!validateSaveState(parsed)) {
    return failure(
      new SaveError(
        'Save data is invalid or from an incompatible version'
      )
    );
  }
  
  return success(parsed.state);
}

/**
 * Migrates old save data to the current version if needed
 * (Future proofing for when we have version 2, 3, etc.)
 */
export function migrateSaveState(saveState: SaveState): SaveState {
  // Currently only version 1 exists, but this is where we'd handle migrations
  switch (saveState.version) {
    case 1:
      return saveState;
    default:
      throw new SaveError(`Unsupported save version: ${saveState.version}`);
  }
}
