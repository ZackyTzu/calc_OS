// Thin wrappers kept for the pages; every icon is an Octicon (GitHub, MIT).
import type { SVGProps } from 'react';
import { Octicon } from './Octicon';

type P = Omit<SVGProps<SVGSVGElement>, 'name'>;

export const CloseIcon = (p: P) => <Octicon name="X" {...p} />;
export const ExternalIcon = (p: P) => <Octicon name="LinkExternal" {...p} />;
export const FolderIcon = (p: P) => <Octicon name="FileDirectoryFill" {...p} />;
export const FileIcon = (p: P) => <Octicon name="File" {...p} />;
export const ChevronIcon = (p: P) => <Octicon name="ChevronRight" {...p} />;
export const MenuIcon = (p: P) => <Octicon name="ThreeBars" {...p} />;
