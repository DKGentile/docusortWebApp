export type FileMetadata = {
  file_id: string;
  file_name: string;
  size: number;
  uploaded_at: string;
};

export type TreeNode = {
  name: string;
  type: "folder" | "file";
  file_id?: string;
  children?: TreeNode[];
};

const API_BASE = "http://localhost:8000/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response.json();
}

export async function getFiles(): Promise<FileMetadata[]> {
  const res = await fetch(`${API_BASE}/files`);
  return handleResponse<FileMetadata[]>(res);
}

export async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: form,
  });
  return handleResponse<{ file_id: string; file_name: string }>(res);
}

export async function generateTree(): Promise<TreeNode> {
  const res = await fetch(`${API_BASE}/sort`, {
    method: "POST",
  });
  return handleResponse<TreeNode>(res);
}

export async function getTree(): Promise<TreeNode | null> {
  const res = await fetch(`${API_BASE}/tree`);
  return handleResponse<TreeNode | null>(res);
}

export async function sendChat(message: string, fileIds: string[]): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, file_ids: fileIds }),
  });
  const data = await handleResponse<{ answer: string }>(res);
  return data.answer;
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/files/${fileId}`, {
    method: "DELETE",
  });
  await handleResponse(res);
}
