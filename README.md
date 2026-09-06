# calc_OS

**Programs for TI graphing calculators, installed straight from the browser.**
Live site: https://zackytzu.github.io/calc_OS/

Plug in a TI-84 Plus CE, click *Connect*, and:

- install generated study programs: **AP Physics 1**, **AP Precalculus**, **AP Statistics** (every formula solves for any variable and has notes),
- install **MathBot**, an offline math assistant that answers typed questions (SOLVE 3X-7=11, FACTOR 360, SQRT 72, MEAN 4,8,15, DERIV X^2 AT 3) with steps,
- install TI-BASIC games (2048, Snake, Tic-Tac-Toe, Blackjack, Video Poker) and open-licensed community programs (TI-Boy CE, CEleste, Open Adventure, Cesium, the CE C libraries), or drop any `.8xp` / `.8xv` / `.8xg` / `.zip` you downloaded elsewhere,
- convert a Game Boy ROM of a cartridge you own into TI-Boy CE AppVars in the browser (`src/lib/tiboy/romgen.ts`, a port of tiboyce-romgen verified byte for byte against the C tool) and install it with the emulator in one click,
- see every program and variable on the calculator, save copies, and delete what you no longer need.

For the **TI-Nspire CX II** the same three study programs and a Python MathBot (answers questions typed in plain words) are generated as `.tns` documents, with an experimental in-browser transfer (see below).

Everything runs in the browser over WebUSB (Chrome, Edge, Brave). No software to install, nothing uploaded anywhere.

## How it works

| Layer | Where | Notes |
|---|---|---|
| USB transport + DUSB protocol | `src/lib/dusb/` | TypeScript re-implementation of the TI-84 family "Direct USB" protocol: handshake, directory listing, send, receive, delete. Behaviour follows [tilibs](https://github.com/debrouxl/tilibs). |
| TI variable files | `src/lib/tifiles/` | Read/write `.8xp`, `.8xv`, `.8xg` with checksums. |
| TI-BASIC tokenizer | `src/lib/tibasic/` | Text to tokens and back using the [TI-Toolkit token sheet](https://github.com/TI-Toolkit/tokens). |
| Program generator | `src/lib/programs/` | Content is data (formulas, variables, rearrangements, notes). A builder emits menu-driven TI-BASIC; a linter and an expression evaluator prove every rearrangement is consistent before anything ships. |
| Library | `src/lib/library/` | Catalog of installable entries with licence and compatibility rules. |
| Game Boy | `src/lib/tiboy/` | Port of TI-Boy CE's romgen: page trimming, bin packing into 64 KB AppVars, metadata AppVar. Tested against SHA-256 hashes of the original tool's output. |
| Nspire | `src/lib/nspire/` | `.tns` writer compatible with Luna (custom zip container, 3DES-CTR document keystream, verified byte-for-byte against Luna's output); Python program generator for the same content; WebUSB transport around [web-libnspire](https://www.npmjs.com/package/web-libnspire) (n-link's engine) running in a worker with a SharedArrayBuffer bridge. |
| UI | `src/ui/` | React + Tailwind. |

Generated TI-84 programs are additionally decoded with the independent Python library `tivars` (`scripts/crosscheck_tivars.py`) to confirm the calculator will display exactly the intended text. The Nspire Python programs are executed with CPython in the test suite, driving every menu path through stdin.

## TI-Nspire CX II

- Programs are Python (needs CX II OS 5.2+). Open the document, then menu, then Run.
- Transfer needs `SharedArrayBuffer`, which needs cross-origin isolation. GitHub Pages cannot send those headers, so the Nspire page installs `public/coi-serviceworker.js` on request and reloads.
- The Nspire path is verified against reference files, not yet against a calculator. Treat it as experimental.

## Assembly games and OS versions

TI removed assembly support in OS 5.5 (2020). The arTIfiCE jailbreak restores it on OS 5.3 to 5.8.4. **OS 5.8.5 (April 2026) blocks it and cannot be downgraded.** The site detects the OS on connect and marks each program as compatible, jailbreak-needed or blocked. TI-BASIC programs (everything calc_OS generates) run on every OS.

## Development

```bash
npm install
npm run dev          # http://localhost:5173/calc_OS/
npm test             # vitest: protocol framing, file format, tokenizer, content consistency
npx tsx scripts/export-programs.ts   # writes build/programs/*.8xp and .txt
npx tsx scripts/export-nspire.ts     # writes build/nspire/*.py and *.tns
```

Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. To serve it from your own domain, follow `docs/custom-domain.md`.

## Status

- [x] TI-84 Plus CE: connect, info, list, install, delete, save
- [x] AP Physics 1, AP Precalculus, AP Statistics solvers; MathBot; five TI-BASIC games
- [x] TI-Nspire CX II: `.tns` generation (Luna-compatible), Python versions of the solvers, in-browser transfer (experimental)
- [ ] Hardware test on a real CE and a real CX II (protocols verified against tilibs / reference files and unit tests; awaiting plugged-in calculators)
- [x] Terms, privacy policy, favicon set, custom-domain support

## Licence

GPL-3.0-or-later. Third-party programs keep their own licences (see `public/library/third-party/*/README.md`).
Not affiliated with Texas Instruments.
