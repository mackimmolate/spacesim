/**
 * Error Handling Utilities
 * 
 * Provides typed error classes and utilities for consistent error handling
 * throughout the application.
 */

/**
 * Base error class for all game errors
 */
export class GameError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'GameError';
  }
}

/**
 * Error for save/load operations
 */
export class SaveError extends GameError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message, 'SAVE_ERROR');
    this.name = 'SaveError';
  }
}

/**
 * Error for contract operations
 */
export class ContractError extends GameError {
  constructor(message: string) {
    super(message, 'CONTRACT_ERROR');
    this.name = 'ContractError';
  }
}

/**
 * Error for crew operations
 */
export class CrewError extends GameError {
  constructor(message: string) {
    super(message, 'CREW_ERROR');
    this.name = 'CrewError';
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = GameError> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Creates a success result
 */
export function success<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Creates a failure result
 */
export function failure<E extends GameError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Safely executes a function and returns a Result
 */
export function tryCatch<T>(
  fn: () => T,
  errorMessage: string,
  ErrorClass: new (message: string, originalError?: unknown) => GameError = SaveError
): Result<T, GameError> {
  try {
    return success(fn());
  } catch (error) {
    return failure(new ErrorClass(errorMessage, error));
  }
}

/**
 * Safely parses JSON with a Result type
 */
export function parseJSON<T>(
  json: string,
  errorMessage = 'Failed to parse JSON'
): Result<T, SaveError> {
  return tryCatch<T>(
    () => JSON.parse(json) as T,
    errorMessage,
    SaveError
  );
}

/**
 * Safely accesses localStorage
 */
export function getFromStorage(key: string): Result<string | null, SaveError> {
  return tryCatch(
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        // localStorage might be disabled or unavailable
        return null;
      }
    },
    'Failed to access localStorage',
    SaveError
  );
}

/**
 * Safely writes to localStorage
 */
export function setInStorage(key: string, value: string): Result<void, SaveError> {
  return tryCatch(
    () => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        throw new Error(`localStorage is unavailable or full: ${error}`);
      }
    },
    'Failed to write to localStorage',
    SaveError
  );
}

/**
 * Type guard for checking if a value is an error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Formats an error for display to the user
 */
export function formatError(error: unknown): string {
  if (error instanceof GameError) {
    return error.message;
  }
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}
