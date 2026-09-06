import { Link } from 'react-router-dom';
import { useCalculator } from '../../state/calculator';
import { CloseIcon } from './Icon';
import { Spinner } from './ui';

export function ConnectButton() {
  const { status, info, connect, disconnect } = useCalculator();
  if (status === 'unsupported') {
    return (
      <Link to="/about#browsers" className="btn btn-outline btn-sm text-xs text-orange border-[rgba(178,80,0,0.35)]">
        Use Chrome or Edge to connect
      </Link>
    );
  }
  if (status === 'disconnected') {
    return (
      <button type="button" onClick={connect} className="btn btn-primary btn-sm">
        Connect
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
        {status === 'busy' ? <Spinner className="text-orange" /> : <span className="inline-block w-2 h-2 rounded-full bg-[#34c759]" aria-hidden="true" />}
        <span>{info?.model ?? 'Calculator'}</span>
        {info && <span className="text-muted hidden sm:inline">OS {info.osMajorMinor}</span>}
      </Link>
      <button type="button" onClick={disconnect} title="Disconnect" aria-label="Disconnect" className="btn btn-ghost btn-sm px-2 text-muted">
        <CloseIcon />
      </button>
    </div>
  );
}
