import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CECalculator, type CalcInfo, type CalcVariable } from '../lib/dusb/calculator';
import { TI_VENDOR_ID } from '../lib/dusb/constants';
import type { VarEntry } from '../lib/tifiles/tifile';

export type Status = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'busy';

export interface LogLine { t: number; dir: 'tx' | 'rx' | 'info'; text: string }

export interface InstallProgress { current: string; index: number; total: number; sent: number; size: number }

interface Ctx {
  status: Status;
  error: string | null;
  info: CalcInfo | null;
  variables: CalcVariable[] | null;
  log: LogLine[];
  progress: InstallProgress | null;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  refresh(): Promise<void>;
  install(entries: VarEntry[], opts?: { replace?: boolean }): Promise<void>;
  remove(v: CalcVariable): Promise<void>;
  download(v: CalcVariable): Promise<VarEntry>;
  clearError(): void;
}

const CalculatorContext = createContext<Ctx | null>(null);

export function CalculatorProvider({ children }: { children: ReactNode }) {
  const supported = typeof navigator !== 'undefined' && !!navigator.usb;
  const [status, setStatus] = useState<Status>(supported ? 'disconnected' : 'unsupported');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<CalcInfo | null>(null);
  const [variables, setVariables] = useState<CalcVariable[] | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const calcRef = useRef<CECalculator | null>(null);
  const deviceRef = useRef<USBDevice | null>(null);

  const pushLog = useCallback((dir: LogLine['dir'], text: string) => {
    setLog((l) => [...l.slice(-400), { t: Date.now(), dir, text }]);
  }, []);

  const fail = useCallback((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(msg);
    pushLog('info', `error: ${msg}`);
  }, [pushLog]);

  const attach = useCallback(async (device: USBDevice) => {
    setStatus('connecting');
    setError(null);
    const calc = CECalculator.fromUSBDevice(device);
    calc.log = pushLog;
    try {
      const i = await calc.connect();
      calcRef.current = calc;
      deviceRef.current = device;
      setInfo(i);
      setStatus('connected');
      pushLog('info', `connected to ${i.model} OS ${i.osVersion}`);
      try {
        setStatus('busy');
        setVariables(await calc.listVariables());
      } finally {
        setStatus('connected');
      }
    } catch (e) {
      fail(e);
      try { await calc.disconnect(); } catch { /* ignore */ }
      calcRef.current = null;
      setStatus('disconnected');
    }
  }, [fail, pushLog]);

  const connect = useCallback(async () => {
    if (!supported) return;
    try {
      const device = await navigator.usb.requestDevice({ filters: [{ vendorId: TI_VENDOR_ID }] });
      await attach(device);
    } catch (e) {
      if ((e as Error)?.name === 'NotFoundError') return; // user cancelled the picker
      fail(e);
    }
  }, [attach, fail, supported]);

  const disconnect = useCallback(async () => {
    const c = calcRef.current;
    calcRef.current = null;
    deviceRef.current = null;
    if (c) await c.disconnect().catch(() => undefined);
    setInfo(null);
    setVariables(null);
    setStatus(supported ? 'disconnected' : 'unsupported');
  }, [supported]);

  // Reconnect to already-authorised devices on load; drop state when the cable is pulled.
  useEffect(() => {
    if (!supported) return;
    navigator.usb.getDevices().then((devices) => {
      const d = devices.find((x) => x.vendorId === TI_VENDOR_ID);
      if (d && !calcRef.current) attach(d);
    }).catch(() => undefined);
    const onDisconnect = (ev: USBConnectionEvent) => {
      if (ev.device === deviceRef.current) {
        pushLog('info', 'calculator unplugged');
        disconnect();
      }
    };
    const onConnect = (ev: USBConnectionEvent) => {
      if (!calcRef.current && ev.device.vendorId === TI_VENDOR_ID) attach(ev.device);
    };
    navigator.usb.addEventListener('disconnect', onDisconnect);
    navigator.usb.addEventListener('connect', onConnect);
    return () => {
      navigator.usb.removeEventListener('disconnect', onDisconnect);
      navigator.usb.removeEventListener('connect', onConnect);
    };
  }, [attach, disconnect, pushLog, supported]);

  const withCalc = useCallback(async <T,>(fn: (c: CECalculator) => Promise<T>): Promise<T> => {
    const c = calcRef.current;
    if (!c) throw new Error('No calculator connected');
    setStatus('busy');
    setError(null);
    try {
      return await fn(c);
    } catch (e) {
      fail(e);
      throw e;
    } finally {
      setStatus(calcRef.current ? 'connected' : 'disconnected');
    }
  }, [fail]);

  const refresh = useCallback(async () => {
    await withCalc(async (c) => {
      setVariables(await c.listVariables());
      const mem = await c.refreshMemory();
      setInfo((i) => (i ? { ...i, ...mem } : i));
    });
  }, [withCalc]);

  const install = useCallback(async (entries: VarEntry[], opts: { replace?: boolean } = {}) => {
    await withCalc(async (c) => {
      const existing = variables ?? (await c.listVariables());
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const clash = existing.find((v) => v.name === e.name && v.type === e.type);
        if (clash) {
          if (!opts.replace) throw new Error(`${e.name} already exists on the calculator`);
          pushLog('info', `replacing ${e.name}`);
          await c.deleteVariable(clash.name, clash.type);
        }
        setProgress({ current: e.name, index: i, total: entries.length, sent: 0, size: e.data.length });
        await c.sendVariable(e, (sent, size) => setProgress({ current: e.name, index: i, total: entries.length, sent, size }));
      }
      setProgress(null);
      setVariables(await c.listVariables());
      const mem = await c.refreshMemory();
      setInfo((i) => (i ? { ...i, ...mem } : i));
    }).finally(() => setProgress(null));
  }, [pushLog, variables, withCalc]);

  const remove = useCallback(async (v: CalcVariable) => {
    await withCalc(async (c) => {
      await c.deleteVariable(v.name, v.type);
      setVariables(await c.listVariables());
      const mem = await c.refreshMemory();
      setInfo((i) => (i ? { ...i, ...mem } : i));
    });
  }, [withCalc]);

  const download = useCallback(async (v: CalcVariable) => withCalc((c) => c.receiveVariable(v.name, v.type)), [withCalc]);

  const value = useMemo<Ctx>(() => ({
    status, error, info, variables, log, progress, connect, disconnect, refresh, install, remove, download,
    clearError: () => setError(null),
  }), [status, error, info, variables, log, progress, connect, disconnect, refresh, install, remove, download]);

  return <CalculatorContext.Provider value={value}>{children}</CalculatorContext.Provider>;
}

export function useCalculator(): Ctx {
  const ctx = useContext(CalculatorContext);
  if (!ctx) throw new Error('useCalculator outside provider');
  return ctx;
}
