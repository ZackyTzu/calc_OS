import { describe, expect, it } from 'vitest';
import { evaluate } from './tiexpr';

describe('TI expression evaluator', () => {
  it('follows TI precedence for the constructs we use', () => {
    expect(evaluate('N/2*(2*F+(N-1)*D)', { N: 4, F: 1, D: 2 })).toBe(2 * (2 + 6));
    expect(evaluate('~B/(2*A)', { A: 2, B: 3 })).toBe(-0.75);
    expect(evaluate('X^^2+2^3', { X: 3 })).toBe(17);
    expect(evaluate('6.67|E~11*2', {})).toBeCloseTo(1.334e-10, 20);
    expect(evaluate('5 nCr 2', {})).toBe(10);
    expect(evaluate('5 nPr 2', {})).toBe(20);
    expect(evaluate('5!', {})).toBe(120);
    expect(evaluate('2*5 nCr 2', {})).toBe(20);
  });
  it('handles trig modes', () => {
    expect(evaluate('sin(30)', {}, { mode: 'deg' })).toBeCloseTo(0.5);
    expect(evaluate('sin^-1(.5)', {}, { mode: 'deg' })).toBeCloseTo(30);
    expect(evaluate('cos(pi)', {}, { mode: 'rad' })).toBeCloseTo(-1);
  });
  it('implements the statistics functions used in content', () => {
    expect(evaluate('normalcdf(~1|E99,1.96)', {})).toBeCloseTo(0.975, 4);
    expect(evaluate('normalcdf(90,110,100,10)', {})).toBeCloseTo(0.6827, 3);
    expect(evaluate('invNorm(.975)', {})).toBeCloseTo(1.95996, 4);
    expect(evaluate('invNorm(.9,100,15)', {})).toBeCloseTo(119.22, 1);
    expect(evaluate('binompdf(10,.5,5)', {})).toBeCloseTo(0.24609, 4);
    expect(evaluate('binomcdf(10,.5,5)', {})).toBeCloseTo(0.62305, 4);
    expect(evaluate('geometpdf(.2,3)', {})).toBeCloseTo(0.128, 6);
  });
  it('rejects implicit multiplication so content stays unambiguous', () => {
    expect(() => evaluate('2A', { A: 1 })).toThrow(/Implicit/);
  });
  it('solves numerically', () => {
    expect(evaluate('solve(P+U*T+.5*A*T^^2-X,T,1)', { P: 0, U: 0, A: 2, X: 8 })).toBeCloseTo(Math.sqrt(8));
  });
});
