import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNspire } from '../../state/nspire';
import { Button, Card, ErrorBox, Section, Badge, ConfirmButton, Notice, Progress, Spinner } from '../components/ui';
import { formatBytes } from '../../lib/library/compat';
import { catalog } from '../../lib/library/catalog';
import { FileIcon, FolderIcon } from '../components/Icon';

export function Nspire() {
  const n = useNspire();
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [pendingBytes, setPendingBytes] = useState<Uint8Array | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState<string | null>(null);
  const connected = n.status === 'connected' || n.status === 'busy';
  const nspireEntries = catalog.filter((e) => e.calculator === 'nspire');
  const engineLine = n.log.filter((l) => l.startsWith('transfer engine loaded')).slice(-1)[0];

  async function pickFile(list: FileList | null) {
    if (!list || !list[0]) return;
    const f = list[0];
    if (!/\.tns$/i.test(f.name)) { setFileError('Only .tns documents can be sent to the Nspire.'); return; }
    setFileError(null);
    setPendingName(f.name);
    setPendingBytes(new Uint8Array(await f.arrayBuffer()));
  }

  function childPath(name: string) {
    return `${n.path === '/' ? '' : n.path}/${name}`;
  }

  const version = n.info ? `${n.info.version.major}.${n.info.version.minor}.${n.info.version.patch}.${n.info.version.build}` : '';
  const pythonAvailable = n.info ? (Number(n.info.version.major) >= 5 && Number(n.info.version.minor) >= 2) || Number(n.info.version.major) > 5 : false;

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
          {engineLine && <Notice>{engineLine}.</Notice>}
        </Card>
      )}
      {n.status === 'connecting' && <Card className="flex items-center gap-2 text-slate-300"><Spinner /> Connecting</Card>}

      {connected && n.info && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><div className="text-xs text-slate-400">Model</div><div className="font-semibold">{n.info.name}</div><div className="text-xs text-slate-500">{typeof n.info.hw_type === 'string' ? n.info.hw_type : 'unknown hardware'}</div></Card>
          <Card><div className="text-xs text-slate-400">Operating system</div><div className="font-semibold tabular-nums">{version}</div><div className="text-xs text-slate-500">{pythonAvailable ? 'Python available' : 'Python needs OS 5.2+'}</div></Card>
          <Card><div className="text-xs text-slate-400">Storage free</div><div className="font-semibold tabular-nums">{formatBytes(n.info.free_storage)}</div><div className="text-xs text-slate-500 tabular-nums">of {formatBytes(n.info.total_storage)}</div></Card>
          <Card>
            <div className="text-xs text-slate-400">Battery</div>
            <div className="font-semibold">{typeof n.info.battery === 'string' ? n.info.battery : 'unknown'}{n.info.is_charging ? ', charging' : ''}</div>
            <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={n.disconnect}>Disconnect</Button>
          </Card>
        </div>
      )}

      {connected && (
        <Section
          title={`Files in ${n.path}`}
          right={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={n.path === '/' || n.status === 'busy'} onClick={() => n.open(n.path.slice(0, n.path.lastIndexOf('/')) || '/')}>Up</Button>
              <Button variant="secondary" size="sm" disabled={n.status === 'busy' || newFolder !== null} onClick={() => setNewFolder('')}>New folder</Button>
              <Button variant="secondary" size="sm" disabled={n.status === 'busy'} onClick={() => n.open(n.path)}>Refresh</Button>
            </div>
          }
        >
          {newFolder !== null && (
            <form
              className="enter flex items-center gap-2 flex-wrap"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newFolder.trim();
                if (!name) return;
                n.mkdir(childPath(name));
                setNewFolder(null);
              }}
            >
              <input autoFocus className="input h-8" placeholder="Folder name" aria-label="New folder name" value={newFolder} onChange={(e) => setNewFolder(e.target.value)} />
              <Button type="submit" size="sm" disabled={!newFolder.trim() || n.status === 'busy'}>Create folder</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewFolder(null)}>Cancel</Button>
            </form>
          )}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-left"><tr><th className="px-3 py-2 font-medium">Name</th><th className="px-3 py-2 text-right font-medium">Size</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>
                {(n.files ?? []).map((f) => (
                  <tr key={f.path} className="border-t border-slate-800 row-hover hover:bg-slate-900/60">
                    <td className="px-3 py-2 font-mono">
                      {f.isDir ? (
                        <button type="button" className="text-emerald-300 hover:underline underline-offset-2 rounded" onClick={() => n.open(childPath(f.path))}><FolderIcon className="inline mr-1.5 -mt-0.5" />{f.path}</button>
                      ) : (
                        <span><FileIcon className="inline mr-1.5 -mt-0.5 text-slate-400" />{f.path}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 tabular-nums">{f.isDir ? '' : formatBytes(f.size)}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <ConfirmButton label="Delete" confirmLabel={f.isDir ? 'Delete folder and contents' : `Delete ${f.path}`} disabled={n.status === 'busy'} onConfirm={() => n.remove(f)} />
                    </td>
                  </tr>
                ))}
                {n.files && n.files.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Empty folder.</td></tr>}
              </tbody>
            </table>
          </div>
          <Card className="space-y-3">
            <h3 className="font-semibold">Send a .tns document to this folder</h3>
            <input
              type="file"
              accept=".tns"
              aria-label="Choose a .tns document"
              onChange={(e) => { pickFile(e.target.files); e.target.value = ''; }}
              className="block text-sm text-slate-300 file:mr-3 file:h-8 file:px-3 file:rounded-md file:border-0 file:bg-slate-800 file:text-slate-100 file:text-sm file:font-medium hover:file:bg-slate-700 file:transition-colors"
            />
            {fileError && <ErrorBox message={fileError} onClose={() => setFileError(null)} />}
            {pendingName && pendingBytes && (
              <div className="enter space-y-2">
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="font-mono">{pendingName}</span>
                  <span className="text-slate-400 tabular-nums">{formatBytes(pendingBytes.length)}</span>
                  <Button disabled={n.status === 'busy'} onClick={async () => { await n.upload(pendingName, pendingBytes).catch(() => undefined); setPendingName(null); setPendingBytes(null); }}>
                    {n.status === 'busy' && n.progress ? <><Spinner /> Sending</> : `Send to ${n.path}`}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={n.status === 'busy'} onClick={() => { setPendingName(null); setPendingBytes(null); }}>Cancel</Button>
                </div>
                {n.status === 'busy' && n.progress && (
                  <div className="enter space-y-1">
                    <Progress value={n.progress.total - n.progress.remaining} max={n.progress.total} />
                    <p className="text-xs text-slate-400 tabular-nums">{Math.round((100 * (n.progress.total - n.progress.remaining)) / Math.max(1, n.progress.total))}%</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Section>
      )}

      <Section title="Programs for the Nspire">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nspireEntries.map((e) => (
            <Link key={e.id} to={`/library/${e.id}`} className="pressable rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-600">
              <div className="font-semibold">{e.name}</div>
              <div className="text-sm text-slate-400">{e.tagline}</div>
              <div className="mt-2"><Badge>{e.kind === 'python' ? 'Python' : 'Lua'}</Badge></div>
            </Link>
          ))}
        </div>
      </Section>

      <Card className="text-sm text-slate-300 space-y-2">
        <h3 className="font-semibold text-white">How the Nspire support works</h3>
        <p>The CX II speaks a different USB protocol than the TI-84 family. calc_OS uses <a className="link" href="https://github.com/lights0123/n-link" target="_blank" rel="noreferrer">n-link's</a> open-source engine (web-libnspire) for the transfer, and writes .tns documents the same way the Luna tool does. calc_OS programs for the Nspire are Python (CX II, OS 5.2 or newer): open the document, then run the script with menu, then Run.</p>
        <p>This part has been tested against reference files but not yet on a real calculator. If something fails, please <a className="link" href="https://github.com/ZackyTzu/calc_OS/issues" target="_blank" rel="noreferrer">report it</a> with the connection log.</p>
      </Card>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer rounded-md">Connection log ({n.log.length})</summary>
        <pre className="mt-2 max-h-64 overflow-auto bg-slate-950 border border-slate-800 rounded p-2 font-mono">{n.log.join('\n')}</pre>
      </details>
    </div>
  );
}
