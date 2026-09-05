import type { CalcInfo, CalcVariable } from '../dusb/calculator';
import type { LibraryEntry } from './catalog';

export type CompatLevel = 'ok' | 'warn' | 'blocked' | 'unknown';
export interface Compat { level: CompatLevel; title: string; details: string[] }

const CLIB_NAMES = ['LIBLOAD', 'GRAPHX', 'FILEIOC', 'KEYPADC'];

export function compatibility(entry: LibraryEntry, info: CalcInfo | null, vars: CalcVariable[] | null): Compat {
  const details: string[] = [];
  if (entry.calculator === 'nspire') {
    return { level: 'unknown', title: 'TI-Nspire CX II program', details: ['Nspire transfers are not supported in the browser yet; download the file and use TI-Nspire CX Student Software or n-link.'] };
  }
  if (!info) {
    if (entry.requires.includes('asm')) {
      return { level: 'unknown', title: 'Needs assembly support', details: ['Works natively on OS 5.4 and below, with the arTIfiCE jailbreak on 5.5 to 5.8.4, and not at all on 5.8.5 or newer. Connect your calculator to check.'] };
    }
    return { level: 'ok', title: 'Runs on every TI-84 Plus CE', details: ['Plain TI-BASIC: no jailbreak or libraries needed.'] };
  }
  let level: CompatLevel = 'ok';
  let title = 'Compatible with your calculator';
  if (entry.requires.includes('asm')) {
    if (info.asmBlocked) {
      level = 'blocked';
      title = `Cannot run on OS ${info.osMajorMinor}`;
      details.push('TI removed assembly support in OS 5.5 and patched the last jailbreak in OS 5.8.5. There is currently no way to run this on your OS.');
    } else if (info.asmWithJailbreak) {
      level = 'warn';
      title = `Needs the arTIfiCE jailbreak (OS ${info.osMajorMinor})`;
      details.push('Install arTIfiCE once (see Unlock), then this program will run.');
    } else {
      details.push(`Assembly programs run natively on OS ${info.osMajorMinor}.`);
    }
  }
  if (entry.requires.includes('clibs')) {
    const have = vars ? CLIB_NAMES.every((n) => vars.some((v) => v.name === n && v.type === 0x15)) : false;
    if (!have) {
      if (level === 'ok') { level = 'warn'; title = 'Needs the CE C libraries'; }
      details.push(vars ? 'The CE C libraries are not on this calculator yet. Install them from the library first.' : 'Requires the CE C libraries.');
    } else {
      details.push('CE C libraries found on the calculator.');
    }
  }
  if (entry.kind === 'tibasic' && !entry.requires.length) details.push('Plain TI-BASIC: no jailbreak or libraries needed.');
  return { level, title, details };
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}
