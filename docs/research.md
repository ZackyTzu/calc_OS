# Research notes: browser-to-TI-calculator program hub (2026-09-06)

## 1. Browser <-> calculator transport
- WebUSB only: Chromium browsers (Chrome/Edge/Brave/Opera). No Safari, no Firefox, no iOS. Needs HTTPS or localhost.
- macOS: works out of the box. Windows: TI Connect CE driver may claim the CE; Zadig/WinUSB swap sometimes needed. CX II on Windows needs no extra driver (n-link docs).

### Existing implementations
| Project | Calcs | Ops | Tech | License |
|---|---|---|---|---|
| WebTILP (adriweb) https://web.tilp.info, src https://github.com/adriweb/tilibs/tree/exp2-full-emscripten (`webtilp/`, `build_wasm.sh`) | TI-84+CE (DUSB), Nspire incl. CX II via native NNSE, 89T, HP Prime, NumWorks | dirlist, send, receive, delete, rename, screenshot, clock, remote keys | tilibs C/C++ -> WASM (Emscripten) + WebUSB | GPL-2+ (tilibs) |
| webcalclink (adriweb) https://github.com/adriweb/webcalclink | D-USB/CARS calcs (TI-84+CE) | browse contents (PoC) | TypeScript | GPL-2.0 |
| ticalc-usb / ticalc.link (Timendus) | TI-84 Plus family (CE works in practice) | send only, free mem, press key. No list/delete. | JS | GPL-3 |
| n-link (lights0123) https://n-link.lights0123.com | Nspire CX II (+CX w/ drivers) | browse, rename, upload, download, OS upload | Rust -> WASM + TS | GPL-3 |

### DUSB protocol (TI-84 Plus CE): notes for a from-scratch TS implementation
Source: brandonw.net/calcstuff/DirectUSB.txt + tilibs dusb_cmd.h
- Raw packet: 4-byte BE length + 1-byte type + data. Types: 1 buf size req, 2 buf size alloc, 3 virt data (cont), 4 virt data (final), 5 ack (0xE000).
- Virtual packet: 4-byte BE length + 2-byte type + data.
- Handshake: raw type1 (max buf) -> raw type2 -> virt 0x0001 mode set (DUSB_MODE_NORMAL {3,1,0,0,0x07d0}) -> 0x0012 ack.
- Commands: 0x0007 param request (PID 0x000E free RAM, 0x0011 free flash) / 0x0008 param data; 0x0009 dirlist request -> stream of 0x000A var headers -> 0xDD00 EOT; 0x000B RTS -> 0xAA00 -> 0x000D var contents -> 0xAA00 -> 0xDD00; 0x000C var request (receive); 0x0010 delete var -> 0xAA00; 0xEE00 error.

## 2. TI-84 Plus CE program ecosystem
- File types: .8xp (program; type 0x05, protected 0x06), .8xv (appvar), .8xg (group). Header "**TI83F*".
- ASM/C programs need: (a) OS <= 5.4, or (b) arTIfiCE jailbreak. Timeline: 5.5 (2020) removed ASM; arTIfiCE v1 5.3 to 5.8.2; TI 5.8.3 (May 2025) patched; arTIfiCE v2 (Aug 2025) works 5.3 to 5.8.4; **TI OS 5.8.5 (Apr 17 2026) blocks arTIfiCE v2, no v3 exists, cannot downgrade without a pre-installed ASM shell.** Sources: cemetech.net t=21109, yvantt.github.io/arTIfiCE.
- arTIfiCE v2.1: send arTIfiCE_v2.1.8xp, run via prgm menu (choose TI-Basic if asked), press MODE to exit. Does not survive RAM reset. Disables exam mode. No formal license.
- C games also need CE C libraries: clibs.8xg (v15.0, BSD-2, github.com/CE-Programming/libraries). graphx, fileioc, keypadc, fontlibc, libload, usbdrvce...
- TI-BASIC programs run on every OS, no jailbreak. Python programs only on Python edition.
- Tokenizer data: TI-Toolkit/tokens (8X.xml; JSON in `built` branch), tivars_lib_py (PyPI `tivars`, robust tokenizer, good for cross-checking our output), tivars_lib_cpp (MIT).
- Emulator for automated testing: CE-Programming/CEmu (needs ROM dump from user's calc).
- TI-BASIC constraints: Menu( max 9 items; homescreen 26 cols x 10 rows; solve(expr,var,guess) available in programs; Input/Prompt/Disp/Output/ClrHome.

### Popular CE games (Cemetech asm archive, downloads)
Pac-Man (Mateo, 440k), FlappyBird (Rico/Ricovl, 261k, no license file), Oiram (Mateo, 144k, BSD-3: Oiram.8xp + OiramS/OiramT/OiramPK .8xv, needs clibs), 2048 (Rico), Tetric A (Kerm, source not public), Geometry Dash CE (Epharius), Portal Returns CE (Mateo), Donkey Kong CE, ChessCE (Mateo), Calcuzap, Minesweeper (merthsoft), SnakeCE, Dino Run CE, SolitiCE, CheckersCE, CEleste.
TI-BASIC (work everywhere): Snake (merthsoft 45k), Basic Tetris (tifreak8x), Pokemon Text Version, Connect 4, Battleship, CSE Minesweeper, Pong, Tic-Tac-Toe, Cookie Clicker, First Fantasy RPG, Scarth.
Licensing: most archive uploads have no license (all rights reserved by default) -> host only permissive/own content; link out or "install from your own file" for the rest.

### Existing academic programs (for UX reference)
- jessicarod7/TI84-colour-physics-bible (TI-BASIC kinematics solver, GitHub)
- mcstutoring.com commercial AP Physics 1 solver bundles (FYSOLV1, EMBASIC): variable solving, unit conversions, step-by-step.
- Cemetech 83plus/basic/science archive.

## 3. TI-Nspire CX II
- Protocol: CX II uses new native protocol (NNSE), implemented in WebTILP and n-link (libnspire). Older tilibs NSP/NavNet works only after switching USB config.
- File format: .tns. Generate with Luna (github.com/ndless-nspire/Luna; MPL-1.1; Lua/Python/XML -> .tns; zlib only; has `emscripten/` folder -> WASM port viable). Lua needs OS 3.0.2+, Python needs CX II OS 5.2+.
- Ndless (native code) supports CX II OS 5.2.0.771, 5.3.0.564, 6.2.0.333, 6.4.0.74. Not needed for Lua/Python.
- Lua games (no Ndless) on ticalc.org/pub/nspire/lua/games: Flappy Bird, Pac-Man, ColorTetris/TI-Tris, 2048, Texas Hold'em Poker, Blackjack, Chess, Checkers, Minecraft 2D, Snake variants, Minesweeper, Bloxorz, Block Dude, Freecell, Cookie Clicker, SimCity. No Mario-style Lua title found.
- Known n-link issue: CX II CAS "stuck on loading" (#12).

## 4. "Offline intelligent chatbot" reality
- CE: 48 MHz eZ80, ~150 KB user RAM, ~3 MB archive. No language model fits. Prior art: CHELSEA (ELIZA, TI-BASIC), Suzan-84, calcgpt (needs internet bridge), z80.me digit classifier.
- Feasible: rule/keyword + retrieval study assistant (formula lookup, definitions, how-to steps), TI-BASIC (all OS) or C (jailbreak-gated).
- CX II: 64 MB RAM, Python/Lua -> much richer retrieval assistant (TF-IDF/keyword over a few thousand Q&A), still not an LLM.

## 5. Site architecture options
- Phase 1 needs no backend: static SPA (Vite + React + TS), library manifest JSON + bundled files, in-browser tokenizer -> .8xp -> WebUSB. Host on GitHub Pages / Cloudflare Pages / Netlify (HTTPS by default).
- Backend later only for accounts/uploads/ratings.
- License decision drives transport choice: GPL-3 project -> can reuse WebTILP/webcalclink/n-link. Permissive -> write DUSB in TS from docs (feasible), Nspire NNSE from scratch (hard).
