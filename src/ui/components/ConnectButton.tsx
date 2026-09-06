import { Link } from 'react-router-dom';
import { useCalculator } from '../../state/calculator';
import { CloseIcon } from './Icon';
import { Spinner } from './ui';

export function ConnectButton() {
  const { status, info, connect, disconnect } = useCalculator();
  if (status === 'unsupported') {
    return (
      <Link to="/about#browsers" className="btn btn-sm text-xs bg-amber-900/40 text-amber-200 border border-amber-800 hover:bg-amber-900/60">
        Use Chrome or Edge to connect
      </Link>
    );
  }
  if (status === 'disconnected') {
    return (
      <button type="button" onClick={connect} className="btn btn-primary btn-sm">
        Connect calculator
      </button>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="btn btn-secondary btn-sm cursor-default" aria-live="polite">
        <Spinner /> Connecting
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm">
      <Link to="/calculator" className="btn btn-secondary btn-sm">
        {status === 'busy' ? <Spinner className="text-amber-300" /> : <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />}
        <span>{info?.model ?? 'Calculator'}</span>
        {info && <span className="text-slate-400 hidden sm:inline">OS {info.osMajorMinor}</span>}
      </Link>
      <button type="button" onClick={disconnect} title="Disconnect" aria-label="Disconnect" className="btn btn-ghost btn-sm px-2">
        <CloseIcon />
      </button>
    </div>
  );
}
