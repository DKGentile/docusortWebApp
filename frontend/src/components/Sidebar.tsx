import { useRef } from "react";
import type { ChangeEvent } from "react";
import type { FileMetadata, TreeNode } from "../api";
import TreeView from "./TreeView";

type SidebarProps = {
  files: FileMetadata[];
  tree: TreeNode | null;
  selectedFileIds: string[];
  onSelectionChange: (fileIds: string[]) => void;
  onUpload: (file: File) => Promise<void>;
  onSort: () => Promise<void>;
  sorting: boolean;
  statusMessage?: string | null;
  viewMode: "tree" | "flat";
  onViewModeChange: (mode: "tree" | "flat") => void;
  onDeleteRequest: (fileId: string, fileName: string) => void;
};

const Sidebar = ({
  files,
  tree,
  selectedFileIds,
  onSelectionChange,
  onUpload,
  onSort,
  sorting,
  statusMessage,
  viewMode,
  onViewModeChange,
  onDeleteRequest,
}: SidebarProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilePick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onUpload(file);
      event.target.value = "";
    }
  };

  const toggleFlatFile = (fileId: string) => {
    const next = new Set(selectedFileIds);
    if (next.has(fileId)) {
      next.delete(fileId);
    } else {
      next.add(fileId);
    }
    onSelectionChange(Array.from(next));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>DocuSort</h1>
        <div className="sidebar-buttons">
          <button onClick={handleFilePick}>Upload</button>
          <button onClick={onSort} disabled={sorting}>
            {sorting ? "Sorting..." : "Sort"}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            hidden
            accept=".pdf,.docx,.txt"
          />
        </div>
      </div>
      <div className="sidebar-tabs">
        <button
          className={viewMode === "tree" ? "active" : ""}
          onClick={() => onViewModeChange("tree")}
        >
          Tree
        </button>
        <button
          className={viewMode === "flat" ? "active" : ""}
          onClick={() => onViewModeChange("flat")}
        >
          Flat
        </button>
      </div>
      <div className="sidebar-content">
        {viewMode === "tree" ? (
          tree ? (
            <TreeView
              node={tree}
              selectedFileIds={selectedFileIds}
              onSelectionChange={onSelectionChange}
              onDeleteRequest={onDeleteRequest}
            />
          ) : (
            <p className="placeholder">Generate a tree to organize your files.</p>
          )
        ) : (
          <div className="flat-list">
            {files.map((file) => {
              const selected = selectedFileIds.includes(file.file_id);
              return (
                <button
                  type="button"
                  key={file.file_id}
                  className={`file-chip ${selected ? "selected" : ""}`}
                  onClick={() => toggleFlatFile(file.file_id)}
                  title={file.file_name}
                >
                  <span className="file-chip-name">{file.file_name}</span>
                  <span
                    className="chip-delete"
                    role="button"
                    aria-label={`Delete ${file.file_name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteRequest(file.file_id, file.file_name);
                    }}
                  >
                    x
                  </span>
                </button>
              );
            })}
            {!files.length && <p className="placeholder">No files uploaded yet.</p>}
          </div>
        )}
        {statusMessage && <p className="status-message">{statusMessage}</p>}
      </div>
    </aside>
  );
};

export default Sidebar;
