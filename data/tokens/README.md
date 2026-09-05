# Token data

`8X.json` is the machine-generated build of the TI-BASIC token sheet maintained by
the TI-Toolkit project: https://github.com/TI-Toolkit/tokens (branch `built`).
It describes every TI-83/84 family token: byte value, on-calculator text,
accessible ASCII spelling, and the OS versions in which each spelling applies.

`scripts/build-tokens.mjs` reduces it to the subset valid on a TI-84 Plus CE
running OS 5.x and writes `src/lib/tibasic/tokens.json`, which the in-browser
tokenizer uses. Re-run `npm run build:tokens` after updating `8X.json`.
