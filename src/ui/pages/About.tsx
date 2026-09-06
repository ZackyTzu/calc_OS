import { Card } from '../components/ui';

export function About() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">About calc_OS</h1>
      <Card className="space-y-2 text-slate-300">
        <p>calc_OS is a free, open-source web app that installs programs on Texas Instruments graphing calculators straight from the browser using WebUSB. It generates its own study programs (AP Physics 1, AP Precalculus, AP Statistics, a math assistant) and hosts open-licensed community programs. Everything runs in your browser; nothing about your calculator is sent to any server.</p>
        <p>Source code: <a className="link" href="https://github.com/ZackyTzu/calc_OS" target="_blank" rel="noreferrer">github.com/ZackyTzu/calc_OS</a> (GPL-3.0-or-later).</p>
      </Card>
      <Card className="space-y-2 text-slate-300" id="browsers">
        <h2 className="font-semibold text-white">Browser and system support</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Chrome, Edge, Brave and Opera on Windows, macOS, Linux and ChromeOS. Chrome on Android with a USB-OTG adapter also works.</li>
          <li>Safari and Firefox do not implement WebUSB. iPhones and iPads cannot connect.</li>
          <li>macOS and Linux: plug and play. Linux may need a udev rule: <code>SUBSYSTEM=="usb", ATTR{'{'}idVendor{'}'}=="0451", MODE="0666"</code>.</li>
          <li>Windows: works with the standard driver in most cases. If connecting fails, TI Connect CE's driver has claimed the device; close TI Connect CE, or replace the driver with WinUSB using Zadig.</li>
        </ul>
      </Card>
      <Card className="space-y-2 text-slate-300">
        <h2 className="font-semibold text-white">Safety</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Installing and deleting variables uses the same USB commands as TI Connect CE. It cannot damage the calculator.</li>
          <li>Deleting is permanent. Use Save on the My calculator page to keep a copy first.</li>
          <li>calc_OS never sends operating systems to the calculator.</li>
          <li>Jailbreaks disable exam mode. Check your school's rules before installing one.</li>
        </ul>
      </Card>
      <Card className="space-y-2 text-slate-300">
        <h2 className="font-semibold text-white">Credits</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>USB protocol knowledge from <a className="link" href="https://github.com/debrouxl/tilibs">tilibs</a> (Lionel Debroux, Romain Liévin and contributors), Benjamin Moody's protocol analysis, and Adrien Bertrand's WebTILP.</li>
          <li>TI-BASIC token data from the <a className="link" href="https://github.com/TI-Toolkit/tokens">TI-Toolkit token sheets</a>; generated files are cross-checked with <a className="link" href="https://github.com/TI-Toolkit/tivars_lib_py">tivars_lib_py</a>.</li>
          <li>CE C libraries and Cesium by the CE-Programming team and Matt Waltz; arTIfiCE by YvanTT.</li>
          <li>TI-84 Plus CE, TI-Nspire and TI Connect are trademarks of Texas Instruments, which is not affiliated with this project.</li>
        </ul>
      </Card>
    </div>
  );
}
