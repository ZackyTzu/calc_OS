import { useTheme, type ThemePref } from '../../state/theme';
import { Octicon, type OcticonName } from './Octicon';

const OPTIONS: { value: ThemePref; label: string; icon: OcticonName }[] = [
  { value: 'light', label: 'Light', icon: 'Sun' },
  { value: 'dark', label: 'Dark', icon: 'Moon' },
  { value: 'system', label: 'System', icon: 'DeviceDesktop' },
];

export function ThemeSwitch({ showLabels = false }: { showLabels?: boolean }) {
  const [pref, setPref] = useTheme();
  return (
    <div className="SegmentedControl" role="group" aria-label="Appearance">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" aria-pressed={pref === o.value} title={o.label} onClick={() => setPref(o.value)}>
          <Octicon name={o.icon} size={14} />
          <span className={showLabels ? '' : 'sr-only lg:not-sr-only'}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
