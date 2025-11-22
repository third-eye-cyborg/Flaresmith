"use client";
import React, { useMemo, useState } from "react";
import CodeEditor from "../../../src/components/editor/CodeEditor";
import FileTree from "../../../src/components/editor/FileTree";
import ChatPanel from "../../../src/components/chat/ChatPanel";
import DiffPreview from "../../../src/components/chat/DiffPreview";

export default function ProjectEditorPage() {
  const [files, setFiles] = useState<Array<{ path: string; type: "blob" | "tree" }>>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [diffs, setDiffs] = useState<Array<{ path: string; patch: string }>>([]);

  // In a real app, fetch tree via API then setFiles

  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const wsUrl = useMemo(() => (typeof window !== "undefined" ? (window.location.origin + "/api/chat/stream").replace("http", "ws") : ""), []);

  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      <div className="col-span-3">
        <FileTree files={files} onSelect={setActiveFile} />
      </div>
      <div className="col-span-6 space-y-2">
        <CodeEditor value={content} onChange={setContent} />
        <DiffPreview diffs={diffs} />
      </div>
      <div className="col-span-3">
        <ChatPanel wsUrl={wsUrl} sessionId={sessionId} onDiff={setDiffs} />
      </div>
    </div>
  );
}
