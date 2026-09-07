import { Link } from 'react-router-dom';
import { useCalculator } from '../../state/calculator';
import { Octicon } from './Octicon';
import { Spinner } from './ui';

export function ConnectButton() {
  const { status, info, connect, disconnect } = useCalculator();
  if (status === 'unsupported') {
    return (
      <Link to="/about#browsers" className="btn text-xs text-orange">
        <Octicon name="Alert" /> Use Chrome or Edge
      </Link>
    );
  }
  if (status === 'disconnected') {
    return (
      <button type="button" onClick={connect} className="btn btn-primary">
        <Octicon name="Plug" /> Connect
      </button>
    );
  }
  if (status === 'connecting') {
    return (
      <span className="btn cursor-default" aria-live="polite">
        <Spinner /> Connecting
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Link to="/calculator" className="btn">
        {status === 'busy' ? <Spinner className="text-orange" /> : <span className="inline-block w-2 h-2 rounded-full bg-green-button" aria-hidden="true" />}
        <span>{info?.model ?? 'Calculator'}</span>
        {info && <span className="text-muted hidden sm:inline">OS {info.osMajorMinor}</span>}
      </Link>
      <button type="button" onClick={disconnect} title="Disconnect" aria-label="Disconnect" className="btn btn-ghost px-2 text-muted">
        <Octicon name="X" />
      </button>
    </div>
  );
}
