import { useMemo, useState } from 'react';
import { useCalculator } from '../../state/calculator';
import { Button, Card, ErrorBox, Section, Badge, ConfirmButton, Notice, Progress, Spinner } from '../components/ui';
import { Dropzone } from '../components/Dropzone';
import type { ImportedFile } from '../../lib/library/install';
import { typeName, isProgram, typeExtension } from '../../lib/tifiles/types';
import type { CalcVariable } from '../../lib/dusb/calculator';
import { formatBytes } from '../../lib/library/compat';
import { buildFile } from '../../lib/tifiles/tifile';
import { CloseIcon } from '../components/Icon';

export function Calculator() {
  const { status, info, variables, error, clearError, connect, refresh, remove, install, download, progress, log } = useCalculator();
  const [pending, setPending] = useState<ImportedFile[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'programs' | 'appvars' | 'other'>('all');
  const [message, setMessage] = useState<string | null>(null);

  const connected = status === 'connected' || status === 'busy';
  const sending = status === 'busy' && progress !== null;
  const sorted = useMemo(() => {
    const vs = [...(variables ?? [])];
    vs.sort((a, b) => a.type - b.type || a.name.localeCompare(b.name));
    return vs.filter((v) => {
      if (filter === 'programs') return isProgram(v.type);
      if (filter === 'appvars') return v.type === 0x15;
      if (filter === 'other') return !isProgram(v.type) && v.type !== 0x15;
      return true;
    });
  }, [variables, filter]);

  const pendingEntries = pending.flatMap((p) => p.entries);
  const clashes = pendingEntries.filter((e) => variables?.some((v) => v.name === e.name && v.type === e.type)).map((e) => e.name);

  async function installPending() {
    if (!pendingEntries.length) return;
    try {
      await install(pendingEntries, { replace: true });
      setMessage(`Installed ${pendingEntries.map((e) => e.name).join(', ')}.`);
      setPending([]);
    } catch { /* error shown by provider */ }
  }

  async function saveVariable(v: CalcVariable) {
    try {
      const e = await download(v);
      const blob = new Blob([buildFile([e], `${e.name} from calc_OS`) as BlobPart], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${e.name}.${typeExtension(e.type)}`;
      a.click();
    } catch { /* shown by provider */ }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">My calculator</h1>
        {connected && <Button variant="secondary" onClick={refresh} disabled={status === 'busy'}>Refresh</Button>}
      </div>
      {error && <ErrorBox message={error} onClose={clearError} />}

      {!connected && (
        <Card className="space-y-3">
          {status === 'unsupported' ? (
            <p>This browser cannot use WebUSB. Open this page in Chrome, Edge or Brave on Windows, macOS, Linux or ChromeOS.</p>
          ) : (
            <>
              <p className="text-slate-300">Plug the calculator in with its USB cable, turn it on, stay on the home screen, then connect.</p>
              <Button onClick={connect} disabled={status === 'connecting'}>
                {status === 'connecting' ? <><Spinner /> Connecting</> : 'Connect calculator'}
              </Button>
              <details className="text-sm text-slate-400">
                <summary className="cursor-pointer rounded-md">Nothing shows up in the device list?</summary>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Close TI Connect CE: only one program can use the calculator at a time.</li>
                  <li>Try another cable or port; charging-only cables do not carry data.</li>
                  <li>On Windows, if the calculator appears but the connection fails, the TI driver may need to be swapped for WinUSB with Zadig (see About).</li>
                  <li>Linux needs a udev rule allowing access to USB vendor 0451.</li>
                </ul>
              </details>
            </>
          )}
        </Card>
      )}

      {connected && info && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><div className="text-xs text-slate-400">Model</div><div className="font-semibold">{info.model}</div><div className="text-xs text-slate-500">HW {info.hwVersion}{info.pythonOnBoard ? ', Python' : ''}</div></Card>
          <Card><div className="text-xs text-slate-400">Operating system</div><div className="font-semibold tabular-nums">{info.osVersion}</div><div className="text-xs text-slate-500 tabular-nums">boot {info.bootVersion}</div></Card>
          <Card>
            <div className="text-xs text-slate-400">RAM free</div>
            <div className="font-semibold tabular-nums">{info.ramFree ? formatBytes(info.ramFree) : 'n/a on home screen'}</div>
            {info.ramTotal > 0 && <Progress className="mt-2" value={info.ramFree} max={info.ramTotal} />}
          </Card>
          <Card>
            <div className="text-xs text-slate-400">Archive free</div>
            <div className="font-semibold tabular-nums">{formatBytes(info.flashFree)}</div>
            {info.flashTotal > 0 && <Progress className="mt-2" value={info.flashFree} max={info.flashTotal} />}
          </Card>
          <Card className="sm:col-span-2 lg:col-span-4 text-sm">
            <span className="text-slate-400">Assembly programs: </span>
            {info.asmNative && <Badge tone="green">run natively on this OS</Badge>}
            {info.asmWithJailbreak && <Badge tone="amber">need the arTIfiCE jailbreak on OS {info.osMajorMinor}</Badge>}
            {info.asmBlocked && <Badge tone="red">not possible on OS {info.osMajorMinor} (TI patched all known jailbreaks)</Badge>}
            <span className="text-slate-400 ml-2">TI-BASIC programs always work.</span>
          </Card>
        </div>
      )}

      <Section title="Install from file">
        <Dropzone disabled={!connected} onFiles={(f) => { setMessage(null); setPending((p) => [...p, ...f]); }} />
        {pending.length > 0 && (
          <Card className="enter space-y-3">
            <ul className="text-sm space-y-1">
              {pending.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="font-mono">{p.filename}</span>
                  {p.error && <span className="text-rose-300">{p.error}</span>}
                  {!p.error && <span className="text-slate-400">contains {p.entries.map((e) => `${e.name} (${typeName(e.type)}, ${formatBytes(e.data.length)}${e.archived ? ', archive' : ''})`).join(', ')}</span>}
                  <button type="button" className="ml-auto text-slate-500 hover:text-white transition-colors" aria-label={`Remove ${p.filename}`} onClick={() => setPending((ps) => ps.filter((_, j) => j !== i))}><CloseIcon /></button>
                </li>
              ))}
            </ul>
            {clashes.length > 0 && (
              <p className="text-xs text-amber-200">{clashes.join(', ')} already {clashes.length === 1 ? 'exists' : 'exist'} on the calculator and will be replaced.</p>
            )}
            <div className="flex gap-2 items-center flex-wrap">
              <Button onClick={installPending} disabled={!connected || status === 'busy' || pendingEntries.length === 0}>
                {sending ? <><Spinner /> Sending {progress!.current}</> : `Install ${pendingEntries.length} variable${pendingEntries.length === 1 ? '' : 's'}`}
              </Button>
              <Button variant="ghost" onClick={() => setPending([])} disabled={status === 'busy'}>Clear</Button>
            </div>
            {sending && (
              <div className="enter space-y-1">
                <Progress value={progress!.sent} max={progress!.size} />
                <p className="text-xs text-slate-400 tabular-nums">{Math.round((100 * progress!.sent) / Math.max(1, progress!.size))}% of {formatBytes(progress!.size)}</p>
              </div>
            )}
          </Card>
        )}
        {message && <Notice>{message}</Notice>}
      </Section>

      <Section
        title={`On the calculator${variables ? ` (${variables.length})` : ''}`}
        right={
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Show" className="input h-8">
            <option value="all">All variables</option>
            <option value="programs">Programs</option>
            <option value="appvars">AppVars</option>
            <option value="other">Other</option>
          </select>
        }
      >
        {!connected && <p className="text-slate-400 text-sm">Connect to see the programs and variables on the calculator.</p>}
        {connected && variables && (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-left">
                <tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 font-medium">Type</th><th className="px-3 py-2 text-right font-medium">Size</th><th className="px-3 py-2 font-medium">Where</th><th className="px-3 py-2"></th></tr>
              </thead>
              <tbody>
                {sorted.map((v) => (
                  <tr key={`${v.type}-${v.name}`} className="border-t border-slate-800 row-hover hover:bg-slate-900/60">
                    <td className="px-3 py-2 font-mono">{v.name}</td>
                    <td className="px-3 py-2 text-slate-300">{typeName(v.type)}</td>
                    <td className="px-3 py-2 text-right text-slate-300 tabular-nums">{formatBytes(v.size)}</td>
                    <td className="px-3 py-2 text-slate-400">{v.archived ? 'Archive' : 'RAM'}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button type="button" className="text-slate-400 hover:text-white disabled:opacity-40 transition-colors mr-3" disabled={status === 'busy'} onClick={() => saveVariable(v)} title="Save a copy to this computer">Save</button>
                      <ConfirmButton label="Delete" confirmLabel={`Delete ${v.name}`} disabled={status === 'busy'} onConfirm={() => remove(v)} />
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Nothing here.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <details className="text-xs text-slate-500" open={showLog} onToggle={(e) => setShowLog((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer rounded-md">Connection log ({log.length})</summary>
        <pre className="mt-2 max-h-64 overflow-auto bg-slate-950 border border-slate-800 rounded p-2 font-mono">
          {log.map((l) => `${new Date(l.t).toLocaleTimeString()} ${l.dir === 'tx' ? 'TX' : l.dir === 'rx' ? 'RX' : '--'} ${l.text}`).join('\n')}
        </pre>
      </details>
    </div>
  );
}
