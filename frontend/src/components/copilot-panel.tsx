import { useState } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";

interface CopilotPanelProps {
  backendUrl: string;
}

interface Message {
  sender: "user" | "copilot";
  text: string;
}

export default function CopilotPanel({ backendUrl }: CopilotPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "copilot",
      text: "Hi! I am your **PropMatch AI Copilot**. Ask me things like:\n\n- *'List all active listings'*\n- *'Show active leads database'*\n- *'What matching deals are in the pipeline?'*\n- *'Draft a WhatsApp template for Aarini'*"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userPrompt = input;
    setMessages((prev) => [...prev, { sender: "user", text: userPrompt }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/copilot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "copilot", text: data.reply }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { sender: "copilot", text: "Sorry, I had trouble connecting to the PropMatch backend API." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Sparkle Button to trigger Copilot */}
      <button
        onClick={() => setOpen(true)}
        className="btn btn-primary"
        style={{
          position: "fixed",
          bottom: "2.5rem",
          right: "2.5rem",
          borderRadius: "50%",
          width: "56px",
          height: "56px",
          padding: 0,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.2)",
          zIndex: 90,
          border: "2px solid #ffffff"
        }}
        title="Open AI Copilot"
      >
        <Sparkles size={22} className="animate-pulse" style={{ fill: "#ffffff" }} />
      </button>

      {/* Drawer Overlay */}
      {open && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.15)",
              backdropFilter: "blur(2px)",
              zIndex: 150
            }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "1.5rem",
              right: "1.5rem",
              bottom: "1.5rem",
              width: "400px",
              backgroundColor: "#ffffff",
              borderRadius: "24px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
              border: "1px solid #e5e7eb",
              zIndex: 151,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#000000",
                color: "#ffffff"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={16} style={{ fill: "#ffffff" }} />
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>PropMatch AI Copilot</span>
              </div>
              <X
                style={{ cursor: "pointer", opacity: 0.8 }}
                size={18}
                onClick={() => setOpen(false)}
              />
            </div>

            {/* Chat Body */}
            <div
              style={{
                flexGrow: 1,
                padding: "1.5rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                backgroundColor: "#f9fafb"
              }}
            >
              {messages.map((m, idx) => {
                const isCopilot = m.sender === "copilot";
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isCopilot ? "flex-start" : "flex-end",
                      backgroundColor: isCopilot ? "#ffffff" : "#000000",
                      color: isCopilot ? "#000000" : "#ffffff",
                      border: isCopilot ? "1px solid #e5e7eb" : "none",
                      padding: "0.85rem 1.1rem",
                      borderRadius: "16px",
                      borderTopLeftRadius: isCopilot ? "0" : "16px",
                      borderTopRightRadius: isCopilot ? "16px" : "0",
                      fontSize: "0.85rem",
                      lineHeight: "1.4",
                      maxWidth: "85%",
                      whiteSpace: "pre-line",
                      fontWeight: 500,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.01)"
                    }}
                  >
                    {m.text}
                  </div>
                );
              })}
              {loading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    padding: "0.85rem 1.1rem",
                    borderRadius: "16px",
                    borderTopLeftRadius: "0",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    fontWeight: 500
                  }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing database...
                </div>
              )}
            </div>

            {/* Form Input */}
            <form
              onSubmit={handleSend}
              style={{
                padding: "1rem 1.25rem",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "0.5rem",
                backgroundColor: "#ffffff"
              }}
            >
              <input
                type="text"
                placeholder="Ask Copilot search inventory or draft message..."
                className="form-control"
                style={{
                  borderRadius: "20px",
                  border: "1px solid #e5e7eb",
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem"
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                style={{
                  background: "#000000",
                  border: "none",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  cursor: "pointer",
                  flexShrink: 0
                }}
                disabled={loading}
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
