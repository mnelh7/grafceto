import type { GrafcetModel, GrafcetStep, GrafcetTransition } from './parser';

// ──────────────────────────────────────────────────────────
// Layout constants
// ──────────────────────────────────────────────────────────

export const STEP_W = 72;
export const STEP_H = 48;
export const TRANS_H = 16; // height of transition bar zone
export const ACTION_W = 120;
export const ACTION_H = 28;
export const ROW_GAP = 60;   // vertical space between step rows
export const COL_GAP = 120;  // horizontal space between parallel branches
export const PAD_X = 80;
export const PAD_Y = 60;

export interface LayoutStep {
  step: GrafcetStep;
  x: number;
  y: number;
  col: number;
  row: number;
}

export interface LayoutTransition {
  transition: GrafcetTransition;
  x: number; // center x of bar
  y: number; // center y of bar
  barWidth: number;
  fromCenters: { x: number; y: number }[];
  toCenters: { x: number; y: number }[];
}

export interface LayoutResult {
  steps: LayoutStep[];
  transitions: LayoutTransition[];
  svgWidth: number;
  svgHeight: number;
}

// ──────────────────────────────────────────────────────────
// Build a simple layer graph
// ──────────────────────────────────────────────────────────

interface Layer {
  stepIds: string[];
  transId: string | null; // transition that follows this layer
}

export function computeLayout(model: GrafcetModel): LayoutResult {
  const { steps, transitions } = model;

  if (steps.length === 0) {
    return { steps: [], transitions: [], svgWidth: 400, svgHeight: 200 };
  }

  // Build adjacency
  const stepById = new Map<string, GrafcetStep>(steps.map(s => [s.id, s]));
  const transById = new Map<string, GrafcetTransition>(transitions.map(t => [t.id, t]));

  // Assign row layers using topological sort
  const inDegree = new Map<string, number>();
  const adjOut = new Map<string, string[]>(); // stepId -> transIds
  const adjIn = new Map<string, string[]>();  // stepId -> transIds

  for (const s of steps) {
    inDegree.set(s.id, 0);
    adjOut.set(s.id, []);
    adjIn.set(s.id, []);
  }

  for (const t of transitions) {
    for (const sid of t.from) {
      adjOut.get(sid)?.push(t.id);
    }
    for (const sid of t.to) {
      adjIn.get(sid)?.push(t.id);
    }
  }

  // Row assignment: BFS from initial steps
  const rowOf = new Map<string, number>();
  const queue: string[] = [];

  // Start from initial steps (or first step if none marked)
  const initials = steps.filter(s => s.initial);
  const starts = initials.length > 0 ? initials : [steps[0]];
  for (const s of starts) {
    rowOf.set(s.id, 0);
    queue.push(s.id);
  }

  // BFS through transitions
  let head = 0;
  while (head < queue.length) {
    const sid = queue[head++];
    const row = rowOf.get(sid) ?? 0;
    const outTrans = adjOut.get(sid) ?? [];
    for (const tid of outTrans) {
      const t = transById.get(tid);
      if (!t) continue;
      // Transition appears at row + 0.5
      const transRow = row + 1;
      for (const tsid of t.to) {
        const existing = rowOf.get(tsid);
        if (existing === undefined || existing < transRow) {
          rowOf.set(tsid, transRow);
          queue.push(tsid);
        }
      }
    }
  }

  // Steps not reachable: assign them sequentially after max row
  let maxRow = 0;
  for (const r of rowOf.values()) maxRow = Math.max(maxRow, r);
  for (const s of steps) {
    if (!rowOf.has(s.id)) {
      maxRow++;
      rowOf.set(s.id, maxRow);
    }
  }

  // Group steps by row
  const byRow = new Map<number, string[]>();
  const sortedRows: number[] = [];
  for (const [sid, row] of rowOf.entries()) {
    if (!byRow.has(row)) { byRow.set(row, []); sortedRows.push(row); }
    byRow.get(row)!.push(sid);
  }
  sortedRows.sort((a, b) => a - b);

  // Column assignment within row: try to inherit from parent
  const colOf = new Map<string, number>();

  // For row 0 steps, assign columns 0, 1, 2...
  const row0 = byRow.get(sortedRows[0]) ?? [];
  row0.forEach((sid, i) => colOf.set(sid, i));

  for (const row of sortedRows.slice(1)) {
    const rowSteps = byRow.get(row) ?? [];
    // Check if they come from a parallel split
    const assignedCols = new Set<number>();
    for (const sid of rowSteps) {
      // Find transition(s) leading to this step
      const inTrans = (adjIn.get(sid) ?? []).map(tid => transById.get(tid)!).filter(Boolean);
      let parentCol: number | undefined;
      for (const t of inTrans) {
        for (const fsid of t.from) {
          const c = colOf.get(fsid);
          if (c !== undefined) { parentCol = c; break; }
        }
        if (parentCol !== undefined) break;
      }
      if (parentCol !== undefined && !assignedCols.has(parentCol)) {
        colOf.set(sid, parentCol);
        assignedCols.add(parentCol);
      }
    }
    // Steps that didn't get a column yet: assign new ones
    let nextFree = 0;
    for (const sid of rowSteps) {
      if (!colOf.has(sid)) {
        while (assignedCols.has(nextFree)) nextFree++;
        colOf.set(sid, nextFree);
        assignedCols.add(nextFree);
        nextFree++;
      }
    }
  }

  // For parallel branches (multiple to[]), spread them side by side
  for (const t of transitions) {
    if (t.to.length > 1) {
      let baseCol = 0;
      if (t.from.length > 0) baseCol = colOf.get(t.from[0]) ?? 0;
      const half = (t.to.length - 1) / 2;
      t.to.forEach((sid, i) => {
        colOf.set(sid, baseCol + (i - half));
      });
    }
  }

  // Compute max col
  let maxCol = 0;
  for (const c of colOf.values()) maxCol = Math.max(maxCol, c);

  // X positions: center branches, allow negative cols
  const minCol = Math.min(...colOf.values());

  const colWidth = STEP_W + COL_GAP;

  // Compute SVG coordinates
  const layoutSteps: LayoutStep[] = [];

  for (const row of sortedRows) {
    const rowSteps = byRow.get(row) ?? [];
    for (const sid of rowSteps) {
      const s = stepById.get(sid);
      if (!s) continue;
      const col = colOf.get(sid) ?? 0;
      const x = PAD_X + (col - minCol) * colWidth;
      const y = PAD_Y + row * (STEP_H + ROW_GAP + TRANS_H + 16);
      layoutSteps.push({ step: s, x, y, col, row });
    }
  }

  const stepPosById = new Map<string, { x: number; y: number }>();
  for (const ls of layoutSteps) {
    stepPosById.set(ls.step.id, { x: ls.x, y: ls.y });
  }

  // Layout transitions: place between from steps (bottom) and to steps (top)
  const layoutTransitions: LayoutTransition[] = [];

  for (const t of transitions) {
    const fromPositions = t.from
      .map(sid => stepPosById.get(sid))
      .filter((p): p is { x: number; y: number } => !!p);
    const toPositions = t.to
      .map(sid => stepPosById.get(sid))
      .filter((p): p is { x: number; y: number } => !!p);

    if (fromPositions.length === 0 || toPositions.length === 0) continue;

    // Transition bar y: midpoint between bottom of from-steps and top of to-steps
    const fromBottoms = fromPositions.map(p => p.y + STEP_H);
    const toTops = toPositions.map(p => p.y);
    const maxFromBottom = Math.max(...fromBottoms);
    const minToTop = Math.min(...toTops);
    const barY = (maxFromBottom + minToTop) / 2;

    // Transition bar x: center of all involved steps
    const allX = [...fromPositions, ...toPositions].map(p => p.x + STEP_W / 2);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const barX = (minX + maxX) / 2;
    const barWidth = t.from.length > 1 || t.to.length > 1
      ? maxX - minX + STEP_W / 2
      : 40; // single connection bar

    const fromCenters = fromPositions.map(p => ({ x: p.x + STEP_W / 2, y: p.y + STEP_H }));
    const toCenters = toPositions.map(p => ({ x: p.x + STEP_W / 2, y: p.y }));

    layoutTransitions.push({
      transition: t,
      x: barX,
      y: barY,
      barWidth,
      fromCenters,
      toCenters,
    });
  }

  // Compute total SVG size
  let maxX = 0, maxY = 0;
  for (const ls of layoutSteps) {
    maxX = Math.max(maxX, ls.x + STEP_W + ACTION_W + 20);
    maxY = Math.max(maxY, ls.y + STEP_H);
  }

  const svgWidth = maxX + PAD_X;
  const svgHeight = maxY + PAD_Y + 40;

  return { steps: layoutSteps, transitions: layoutTransitions, svgWidth, svgHeight };
}
