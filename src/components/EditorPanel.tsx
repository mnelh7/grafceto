import { useState, useRef, useCallback } from 'react';
import type { ParseResult } from '../lib/parser';
import type { AppConfig } from '../App';
import type { Example } from '../examples';
import { EXAMPLES } from '../examples';

interface Props {
  code: string;
  onChange: (code: string) => void;
  parseResult: ParseResult;
  config: AppConfig;
  onConfigChange: (c: AppConfig) => void;
  onLoadExample: (ex: Example) => void;
}

type Tab = 'code' | 'config' | 'examples';

// ── Tab bar ─────────────────────────────────────────────────
function TabBar({ active, onSelect }: { active: Tab; onSelect: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'code', label: 'Code' },
    { id: 'config', label: 'Config' },
    { id: 'examples', label: 'Examples' },
  ];
  return (
    <div className="flex border-b border-slate-200 bg-white">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-[-2px] ${
            active === t.id
              ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Status bar ───────────────────────────────────────────────
function StatusBar({ parseResult }: { parseResult: ParseResult }) {
  const ok = parseResult.errors.length === 0 && parseResult.model !== null;
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-t ${
        ok
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-600 border-red-200'
      }`}
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      />
      {ok
        ? `Parsed successfully — ${parseResult.model!.steps.length} steps, ${parseResult.model!.transitions.length} transitions`
        : `${parseResult.errors.length} error${parseResult.errors.length !== 1 ? 's' : ''}`}
    </div>
  );
}

// ── Error list ───────────────────────────────────────────────
function ErrorList({ parseResult }: { parseResult: ParseResult }) {
  if (parseResult.errors.length === 0) return null;
  return (
    <div className="border-t border-red-100 bg-red-50 max-h-36 overflow-y-auto">
      {parseResult.errors.map((e, i) => (
        <div key={i} className="flex gap-2 px-3 py-1.5 text-xs text-red-700 border-b border-red-100 last:border-0">
          {e.line > 0 && (
            <span className="font-mono font-semibold text-red-400 flex-shrink-0 w-10 text-right">
              L{e.line}
            </span>
          )}
          <span>{e.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Code editor with line numbers ────────────────────────────
function CodeEditor({ code, onChange }: { code: string; onChange: (v: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  const lineCount = code.split('\n').length;

  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Indent with Tab instead of losing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const next = code.slice(0, start) + '  ' + code.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden font-mono text-[13px] leading-[1.6]">
      {/* Line numbers */}
      <div
        ref={lineNumRef}
        className="select-none overflow-hidden flex-shrink-0 w-10 pt-3 pb-3 text-right pr-2 pl-2 text-slate-400 bg-slate-50 border-r border-slate-100"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="code-textarea flex-1 overflow-auto"
        value={code}
        onChange={e => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        aria-label="GRAFCET DSL code editor"
      />
    </div>
  );
}

// ── Config tab ───────────────────────────────────────────────
function ConfigTab({ config, onChange }: { config: AppConfig; onChange: (c: AppConfig) => void }) {
  function Toggle({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
    return (
      <label className="flex items-center justify-between py-2.5 cursor-pointer group">
        <span className="text-sm text-slate-700 group-hover:text-slate-900">{label}</span>
        <button
          role="switch"
          aria-checked={checked}
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-blue-500 ${
            checked ? 'bg-blue-500' : 'bg-slate-200'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
      </label>
    );
  }

  function RadioGroup<T extends string>({
    label,
    value,
    options,
    onChange: onChangeRadio,
  }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
  }) {
    return (
      <div className="py-2.5">
        <p className="text-sm text-slate-700 mb-2">{label}</p>
        <div className="flex gap-2">
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => onChangeRadio(o.value)}
              className={`flex-1 py-1.5 text-xs rounded-md border transition-colors ${
                value === o.value
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-slate-100">
      <Toggle
        label="Show grid"
        checked={config.showGrid}
        onToggle={() => onChange({ ...config, showGrid: !config.showGrid })}
      />
      <Toggle
        label="Show action boxes"
        checked={config.showActions}
        onToggle={() => onChange({ ...config, showActions: !config.showActions })}
      />
      <RadioGroup
        label="Spacing"
        value={config.spacing}
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'comfortable', label: 'Comfortable' },
        ]}
        onChange={v => onChange({ ...config, spacing: v })}
      />
      <RadioGroup
        label="Step labels"
        value={config.labelPosition}
        options={[
          { value: 'below', label: 'Below box' },
          { value: 'inside', label: 'Inside box' },
        ]}
        onChange={v => onChange({ ...config, labelPosition: v })}
      />
    </div>
  );
}

// ── Examples tab ─────────────────────────────────────────────
function ExamplesTab({ onSelect }: { onSelect: (ex: Example) => void }) {
  return (
    <div className="flex-1 overflow-y-auto py-2">
      {EXAMPLES.map(ex => (
        <button
          key={ex.id}
          onClick={() => onSelect(ex)}
          className="w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-blue-50 transition-colors group"
        >
          <div className="text-sm font-medium text-slate-800 group-hover:text-blue-700">
            {ex.title}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{ex.description}</div>
        </button>
      ))}
    </div>
  );
}

// ── EditorPanel ──────────────────────────────────────────────
export default function EditorPanel({
  code,
  onChange,
  parseResult,
  config,
  onConfigChange,
  onLoadExample,
}: Props) {
  const [tab, setTab] = useState<Tab>('code');

  return (
    <div className="flex flex-col h-full">
      <TabBar active={tab} onSelect={setTab} />

      {tab === 'code' && (
        <>
          <CodeEditor code={code} onChange={onChange} />
          <StatusBar parseResult={parseResult} />
          <ErrorList parseResult={parseResult} />
        </>
      )}

      {tab === 'config' && (
        <ConfigTab config={config} onChange={onConfigChange} />
      )}

      {tab === 'examples' && (
        <ExamplesTab
          onSelect={ex => {
            onLoadExample(ex);
            setTab('code');
          }}
        />
      )}
    </div>
  );
}
