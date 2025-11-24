"use client";

type Props = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
};

// T107: Placeholder editor (textarea) to avoid new dependencies; swap with CodeMirror later
export function CodeEditor({ value, onChange, className }: Props) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || "w-full h-96 font-mono text-sm border rounded p-2"}
      aria-label="Code editor"
      spellCheck={false}
    />
  );
}

export default CodeEditor;
