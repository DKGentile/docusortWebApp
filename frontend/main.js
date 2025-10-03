const API_BASE = "http://localhost:8000/api";
const uploadForm = document.getElementById("upload-form");
const fileInput = document.getElementById("file-input");
const documentList = document.getElementById("document-list");
const queryForm = document.getElementById("query-form");
const queryTextarea = document.getElementById("question");
const querySelect = document.getElementById("query-documents");
const queryResult = document.getElementById("query-result");
const synthesisForm = document.getElementById("synthesis-form");
const synthesisTextarea = document.getElementById("synthesis-request");
const synthesisTitle = document.getElementById("synthesis-title");
const synthesisSelect = document.getElementById("synthesis-documents");
const synthesisResult = document.getElementById("synthesis-result");
const template = document.getElementById("document-item-template");

async function fetchDocuments() {
  try {
    const response = await fetch(`${API_BASE}/documents`);
    if (!response.ok) throw new Error("Failed to fetch documents");
    const data = await response.json();
    renderDocuments(data.documents);
  } catch (error) {
    console.error(error);
  }
}

function renderDocuments(documents) {
  documentList.innerHTML = "";
  querySelect.innerHTML = "";
  synthesisSelect.innerHTML = "";
  documents.forEach((doc) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = doc.id;
    node.querySelector(".document-name").textContent = `${doc.filename}`;
    node.querySelector(".delete").addEventListener("click", () => deleteDocument(doc.id));
    documentList.appendChild(node);

    const option = new Option(doc.filename, doc.id);
    querySelect.add(option.cloneNode(true));
    synthesisSelect.add(option);
  });

  if (documents.length === 0) {
    documentList.innerHTML = '<li class="empty">No documents uploaded yet.</li>';
  }
}

async function deleteDocument(id) {
  if (!confirm("Remove this document?")) return;
  try {
    const response = await fetch(`${API_BASE}/documents/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete document");
    await fetchDocuments();
  } catch (error) {
    alert(error.message);
  }
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!fileInput.files.length) {
    alert("Please select at least one file");
    return;
  }
  const formData = new FormData();
  Array.from(fileInput.files).forEach((file) => formData.append("files", file));
  try {
    uploadForm.classList.add("loading");
    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Upload failed");
    }
    fileInput.value = "";
    await fetchDocuments();
  } catch (error) {
    alert(error.message);
  } finally {
    uploadForm.classList.remove("loading");
  }
});

queryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = queryTextarea.value.trim();
  if (!question) {
    alert("Enter a question to ask");
    return;
  }
  const documentIds = Array.from(querySelect.selectedOptions).map((option) => Number(option.value));
  queryResult.textContent = "Working on it...";
  try {
    const response = await fetch(`${API_BASE}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, document_ids: documentIds.length ? documentIds : undefined }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Query failed");
    }
    const data = await response.json();
    const contextList = data.context
      .map(
        (chunk) => `Document ${chunk.document_id}, section ${chunk.chunk_index + 1}:\n${chunk.text.substring(0, 600)}${
          chunk.text.length > 600 ? "..." : ""
        }`
      )
      .join("\n\n");
    queryResult.innerHTML = `<h3>Answer</h3><p>${data.answer.replace(/\n/g, "<br>")}</p>`;
    if (contextList) {
      const details = document.createElement("details");
      details.innerHTML = `<summary>Supporting context</summary><pre>${contextList}</pre>`;
      queryResult.appendChild(details);
    }
  } catch (error) {
    queryResult.textContent = error.message;
  }
});

synthesisForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = synthesisTextarea.value.trim();
  if (!question) {
    alert("Describe the document you would like to generate");
    return;
  }
  const documentIds = Array.from(synthesisSelect.selectedOptions).map((option) => Number(option.value));
  synthesisResult.textContent = "Generating...";
  try {
    const response = await fetch(`${API_BASE}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        output_title: synthesisTitle.value || undefined,
        document_ids: documentIds.length ? documentIds : undefined,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Unable to generate document");
    }
    const data = await response.json();
    synthesisResult.innerHTML = `<h3>${data.title}</h3><p>${data.body.replace(/\n/g, "<br>")}</p>`;
  } catch (error) {
    synthesisResult.textContent = error.message;
  }
});

fetchDocuments();
