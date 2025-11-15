import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import type { TreeNode } from "../api";

type TreeViewProps = {
  node: TreeNode;
  selectedFileIds: string[];
  onSelectionChange: (fileIds: string[]) => void;
  onDeleteRequest: (fileId: string, fileName: string) => void;
};

type TreeNodeItemProps = {
  node: TreeNode;
  selectedSet: Set<string>;
  onBulkUpdate: (ids: string[], select: boolean) => void;
  onDeleteRequest: (fileId: string, fileName: string) => void;
};

const collectFileIds = (node: TreeNode): string[] => {
  if (node.type === "file") {
    return node.file_id ? [node.file_id] : [];
  }
  const ids: string[] = [];
  node.children?.forEach((child) => {
    ids.push(...collectFileIds(child));
  });
  return ids;
};

const TreeNodeItem = ({ node, selectedSet, onBulkUpdate, onDeleteRequest }: TreeNodeItemProps) => {
  const [expanded, setExpanded] = useState(true);

  if (node.type === "file") {
    const fileId = node.file_id ?? "";
    const isChecked = selectedSet.has(fileId);
    return (
      <div className="tree-node file">
        <button
          type="button"
          className={`tree-chip ${isChecked ? "selected" : ""}`}
          onClick={() => onBulkUpdate([fileId], !isChecked)}
          title={node.name}
        >
          <span className="tree-label">{node.name}</span>
          <span
            className="chip-delete"
            role="button"
            aria-label={`Delete ${node.name}`}
            onClick={(event) => {
              event.stopPropagation();
              if (fileId) {
                onDeleteRequest(fileId, node.name);
              }
            }}
          >
            x
          </span>
        </button>
      </div>
    );
  }

  const descendantIds = useMemo(() => collectFileIds(node), [node]);
  const isChecked = descendantIds.length > 0 && descendantIds.every((id) => selectedSet.has(id));
  const isIndeterminate = !isChecked && descendantIds.some((id) => selectedSet.has(id));
  const selectionState = isChecked ? "selected" : isIndeterminate ? "partial" : "";

  const handleSelectClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!descendantIds.length) return;
    onBulkUpdate(descendantIds, !isChecked);
  };

  return (
    <div className="tree-node folder">
      <div className="folder-row">
        <button
          type="button"
          className={`folder-select ${selectionState}`}
          onClick={handleSelectClick}
          disabled={!descendantIds.length}
          aria-label={`Select folder ${node.name}`}
        />
        <button
          type="button"
          className="folder-label"
          title={node.name}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <span className={`folder-caret ${expanded ? "open" : ""}`} aria-hidden="true">
            &gt;
          </span>
          <span className="tree-label">{node.name}</span>
        </button>
      </div>
      {expanded && (
        <div className="tree-children">
          {node.children?.map((child) => (
            <TreeNodeItem
              key={`${child.file_id ?? ""}-${child.name}`}
              node={child}
              selectedSet={selectedSet}
              onBulkUpdate={onBulkUpdate}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView = ({ node, selectedFileIds, onSelectionChange, onDeleteRequest }: TreeViewProps) => {
  const selectedSet = useMemo(() => new Set(selectedFileIds), [selectedFileIds]);

  const handleBulkUpdate = (ids: string[], select: boolean) => {
    const next = new Set(selectedSet);
    ids.forEach((id) => {
      if (!id) return;
      if (select) {
        next.add(id);
      } else {
        next.delete(id);
      }
    });
    onSelectionChange(Array.from(next));
  };

  return (
    <div className="tree-view">
      <TreeNodeItem
        node={node}
        selectedSet={selectedSet}
        onBulkUpdate={handleBulkUpdate}
        onDeleteRequest={onDeleteRequest}
      />
    </div>
  );
};

export default TreeView;
