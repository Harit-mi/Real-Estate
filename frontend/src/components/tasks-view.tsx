import { useState, useEffect } from "react";

interface Contact {
  id: string;
  name: string;
}

interface Deal {
  id: string;
  requirement: {
    contact: Contact;
  };
}

interface Task {
  id: string;
  title: string;
  type: string;
  date: string;
  status: string;
  contact?: Contact | null;
  deal?: Deal | null;
}

interface TasksViewProps {
  backendUrl: string;
  refreshTrigger: number;
  onTaskChange: () => void;
}

export default function TasksView({ backendUrl, refreshTrigger, onTaskChange }: TasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState("call");
  const [date, setDate] = useState("");
  const [dealId, setDealId] = useState("");

  const fetchTasksAndDeals = async () => {
    setLoading(true);
    try {
      const resTasks = await fetch(`${backendUrl}/api/tasks`);
      const dataTasks = await resTasks.json();
      setTasks(dataTasks);

      const resDeals = await fetch(`${backendUrl}/api/deals`);
      const dataDeals = await resDeals.json();
      setDeals(dataDeals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasksAndDeals();
  }, [refreshTrigger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      alert("Please enter a title and select a date/time.");
      return;
    }

    setSubmitting(true);
    try {
      let contactId = "";
      if (dealId) {
        const selected = deals.find(d => d.id === dealId);
        if (selected) {
          contactId = selected.requirement.contact.id;
        }
      }

      const response = await fetch(`${backendUrl}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          date,
          dealId: dealId || null,
          contactId: contactId || null,
        }),
      });

      if (response.ok) {
        setTitle("");
        setDate("");
        setDealId("");
        fetchTasksAndDeals();
        onTaskChange();
      } else {
        alert("Failed to schedule task");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "pending" ? "completed" : "pending";
    try {
      // Optimistic update
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus } : t));
      
      await fetch(`${backendUrl}/api/tasks/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchTasksAndDeals();
      onTaskChange();
    } catch (e) {
      console.error(e);
      fetchTasksAndDeals();
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
      
      {/* Left side: Task Scheduler List - Styled like a physical Case Log Book */}
      <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", display: "flex", flexDirection: "column", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
          <i className="fa-solid fa-clock" style={{ color: "var(--color-navy)" }}></i>
          CASE LOG SCHEDULE ({tasks.filter(t => t.status === "pending").length} PENDING)
        </h2>

        {loading && tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            Loading file checklist...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto", maxHeight: "400px" }}>
            {tasks.map((task) => {
              const isCompleted = task.status === "completed";
              const taskDate = new Date(task.date).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div 
                  key={task.id} 
                  style={{ 
                    padding: "1rem", 
                    backgroundColor: isCompleted ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(23,50,77,0.15)", 
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: isCompleted ? 0.6 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexGrow: 1 }}>
                    {/* Tick Checkbox */}
                    <div 
                      onClick={() => handleToggleStatus(task.id, task.status)}
                      style={{ 
                        width: "22px", 
                        height: "22px", 
                        borderRadius: "4px", 
                        border: "2px solid var(--color-navy)", 
                        display: "grid", 
                        placeItems: "center", 
                        cursor: "pointer",
                        backgroundColor: isCompleted ? "var(--color-navy)" : "transparent"
                      }}
                    >
                      {isCompleted && <i className="fa-solid fa-check" style={{ color: "#ffffff", fontSize: "12px" }}></i>}
                    </div>

                    <div>
                      <div 
                        style={{ 
                          fontSize: "0.85rem", 
                          fontWeight: 700, 
                          color: "var(--color-navy)",
                          textDecoration: isCompleted ? "line-through" : "none" 
                        }}
                      >
                        {task.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                        <i className="fa-solid fa-calendar-days"></i>
                        {taskDate}
                        {task.contact && (
                          <span style={{ color: "var(--color-thread)", fontWeight: 700 }}>
                            · Client: {task.contact.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Type badge */}
                  <span 
                    style={{ 
                      fontSize: "0.65rem", 
                      fontWeight: 700, 
                      padding: "0.2rem 0.5rem", 
                      borderRadius: "4px",
                      backgroundColor: task.type === "visit" ? "#f3e8ff" : task.type === "call" ? "#fef3c7" : "#e0f2fe",
                      color: task.type === "visit" ? "#7c3aed" : task.type === "call" ? "#d97706" : "#0284c7"
                    }}
                  >
                    {task.type.toUpperCase()}
                  </span>
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)" }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "30px", marginBottom: "0.5rem" }}></i>
                No scheduled activities logged. Use form to draft events.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Add Task Form - Styled like Blueprint Ingest */}
      <div style={{ backgroundColor: "var(--color-navy)", border: "2px solid var(--color-cyan)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-cyan)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(94,194,224,0.3)", paddingBottom: "0.5rem" }}>
          <i className="fa-solid fa-calendar-plus" style={{ color: "var(--color-cyan)" }}></i>
          SCHEDULE AGENDA EVENT
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: "var(--color-cyan)" }}>Task Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Satellite highrise site tour" 
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: "var(--color-cyan)" }}>Task Type</label>
              <select 
                className="form-control" 
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="call">📞 Phone Call</option>
                <option value="visit">🏠 Site Visit</option>
                <option value="negotiation">🤝 Negotiation</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ color: "var(--color-cyan)" }}>Linked Deal / Client</label>
              <select 
                className="form-control" 
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
              >
                <option value="">-- Optional --</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.requirement.contact.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ color: "var(--color-cyan)" }}>Event Date & Time *</label>
            <input 
              type="datetime-local" 
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem", padding: "0.8rem" }}
            disabled={submitting}
          >
            {submitting ? "Scheduling..." : "Schedule Event"}
          </button>
        </form>
      </div>

    </div>
  );
}
