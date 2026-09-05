// Turns a Subject content spec into a TI-BASIC program: nested menus, "solve for" prompts, notes.
import { ProgramBuilder, type Label, type MenuItem } from './builder';
import type { Equation, Subject, Topic } from './types';
import { variablesIn } from './tiexpr';

export interface GeneratedProgram {
  name: string;
  source: string;
}

export function generateAcademic(subject: Subject): GeneratedProgram {
  validateSubject(subject);
  const b = new ProgramBuilder();
  const main = b.label();
  const quit = b.label();
  const settings = subject.constants?.length ? b.label() : null;

  b.clrHome();
  for (const c of subject.constants ?? []) b.store(c.value, c.sym);
  if (subject.intro?.length) b.pages(subject.intro, subject.title);

  // Main menu
  b.place(main);
  const topicLabels = new Map<Topic, Label>();
  const items: MenuItem[] = subject.topics.map((t) => {
    const l = b.label();
    topicLabels.set(t, l);
    return { label: t.menu, target: l };
  });
  if (settings) items.push({ label: 'Settings', target: settings });
  b.menu(subject.title, items, [{ label: 'Quit', target: quit }]);

  b.place(quit);
  b.clrHome();
  b.raw('Return');

  if (settings) {
    b.place(settings);
    b.clrHome();
    b.disp('Constants in use:');
    for (const c of subject.constants!) b.dispValue(`${c.name}`, c.sym);
    b.pause();
    for (const c of subject.constants!) b.input(`${c.name}=`, c.sym);
    b.goto(main);
  }

  for (const topic of subject.topics) {
    const tl = topicLabels.get(topic)!;
    b.place(tl);
    const eqLabels = new Map<Equation, Label>();
    const eqItems: MenuItem[] = topic.equations.map((e) => {
      const l = b.label();
      eqLabels.set(e, l);
      return { label: e.menu, target: l };
    });
    let topicNotes: Label | null = null;
    if (topic.notes?.length) {
      topicNotes = b.label();
      eqItems.push({ label: 'Notes', target: topicNotes });
    }
    b.menu(topic.menu.toUpperCase(), eqItems, [{ label: 'Back', target: main }]);

    if (topicNotes) {
      b.place(topicNotes);
      b.pages(topic.notes!, topic.menu.toUpperCase());
      b.goto(tl);
    }

    for (const eq of topic.equations) {
      const el = eqLabels.get(eq)!;
      const notes = b.label();
      const solve = b.label();
      b.place(el);
      b.menu(eq.menu, [{ label: 'Solve', target: solve }, { label: 'Notes', target: notes }], [{ label: 'Back', target: tl }]);

      // Notes
      b.place(notes);
      b.pages(eq.notes, eq.display);
      b.goto(el);

      // Solve
      b.place(solve);
      if (eq.compute) {
        emitCompute(b, eq, solve, el);
      } else {
        emitSolveMenu(b, eq, solve, el);
      }
    }
  }

  return { name: subject.program, source: b.source() };
}

function emitMode(b: ProgramBuilder, eq: Equation) {
  if (eq.mode === 'deg') b.raw('Degree');
  if (eq.mode === 'rad') b.raw('Radian');
}

function emitCompute(b: ProgramBuilder, eq: Equation, solve: Label, back: Label) {
  const c = eq.compute!;
  b.clrHome();
  b.disp(eq.display);
  emitMode(b, eq);
  for (const sym of c.inputs) {
    const v = eq.vars.find((x) => x.sym === sym)!;
    b.input(`${v.name}=`, sym);
  }
  if (c.code) for (const line of c.code) b.raw(line);
  else for (const o of c.outputs) b.store(o.expr, o.sym);
  b.clrHome();
  b.disp(eq.display);
  for (const o of c.outputs) b.dispValue(`${o.name}=`, o.sym);
  b.pause();
  b.menu(eq.menu, [{ label: 'Again', target: solve }], [{ label: 'Back', target: back }]);
}

function emitSolveMenu(b: ProgramBuilder, eq: Equation, solve: Label, back: Label) {
  const solvable = Object.keys(eq.solve ?? {});
  const varLabels = new Map<string, Label>();
  const items: MenuItem[] = solvable.map((sym) => {
    const v = eq.vars.find((x) => x.sym === sym)!;
    const l = b.label();
    varLabels.set(sym, l);
    return { label: v.name, target: l };
  });
  b.menu('SOLVE FOR', items, [{ label: 'Back', target: back }]);

  for (const sym of solvable) {
    const expr = eq.solve![sym];
    const target = eq.vars.find((x) => x.sym === sym)!;
    b.place(varLabels.get(sym)!);
    b.clrHome();
    b.disp(eq.display);
    emitMode(b, eq);
    for (const v of eq.vars) {
      if (v.sym === sym) continue;
      if (!variablesIn(expr).includes(v.sym)) continue; // not needed for this rearrangement
      b.input(`${v.name}=`, v.sym);
    }
    b.store(expr, sym);
    b.dispValue(`${target.name}=`, sym);
    b.pause();
    b.goto(solve);
  }
}

export function validateSubject(s: Subject): void {
  if (!/^[A-Z][A-Z0-9]{0,7}$/.test(s.program)) throw new Error(`Bad program name ${s.program}`);
  const constSyms = new Set((s.constants ?? []).map((c) => c.sym));
  for (const t of s.topics) {
    for (const e of t.equations) {
      const syms = new Set<string>();
      for (const v of e.vars) {
        if (!/^[A-Z]$/.test(v.sym)) throw new Error(`${e.id}: variable symbol must be a single letter, got ${v.sym}`);
        if (syms.has(v.sym)) throw new Error(`${e.id}: duplicate variable ${v.sym}`);
        if (constSyms.has(v.sym)) throw new Error(`${e.id}: variable ${v.sym} clashes with a constant`);
        syms.add(v.sym);
      }
      if (e.solve && e.compute) throw new Error(`${e.id}: use either solve or compute`);
      if (!e.solve && !e.compute) throw new Error(`${e.id}: needs solve or compute`);
      if (e.solve) {
        for (const [sym, expr] of Object.entries(e.solve)) {
          if (!syms.has(sym)) throw new Error(`${e.id}: solve target ${sym} is not a declared variable`);
          for (const used of variablesIn(expr)) {
            if (used === sym && !expr.includes('solve(')) throw new Error(`${e.id}: expression for ${sym} refers to itself`);
            if (!syms.has(used) && !constSyms.has(used)) throw new Error(`${e.id}: expression for ${sym} uses undeclared ${used}`);
          }
        }
      }
      if (e.compute) {
        for (const i of e.compute.inputs) if (!syms.has(i)) throw new Error(`${e.id}: compute input ${i} undeclared`);
        for (const o of e.compute.outputs) {
          if (!/^[A-Z]$/.test(o.sym)) throw new Error(`${e.id}: output symbol ${o.sym}`);
          if (e.compute.code) continue; // code blocks are checked by the linter, not the evaluator
          for (const used of variablesIn(o.expr)) {
            if (!e.compute.inputs.includes(used) && !constSyms.has(used) && !e.compute.outputs.some((x) => x.sym === used)) {
              throw new Error(`${e.id}: output ${o.sym} uses ${used} which is not an input`);
            }
          }
        }
      }
    }
  }
}
