import { describe, expect, it } from 'vitest';
import { previewPython, previewTiBasic } from './preview';
import { allPrograms, subjects } from '../programs';
import { generatePython } from '../nspire/python-gen';
import { mathbotPython } from '../nspire/mathbot-py';

describe('previewTiBasic', () => {
  it('shows the intro page of a solver program', () => {
    const p = previewTiBasic(allPrograms().find((x) => x.name === 'PHYSICS1')!.source);
    expect(p.kind).toBe('text');
    expect(p.rows[0]).toBe('AP PHYSICS 1');
    expect(p.rows).toContain('AP PHYSICS 1 SOLVER');
    expect(p.rows.length).toBeLessThanOrEqual(10);
    for (const r of p.rows) expect(r.length).toBeLessThanOrEqual(26);
  });
  it('renders the main menu of MathBot', () => {
    const p = previewTiBasic(allPrograms().find((x) => x.name === 'MATHBOT')!.source);
    expect(p.kind).toBe('menu');
    expect(p.rows[0]).toBe('MATHBOT');
    expect(p.rows[1]).toBe('1:Ask me (type)');
  });
  it('skips conditional blocks and stops at the first wait', () => {
    const p = previewTiBasic(allPrograms().find((x) => x.name === 'BLACKJCK')!.source);
    expect(p.rows[0]).toBe('BLACKJACK');
    expect(p.rows.join('\n')).not.toContain('BROKE');
    expect(p.rows[p.rows.length - 1]).toBe('BET (0=QUIT): ');
  });
  it('handles Output( placement and Disp with several arguments', () => {
    const p = previewTiBasic('ClrHome\nDisp "A","B"\nOutput(4,3,"HI")\nPause ');
    expect(p.rows).toEqual(['A', 'B', '', '  HI']);
  });
  it('previews every generated program without throwing', () => {
    for (const prog of allPrograms()) {
      const p = previewTiBasic(prog.source);
      expect(p.rows.length).toBeGreaterThan(0);
    }
  });
});

describe('previewPython', () => {
  it('shows the intro and first menu of a solver', () => {
    const p = previewPython(generatePython(subjects[0]).source);
    expect(p.rows[0]).toBe('AP PHYSICS 1');
    expect(p.rows).toContain('== AP PHYSICS 1 ==');
    expect(p.rows).toContain('1) Kinematics');
    expect(p.rows[p.rows.length - 1]).toBe('> ');
  });
  it('shows the MathBot greeting', () => {
    const p = previewPython(mathbotPython.source);
    expect(p.rows[0]).toContain('MathBot');
    expect(p.rows[p.rows.length - 1]).toBe('? ');
  });
});
