// Emit a sample .8xp with our TS pipeline so the Python `tivars` library can decode it independently.
import { writeFileSync, mkdirSync } from 'node:fs';
import { tokenize } from '../src/lib/tibasic/tokenizer';
import { buildFile, programEntry } from '../src/lib/tifiles/tifile';

const src = process.argv[2] ?? 'ClrHome\nDisp "HELLO WORLD"\nInput "V0=",V\nV^^2/(2*~9.8)->D\nDisp "D=",D\nIf D>=0 and V!=0\nThen\nDisp "ok",[n],{Y1},Str1\nEnd\nMenu("T","A",1,"B",2)\nLbl 1\nsqrt(2GH)->V\nLbl 2\ntheta->T\ne^^(2)->E\nDisp 3 nCr 2,pi';
mkdirSync('build', { recursive: true });
writeFileSync('build/SAMPLE.8xp', buildFile([programEntry('SAMPLE', tokenize(src))]));
writeFileSync('build/SAMPLE.txt', src);
console.log('wrote build/SAMPLE.8xp');
