import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { sendChat } from "../api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

import type { FileMetadata } from "../api";

type ChatProps = {
  selectedFiles: string[];
  files: FileMetadata[];
};

const Chat = ({ selectedFiles, files }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedNames = useMemo(() => {
    const fileMap = new Map(files.map((file) => [file.file_id, file.file_name]));
    if (!selectedFiles.length) {
      return files.map((file) => file.file_name);
    }
    return selectedFiles
      .map((id) => fileMap.get(id))
      .filter((name): name is string => Boolean(name));
  }, [files, selectedFiles]);

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    try {
      setLoading(true);
      const answer = await sendChat(trimmed, selectedFiles);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="chat">
      <div className="chat-header">
        <p>
          {selectedNames.length > 0 && selectedNames.length < 3
            ? selectedNames.join(", ")
            : `Using ${selectedFiles.length === 0 ? "all" : selectedFiles.length} ${
                selectedFiles.length === 1 ? "file" : "files"
              }`}
        </p>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <div className="message-role">{message.role === "user" ? "You" : "DocuSort"}</div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        {!messages.length && <p className="placeholder">Ask a question about your documents.</p>}
      </div>
      <form className="chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          placeholder="Ask something..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
};

export default Chat;
