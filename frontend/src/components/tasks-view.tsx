import { useState, useEffect } from "react";
import { Clock, Calendar, Check, Plus, AlertCircle } from "lucide-react";

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
      
      {/* Left side: Task Scheduler List */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Clock size={18} color="#000000" />
          Agent Schedule Checklist ({tasks.filter(t => t.status === "pending").length})
        </h2>

        {loading && tasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Loading checklist...
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
                    backgroundColor: isCompleted ? "var(--bg-app)" : "var(--bg-card)",
                    border: "1px solid var(--border-color)", 
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: isCompleted ? 0.6 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexGrow: 1 }}>
                    {/* Checkbox */}
                    <div 
                      onClick={() => handleToggleStatus(task.id, task.status)}
                      style={{ 
                        width: "22px", 
                        height: "22px", 
                        borderRadius: "6px", 
                        border: "2px solid #000000", 
                        display: "grid", 
                        placeItems: "center", 
                        cursor: "pointer",
                        backgroundColor: isCompleted ? "#000000" : "transparent"
                      }}
                    >
                      {isCompleted && <Check size={14} color="#ffffff" strokeWidth={3} />}
                    </div>

                    <div>
                      <div 
                        style={{ 
                          fontSize: "0.85rem", 
                          fontWeight: 700, 
                          textDecoration: isCompleted ? "line-through" : "none" 
                        }}
                      >
                        {task.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem", fontWeight: 500 }}>
                        <Calendar size={12} />
                        {taskDate}
                        {task.contact && (
                          <span style={{ color: "#000000", fontWeight: 700 }}>
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
                      borderRadius: "6px",
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
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                <AlertCircle size={36} />
                No scheduled activities today. Use form to create tasks!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side: Add Task Form */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Plus size={18} color="#000000" />
          Schedule Event
        </h2>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Task Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Satellite highrise site tour" 
              className="form-control"
              style={{ borderRadius: "8px" }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Task Type</label>
              <select 
                className="form-control" 
                style={{ borderRadius: "8px" }}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="call">📞 Phone Call</option>
                <option value="visit">🏠 Site Visit</option>
                <option value="negotiation">🤝 Negotiation</option>
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Linked Deal / Client</label>
              <select 
                className="form-control" 
                style={{ borderRadius: "8px" }}
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
            <label>Event Date & Time *</label>
            <input 
              type="datetime-local" 
              className="form-control"
              style={{ borderRadius: "8px" }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "0.5rem", borderRadius: "8px", padding: "0.8rem" }}
            disabled={submitting}
          >
            {submitting ? "Scheduling..." : "Schedule Event"}
          </button>
        </form>
      </div>

    </div>
  );
}
