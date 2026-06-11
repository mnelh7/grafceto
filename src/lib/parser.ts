export interface GrafcetStep {
  id: string;
  label: string;
  initial: boolean;
  actions: string[];
}

export interface GrafcetTransition {
  id: string;
  from: string[];
  to: string[];
  condition: string;
}

export interface GrafcetModel {
  title: string;
  steps: GrafcetStep[];
  transitions: GrafcetTransition[];
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  model: GrafcetModel | null;
  errors: ParseError[];
}

// ──────────────────────────────────────────────────────────
// Tokenizer helpers
// ──────────────────────────────────────────────────────────

function stripInlineComment(s: string): string {
  return s.replace(/\/\/.*$/, '').trimEnd();
}

function unquote(s: string): string {
  const m = s.match(/^"([^"]*)"$/);
  return m ? m[1] : s.trim();
}

function parseIdList(s: string): string[] {
  // "[S1, S2]" or "S1"
  const trimmed = s.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
  }
  return [trimmed];
}

// ──────────────────────────────────────────────────────────
// Main parser
// ──────────────────────────────────────────────────────────

export function parse(source: string): ParseResult {
  const errors: ParseError[] = [];
  const lines = source.split('\n');

  const model: GrafcetModel = { title: '', steps: [], transitions: [] };

  let inGrafcetBlock = false;
  let blockDepth = 0;

  // For multi-line verbose step/transition
  let currentStep: GrafcetStep | null = null;
  let currentStepLineNum = 0;

  let transitionCounter = 0;
  let stepIdSet = new Set<string>();

  function addError(lineNum: number, msg: string) {
    errors.push({ line: lineNum + 1, message: msg });
  }

  function finalizeStep() {
    if (currentStep) {
      if (stepIdSet.has(currentStep.id)) {
        addError(currentStepLineNum, `Duplicate step ID: ${currentStep.id}`);
      } else {
        stepIdSet.add(currentStep.id);
        model.steps.push(currentStep);
      }
      currentStep = null;
    }
  }

  // First pass: find grafcet block header
  let grafcetHeaderLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const raw = stripInlineComment(lines[i]).trim();
    const headerMatch = raw.match(/^grafcet\s+("([^"]+)")?\s*\{?/);
    if (headerMatch) {
      grafcetHeaderLine = i;
      model.title = headerMatch[2] ?? 'Untitled';
      inGrafcetBlock = true;
      blockDepth = raw.endsWith('{') ? 1 : 0;
      break;
    }
  }

  if (!inGrafcetBlock) {
    addError(0, 'Missing grafcet block. Start with: grafcet "Title" { ... }');
    return { model: null, errors };
  }

  // Second pass: parse body
  for (let i = grafcetHeaderLine + 1; i < lines.length; i++) {
    const raw = stripInlineComment(lines[i]);
    const trimmed = raw.trim();

    if (!trimmed) continue;

    // Track braces for block depth
    const openBraces = (raw.match(/\{/g) || []).length;
    const closeBraces = (raw.match(/\}/g) || []).length;

    // Closing a step block
    if (trimmed === '}' && currentStep) {
      blockDepth += openBraces - closeBraces;
      finalizeStep();
      continue;
    }

    blockDepth += openBraces - closeBraces;

    if (blockDepth <= 0 && trimmed === '}') {
      // End of grafcet block
      finalizeStep();
      break;
    }

    // Inside a step body (action lines)
    if (currentStep && blockDepth >= 2) {
      const actionMatch = trimmed.match(/^action\s+"([^"]+)"/);
      if (actionMatch) {
        currentStep.actions.push(actionMatch[1]);
      }
      continue;
    }

    // ── VERBOSE STEP ─────────────────────────────────────
    // initial step S0 "Label" {
    // step S1 "Label" {
    const verboseStepMatch = trimmed.match(
      /^(initial\s+)?step\s+(\w+)(?:\s+"([^"]*)")?\s*\{?/
    );
    if (verboseStepMatch) {
      finalizeStep();
      const isInitial = !!verboseStepMatch[1];
      const id = verboseStepMatch[2];
      const label = verboseStepMatch[3] ?? id;
      currentStep = { id, label, initial: isInitial, actions: [] };
      currentStepLineNum = i;
      continue;
    }

    // ── VERBOSE TRANSITION ────────────────────────────────
    // transition T1 from S0 to S1 when "cond"
    const verboseTransMatch = trimmed.match(
      /^transition\s+(\w+)\s+from\s+(\[[\w,\s]+\]|\w+)\s+to\s+(\[[\w,\s]+\]|\w+)(?:\s+when\s+("([^"]*)"))?/
    );
    if (verboseTransMatch) {
      finalizeStep();
      const id = verboseTransMatch[1];
      const from = parseIdList(verboseTransMatch[2]);
      const to = parseIdList(verboseTransMatch[3]);
      const condition = verboseTransMatch[5] ?? '1';
      model.transitions.push({ id, from, to, condition });
      continue;
    }

    // ── COMPACT STEP ─────────────────────────────────────
    // initial S0: "Label" / "Action"
    // S1: "Label" / "Action1" / "Action2"
    const compactStepMatch = trimmed.match(
      /^(initial\s+)?(\w+)\s*:\s*"([^"]*)"(.*)/
    );
    if (compactStepMatch && !trimmed.match(/^T\d+\s*:|^\w+\s*:\s*\[?\w+\s*->/) ) {
      // Make sure it's not a transition line
      const possibleTransArrow = compactStepMatch[4] && compactStepMatch[4].includes('->');
      if (!possibleTransArrow) {
        finalizeStep();
        const isInitial = !!compactStepMatch[1];
        const id = compactStepMatch[2];
        const label = compactStepMatch[3];
        const rest = compactStepMatch[4];
        const actions: string[] = [];
        // Parse / "action" / "action" ...
        const actionParts = rest.match(/"([^"]*)"/g);
        if (actionParts) {
          actionParts.forEach(a => actions.push(unquote(a)));
        }
        if (stepIdSet.has(id)) {
          addError(i, `Duplicate step ID: ${id}`);
        } else {
          stepIdSet.add(id);
          model.steps.push({ id, label, initial: isInitial, actions });
        }
        continue;
      }
    }

    // ── COMPACT TRANSITION ────────────────────────────────
    // T1: S0 -> S1 when "cond"
    // T1: S0 -> [S1, S2] when "cond"
    // T1: [S1, S2] -> S3 when "cond"
    const compactTransMatch = trimmed.match(
      /^(\w+)\s*:\s*(\[[\w,\s]+\]|\w+)\s*->\s*(\[[\w,\s]+\]|\w+)(?:\s+when\s+"([^"]*)")?/
    );
    if (compactTransMatch) {
      finalizeStep();
      const id = compactTransMatch[1];
      const from = parseIdList(compactTransMatch[2]);
      const to = parseIdList(compactTransMatch[3]);
      const condition = compactTransMatch[4] ?? '1';
      model.transitions.push({ id, from, to, condition });
      continue;
    }

    // ── BARE TRANSITION (no id prefix) ────────────────────
    // S0 -> S1 when "cond"
    const bareTransMatch = trimmed.match(
      /^(\[[\w,\s]+\]|\w+)\s*->\s*(\[[\w,\s]+\]|\w+)(?:\s+when\s+"([^"]*)")?/
    );
    if (bareTransMatch) {
      finalizeStep();
      transitionCounter++;
      const id = `T${transitionCounter}`;
      const from = parseIdList(bareTransMatch[1]);
      const to = parseIdList(bareTransMatch[2]);
      const condition = bareTransMatch[3] ?? '1';
      model.transitions.push({ id, from, to, condition });
      continue;
    }

    // ── action inline (inside verbose step, depth 1) ──────
    if (currentStep) {
      const actionMatch = trimmed.match(/^action\s+"([^"]+)"/);
      if (actionMatch) {
        currentStep.actions.push(actionMatch[1]);
        continue;
      }
    }

    // ── Unrecognized line ──────────────────────────────────
    if (trimmed !== '{' && trimmed !== '}') {
      addError(i, `Unrecognized syntax: ${trimmed.slice(0, 60)}`);
    }
  }

  finalizeStep();

  // ── Validation ────────────────────────────────────────────
  for (const t of model.transitions) {
    for (const sid of [...t.from, ...t.to]) {
      if (!stepIdSet.has(sid)) {
        errors.push({ line: 0, message: `Transition ${t.id}: references unknown step "${sid}"` });
      }
    }
  }

  if (model.steps.length === 0 && errors.length === 0) {
    addError(grafcetHeaderLine, 'No steps found in grafcet block.');
  }

  return {
    model: errors.length === 0 || model.steps.length > 0 ? model : null,
    errors,
  };
}
