import { physics1 } from './content/physics1';
import { precalc } from './content/precalc';
import { stats } from './content/stats';
import { mathbot } from './mathbot';
import { games } from './games';
import { generateAcademic, type GeneratedProgram } from './academic';
import type { Subject } from './types';

/** Academic solver programs generated from content specs. */
export const subjects: Subject[] = [physics1, precalc, stats];

/** Hand-written TI-BASIC programs (assistant, games). */
export const extraPrograms: GeneratedProgram[] = [mathbot, ...games];

/** Every program calc_OS generates, by calculator name. */
export function allPrograms(): GeneratedProgram[] {
  return [...subjects.map(generateAcademic), ...extraPrograms];
}

export function programByName(name: string): GeneratedProgram | undefined {
  const s = subjects.find((x) => x.program === name);
  if (s) return generateAcademic(s);
  return extraPrograms.find((p) => p.name === name);
}

export { generateAcademic } from './academic';
export type { GeneratedProgram } from './academic';
export { lint } from './lint';
