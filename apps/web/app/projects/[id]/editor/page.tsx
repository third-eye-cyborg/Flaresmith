"use client";
import { useState } from "react";

export default function ProjectEditorPage() {
  const [content] = useState<string>("");

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Code Editor</h1>
        <p className="text-gray-600">Editor interface - In development</p>
        <p className="text-sm text-gray-500 mt-2">Content: {content ? "loaded" : "empty"}</p>
      </div>
    </div>
  );
}
