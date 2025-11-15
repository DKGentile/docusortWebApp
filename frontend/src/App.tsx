import { useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import type { FileMetadata, TreeNode } from "./api";
import { deleteFile, generateTree, getFiles, getTree, uploadFile } from "./api";

function App() {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
  const [sorting, setSorting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ file_id: string; file_name: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const refreshFiles = async () => {
    try {
      const fetchedFiles = await getFiles();
      setFiles(fetchedFiles);
      setSelectedFileIds((prev) =>
        prev.filter((id) => fetchedFiles.some((file) => file.file_id === id)),
      );
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to fetch files. Check backend status.");
    }
  };

  const refreshTree = async () => {
    try {
      const latestTree = await getTree();
      setTree(latestTree);
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to fetch tree. Try regenerating.");
    }
  };

  useEffect(() => {
    refreshFiles();
    refreshTree();
  }, []);

  useEffect(() => {
    if (!isResizing) {
      document.body.style.cursor = "";
      return;
    }
    document.body.style.cursor = "col-resize";
    const handleMove = (event: MouseEvent) => {
      const min = 240;
      const max = 500;
      const nextWidth = Math.min(Math.max(event.clientX, min), max);
      setSidebarWidth(nextWidth);
    };
    const stopResize = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, [isResizing]);

  const handleUpload = async (file: File) => {
    try {
      setStatusMessage("Uploading file...");
      await uploadFile(file);
      await refreshFiles();
      await refreshTree();
      setStatusMessage("File uploaded.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Upload failed. Ensure backend is running.");
    }
  };

  const handleSort = async () => {
    try {
      setSorting(true);
      setStatusMessage("Generating synthetic tree...");
      const newTree = await generateTree();
      setTree(newTree);
      setStatusMessage("Tree updated.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not generate tree.");
    } finally {
      setSorting(false);
    }
  };

  const requestDelete = (file_id: string, file_name: string) => {
    setConfirmDelete({ file_id, file_name });
  };

  const confirmDeletion = async () => {
    if (!confirmDelete) return;
    try {
      setDeleting(true);
      setStatusMessage("Deleting file...");
      await deleteFile(confirmDelete.file_id);
      setConfirmDelete(null);
      await refreshFiles();
      await refreshTree();
      setStatusMessage("File deleted.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Failed to delete file.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="app">
      <div className="sidebar-wrapper" style={{ width: sidebarWidth }}>
        <Sidebar
          files={files}
          tree={tree}
          selectedFileIds={selectedFileIds}
          onSelectionChange={setSelectedFileIds}
          onUpload={handleUpload}
          onSort={handleSort}
          sorting={sorting}
          statusMessage={statusMessage}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onDeleteRequest={requestDelete}
        />
      </div>
      <div className="sidebar-resizer" onMouseDown={() => setIsResizing(true)} />
      <main className="main-panel">
        <Chat selectedFiles={selectedFileIds} files={files} />
      </main>
      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Delete this file?</h3>
            <p>
              Are you sure you want to delete <strong>{confirmDelete.file_name}</strong>? This will
              remove it from DocuSort.
            </p>
            <div className="modal-actions">
              <button type="button" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button type="button" onClick={confirmDeletion} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
