import { useState, useMemo, useCallback, useRef } from 'react';
import { parse } from './lib/parser';
import type { GrafcetModel } from './lib/parser';
import { EXAMPLES, DEFAULT_EXAMPLE } from './examples';
import type { Example } from './examples';
import EditorPanel from './components/EditorPanel';
import PreviewCanvas from './components/PreviewCanvas';

// ── Logo mark: a minimal GRAFCET initial-step icon ──────────
function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="18" height="18" rx="1" stroke="#3b82f6" strokeWidth="1.5" />
      <rect x="5" y="5" width="12" height="12" rx="0.5" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="11" y1="0" x2="11" y2="5" stroke="#3b82f6" strokeWidth="1.5" />
      <line x1="11" y1="17" x2="11" y2="22" stroke="#3b82f6" strokeWidth="1.5" />
    </svg>
  );
}

// ── Header button component ──────────────────────────────────
interface HdrBtnProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'primary';
  disabled?: boolean;
  title?: string;
}

function HdrBtn({ onClick, children, variant = 'default', disabled, title }: HdrBtnProps) {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-1 disabled:opacity-40 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? `${base} bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700`
      : `${base} bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100`;
  return (
    <button className={styles} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

// ── Load example dropdown ────────────────────────────────────
interface LoadExampleMenuProps {
  onSelect: (ex: Example) => void;
}

function LoadExampleMenu({ onSelect }: LoadExampleMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleSelect = (ex: Example) => {
    onSelect(ex);
    setOpen(false);
  };

  // Close on outside click
  const handleBlur = (e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  };

  return (
    <div ref={ref} className="relative" onBlur={handleBlur}>
      <HdrBtn onClick={() => setOpen(o => !o)}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 4h10M2 7h7M2 10h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Load example
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </HdrBtn>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
          {EXAMPLES.map(ex => (
            <button
              key={ex.id}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              onClick={() => handleSelect(ex)}
            >
              <div className="font-medium">{ex.title}</div>
              <div className="text-xs text-slate-400 mt-0.5 truncate">{ex.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export interface AppConfig {
  showGrid: boolean;
  showActions: boolean;
  spacing: 'compact' | 'comfortable';
  labelPosition: 'inside' | 'below';
}

const DEFAULT_CONFIG: AppConfig = {
  showGrid: true,
  showActions: true,
  spacing: 'comfortable',
  labelPosition: 'below',
};

export default function App() {
  const [code, setCode] = useState(DEFAULT_EXAMPLE.code);
  const [activeExample, setActiveExample] = useState<Example>(DEFAULT_EXAMPLE);
  const [lastValidModel, setLastValidModel] = useState<GrafcetModel | null>(null);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  const parseResult = useMemo(() => parse(code), [code]);

  // Keep last valid model for faded preview on error
  useMemo(() => {
    if (parseResult.model) setLastValidModel(parseResult.model);
  }, [parseResult]);

  const handleLoadExample = useCallback((ex: Example) => {
    setCode(ex.code);
    setActiveExample(ex);
  }, []);

  const handleExportSVG = useCallback(() => {
    // Implemented in M5 — wired here as stub
    const svg = document.querySelector('#grafcet-svg') as SVGSVGElement | null;
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeExample.title.replace(/\s+/g, '-').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeExample]);

  const handleExportPNG = useCallback(() => {
    // Implemented in M5
  }, []);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code).catch(() => {});
  }, [code]);

  const hasDiagram = !!(parseResult.model ?? lastValidModel);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-shrink-0 h-13 flex items-center justify-between px-4 bg-white border-b border-slate-200 shadow-sm z-10">
        {/* Left: logo + name */}
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-semibold text-slate-800 text-sm tracking-tight">
            GRAFCET Live Generator
          </span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-500 border border-slate-200">
            v0.1.0
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <HdrBtn onClick={() => {}} title="Open DSL documentation">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 6.5v3M7 4.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Docs
          </HdrBtn>

          <LoadExampleMenu onSelect={handleLoadExample} />

          <div className="w-px h-5 bg-slate-200 mx-0.5" />

          <HdrBtn onClick={handleExportSVG} disabled={!hasDiagram} title="Export SVG (Ctrl+S)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 2v7M4 7l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export SVG
          </HdrBtn>

          <HdrBtn onClick={handleExportPNG} disabled={!hasDiagram} title="Export PNG">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1.5" y="2.5" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <path d="M1.5 9l3-3 2.5 2.5L9.5 6l3 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export PNG
          </HdrBtn>

          <HdrBtn onClick={handleCopyCode} title="Copy DSL code to clipboard">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="5" y="1.5" width="7.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <path d="M2 4H1.5A1 1 0 0 0 .5 5v7a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            Copy code
          </HdrBtn>
        </div>
      </header>

      {/* ── Main content ── */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left: editor */}
        <div className="flex-shrink-0 w-full md:w-[38%] border-r border-slate-200 flex flex-col overflow-hidden bg-white">
          <EditorPanel
            code={code}
            onChange={setCode}
            parseResult={parseResult}
            config={config}
            onConfigChange={setConfig}
            onLoadExample={handleLoadExample}
          />
        </div>

        {/* Right: live preview canvas */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <PreviewCanvas
            model={parseResult.model}
            lastValidModel={lastValidModel}
            hasErrors={parseResult.errors.length > 0}
            config={config}
          />
        </div>
      </div>
    </div>
  );
}

