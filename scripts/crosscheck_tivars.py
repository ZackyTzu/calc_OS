"""Independent check of a .8xp produced by the TypeScript pipeline using the `tivars` library.

1. Decode our file with tivars and render it the way the calculator displays it.
2. Encode the original source text with tivars' own tokenizer and render that too.
If both renderings match, the program on the calculator is character-for-character what we intended,
even where the two tokenizers picked different (but visually identical) tokens for some text.
Usage: python crosscheck_tivars.py build/programs/X.8xp build/programs/X.txt"""
import sys
from tivars import TIProgram

path, txt = sys.argv[1], sys.argv[2]
expected = open(txt, encoding='utf8').read()
prog = TIProgram.open(path)
print('name:', prog.name, 'version:', hex(prog.version), 'archived:', prog.archived, 'bytes:', len(prog.data))

re = TIProgram(name=prog.name)
re.load_string(expected)

ours_display = prog.string()
theirs_display = re.string()
ok = ours_display.strip() == theirs_display.strip()
print('DISPLAY MATCH:', ok)
if not ok:
    for i, (a, b) in enumerate(zip(ours_display.split('\n'), theirs_display.split('\n'))):
        if a != b:
            print(f'  line {i+1}: ours={a!r} tivars={b!r}')
print('BYTES MATCH:', prog.data == re.data, '(informational: different but equivalent token choices are fine)')
print('VERSION MATCH:', prog.version == re.version, hex(prog.version), hex(re.version))
sys.exit(0 if ok and prog.version == re.version else 1)
