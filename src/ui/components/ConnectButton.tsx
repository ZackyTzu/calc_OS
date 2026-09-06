import { Link } from 'react-router-dom';
import { useCalculator } from '../../state/calculator';
import { CloseIcon } from './Icon';

export function ConnectButton() {
  const { status, info, connect, disconnect } = useCalculator();
  if (status === 'unsupported') {
    return (
      <Link to="/about#browsers" className="text-xs px-3 py-1.5 rounded-md bg-amber-900/40 text-amber-200 border border-amber-800">
        Use Chrome or Edge to connect
      </Link>
    );
  }
  if (status === 'disconnected') {
    return (
      <button onClick={connect} className="text-sm px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
        Connect calculator
      </button>
    );
  }
  if (status === 'connecting') {
    return <span className="text-sm px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 animate-pulse">Connecting…</span>;
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link to="/calculator" className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${status === 'busy' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span>{info?.model ?? 'Calculator'}</span>
        {info && <span className="text-slate-400 hidden sm:inline">OS {info.osMajorMinor}</span>}
      </Link>
      <button onClick={disconnect} title="Disconnect" aria-label="Disconnect" className="px-2 py-1.5 rounded-md text-slate-400 hover:bg-slate-800"><CloseIcon /></button>
    </div>
  );
}
