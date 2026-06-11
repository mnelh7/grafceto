import { useRef, useState, useCallback, useEffect } from 'react';
import GrafcetRenderer from './GrafcetRenderer';
import type { GrafcetModel } from '../lib/parser';
import type { AppConfig } from '../App';
import { computeLayout } from '../lib/layout';

interface Transform {
  x: number;
  y: number;
  scale: number;
}

interface Props {
  model: GrafcetModel | null;
  lastValidModel: GrafcetModel | null;
  hasErrors: boolean;
  config: AppConfig;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;
const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

export default function PreviewCanvas({ model, lastValidModel, hasErrors, config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ mx: number; my: number; tx: number; ty: number } | null>(null);

  const activeModel = model ?? lastValidModel;
  const faded = hasErrors && !model && !!lastValidModel;

  // Compute fit-view transform
  const fitView = useCallback(() => {
    if (!activeModel || !containerRef.current) return;
    const layout = computeLayout(activeModel);
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const padding = 48;
    const scale = clampScale(
      Math.min((cw - padding * 2) / layout.svgWidth, (ch - padding * 2) / layout.svgHeight)
    );
    setTransform({
      scale,
      x: (cw - layout.svgWidth * scale) / 2,
      y: (ch - layout.svgHeight * scale) / 2,
    });
  }, [activeModel]);

  // Fit on initial model load
  useEffect(() => {
    fitView();
  }, [fitView]);

  // Keyboard shortcut: Ctrl/Cmd+Enter → fit view
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        fitView();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fitView]);

  // Pan
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { mx: e.clientX, my: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    setTransform(t => ({
      ...t,
      x: panStart.current!.tx + e.clientX - panStart.current!.mx,
      y: panStart.current!.ty + e.clientY - panStart.current!.my,
    }));
  }, [isPanning]);

  const onMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // Zoom via scroll wheel — keeps cursor point stationary
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setTransform(t => {
      const factor = e.deltaY < 0 ? 1.1 : 0.91;
      const newScale = clampScale(t.scale * factor);
      const ratio = newScale / t.scale;
      return {
        scale: newScale,
        x: mx - (mx - t.x) * ratio,
        y: my - (my - t.y) * ratio,
      };
    });
  }, []);

  const zoomIn = () => setTransform(t => {
    const s = clampScale(t.scale * 1.2);
    const cx = (containerRef.current?.clientWidth ?? 600) / 2;
    const cy = (containerRef.current?.clientHeight ?? 400) / 2;
    return { scale: s, x: cx - (cx - t.x) * (s / t.scale), y: cy - (cy - t.y) * (s / t.scale) };
  });

  const zoomOut = () => setTransform(t => {
    const s = clampScale(t.scale / 1.2);
    const cx = (containerRef.current?.clientWidth ?? 600) / 2;
    const cy = (containerRef.current?.clientHeight ?? 400) / 2;
    return { scale: s, x: cx - (cx - t.x) * (s / t.scale), y: cy - (cy - t.y) * (s / t.scale) };
  });

  const reset = () => setTransform({ x: 0, y: 0, scale: 1 });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${config.showGrid ? 'dotted-grid' : 'bg-slate-50'}`}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {activeModel ? (
          <div
            style={{
              position: 'absolute',
              transformOrigin: '0 0',
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              willChange: 'transform',
            }}
          >
            <GrafcetRenderer model={activeModel} config={config} faded={faded} />
          </div>
        ) : (
          <EmptyState />
        )}

        {/* Zoom controls — floating pill top-center */}
        <ZoomControls
          scale={transform.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fitView}
          onReset={reset}
        />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="bg-white/80 rounded-xl border border-slate-200 px-8 py-6 text-center shadow-sm">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="mx-auto mb-3" aria-hidden="true">
          <rect x="4" y="4" width="36" height="36" rx="2" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="10" y="10" width="24" height="24" rx="1" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="22" y1="0" x2="22" y2="10" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="22" y1="34" x2="22" y2="44" stroke="#cbd5e1" strokeWidth="2" />
        </svg>
        <p className="text-sm font-medium text-slate-500">Write GRAFCET DSL to see your diagram</p>
        <p className="text-xs text-slate-400 mt-1">Try "Load example" to get started</p>
      </div>
    </div>
  );
}

// ── Zoom control pill ─────────────────────────────────────────
interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

function ZoomControls({ scale, onZoomIn, onZoomOut, onFit, onReset }: ZoomControlsProps) {
  const btn = 'flex items-center justify-center w-8 h-8 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500';

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-white/95 border border-slate-200 rounded-lg shadow-sm px-1 py-1 backdrop-blur-sm"
      onMouseDown={e => e.stopPropagation()}
    >
      <button className={btn} onClick={onZoomOut} title="Zoom out">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <span className="text-[11px] font-mono text-slate-400 w-10 text-center select-none">
        {Math.round(scale * 100)}%
      </span>

      <button className={btn} onClick={onZoomIn} title="Zoom in">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="4" x2="6" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      <button className={btn} onClick={onFit} title="Fit view (Ctrl+Enter)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button className={btn} onClick={onReset} title="Reset view">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 7a5 5 0 1 0 1.5-3.5L1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M1 2v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
