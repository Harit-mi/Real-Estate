import { useState } from "react";

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
      text: "LOGGED: PropMatch AI Desk Copilot active.\n\nReady to scan listings database or generate templates.\n\nTRY COMMANDS:\n- 'List all active listings'\n- 'Show active leads database'\n- 'What matching deals are in the pipeline?'\n- 'Draft a WhatsApp template for Aarini'"
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
        { sender: "copilot", text: "ERROR: Connection link to PropMatch core backend database offline." }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Sparkle Button to trigger Copilot - Pinned Manila Badge */}
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
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
          zIndex: 90,
          border: "2px solid var(--color-navy)",
          backgroundColor: "var(--color-manila)"
        }}
        title="Open AI Copilot Desk"
      >
        <i className="fa-solid fa-star fa-beat" style={{ fontSize: "20px", color: "var(--color-navy)" }}></i>
      </button>

      {/* Drawer Overlay */}
      {open && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
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
              backgroundColor: "#0d1b2a",
              borderRadius: "4px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              border: "2px solid var(--color-cyan)",
              zIndex: 151,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {/* Header - Styled like Blueprint Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "2px solid var(--color-cyan)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--color-navy)",
                color: "var(--color-cyan)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-display)", fontWeight: 700 }}>
                <i className="fa-solid fa-terminal"></i>
                <span style={{ fontSize: "0.95rem" }}>CO-PILOT INTEL MONITOR</span>
              </div>
              <i
                className="fa-solid fa-xmark"
                style={{ cursor: "pointer", opacity: 0.8, fontSize: "18px" }}
                onClick={() => setOpen(false)}
              ></i>
            </div>

            {/* Chat Body - Retro green screen command terminal */}
            <div
              style={{
                flexGrow: 1,
                padding: "1.5rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                backgroundColor: "#0b132b",
                fontFamily: "var(--font-mono)"
              }}
            >
              {messages.map((m, idx) => {
                const isCopilot = m.sender === "copilot";
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isCopilot ? "flex-start" : "flex-end",
                      backgroundColor: isCopilot ? "rgba(94, 194, 224, 0.1)" : "rgba(255, 255, 255, 0.05)",
                      color: isCopilot ? "var(--color-cyan)" : "#ffffff",
                      border: isCopilot ? "1px solid rgba(94, 194, 224, 0.4)" : "1px solid rgba(255,255,255,0.2)",
                      padding: "0.85rem 1.1rem",
                      borderRadius: "4px",
                      fontSize: "0.8rem",
                      lineHeight: "1.4",
                      maxWidth: "85%",
                      whiteSpace: "pre-line",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
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
                    backgroundColor: "rgba(94, 194, 224, 0.1)",
                    border: "1px solid rgba(94, 194, 224, 0.4)",
                    padding: "0.85rem 1.1rem",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    fontSize: "0.8rem",
                    color: "var(--color-cyan)"
                  }}
                >
                  <i className="fa-solid fa-rotate fa-spin"></i>
                  QUERYING SQLITE DATABASES...
                </div>
              )}
            </div>

            {/* Form Input */}
            <form
              onSubmit={handleSend}
              style={{
                padding: "1rem 1.25rem",
                borderTop: "2px solid var(--color-cyan)",
                display: "flex",
                gap: "0.5rem",
                backgroundColor: "var(--color-navy)"
              }}
            >
              <input
                type="text"
                placeholder="Ask Copilot or type database search query..."
                className="form-control"
                style={{
                  borderRadius: "4px",
                  border: "1px solid rgba(94, 194, 224, 0.4)",
                  backgroundColor: "#0b132b",
                  color: "#ffffff",
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-mono)"
                }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                style={{
                  background: "var(--color-cyan)",
                  border: "none",
                  width: "36px",
                  height: "36px",
                  borderRadius: "4px",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--color-navy)",
                  cursor: "pointer",
                  flexShrink: 0
                }}
                disabled={loading}
              >
                <i className="fa-solid fa-paper-plane" style={{ fontSize: "14px" }}></i>
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
