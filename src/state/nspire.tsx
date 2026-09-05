import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NspireCalculator, enableCrossOriginIsolation, nspireSupported, selfTestEngine, type NspireFile, type NspireInfo, type NspireProgress } from '../lib/nspire/calculator';

export type NspireStatus = 'unsupported' | 'needs-isolation' | 'disconnected' | 'connecting' | 'connected' | 'busy';

interface Ctx {
  status: NspireStatus;
  reason: string | null;
  error: string | null;
  info: NspireInfo | null;
  path: string;
  files: NspireFile[] | null;
  progress: NspireProgress | null;
  log: string[];
  enableIsolation(): Promise<void>;
  selfTest(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  open(path: string): Promise<void>;
  upload(filename: string, data: Uint8Array, folder?: string): Promise<void>;
  remove(file: NspireFile): Promise<void>;
  mkdir(path: string): Promise<void>;
  clearError(): void;
}

const NspireContext = createContext<Ctx | null>(null);

export function NspireProvider({ children }: { children: ReactNode }) {
  const sup = typeof window !== 'undefined' ? nspireSupported() : { ok: false, reason: 'no window' };
  const initial: NspireStatus = !('usb' in navigator) ? 'unsupported' : !sup.ok ? 'needs-isolation' : 'disconnected';
  const [status, setStatus] = useState<NspireStatus>(initial);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<NspireInfo | null>(null);
  const [path, setPath] = useState('/');
  const [files, setFiles] = useState<NspireFile[] | null>(null);
  const [progress, setProgress] = useState<NspireProgress | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const calcRef = useRef<NspireCalculator | null>(null);
  const pushLog = useCallback((t: string) => setLog((l) => [...l.slice(-300), t]), []);

  const withCalc = useCallback(async <T,>(fn: (c: NspireCalculator) => Promise<T>): Promise<T> => {
    const c = calcRef.current;
    if (!c) throw new Error('No Nspire connected');
    setStatus('busy');
    setError(null);
    try {
      return await fn(c);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      pushLog(`error: ${msg}`);
      throw e;
    } finally {
      setStatus(calcRef.current ? 'connected' : 'disconnected');
      setProgress(null);
    }
  }, [pushLog]);

  const list = useCallback(async (c: NspireCalculator, p: string) => {
    const fs = await c.listDir(p);
    fs.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.path.localeCompare(b.path));
    setFiles(fs);
    setPath(p);
  }, []);

  const connect = useCallback(async () => {
    try {
      const device = await navigator.usb.requestDevice({ filters: NspireCalculator.usbFilters() });
      setStatus('connecting');
      setError(null);
      const calc = new NspireCalculator(device);
      calc.log = pushLog;
      calc.onProgress = setProgress;
      const i = await calc.connect();
      calcRef.current = calc;
      setInfo(i);
      pushLog(`connected to ${i.name} OS ${i.version.major}.${i.version.minor}.${i.version.patch}.${i.version.build}`);
      setStatus('busy');
      await list(calc, '/');
      setStatus('connected');
    } catch (e) {
      if ((e as Error)?.name === 'NotFoundError') { setStatus('disconnected'); return; }
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      pushLog(`error: ${msg}`);
      setStatus(nspireSupported().ok ? 'disconnected' : 'needs-isolation');
    }
  }, [list, pushLog]);

  const disconnect = useCallback(async () => {
    const c = calcRef.current;
    calcRef.current = null;
    if (c) await c.disconnect();
    setInfo(null);
    setFiles(null);
    setPath('/');
    setStatus(nspireSupported().ok ? 'disconnected' : 'needs-isolation');
  }, []);

  useEffect(() => {
    if (!('usb' in navigator)) return;
    const onDisconnect = (ev: USBConnectionEvent) => {
      if (calcRef.current && ev.device === calcRef.current.device) { pushLog('Nspire unplugged'); disconnect(); }
    };
    navigator.usb.addEventListener('disconnect', onDisconnect);
    return () => navigator.usb.removeEventListener('disconnect', onDisconnect);
  }, [disconnect, pushLog]);

  const open = useCallback(async (p: string) => { await withCalc((c) => list(c, p)); }, [list, withCalc]);

  const mkdir = useCallback(async (p: string) => { await withCalc(async (c) => { await c.createDir(p); await list(c, path); }); }, [list, path, withCalc]);

  const upload = useCallback(async (filename: string, data: Uint8Array, folder?: string) => {
    await withCalc(async (c) => {
      const dir = folder ?? path;
      if (folder && folder !== '/') {
        // make sure the target folder exists
        const parent = folder.slice(0, folder.lastIndexOf('/')) || '/';
        const siblings = await c.listDir(parent);
        if (!siblings.some((f) => f.isDir && (f.path === folder || `${parent === '/' ? '' : parent}/${f.path}` === folder))) {
          await c.createDir(folder);
        }
      }
      const target = `${dir === '/' ? '' : dir}/${filename}`;
      pushLog(`uploading ${target} (${data.length} bytes)`);
      await c.upload(target, data);
      const i = await c.refresh();
      setInfo(i);
      await list(c, dir);
    });
  }, [list, path, pushLog, withCalc]);

  const remove = useCallback(async (file: NspireFile) => {
    await withCalc(async (c) => {
      const full = `${path === '/' ? '' : path}/${file.path}`;
      if (file.isDir) await c.deleteDir(full); else await c.deleteFile(full);
      const i = await c.refresh();
      setInfo(i);
      await list(c, path);
    });
  }, [list, path, withCalc]);

  const enableIsolation = useCallback(async () => {
    const r = await enableCrossOriginIsolation(import.meta.env.BASE_URL);
    if (r === 'reload') window.location.reload();
    else if (r === 'unsupported') setError('This browser does not support service workers, which the Nspire engine needs here.');
  }, []);

  const selfTest = useCallback(async () => {
    setError(null);
    try {
      const ms = await selfTestEngine();
      pushLog(`transfer engine loaded in ${Math.round(ms)} ms`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Transfer engine failed to load: ${msg}`);
      pushLog(`engine self-test failed: ${msg}`);
    }
  }, [pushLog]);

  const value = useMemo<Ctx>(() => ({
    status, reason: sup.ok ? null : sup.reason ?? null, error, info, path, files, progress, log,
    enableIsolation, selfTest, connect, disconnect, open, upload, remove, mkdir, clearError: () => setError(null),
  }), [status, sup.ok, sup.reason, error, info, path, files, progress, log, enableIsolation, selfTest, connect, disconnect, open, upload, remove, mkdir]);

  return <NspireContext.Provider value={value}>{children}</NspireContext.Provider>;
}

export function useNspire(): Ctx {
  const ctx = useContext(NspireContext);
  if (!ctx) throw new Error('useNspire outside provider');
  return ctx;
}
