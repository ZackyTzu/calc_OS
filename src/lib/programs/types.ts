// Content model for generated "solver + notes" programs (Physics 1, Precalculus, Statistics).

export interface Variable {
  /** Calculator real variable used to hold the value: a single letter A-Z. */
  sym: string;
  /** Short label shown in prompts and menus, <= 14 characters, e.g. "v0 (m/s)". */
  name: string;
}

export interface Equation {
  id: string;
  /** Menu label, <= 14 characters. */
  menu: string;
  /** Formula as shown on the calculator, <= 26 characters. */
  display: string;
  vars: Variable[];
  /**
   * How to compute each solvable variable from the others, as a TI-BASIC expression using the
   * variable letters (explicit `*` for multiplication, `~` for negation, `^^2` for squares).
   * Variables absent from this map are input-only.
   */
  solve?: Record<string, string>;
  /** Alternative to `solve`: fixed inputs, several outputs computed at once. */
  compute?: { inputs: string[]; outputs: { sym: string; name: string; expr: string }[] };
  /** Trig mode required by the formulas. */
  mode?: 'deg' | 'rad';
  /** Free text; wrapped to 26 columns and paged automatically. */
  notes: string[];
}

export interface Topic {
  id: string;
  /** Menu label, <= 14 characters. */
  menu: string;
  equations: Equation[];
  /** Topic-level notes (shown as a "Notes" entry in the topic menu). */
  notes?: string[];
}

export interface Constant {
  sym: string;
  name: string;
  value: string;
}

export interface Subject {
  /** Program name on the calculator, 1-8 characters A-Z0-9. */
  program: string;
  /** Title shown in the main menu, <= 16 characters. */
  title: string;
  description: string;
  /** Constants stored in calculator variables at start-up and adjustable from Settings. */
  constants?: Constant[];
  topics: Topic[];
  /** Shown once when the program starts. */
  intro?: string[];
}
