import { budgetState } from '../budget';

describe('budgetState', () => {
  it('is ok below 80%', () => {
    expect(budgetState(0, 1000)).toEqual({ level: 'ok', ratio: 0 });
    expect(budgetState(799, 1000)).toEqual({ level: 'ok', ratio: 0.799 });
  });

  it('is near from 80% up to and including 100%', () => {
    expect(budgetState(800, 1000)).toEqual({ level: 'near', ratio: 0.8 });
    expect(budgetState(1000, 1000)).toEqual({ level: 'near', ratio: 1 });
  });

  it('is over above 100% and draws a full bar', () => {
    expect(budgetState(1001, 1000)).toEqual({ level: 'over', ratio: 1 });
    expect(budgetState(2500, 1000)).toEqual({ level: 'over', ratio: 1 });
  });

  it('treats negative spending as zero', () => {
    expect(budgetState(-50, 1000)).toEqual({ level: 'ok', ratio: 0 });
  });

  it('handles a zero limit', () => {
    expect(budgetState(0, 0)).toEqual({ level: 'ok', ratio: 0 });
    expect(budgetState(1, 0)).toEqual({ level: 'over', ratio: 1 });
  });
});
