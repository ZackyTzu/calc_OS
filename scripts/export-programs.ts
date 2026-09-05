// Write every generated program to build/programs as .8xp plus its TI-BASIC source, for inspection
// and for the Python cross-check (scripts/crosscheck_tivars.py).
import { writeFileSync, mkdirSync } from 'node:fs';
import { subjects, generateAcademic, lint } from '../src/lib/programs/index';
import { tokenize } from '../src/lib/tibasic/tokenizer';
import { buildFile, programEntry } from '../src/lib/tifiles/tifile';

mkdirSync('build/programs', { recursive: true });
for (const s of subjects) {
  const p = generateAcademic(s);
  const issues = lint(p.source);
  if (issues.length) {
    console.error(`${p.name}: ${issues.length} lint issue(s)`);
    for (const i of issues) console.error(`  line ${i.line}: ${i.message}\n    ${i.text}`);
    process.exitCode = 1;
  }
  const tokens = tokenize(p.source);
  const file = buildFile([programEntry(p.name, tokens, { archived: true })]);
  writeFileSync(`build/programs/${p.name}.8xp`, file);
  writeFileSync(`build/programs/${p.name}.txt`, p.source);
  console.log(`${p.name}: ${p.source.split('\n').length} lines, ${tokens.length} token bytes, ${file.length} byte file`);
}
