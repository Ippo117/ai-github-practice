import { describe, expect, it } from 'vitest';
import { createProblem } from './arithmetic';

describe('createProblem', () => {
  it('starts with small addition problems at level 0', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;

    const problem = createProblem(0);

    Math.random = originalRandom;

    expect(problem).toEqual({
      left: 1,
      operator: '+',
      right: 1,
      answer: 2,
      prompt: '1 + 1'
    });
  });

  it('unlocks harder operations and larger numbers as the level increases', () => {
    const randomValues = [0.9, 0.4, 0.5];
    const originalRandom = Math.random;
    Math.random = () => randomValues.shift() ?? 0;

    const problem = createProblem(7);

    Math.random = originalRandom;

    expect(problem.operator).toBe('×');
    expect(problem.left).toBeGreaterThanOrEqual(1);
    expect(problem.right).toBeGreaterThanOrEqual(1);
    expect(problem.left).toBeLessThanOrEqual(22);
    expect(problem.right).toBeLessThanOrEqual(22);
    expect(problem.answer).toBe(problem.left * problem.right);
  });
});
