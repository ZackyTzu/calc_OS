// Worker that hosts web-libnspire. All calls are synchronous inside the worker; USB I/O is
// delegated to the main thread through the shared buffer (see bridge.ts).
/// <reference lib="webworker" />
import type { Calculator } from 'web-libnspire';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let calc: Calculator | null = null;
const modulePromise = import('web-libnspire');

type Req = { id: number; method: string; args: unknown[] };

ctx.onmessage = async (ev: MessageEvent<Req>) => {
  const { id, method, args } = ev.data;
  try {
    const mod = await modulePromise;
    let result: unknown = undefined;
    switch (method) {
      case 'init': {
        const [devId, vid, pid, sab] = args as [number, number, number, SharedArrayBuffer];
        if (calc) calc.free();
        calc = new mod.Calculator(devId, vid, pid, new Int32Array(sab));
        break;
      }
      case 'update': result = calc!.update(); break;
      case 'listDir': result = calc!.list_dir(args[0] as string); break;
      case 'downloadFile': result = calc!.download_file(args[0] as string, args[1] as number); break;
      case 'uploadFile': calc!.upload_file(args[0] as string, args[1] as Uint8Array); break;
      case 'deleteFile': calc!.delete_file(args[0] as string); break;
      case 'deleteDir': calc!.delete_dir(args[0] as string); break;
      case 'createDir': calc!.create_dir(args[0] as string); break;
      case 'move': calc!.move_file(args[0] as string, args[1] as string); break;
      case 'copy': calc!.copy_file(args[0] as string, args[1] as string); break;
      case 'free': calc?.free(); calc = null; break;
      default: throw new Error(`unknown method ${method}`);
    }
    ctx.postMessage({ id, ok: true, result });
  } catch (e) {
    ctx.postMessage({ id, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
};
