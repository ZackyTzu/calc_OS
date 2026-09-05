// Turn a library entry into the variables that get sent to the calculator.
import { unzipSync } from 'fflate';
import { subjects, generateAcademic } from '../programs';
import { tokenize } from '../tibasic/tokenizer';
import { buildFile, parseFile, programEntry, type VarEntry } from '../tifiles/tifile';
import { IMPORTABLE_EXTENSIONS } from '../tifiles/types';
import type { LibraryEntry } from './catalog';

export function generatedSource(entry: LibraryEntry): string | null {
  if (entry.source.type !== 'generated') return null;
  const subject = subjects.find((s) => s.program === (entry.source as { subject: string }).subject);
  if (!subject) return null;
  return generateAcademic(subject).source;
}

export async function entriesFor(entry: LibraryEntry): Promise<VarEntry[]> {
  if (entry.source.type === 'generated') {
    const subject = subjects.find((s) => s.program === (entry.source as { subject: string }).subject);
    if (!subject) throw new Error(`Unknown subject ${JSON.stringify(entry.source)}`);
    const prog = generateAcademic(subject);
    return [programEntry(prog.name, tokenize(prog.source), { archived: true })];
  }
  if (entry.source.type === 'hosted') {
    const out: VarEntry[] = [];
    for (const path of entry.source.files) {
      const res = await fetch(import.meta.env.BASE_URL + path);
      if (!res.ok) throw new Error(`Could not download ${path} (${res.status})`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      out.push(...parseFile(bytes).entries);
    }
    return out;
  }
  throw new Error('This program must be downloaded from its author and installed from file.');
}

/** Bytes of a downloadable file for a library entry (generated programs and hosted single files). */
export async function downloadable(entry: LibraryEntry): Promise<{ filename: string; bytes: Uint8Array } | null> {
  if (entry.source.type === 'generated') {
    const entries = await entriesFor(entry);
    return { filename: `${entries[0].name}.8xp`, bytes: buildFile(entries, `${entry.name} - calc_OS`) };
  }
  if (entry.source.type === 'hosted' && entry.source.files.length === 1) {
    const path = entry.source.files[0];
    const res = await fetch(import.meta.env.BASE_URL + path);
    return { filename: path.split('/').pop()!, bytes: new Uint8Array(await res.arrayBuffer()) };
  }
  return null;
}

export interface ImportedFile { filename: string; entries: VarEntry[]; error?: string }

/** Parse dropped files: TI variable files directly, zips recursively. */
export async function importFiles(files: File[]): Promise<ImportedFile[]> {
  const out: ImportedFile[] = [];
  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer());
    out.push(...importBytes(f.name, bytes));
  }
  return out;
}

export function importBytes(filename: string, bytes: Uint8Array): ImportedFile[] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'zip') {
    try {
      const files = unzipSync(bytes);
      const out: ImportedFile[] = [];
      for (const [name, data] of Object.entries(files)) {
        if (name.endsWith('/') || name.startsWith('__MACOSX')) continue;
        const e = name.split('.').pop()?.toLowerCase() ?? '';
        if (IMPORTABLE_EXTENSIONS.includes(e)) out.push(...importBytes(name.split('/').pop()!, data));
      }
      if (!out.length) return [{ filename, entries: [], error: 'No calculator files found inside the zip' }];
      return out;
    } catch (e) {
      return [{ filename, entries: [], error: `Could not read zip: ${(e as Error).message}` }];
    }
  }
  if (!IMPORTABLE_EXTENSIONS.includes(ext)) return [{ filename, entries: [], error: `Unsupported file type .${ext}` }];
  try {
    const parsed = parseFile(bytes);
    return [{ filename, entries: parsed.entries, error: parsed.checksumOk ? undefined : 'Checksum mismatch (file may be corrupted)' }];
  } catch (e) {
    return [{ filename, entries: [], error: (e as Error).message }];
  }
}
