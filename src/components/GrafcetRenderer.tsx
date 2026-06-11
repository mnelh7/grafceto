import { useMemo } from 'react';
import { computeLayout, STEP_W, STEP_H, ACTION_W, ACTION_H } from '../lib/layout';
import type { LayoutStep, LayoutTransition } from '../lib/layout';
import type { GrafcetModel } from '../lib/parser';
import type { AppConfig } from '../App';

// ── Color tokens ─────────────────────────────────────────────
const C = {
  stroke: '#1e293b',
  strokeLight: '#94a3b8',
  connector: '#475569',
  stepFill: '#ffffff',
  initialAccent: '#3b82f6',
  actionFill: '#f8fafc',
  conditionText: '#475569',
  labelText: '#1e293b',
  titleText: '#0f172a',
};

// ── Helpers ───────────────────────────────────────────────────
function stepNum(id: string): string {
  const m = id.match(/\d+$/);
  return m ? m[0] : id.slice(0, 4);
}

function clip(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ── Step box ──────────────────────────────────────────────────
function StepNode({ ls, config }: { ls: LayoutStep; config: AppConfig }) {
  const { step, x, y } = ls;
  const scx = x + STEP_W / 2;
  const scy = y + STEP_H / 2;
  const inside = config.labelPosition === 'inside';

  return (
    <g>
      {step.initial && (
        <rect
          x={x - 5} y={y - 5}
          width={STEP_W + 10} height={STEP_H + 10}
          fill="none"
          stroke={C.initialAccent}
          strokeWidth={1.5}
          rx={1}
        />
      )}
      <rect
        x={x} y={y}
        width={STEP_W} height={STEP_H}
        fill={C.stepFill}
        stroke={C.stroke}
        strokeWidth={2}
        rx={1}
      />
      {inside ? (
        <text x={scx} y={scy + 4} textAnchor="middle" fontSize={9.5} fill={C.labelText}
          fontFamily="system-ui,sans-serif">
          {clip(step.label, 9)}
        </text>
      ) : (
        <>
          <text x={scx} y={scy + 5} textAnchor="middle" fontSize={14} fontWeight={700}
            fill={C.stroke} fontFamily="system-ui,sans-serif">
            {stepNum(step.id)}
          </text>
          <text x={scx} y={y + STEP_H + 15} textAnchor="middle" fontSize={11} fill={C.labelText}
            fontFamily="system-ui,sans-serif">
            {clip(step.label, 18)}
          </text>
        </>
      )}
    </g>
  );
}

// ── Action boxes ──────────────────────────────────────────────
function ActionBoxes({ ls }: { ls: LayoutStep }) {
  const { step, x, y } = ls;
  if (step.actions.length === 0) return null;

  const connX = x + STEP_W;
  const boxX = connX + 14;
  const stepCY = y + STEP_H / 2;
  const totalH = step.actions.length * ACTION_H + (step.actions.length - 1) * 4;
  const startY = stepCY - totalH / 2;

  return (
    <g>
      <line x1={connX} y1={stepCY} x2={boxX} y2={stepCY}
        stroke={C.strokeLight} strokeWidth={1.2} />
      {step.actions.map((action, i) => {
        const ay = startY + i * (ACTION_H + 4);
        return (
          <g key={`${action}-${i}`}>
            {i > 0 && (
              <line x1={boxX + ACTION_W / 2} y1={ay - 4} x2={boxX + ACTION_W / 2} y2={ay}
                stroke={C.strokeLight} strokeWidth={1} />
            )}
            <rect x={boxX} y={ay} width={ACTION_W} height={ACTION_H}
              fill={C.actionFill} stroke={C.strokeLight} strokeWidth={1.2} rx={2} />
            <text x={boxX + ACTION_W / 2} y={ay + ACTION_H / 2 + 4}
              textAnchor="middle" fontSize={10} fill={C.labelText}
              fontFamily="system-ui,sans-serif">
              {clip(action, 20)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// ── Normal transition (downward flow) ─────────────────────────
function NormalTransition({ lt }: { lt: LayoutTransition }) {
  const { transition, fromCenters, toCenters } = lt;
  const isMultiFrom = fromCenters.length > 1;
  const isMultiTo = toCenters.length > 1;

  const maxFromY = Math.max(...fromCenters.map(c => c.y));
  const minToY = Math.min(...toCenters.map(c => c.y));
  const gap = minToY - maxFromY;

  // X span for branch/join bars
  const allX = [...fromCenters, ...toCenters].map(c => c.x);
  const spanLeft = Math.min(...allX);
  const spanRight = Math.max(...allX);
  const spanCx = (spanLeft + spanRight) / 2;

  // Transition bar is always 40px wide, centered on spanCx
  const tBarHalf = 20;

  let transY: number;
  let joinY: number | null = null;
  let branchY: number | null = null;

  if (isMultiFrom && isMultiTo) {
    joinY   = maxFromY + gap * 0.2;
    transY  = maxFromY + gap * 0.5;
    branchY = maxFromY + gap * 0.75;
  } else if (isMultiTo) {
    // branch: trans bar first, then divergence double-bar below
    transY  = maxFromY + gap * 0.28;
    branchY = maxFromY + gap * 0.62;
  } else if (isMultiFrom) {
    // join: convergence double-bar first, then trans bar below
    joinY  = maxFromY + gap * 0.28;
    transY = maxFromY + gap * 0.62;
  } else {
    transY = maxFromY + gap * 0.5;
  }

  return (
    <g>
      {/* Lines from each source step bottom */}
      {fromCenters.map((fc, i) => (
        <line key={`fc${i}`}
          x1={fc.x} y1={fc.y}
          x2={fc.x} y2={joinY !== null ? joinY : transY - 2}
          stroke={C.connector} strokeWidth={1.5} />
      ))}

      {/* Convergence bar (join) */}
      {joinY !== null && (
        <>
          <line x1={spanLeft} y1={joinY} x2={spanRight} y2={joinY}
            stroke={C.stroke} strokeWidth={3} />
          <line x1={spanLeft} y1={joinY + 5} x2={spanRight} y2={joinY + 5}
            stroke={C.stroke} strokeWidth={3} />
          <line x1={spanCx} y1={joinY + 5} x2={spanCx} y2={transY - 2}
            stroke={C.connector} strokeWidth={1.5} />
        </>
      )}

      {/* Transition bar */}
      <line
        x1={spanCx - tBarHalf} y1={transY}
        x2={spanCx + tBarHalf} y2={transY}
        stroke={C.stroke} strokeWidth={4}
      />

      {/* Condition label */}
      <text x={spanCx + tBarHalf + 7} y={transY + 4}
        fontSize={10} fill={C.conditionText} fontStyle="italic"
        fontFamily="system-ui,sans-serif">
        {clip(transition.condition, 30)}
      </text>

      {/* Divergence bar (branch) */}
      {branchY !== null && (
        <>
          <line x1={spanCx} y1={transY + 2} x2={spanCx} y2={branchY}
            stroke={C.connector} strokeWidth={1.5} />
          <line x1={spanLeft} y1={branchY} x2={spanRight} y2={branchY}
            stroke={C.stroke} strokeWidth={3} />
          <line x1={spanLeft} y1={branchY + 5} x2={spanRight} y2={branchY + 5}
            stroke={C.stroke} strokeWidth={3} />
        </>
      )}

      {/* Lines to each target step top */}
      {toCenters.map((tc, i) => (
        <line key={`tc${i}`}
          x1={tc.x}
          y1={branchY !== null ? branchY + 5 : transY + 2}
          x2={tc.x} y2={tc.y}
          stroke={C.connector} strokeWidth={1.5} />
      ))}
    </g>
  );
}

// ── Loop-back routing (target is above source) ────────────────
function LoopBackTransition({ lt, routeX }: { lt: LayoutTransition; routeX: number }) {
  const { transition, fromCenters, toCenters } = lt;
  const fc = fromCenters[0];
  const tc = toCenters[0];

  const downY = fc.y + 18;
  const upY = tc.y - 18;
  const transY = (downY + upY) / 2;

  // Two-segment path with gap at transition bar
  const seg1 = `M ${fc.x} ${fc.y} L ${fc.x} ${downY} L ${routeX} ${downY} L ${routeX} ${transY - 2}`;
  const seg2 = `M ${routeX} ${transY + 2} L ${routeX} ${upY} L ${tc.x} ${upY} L ${tc.x} ${tc.y}`;

  return (
    <g>
      <path d={seg1} fill="none" stroke={C.connector} strokeWidth={1.5} />
      <path d={seg2} fill="none" stroke={C.connector} strokeWidth={1.5} />
      {/* Bar perpendicular to the routing path */}
      <line
        x1={routeX - 20} y1={transY}
        x2={routeX + 20} y2={transY}
        stroke={C.stroke} strokeWidth={4}
      />
      {/* Condition to the right of the bar */}
      <text x={routeX + 23} y={transY + 4}
        fontSize={10} fill={C.conditionText} fontStyle="italic"
        fontFamily="system-ui,sans-serif">
        {clip(transition.condition, 24)}
      </text>
    </g>
  );
}

// ── Main renderer ─────────────────────────────────────────────
interface Props {
  model: GrafcetModel;
  config: AppConfig;
  faded?: boolean;
}

export default function GrafcetRenderer({ model, config, faded = false }: Props) {
  const layout = useMemo(() => computeLayout(model), [model]);

  if (layout.steps.length === 0) return null;

  const minStepX = Math.min(...layout.steps.map(ls => ls.x));
  const loopRouteX = minStepX - 48;

  const W = layout.svgWidth;
  const H = layout.svgHeight;

  return (
    <svg
      id="grafcet-svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: faded ? 0.3 : 1, transition: 'opacity 0.2s' }}
    >
      {/* Title */}
      <text
        x={W / 2} y={30}
        textAnchor="middle"
        fontSize={15} fontWeight={600}
        fill={C.titleText}
        fontFamily="system-ui,sans-serif"
        letterSpacing={0.4}
      >
        {model.title}
      </text>

      {/* Connectors drawn first so step boxes sit on top */}
      {layout.transitions.map(lt => {
        const maxFromY = Math.max(...lt.fromCenters.map(c => c.y));
        const minToY = Math.min(...lt.toCenters.map(c => c.y));
        const isLoopBack = minToY < maxFromY && lt.fromCenters.length === 1 && lt.toCenters.length === 1;
        return isLoopBack
          ? <LoopBackTransition key={lt.transition.id} lt={lt} routeX={loopRouteX} />
          : <NormalTransition key={lt.transition.id} lt={lt} />;
      })}

      {/* Step boxes */}
      {layout.steps.map(ls => (
        <StepNode key={ls.step.id} ls={ls} config={config} />
      ))}

      {/* Action boxes */}
      {config.showActions && layout.steps.map(ls => (
        <ActionBoxes key={ls.step.id} ls={ls} />
      ))}
    </svg>
  );
}
