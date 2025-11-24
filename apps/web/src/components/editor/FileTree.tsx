"use client";

type FileNode = {
  path: string;
  type: "blob" | "tree";
};

type Props = {
  files: FileNode[];
  onSelect: (path: string) => void;
};

export function FileTree({ files, onSelect }: Props) {
  return (
    <div className="border rounded p-2 overflow-auto h-96 text-sm">
      <ul>
        {files.map((f) => (
          <li key={f.path}>
            <button
              type="button"
              className="text-left w-full hover:bg-gray-50 rounded px-1"
              onClick={() => onSelect(f.path)}
            >
              {f.type === "tree" ? "📁" : "📄"} {f.path}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FileTree;
