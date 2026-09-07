import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findEntry, CATEGORY_LABELS } from '../../lib/library/catalog';
import { compatibility, formatBytes } from '../../lib/library/compat';
import { downloadable, entriesFor, generatedSource, tnsFor, type ImportedFile } from '../../lib/library/install';
import { Dropzone } from '../components/Dropzone';
import { Octicon } from '../components/Octicon';
import { typeName } from '../../lib/tifiles/types';
import { useCalculator } from '../../state/calculator';
import { useNspire } from '../../state/nspire';
import { Badge, Button, ButtonLink, Card, CompatBadge, ErrorBox, Notice, Progress, Spinner } from '../components/ui';
import { SourceView } from '../components/SourceView';
import { subjects } from '../../lib/programs';
import { CalcScreen } from '../components/CalcScreen';
import { previewPython, previewTiBasic } from '../../lib/tibasic/preview';
import { ExternalIcon } from '../components/Icon';

export function ProgramDetail() {
  const { id } = useParams();
  const entry = id ? findEntry(id) : undefined;
  const { status, info, variables, install, progress, error, clearError, connect } = useCalculator();
  const nspire = useNspire();
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [size, setSize] = useState<number | null>(null);
  const [pending, setPending] = useState<ImportedFile[]>([]);

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

  if (!entry) return <p>Unknown program. <Link className="link" to="/library">Back to the library</Link>.</p>;

  const compat = compatibility(entry, info, variables);
  const connected = status === 'connected' || status === 'busy';
  const installedNames = entry.installs?.filter((n) => variables?.some((v) => v.name === n)) ?? [];
  const installedAlready = installedNames.length > 0;
  const sending = status === 'busy' && progress !== null;

  async function doInstall() {
    setLocalError(null);
    setDone(false);
    try {
      const entries = await entriesFor(entry!);
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

  const pendingEntries = pending.flatMap((p) => p.entries);
  const pendingClashes = pendingEntries.filter((e) => variables?.some((v) => v.name === e.name && v.type === e.type)).map((e) => e.name);

  async function doInstallPending() {
    if (!pendingEntries.length) return;
    setLocalError(null);
    setDone(false);
    try {
      await install(pendingEntries, { replace: true });
      setPending([]);
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
      <Link to="/library" className="text-sm text-muted hover:text-ink transition-colors">Back to the library</Link>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-xl font-semibold mr-2">{entry.name}</h1>
              <Badge>{entry.calculator === 'ce' ? 'TI-84 Plus CE' : 'TI-Nspire CX II'}</Badge>
              <Badge>{CATEGORY_LABELS[entry.category]}</Badge>
              {entry.version && <Badge>{entry.version}</Badge>}
            </div>
            <p className="text-ink">{entry.description}</p>
          </div>
          {entry.features && (
            <ul className="list-disc list-inside text-ink space-y-1">
              {entry.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          )}
          {subject && (
            <Card>
              <h2 className="font-semibold mb-3">What is inside</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {subject.topics.map((t) => (
                  <div key={t.id}>
                    <div className="font-medium text-ink">{t.menu}</div>
                    <div className="text-muted">{t.equations.length ? t.equations.map((e) => e.display).join(', ') : 'Reference notes'}</div>
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

        <div className="space-y-4 lg:sticky lg:top-6 self-start min-w-0">
          {preview && <CalcScreen preview={preview} calculator={entry.calculator} caption="First screen, simulated from the program" />}
          <Card className="space-y-3">
            <CompatBadge compat={compat} />
            <ul className="text-sm text-ink space-y-1">
              {compat.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
            {size !== null && <p className="text-xs text-muted tabular-nums">Size on calculator: {formatBytes(size)}</p>}
            {installedAlready && <p className="text-xs text-green">Already on your calculator. Reinstalling replaces {installedNames.join(', ')}.</p>}
            {entry.calculator === 'nspire' && entry.source.type !== 'external' ? (
              <div className="flex flex-col gap-2">
                {nspire.status === 'connected' || nspire.status === 'busy' ? (
                  <>
                    <Button onClick={doInstallNspire} disabled={nspire.status === 'busy'}>
                      {nspire.status === 'busy' ? <><Spinner /> Sending</> : 'Send to Nspire (folder calc_OS)'}
                    </Button>
                    {nspire.status === 'busy' && nspire.progress && (
                      <Progress className="enter" value={nspire.progress.total - nspire.progress.remaining} max={nspire.progress.total} />
                    )}
                  </>
                ) : (
                  <ButtonLink to="/nspire" className="w-full">Connect an Nspire to install</ButtonLink>
                )}
                <Button variant="secondary" onClick={doDownload}>Download .tns</Button>
                {nspire.error && <ErrorBox message={nspire.error} onClose={nspire.clearError} />}
              </div>
            ) : entry.source.type !== 'external' ? (
              <div className="flex flex-col gap-2">
                {connected ? (
                  <>
                    <Button onClick={doInstall} disabled={status === 'busy' || compat.level === 'blocked'}>
                      {sending ? <><Spinner /> Sending {progress!.current}</> : installedAlready ? 'Reinstall' : 'Install to calculator'}
                    </Button>
                    {sending && (
                      <div className="enter space-y-1">
                        <Progress value={progress!.sent} max={progress!.size} />
                        <p className="text-xs text-muted tabular-nums">{Math.round((100 * progress!.sent) / Math.max(1, progress!.size))}% of {formatBytes(progress!.size)}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <Button onClick={connect} disabled={status === 'unsupported' || status === 'connecting'}>
                    {status === 'connecting' ? <><Spinner /> Connecting</> : 'Connect to install'}
                  </Button>
                )}
                <Button variant="secondary" onClick={doDownload}>Download file</Button>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <a className="btn btn-primary w-full" href={entry.source.url} target="_blank" rel="noreferrer">
                  <Octicon name="Download" /> Get it from the author <ExternalIcon />
                </a>
                <p className="text-muted">{entry.source.note} calc_OS cannot host this file because its author has not granted redistribution rights.</p>
                <Dropzone
                  disabled={!connected}
                  onFiles={(f) => { setDone(false); setPending((p) => [...p, ...f]); }}
                  label={connected ? 'Drop the downloaded file here' : 'Connect the calculator, then drop the downloaded file here'}
                  hint="The .zip as downloaded, or its .8xp and .8xv files. It installs straight to the archive."
                />
                {pending.length > 0 && (
                  <div className="enter space-y-2">
                    <ul className="space-y-1">
                      {pending.map((p, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-mono text-xs shrink-0">{p.filename}</span>
                          {p.error ? <span className="text-red text-xs">{p.error}</span> : <span className="text-muted text-xs">{p.entries.map((e) => `${e.name} (${typeName(e.type)})`).join(', ')}</span>}
                          <button type="button" className="ml-auto text-muted hover:text-ink" aria-label={`Remove ${p.filename}`} onClick={() => setPending((ps) => ps.filter((_, j) => j !== i))}><Octicon name="X" /></button>
                        </li>
                      ))}
                    </ul>
                    {pendingClashes.length > 0 && <p className="text-xs text-orange">{pendingClashes.join(', ')} already {pendingClashes.length === 1 ? 'exists' : 'exist'} on the calculator and will be replaced.</p>}
                    <Button className="w-full" onClick={doInstallPending} disabled={!connected || status === 'busy' || pendingEntries.length === 0 || compat.level === 'blocked'}>
                      {sending ? <><Spinner /> Sending {progress!.current}</> : `Install ${pendingEntries.length} variable${pendingEntries.length === 1 ? '' : 's'}`}
                    </Button>
                    {sending && <Progress value={progress!.sent} max={progress!.size} />}
                  </div>
                )}
                {!connected && <p className="text-xs text-muted">Or drop the file on the <Link to="/calculator" className="link">My calculator</Link> page later.</p>}
              </div>
            )}
            {done && entry.calculator === 'ce' && <Notice>Installed. On the calculator press prgm, choose {entry.installs?.[0] ?? entry.name}, then enter.</Notice>}
            {done && entry.calculator === 'nspire' && <Notice>Sent. On the Nspire open My Documents, folder calc_OS, then the document; press menu and choose Run.</Notice>}
            {(localError || error) && <ErrorBox message={localError ?? error!} onClose={() => { setLocalError(null); clearError(); }} />}
          </Card>
          <Card className="text-sm space-y-1">
            <div><span className="text-muted">Author:</span> {entry.author}</div>
            <div><span className="text-muted">License:</span> {entry.license}</div>
            {entry.homepage && <div><a className="link inline-flex items-center gap-1" href={entry.homepage} target="_blank" rel="noreferrer">Project page <ExternalIcon /></a></div>}
            {entry.requires.length > 0 && <div><span className="text-muted">Requires:</span> {entry.requires.map((r) => ({ asm: 'assembly support', clibs: 'CE C libraries' })[r]).join(', ')}</div>}
            <div className="flex flex-wrap gap-1 pt-1">{entry.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
