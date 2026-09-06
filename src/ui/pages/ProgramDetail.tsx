import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findEntry, CATEGORY_LABELS } from '../../lib/library/catalog';
import { compatibility } from '../../lib/library/compat';
import { downloadable, entriesFor, generatedSource } from '../../lib/library/install';
import { useCalculator } from '../../state/calculator';
import { useNspire } from '../../state/nspire';
import { tnsFor } from '../../lib/library/install';
import { Badge, Button, Card, CompatBadge, ErrorBox } from '../components/ui';
import { SourceView } from '../components/SourceView';
import { subjects } from '../../lib/programs';
import { CalcScreen } from '../components/CalcScreen';
import { previewPython, previewTiBasic } from '../../lib/tibasic/preview';

export function ProgramDetail() {
  const { id } = useParams();
  const entry = id ? findEntry(id) : undefined;
  const { status, info, variables, install, progress, error, clearError, connect } = useCalculator();
  const nspire = useNspire();
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [size, setSize] = useState<number | null>(null);

  const source = useMemo(() => (entry ? generatedSource(entry) : null), [entry]);
  const preview = useMemo(() => {
    if (!entry || !source) return null;
    return entry.calculator === 'nspire' ? previewPython(source) : previewTiBasic(source);
  }, [entry, source]);
  const subject = entry?.source.type === 'generated' ? subjects.find((s) => s.program === (entry.source as { subject: string }).subject) : undefined;

  useEffect(() => {
    setDone(false);
    if (!entry) return;
    if (entry.source.type === 'external') { setSize(null); return; }
    if (entry.calculator === 'nspire') { try { setSize(tnsFor(entry).bytes.length); } catch { setSize(null); } return; }
    entriesFor(entry).then((es) => setSize(es.reduce((n, e) => n + e.data.length, 0))).catch(() => setSize(null));
  }, [entry]);

  if (!entry) return <p>Unknown program. <Link className="underline" to="/library">Back to the library</Link>.</p>;

  const compat = compatibility(entry, info, variables);
  const connected = status === 'connected' || status === 'busy';
  const installedAlready = entry.installs?.some((n) => variables?.some((v) => v.name === n)) ?? false;

  async function doInstall() {
    setLocalError(null);
    setDone(false);
    try {
      const entries = await entriesFor(entry!);
      const clash = entries.filter((e) => variables?.some((v) => v.name === e.name && v.type === e.type));
      if (clash.length && !window.confirm(`${clash.map((c) => c.name).join(', ')} already exists on the calculator. Replace it?`)) return;
      await install(entries, { replace: true });
      setDone(true);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }

  async function doInstallNspire() {
    setLocalError(null);
    setDone(false);
    try {
      const t = tnsFor(entry!);
      await nspire.upload(t.filename, t.bytes, '/calc_OS');
      setDone(true);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }

  async function doDownload() {
    setLocalError(null);
    try {
      const d = await downloadable(entry!);
      if (!d) { setLocalError('This program has no direct download here; use the author link.'); return; }
      const blob = new Blob([d.bytes as BlobPart], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = d.filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/library" className="text-sm text-slate-400 hover:text-white">← Library</Link>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold mr-2">{entry.name}</h1>
              <Badge>{entry.calculator === 'ce' ? 'TI-84 Plus CE' : 'TI-Nspire CX II'}</Badge>
              <Badge>{CATEGORY_LABELS[entry.category]}</Badge>
              {entry.version && <Badge>{entry.version}</Badge>}
            </div>
            <p className="text-slate-300">{entry.description}</p>
          </div>
          {entry.features && (
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              {entry.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
          {subject && (
            <Card>
              <h2 className="font-semibold mb-3">What is inside</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {subject.topics.map((t) => (
                  <div key={t.id}>
                    <div className="font-medium text-emerald-300">{t.menu}</div>
                    <div className="text-slate-400">{t.equations.length ? t.equations.map((e) => e.display).join(' · ') : 'Reference notes'}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {source && (
            <div>
              <h2 className="font-semibold mb-2">{entry.calculator === 'nspire' ? 'Python source' : 'Program source'}</h2>
              <SourceView source={source} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {preview && <CalcScreen preview={preview} calculator={entry.calculator} caption="First screen, simulated from the program" />}
          <Card className="space-y-3">
            <CompatBadge compat={compat} />
            <ul className="text-sm text-slate-300 space-y-1">
              {compat.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
            {size !== null && <p className="text-xs text-slate-400">Size on calculator: {(size / 1024).toFixed(1)} KB</p>}
            {installedAlready && <p className="text-xs text-emerald-300">Already on your calculator.</p>}
            {entry.calculator === 'nspire' && entry.source.type !== 'external' ? (
              <div className="flex flex-col gap-2">
                {nspire.status === 'connected' || nspire.status === 'busy' ? (
                  <Button onClick={doInstallNspire} disabled={nspire.status === 'busy'}>
                    {nspire.status === 'busy' ? 'Sending…' : 'Send to Nspire (folder calc_OS)'}
                  </Button>
                ) : (
                  <Link to="/nspire"><Button className="w-full">Connect an Nspire to install</Button></Link>
                )}
                <Button variant="secondary" onClick={doDownload}>Download .tns</Button>
                {nspire.error && <ErrorBox message={nspire.error} onClose={nspire.clearError} />}
              </div>
            ) : entry.source.type !== 'external' ? (
              <div className="flex flex-col gap-2">
                {connected ? (
                  <Button onClick={doInstall} disabled={status === 'busy' || compat.level === 'blocked'}>
                    {status === 'busy' && progress ? `Sending ${progress.current}… ${Math.round((100 * progress.sent) / Math.max(1, progress.size))}%` : installedAlready ? 'Reinstall' : 'Install to calculator'}
                  </Button>
                ) : (
                  <Button onClick={connect} disabled={status === 'unsupported' || status === 'connecting'}>Connect to install</Button>
                )}
                <Button variant="secondary" onClick={doDownload}>Download file</Button>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <a className="block" href={entry.source.url} target="_blank" rel="noreferrer">
                  <Button className="w-full">Get it from the author ↗</Button>
                </a>
                <p className="text-slate-400">{entry.source.note}</p>
                <Link to="/calculator" className="text-emerald-300 underline">Then install it from file →</Link>
              </div>
            )}
            {done && entry.calculator === 'ce' && <p className="text-sm text-emerald-300">Installed. On the calculator press prgm, choose {entry.installs?.[0] ?? entry.name}, then enter.</p>}
            {done && entry.calculator === 'nspire' && <p className="text-sm text-emerald-300">Sent. On the Nspire open My Documents, folder calc_OS, then the document; press menu and choose Run.</p>}
            {(localError || error) && <ErrorBox message={localError ?? error!} onClose={() => { setLocalError(null); clearError(); }} />}
          </Card>
          <Card className="text-sm space-y-1">
            <div><span className="text-slate-400">Author:</span> {entry.author}</div>
            <div><span className="text-slate-400">License:</span> {entry.license}</div>
            {entry.homepage && <div><a className="text-emerald-300 underline" href={entry.homepage} target="_blank" rel="noreferrer">Project page ↗</a></div>}
            {entry.requires.length > 0 && <div><span className="text-slate-400">Requires:</span> {entry.requires.map((r) => ({ asm: 'assembly support', clibs: 'CE C libraries' })[r]).join(', ')}</div>}
            <div className="flex flex-wrap gap-1 pt-1">{entry.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
