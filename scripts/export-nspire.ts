// Write the generated Nspire Python programs and .tns documents to build/nspire.
import { mkdirSync, writeFileSync } from 'node:fs';
import { subjects } from '../src/lib/programs';
import { generatePython } from '../src/lib/nspire/python-gen';
import { buildPythonTns } from '../src/lib/nspire/tns';
import { mathbotPython } from '../src/lib/nspire/mathbot-py';

mkdirSync('build/nspire', { recursive: true });
for (const s of subjects) {
  const py = generatePython(s);
  writeFileSync(`build/nspire/${py.filename}`, py.source);
  const tns = buildPythonTns([{ name: py.filename, source: py.source }]);
  writeFileSync(`build/nspire/${s.program}.tns`, tns);
  console.log(`${py.filename}: ${py.source.split('\n').length} lines; ${s.program}.tns ${tns.length} bytes`);
}
writeFileSync('build/nspire/MATHBOT.py', mathbotPython.source);
writeFileSync('build/nspire/MATHBOT.tns', buildPythonTns([{ name: mathbotPython.filename, source: mathbotPython.source }]));
console.log('MATHBOT.py / MATHBOT.tns written');
