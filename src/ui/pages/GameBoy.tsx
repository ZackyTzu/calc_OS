import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { unzipSync, zipSync } from 'fflate';
import { useCalculator } from '../../state/calculator';
import { findEntry } from '../../lib/library/catalog';
import { compatibility, formatBytes } from '../../lib/library/compat';
import { entriesFor } from '../../lib/library/install';
import { compareVersion } from '../../lib/dusb/calculator';
import { convertRom, parseGbHeader, planRom, suggestPrefix, validatePrefix, type RomPlan } from '../../lib/tiboy/romgen';
import { Button, Card, CompatBadge, ErrorBox, Notice, Progress, Spinner } from '../components/ui';
import { Dropzone } from '../components/Dropzone';

const TIBOY_NAMES = ['TIBOYCE', 'TIBoyDat', 'TIBoySkn'];

interface LoadedRom { filename: string; bytes: Uint8Array; plan: RomPlan | null; planError: string | null }

function pickRom(filename: string, bytes: Uint8Array): { filename: string; bytes: Uint8Array } | null {
  if (/\.zip$/i.test(filename)) {
    const files = unzipSync(bytes);
    for (const [name, data] of Object.entries(files)) {
      if (/\.gbc?$/i.test(name) && !name.startsWith('__MACOSX')) return { filename: name.split('/').pop()!, bytes: data };
    }
    return null;
  }
  return { filename, bytes };
}

export function GameBoy() {
  const emulator = findEntry('tiboyce')!;
  const { status, info, variables, install, progress, error, clearError, connect } = useCalculator();
  const [rom, setRom] = useState<LoadedRom | null>(null);
  const [prefix, setPrefix] = useState('');
  const [title, setTitle] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const connected = status === 'connected' || status === 'busy';
  const sending = status === 'busy' && progress !== null;
  const compat = compatibility(emulator, info, variables);
  const header = useMemo(() => (rom ? parseGbHeader(rom.bytes) : null), [rom]);
  const prefixError = validatePrefix(prefix);
  const converted = useMemo(() => {
    if (!rom || !rom.plan || prefixError) return null;
    try {
      return convertRom(rom.bytes, prefix, title, rom.plan);
    } catch {
      return null;
    }
  }, [rom, prefix, title, prefixError]);

  const emulatorInstalled = TIBOY_NAMES.slice(0, 2).every((n) => variables?.some((v) => v.name === n));
  const gameBytes = converted ? converted.entries.reduce((n, e) => n + e.data.length, 0) : 0;
  const emulatorBytes = 444 + 44106 + 7079;
  const totalBytes = gameBytes + (emulatorInstalled ? 0 : emulatorBytes);
  const notEnoughSpace = connected && info ? info.flashFree > 0 && totalBytes > info.flashFree : false;
  const sameNameOnCalc = converted ? converted.entries.filter((e) => variables?.some((v) => v.name === e.name)).map((e) => e.name) : [];

  const warnings: string[] = [];
  if (rom && header) {
    const size = rom.bytes.length;
    if (size < 0x8000 || (size & (size - 1)) !== 0) warnings.push(`The file is ${formatBytes(size)}. Cartridge dumps are powers of two from 32 KB up, so this is probably not a complete ROM.`);
    if (!header.headerChecksumOk) warnings.push('The cartridge header checksum does not match. The file may be corrupted or not a Game Boy ROM.');
    if (header.declaredRomSize && header.declaredRomSize !== size) warnings.push(`The header declares ${formatBytes(header.declaredRomSize)} but the file is ${formatBytes(size)}.`);
  }

  async function loadFiles(files: File[]) {
    setLocalError(null);
    setDone(null);
    const f = files[0];
    if (!f) return;
    try {
      const picked = pickRom(f.name, new Uint8Array(await f.arrayBuffer()));
      if (!picked) { setLocalError('No .gb or .gbc file found inside that zip.'); return; }
      const h = parseGbHeader(picked.bytes);
      if (!h) { setLocalError('That file is too small to be a Game Boy ROM.'); return; }
      let plan: RomPlan | null = null;
      let planError: string | null = null;
      try { plan = planRom(picked.bytes); } catch (e) { planError = (e as Error).message; }
      setRom({ filename: picked.filename, bytes: picked.bytes, plan, planError });
      setPrefix(suggestPrefix(h.title));
      setTitle(h.title);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }

  async function emulatorFiles(): Promise<{ filename: string; bytes: Uint8Array }[]> {
    if (emulator.source.type !== 'hosted') return [];
    const out = [];
    for (const path of emulator.source.files) {
      const res = await fetch(import.meta.env.BASE_URL + path);
      if (!res.ok) throw new Error(`Could not download ${path} (${res.status})`);
      out.push({ filename: path.split('/').pop()!, bytes: new Uint8Array(await res.arrayBuffer()) });
    }
    return out;
  }

  async function doInstall() {
    if (!converted || !info) return;
    setLocalError(null);
    setDone(null);
    try {
      const oldOs = compareVersion(info.osMajorMinor, '5.3') < 0;
      const emu = emulatorInstalled ? [] : (await entriesFor(emulator)).map((e) => (e.name === 'TIBOYCE' && oldOs ? { ...e, archived: false } : e));
      await install([...emu, ...converted.entries], { replace: true });
      setDone(oldOs ? `Installed. Run it with Asm(prgmTIBOYCE) from the catalog, then pick ${converted.title}.` : `Installed. On the calculator press prgm, choose TIBOYCE, press enter, then pick ${converted.title} with the arrow keys and press 2nd.`);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }

  async function doDownload() {
    if (!converted) return;
    setLocalError(null);
    try {
      const files = [...(await emulatorFiles()), ...converted.files];
      const zip = zipSync(Object.fromEntries(files.map((f) => [f.filename, f.bytes])), { level: 6 });
      const blob = new Blob([zip as BlobPart], { type: 'application/zip' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${prefix}-tiboyce.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-4xl font-semibold">Game Boy games on the TI-84 Plus CE</h1>
        <p className="text-ink">
          TI-Boy CE is a Game Boy and Game Boy Color emulator for the calculator. Convert a ROM file of a cartridge you own here, install it together with the emulator, and play Pokemon, Zelda, Mario Land, Tetris, Mortal Kombat and the rest of the Game Boy library at full speed. The conversion runs in your browser; the ROM never leaves your computer.
        </p>
      </div>

      {error && <ErrorBox message={error} onClose={clearError} />}
      {localError && <ErrorBox message={localError} onClose={() => setLocalError(null)} />}

      <Card className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="font-semibold">Will it run on my calculator?</h2>
          <CompatBadge compat={compat} />
        </div>
        <ul className="text-sm text-ink space-y-1">
          {compat.details.map((d) => <li key={d}>{d}</li>)}
        </ul>
        <p className="text-sm text-muted">
          TI-Boy CE is an assembly program, so the OS rules on the <Link className="link" to="/unlock">Unlock games</Link> page apply. Find your OS version on the calculator with <b>2nd</b>, <b>+</b>, <b>About</b>.
        </p>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Choose a ROM file</h2>
        <Dropzone
          onRawFiles={loadFiles}
          multiple={false}
          accept=".gb,.gbc,.zip"
          label="Drop a Game Boy ROM here, or click to choose"
          hint=".gb or .gbc, or a .zip containing one. Use a dump of a cartridge you own."
        />
        {rom && header && (
          <Card className="enter text-sm space-y-2">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="text-muted">File:</span> <span className="font-mono">{rom.filename}</span></div>
              <div><span className="text-muted">Size:</span> <span className="tabular-nums">{formatBytes(rom.bytes.length)}</span></div>
              <div><span className="text-muted">Header title:</span> {header.title || '(none)'}</div>
              <div><span className="text-muted">System:</span> {header.cgbOnly ? 'Game Boy Color only' : header.cgb ? 'Game Boy Color (also runs on Game Boy)' : 'Game Boy'}</div>
              <div><span className="text-muted">Cartridge:</span> {header.cartridgeTypeName}</div>
              <div><span className="text-muted">Save RAM:</span> {header.ramSize ? formatBytes(header.ramSize) : 'none'}</div>
            </div>
            {warnings.map((w) => <p key={w} className="text-orange">{w}</p>)}
            {rom.planError && <p className="text-red">{rom.planError}</p>}
          </Card>
        )}
      </section>

      {rom && rom.plan && (
        <section className="enter space-y-3">
          <h2 className="text-lg font-semibold">2. Name it</h2>
          <Card className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm space-y-1">
                <span className="text-ink">Name on the calculator (up to 5 characters)</span>
                <input className="input w-full font-mono" value={prefix} maxLength={5} onChange={(e) => setPrefix(e.target.value)} aria-invalid={!!prefixError} />
                <span className={`block text-xs ${prefixError ? 'text-red' : 'text-faint'}`}>{prefixError ?? `Creates ${converted ? converted.entries.length : 'the'} AppVars named ${prefix}, ${prefix}R00, ...`}</span>
              </label>
              <label className="block text-sm space-y-1">
                <span className="text-ink">Title shown in the emulator's list</span>
                <input className="input w-full" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />
                <span className="block text-xs text-faint">Letters, digits and punctuation. Anything else becomes ?.</span>
              </label>
            </div>
          </Card>
        </section>
      )}

      {converted && (
        <section className="enter space-y-3">
          <h2 className="text-lg font-semibold">3. Install</h2>
          <Card className="space-y-3 text-sm">
            <ul className="space-y-1 text-ink">
              <li className="tabular-nums">{converted.entries.length} AppVars for the game, {formatBytes(gameBytes)} in the archive.</li>
              <li>{emulatorInstalled ? 'TI-Boy CE is already on the calculator.' : `TI-Boy CE itself (${formatBytes(emulatorBytes)}) is ${connected ? 'not on the calculator yet and will be installed too' : 'included'}.`}</li>
              {connected && info && info.flashFree > 0 && <li className="tabular-nums">Archive free: {formatBytes(info.flashFree)}.</li>}
            </ul>
            {sameNameOnCalc.length > 0 && <p className="text-orange">{sameNameOnCalc.join(', ')} already {sameNameOnCalc.length === 1 ? 'exists' : 'exist'} on the calculator and will be replaced.</p>}
            {notEnoughSpace && <p className="text-red">Not enough archive space. Delete something on the My calculator page first.</p>}
            <div className="flex gap-2 flex-wrap items-center">
              {connected ? (
                <Button onClick={doInstall} disabled={status === 'busy' || compat.level === 'blocked' || notEnoughSpace}>
                  {sending ? <><Spinner /> Sending {progress!.current}</> : emulatorInstalled ? 'Install game' : 'Install TI-Boy CE and game'}
                </Button>
              ) : (
                <Button onClick={connect} disabled={status === 'unsupported' || status === 'connecting'}>
                  {status === 'connecting' ? <><Spinner /> Connecting</> : 'Connect calculator to install'}
                </Button>
              )}
              <Button variant="secondary" onClick={doDownload}>Download everything as .zip</Button>
            </div>
            {sending && (
              <div className="enter space-y-1">
                <Progress value={progress!.sent} max={progress!.size} />
                <p className="text-xs text-muted tabular-nums">{progress!.index + 1} of {progress!.total} files, {Math.round((100 * progress!.sent) / Math.max(1, progress!.size))}% of the current one</p>
              </div>
            )}
            {done && <Notice>{done}</Notice>}
            <p className="text-xs text-faint">The zip holds the same files for TI Connect CE: send all of them to the archive.</p>
          </Card>
        </section>
      )}

      <Card className="text-sm text-ink space-y-2">
        <h2 className="font-semibold text-ink">Controls in the emulator</h2>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
          <div>D-pad: arrow keys</div>
          <div>A: <b>2nd</b>, B: <b>alpha</b></div>
          <div>Start: <b>mode</b>, Select: <b>X,T,θ,n</b></div>
          <div>Menu: <b>clear</b>, turbo: <b>zoom</b></div>
          <div>Save state: <b>sto</b>, load state: <b>ln</b></div>
          <div>Quit at once: <b>on</b></div>
        </div>
        <p className="text-muted">Choose a game in the ROM list with the arrow keys and start it with <b>2nd</b> or <b>enter</b>. Save files (battery saves) are kept in an AppVar named after the game plus SAV. Sound and link cable are not emulated.</p>
      </Card>

      <Card className="text-sm text-ink space-y-2">
        <h2 className="font-semibold text-ink">About ROM files</h2>
        <p>A ROM is a copy of a cartridge. Make your own from cartridges you own; calc_OS does not provide ROMs and does not link to sites that do. The conversion is a port of TI-Boy CE's own romgen tool and produces identical files, so a game converted here also works with the official converter's output and vice versa.</p>
        <p>TI-Boy CE is by calc84maniac and is free software under the GPL-3.0: <a className="link" href="https://github.com/calc84maniac/tiboyce" target="_blank" rel="noreferrer">github.com/calc84maniac/tiboyce</a>. Its page in the library: <Link className="link" to="/library/tiboyce">TI-Boy CE</Link>.</p>
      </Card>
    </div>
  );
}
