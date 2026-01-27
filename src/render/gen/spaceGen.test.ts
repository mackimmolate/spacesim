import { describe, expect, it } from 'vitest';
import { generateSpaceDescriptor, hashSpaceDescriptor } from './spaceGen';

describe('space generation determinism', () => {
  it('produces stable hashes for the same seed', () => {
    const first = hashSpaceDescriptor(generateSpaceDescriptor('nebula-001'));
    const second = hashSpaceDescriptor(generateSpaceDescriptor('nebula-001'));

    expect(first).toBe(second);
  });
});
