# calc_OS

**Programs for TI graphing calculators, installed straight from the browser.**
Live site: https://zackytzu.github.io/calc_OS/

Plug in a TI-84 Plus CE, click *Connect*, and:

- install generated study programs: **AP Physics 1** (more subjects coming: AP Precalculus, AP Statistics, an offline math assistant),
- install open-licensed community tools and games, or drop any `.8xp` / `.8xv` / `.8xg` / `.zip` you downloaded elsewhere,
- see every program and variable on the calculator, save copies, and delete what you no longer need.

Everything runs in the browser over WebUSB (Chrome, Edge, Brave). No software to install, nothing uploaded anywhere.

## How it works

| Layer | Where | Notes |
|---|---|---|
| USB transport + DUSB protocol | `src/lib/dusb/` | TypeScript re-implementation of the TI-84 family "Direct USB" protocol: handshake, directory listing, send, receive, delete. Behaviour follows [tilibs](https://github.com/debrouxl/tilibs). |
| TI variable files | `src/lib/tifiles/` | Read/write `.8xp`, `.8xv`, `.8xg` with checksums. |
| TI-BASIC tokenizer | `src/lib/tibasic/` | Text ⇄ tokens using the [TI-Toolkit token sheet](https://github.com/TI-Toolkit/tokens). |
| Program generator | `src/lib/programs/` | Content is data (formulas, variables, rearrangements, notes). A builder emits menu-driven TI-BASIC; a linter and an expression evaluator prove every rearrangement is consistent before anything ships. |
| Library | `src/lib/library/` | Catalog of installable entries with licence and compatibility rules. |
| UI | `src/ui/` | React + Tailwind. Design pass still to come. |

Generated programs are additionally decoded with the independent Python library `tivars` (`scripts/crosscheck_tivars.py`) to confirm the calculator will display exactly the intended text.

## Assembly games and OS versions

TI removed assembly support in OS 5.5 (2020). The arTIfiCE jailbreak restores it on OS 5.3–5.8.4. **OS 5.8.5 (April 2026) blocks it and cannot be downgraded.** The site detects the OS on connect and marks each program as compatible, jailbreak-needed or blocked. TI-BASIC programs (everything calc_OS generates) run on every OS.

## Development

```bash
npm install
npm run dev          # http://localhost:5173/calc_OS/
npm test             # vitest: protocol framing, file format, tokenizer, content consistency
npx tsx scripts/export-programs.ts   # writes build/programs/*.8xp and .txt
```

Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Status

- [x] TI-84 Plus CE: connect, info, list, install, delete, save
- [x] AP Physics 1 solver program (64 formulas, 8 units)
- [ ] Hardware test on a real CE (protocol verified against tilibs and unit tests; awaiting a plugged-in calculator)
- [ ] AP Precalculus, AP Statistics, math assistant, TI-BASIC games
- [ ] TI-Nspire CX II transfer and `.tns` generation
- [ ] Design pass

## Licence

GPL-3.0-or-later. Third-party programs keep their own licences (see `public/library/third-party/*/README.md`).
Not affiliated with Texas Instruments.
