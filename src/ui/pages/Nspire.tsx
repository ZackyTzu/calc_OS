import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNspire } from '../../state/nspire';
import { Button, Card, ErrorBox, Section, Badge } from '../components/ui';
import { formatBytes } from '../../lib/library/compat';
import { catalog } from '../../lib/library/catalog';
import { FileIcon, FolderIcon } from '../components/Icon';

export function Nspire() {
  const n = useNspire();
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [pendingBytes, setPendingBytes] = useState<Uint8Array | null>(null);
  const connected = n.status === 'connected' || n.status === 'busy';
  const nspireEntries = catalog.filter((e) => e.calculator === 'nspire');

  async function pickFile(list: FileList | null) {
    if (!list || !list[0]) return;
    const f = list[0];
    if (!/\.tns$/i.test(f.name)) { alert('Only .tns documents can be sent to the Nspire.'); return; }
    setPendingName(f.name);
    setPendingBytes(new Uint8Array(await f.arrayBuffer()));
  }

  const version = n.info ? `${n.info.version.major}.${n.info.version.minor}.${n.info.version.patch}.${n.info.version.build}` : '';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">TI-Nspire CX II</h1>
        <Badge tone="amber">experimental: not yet tested on hardware</Badge>
      </div>
      {n.error && <ErrorBox message={n.error} onClose={n.clearError} />}

      {n.status === 'unsupported' && (
        <Card><p>This browser cannot use WebUSB. Open this page in Chrome, Edge or Brave on a computer.</p></Card>
      )}

      {n.status === 'needs-isolation' && (
        <Card className="space-y-3">
          <p className="text-slate-300">The Nspire transfer engine (web-libnspire, the same code behind n-link) runs in a background thread and needs a browser feature called cross-origin isolation. Enabling it installs a small service worker for this site and reloads the page. Nothing else changes.</p>
          <Button onClick={n.enableIsolation}>Enable Nspire transfers (reloads the page)</Button>
          <p className="text-xs text-slate-500">{n.reason}</p>
        </Card>
      )}

      {n.status === 'disconnected' && (
        <Card className="space-y-3">
          <p className="text-slate-300">Plug in the TI-Nspire CX II with its USB cable and turn it on, then connect. On Windows the CX II needs no extra driver; the older CX needs WinUSB (Zadig).</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={n.connect}>Connect Nspire</Button>
            <Button variant="secondary" onClick={n.selfTest}>Test the transfer engine</Button>
          </div>
          {n.log.some((l) => l.startsWith('transfer engine loaded')) && <p className="text-sm text-emerald-300">{n.log.filter((l) => l.startsWith('transfer engine loaded')).slice(-1)[0]}.</p>}
        </Card>
      )}
      {n.status === 'connecting' && <Card><span className="animate-pulse">Connecting…</span></Card>}

      {connected && n.info && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><div className="text-xs text-slate-400">Model</div><div className="font-semibold">{n.info.name}</div><div className="text-xs text-slate-500">{typeof n.info.hw_type === 'string' ? n.info.hw_type : 'unknown hardware'}</div></Card>
          <Card><div className="text-xs text-slate-400">Operating system</div><div className="font-semibold">{version}</div><div className="text-xs text-slate-500">{Number(n.info.version.major) >= 5 && Number(n.info.version.minor) >= 2 || Number(n.info.version.major) > 5 ? 'Python available' : 'Python needs OS 5.2+'}</div></Card>
          <Card><div className="text-xs text-slate-400">Storage free</div><div className="font-semibold">{formatBytes(n.info.free_storage)}</div><div className="text-xs text-slate-500">of {formatBytes(n.info.total_storage)}</div></Card>
          <Card><div className="text-xs text-slate-400">Battery</div><div className="font-semibold">{typeof n.info.battery === 'string' ? n.info.battery : 'unknown'}{n.info.is_charging ? ', charging' : ''}</div><Button variant="ghost" className="mt-1 !px-0" onClick={n.disconnect}>Disconnect</Button></Card>
        </div>
      )}

      {connected && (
        <Section
          title={`Files in ${n.path}`}
          right={
            <div className="flex gap-2">
              <Button variant="secondary" disabled={n.path === '/' || n.status === 'busy'} onClick={() => n.open(n.path.slice(0, n.path.lastIndexOf('/')) || '/')}>Up</Button>
              <Button variant="secondary" disabled={n.status === 'busy'} onClick={() => { const name = prompt('New folder name'); if (name) n.mkdir(`${n.path === '/' ? '' : n.path}/${name}`); }}>New folder</Button>
              <Button variant="secondary" disabled={n.status === 'busy'} onClick={() => n.open(n.path)}>Refresh</Button>
            </div>
          }
        >
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-left"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2 text-right">Size</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>
                {(n.files ?? []).map((f) => (
                  <tr key={f.path} className="border-t border-slate-800 hover:bg-slate-900/60">
                    <td className="px-3 py-2 font-mono">
                      {f.isDir ? (
                        <button className="text-emerald-300 hover:underline" onClick={() => n.open(`${n.path === '/' ? '' : n.path}/${f.path}`)}><FolderIcon className="inline mr-1.5 -mt-0.5" />{f.path}</button>
                      ) : (
                        <span><FileIcon className="inline mr-1.5 -mt-0.5 text-slate-400" />{f.path}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300">{f.isDir ? '' : formatBytes(f.size)}</td>
                    <td className="px-3 py-2 text-right">
                      <button className="text-rose-300 hover:text-rose-100" disabled={n.status === 'busy'} onClick={() => { if (confirm(`Delete ${f.path}${f.isDir ? ' and everything in it' : ''}?`)) n.remove(f); }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {n.files && n.files.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Empty folder.</td></tr>}
              </tbody>
            </table>
          </div>
          <Card className="space-y-3">
            <h3 className="font-semibold">Send a .tns document to this folder</h3>
            <input type="file" accept=".tns" onChange={(e) => pickFile(e.target.files)} className="text-sm" />
            {pendingName && pendingBytes && (
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono">{pendingName}</span>
                <span className="text-slate-400">{formatBytes(pendingBytes.length)}</span>
                <Button disabled={n.status === 'busy'} onClick={async () => { await n.upload(pendingName, pendingBytes).catch(() => undefined); setPendingName(null); setPendingBytes(null); }}>
                  {n.status === 'busy' && n.progress ? `Sending… ${Math.round((100 * (n.progress.total - n.progress.remaining)) / Math.max(1, n.progress.total))}%` : `Send to ${n.path}`}
                </Button>
              </div>
            )}
          </Card>
        </Section>
      )}

      <Section title="Programs for the Nspire">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nspireEntries.map((e) => (
            <Link key={e.id} to={`/library/${e.id}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-emerald-700">
              <div className="font-semibold">{e.name}</div>
              <div className="text-sm text-slate-400">{e.tagline}</div>
              <div className="mt-2"><Badge>{e.kind === 'python' ? 'Python' : 'Lua'}</Badge></div>
            </Link>
          ))}
        </div>
      </Section>

      <Card className="text-sm text-slate-300 space-y-2">
        <h3 className="font-semibold text-white">How the Nspire support works</h3>
        <p>The CX II speaks a different USB protocol than the TI-84 family. calc_OS uses <a className="underline" href="https://github.com/lights0123/n-link" target="_blank" rel="noreferrer">n-link's</a> open-source engine (web-libnspire) for the transfer, and writes .tns documents the same way the Luna tool does. calc_OS programs for the Nspire are Python (CX II, OS 5.2 or newer): open the document, then run the script with menu, then Run.</p>
        <p>This part has been tested against reference files but not yet on a real calculator. If something fails, please <a className="underline" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">report it</a> with the connection log.</p>
      </Card>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer">Connection log ({n.log.length})</summary>
        <pre className="mt-2 max-h-64 overflow-auto bg-slate-950 border border-slate-800 rounded p-2 font-mono">{n.log.join('\n')}</pre>
      </details>
    </div>
  );
}
