# Hardware test checklist

Everything in calc_OS was built without a calculator plugged in. The protocol code is verified
against the tilibs reference implementation and unit tests; the generated programs are verified
with independent decoders and by executing the Python versions. This is the list of things to try
the first time a real device is available, in order. Keep the connection log (bottom of the
My calculator / Nspire page) for anything that fails.

## TI-84 Plus CE

1. Chrome or Edge, calculator on the home screen, USB cable in. Home page → **Connect calculator**.
   Expected: the header shows the model and OS version; My calculator lists RAM/Archive and variables.
2. My calculator → **Refresh**. Expected: same list; no error.
3. Library → **2048** → **Install to calculator**. Expected: progress, then `G2048` appears in the list.
   On the calculator: `prgm` → `G2048` → `enter`. Play a few moves; `clear` quits.
4. Library → **AP Physics 1** → Install (54 KB, archived). Run it: `prgm` → `PHYSICS1`.
   Try Kinematics → v=v0+at → Solve → v with v0=2, a=3, t=4. Expected `v (m/s)=14`.
   Try a Notes page and Settings (change g).
5. Library → **MathBot** → Install. Run, choose *Ask me (type)*, type `SOLVE 3X-7=11`. Expected `X = 6`.
   Try `FACTOR 360`, `SQRT 72`, `MEAN 4,8,15`, `2+3*4`.
6. My calculator → **Save** on `G2048`. Expected: a `.8xp` download that re-imports via the drop zone.
7. My calculator → **Delete** `G2048`. Expected: it disappears from the list and from the calculator.
8. Drop a `.zip` from ticalc.org onto the install box. Expected: the contained files are listed and install.
9. If the OS is 5.8.4 or lower: Unlock guide → arTIfiCE → CE C libraries → Cesium → Oiram.
10. Game Boy page → drop a .gb ROM of a cartridge you own → **Install TI-Boy CE and game**.
    Expected: TIBOYCE, TIBoyDat, TIBoySkn plus `<NAME>`, `<NAME>R00`... appear in the archive.
    On the calculator: `prgm` → `TIBOYCE` → the game shows in the list → `2nd` starts it.
    Compare with the official converter (calc84maniac.github.io/tiboyce/converter): the files must be identical.

Things that would indicate a protocol bug: a hang on connect (buffer negotiation), `ERR:`/garbage
after install (variable header attributes), the calculator showing a *Receive* prompt (mode set),
or a stalled transfer at a multiple of 64 bytes (the zero-length-packet workaround).

## TI-Nspire CX II

1. Nspire page → **Enable Nspire transfers** (once; the page reloads) → **Test the transfer engine**.
   Expected: "transfer engine loaded in N ms".
2. **Connect Nspire**. Expected: model, OS version, storage; the root folder listing.
3. Library → **AP Physics 1 (Nspire)** → **Send to Nspire**. Expected: `calc_OS/PHYSICS1.tns` appears.
   On the calculator: My Documents → calc_OS → PHYSICS1 → menu → Run. Type `1`, `1`, `1`, `1`, then
   `2`, `3`, `4`. Expected `v (m/s) = 14`.
4. Nspire page → Delete the document. Expected: it disappears.

If step 2 fails with a USB error immediately, the CX II protocol negotiation in web-libnspire is the
suspect (it is n-link's engine, unchanged). If step 3 sends but the document does not open, the
`.tns` writer is the suspect: compare with a document produced by Luna for the same script.
