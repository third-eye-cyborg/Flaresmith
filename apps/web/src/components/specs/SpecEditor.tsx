"use client";

import React, { useCallback } from "react";
import dynamic from "next/dynamic";

type SpecEditorProps = {
  value: string;
  onChange: (next: string) => void;
  language?: "markdown" | "yaml" | "json" | "text";
  readOnly?: boolean;
  className?: string;
  height?: string | number;
};

// Lazy-load CodeMirror on the client. If the dependency is missing at runtime,
// we provide a lightweight textarea fallback so the app remains usable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CodeMirror: any = dynamic(
  async () => {
    try {
      const mod = await import("@uiw/react-codemirror");
      return mod.default ?? (mod as unknown as React.ComponentType);
    } catch {
      // Fallback to a textarea-compatible component interface
      return function FallbackEditor(props: {
        value?: string;
        onChange?: (val: string) => void;
        readOnly?: boolean;
        className?: string;
        style?: React.CSSProperties;
      }) {
        return (
          <textarea
            className={props.className}
            style={props.style}
            readOnly={props.readOnly}
            value={props.value}
            onChange={(e) => props.onChange?.(e.target.value)}
          />
        );
      } as unknown as React.ComponentType;
    }
  },
  { ssr: false }
);

export function SpecEditor({
  value,
  onChange,
  readOnly,
  className,
  height = 360,
}: SpecEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange?.(String(val ?? ""));
    },
    [onChange]
  );

  // We keep extensions minimal to avoid hard dependency on lang packages.
  // If CodeMirror is present, basicSetup is enabled by default.
  return (
    <div className={className}>
      <CodeMirror
        value={value}
        onChange={handleChange}
        // Props below are accepted by @uiw/react-codemirror; the fallback ignores them.
        readOnly={readOnly}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extensions={[] as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        theme={undefined as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        basicSetup={true as any}
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      />
    </div>
  );
}

export default SpecEditor;
