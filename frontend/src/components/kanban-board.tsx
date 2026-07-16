import { useState, useEffect } from "react";
import { 
  X, Send, Check, FileText, 
  ThumbsDown, Sparkles, Building,
  Calendar
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  jobTitle?: string | null;
  company?: string | null;
  intentScore?: string | null;
}

interface Requirement {
  id: string;
  type: string;
  bedrooms: number;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  locations: string;
  propertyType: string;
  timeline: string | null;
  contact: Contact;
}

interface Property {
  id: string;
  title: string;
  type: string;
  propertyType: string;
  bedrooms: number;
  price: number;
  currency: string;
  location: string;
  status: string;
}

interface DealProperty {
  id: string;
  dealId: string;
  propertyId: string;
  status: string;
  matchScore: number;
  rejectionReason: string | null;
  property: Property;
}

interface Deal {
  id: string;
  requirementId: string;
  stage: string;
  ownerAgentId: string;
  createdAt: string;
  closedAt: string | null;
  requirement: Requirement;
  dealProperties: DealProperty[];
  ownerAgent: { name: string };
}

interface Activity {
  id: string;
  type: string;
  content: string;
  timestamp: string;
  agent?: { name: string } | null;
}

interface KanbanBoardProps {
  backendUrl: string;
  onRefreshTriggered: number;
  onDealSelectedForPhone: (contactName: string, contactPhone: string, dealId: string) => void;
}

const STAGES = [
  { key: "new_match", label: "New Match", color: "#000000" },
  { key: "contacted", label: "Contacted", color: "#737373" },
  { key: "shortlisted", label: "Shortlisted", color: "#eab308" },
  { key: "visit_scheduled", label: "Site Visit", color: "#8b5cf6" },
  { key: "negotiation", label: "Negotiation", color: "#3b82f6" },
  { key: "won", label: "Won", color: "#10b981" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

export default function KanbanBoard({ backendUrl, onRefreshTriggered, onDealSelectedForPhone }: KanbanBoardProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [noteContent, setNoteContent] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [rejectionInputs, setRejectionInputs] = useState<Record<string, boolean>>({});

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/deals`);
      const data = await response.json();
      setDeals(data);

      if (selectedDeal) {
        const refreshed = data.find((d: Deal) => d.id === selectedDeal.id);
        if (refreshed) {
          setSelectedDeal(refreshed);
          fetchActivities(refreshed.id, refreshed.requirement.contact.id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch deals:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async (dealId: string, contactId: string) => {
    try {
      const response = await fetch(`${backendUrl}/api/activities?contactId=${contactId}&dealId=${dealId}`);
      const data = await response.json();
      setActivities(data);
    } catch (e) {
      console.error("Failed to fetch activities:", e);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [onRefreshTriggered]);

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    if (!dealId) return;

    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d))
    );

    try {
      await fetch(`${backendUrl}/api/deals/${dealId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: targetStage }),
      });
      fetchDeals();
    } catch (e) {
      console.error("Failed to update deal stage:", e);
      fetchDeals();
    }
  };

  const handleSelectDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    fetchActivities(deal.id, deal.requirement.contact.id);
    onDealSelectedForPhone(deal.requirement.contact.name, deal.requirement.contact.phone, deal.id);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !selectedDeal) return;

    try {
      await fetch(`${backendUrl}/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedDeal.requirement.contact.id,
          dealId: selectedDeal.id,
          type: "note",
          content: noteContent,
        }),
      });
      setNoteContent("");
      fetchActivities(selectedDeal.id, selectedDeal.requirement.contact.id);
      fetchDeals();
    } catch (e) {
      console.error("Failed to add note:", e);
    }
  };

  const handleUpdatePropertyStatus = async (propertyId: string, status: string) => {
    if (!selectedDeal) return;

    const body: Record<string, any> = { status };
    if (status === "rejected") {
      const reason = rejectionReasons[propertyId];
      if (!reason) {
        setRejectionInputs((prev) => ({ ...prev, [propertyId]: true }));
        return;
      }
      body.rejectionReason = reason;
    }

    try {
      const response = await fetch(
        `${backendUrl}/api/deals/${selectedDeal.id}/properties/${propertyId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        setRejectionInputs((prev) => ({ ...prev, [propertyId]: false }));
        setRejectionReasons((prev) => ({ ...prev, [propertyId]: "" }));
        fetchDeals();
      } else {
        alert("Failed to update property status");
      }
    } catch (e) {
      console.error("Failed to update property status:", e);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === "INR" ? "₹" : "$";
    if (price >= 10000000) {
      return `${symbol}${(price / 10000000).toFixed(2)} Cr`;
    } else if (price >= 100000) {
      return `${symbol}${(price / 100000).toFixed(2)} L`;
    }
    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <div style={{ position: "relative" }}>
      {loading && deals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontWeight: 600 }}>
          Loading Sales Pipeline...
        </div>
      ) : (
        <div className="kanban-container">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.key)}
              >
                <div className="column-header">
                  <div className="column-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span 
                      style={{ 
                        display: "inline-block", 
                        width: "8px", 
                        height: "8px", 
                        borderRadius: "50%", 
                        backgroundColor: stage.color 
                      }} 
                    />
                    {stage.label}
                  </div>
                  <span className="column-badge">{stageDeals.length}</span>
                </div>

                <div className="card-list">
                  {stageDeals.map((deal) => {
                    const req = deal.requirement;
                    const contact = req.contact;
                    const bestMatch = deal.dealProperties.reduce(
                      (max, p) => (p.matchScore > max ? p.matchScore : max),
                      0
                    );

                    return (
                      <div
                        key={deal.id}
                        className="deal-card"
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => handleSelectDeal(deal)}
                      >
                        <h4 style={{ color: "var(--text-main)", marginBottom: "0.25rem" }}>{contact.name}</h4>
                        <div className="client-name" style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                          Owner: {deal.ownerAgent.name}
                        </div>
                        
                        <div className="deal-details-preview" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          <div>📍 Loc: {req.locations}</div>
                          <div>🏠 Type: {req.bedrooms}BHK {req.propertyType}</div>
                          <div style={{ color: "#000000", fontWeight: 700, marginTop: "0.25rem" }}>
                            {formatPrice(req.budgetMin, req.currency)} - {formatPrice(req.budgetMax, req.currency)}
                          </div>
                        </div>

                        {bestMatch > 0 && (
                          <div className="match-badge">
                            <Sparkles size={10} style={{ fill: "#ffffff" }} />
                            Best Match: {bestMatch}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {stageDeals.length === 0 && (
                    <div style={{ textAlign: "center", padding: "2rem 1rem", fontSize: "0.8rem", color: "var(--text-light)", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)", marginTop: "0.5rem", fontWeight: 600 }}>
                      Drag cards here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Side Panel Overlay */}
      {selectedDeal && (
        <>
          <div className="side-panel-overlay" onClick={() => setSelectedDeal(null)} />
          <div className="side-panel">
            <div className="panel-header">
              <div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {selectedDeal.requirement.contact.name}
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", fontWeight: 500 }}>
                  Active Smart Deal · Agent: {selectedDeal.ownerAgent.name}
                </p>
              </div>
              <X className="panel-close" onClick={() => setSelectedDeal(null)} size={20} />
            </div>

            {/* Profile Info */}
            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.25rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#000000", textTransform: "uppercase", marginBottom: "0.75rem", letterSpacing: "0.5px" }}>
                Lead requirement details
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.85rem", fontWeight: 500 }}>
                <div><strong>Phone:</strong> {selectedDeal.requirement.contact.phone}</div>
                <div><strong>Source:</strong> {selectedDeal.requirement.contact.source}</div>
                <div style={{ gridColumn: "span 2" }}>
                  <strong>Occupation:</strong> {selectedDeal.requirement.contact.jobTitle || "Director"} at {selectedDeal.requirement.contact.company || "Studio Chinar"}
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <strong>Purchase Intent:</strong>{" "}
                  <span 
                    style={{ 
                      textTransform: "capitalize", 
                      fontWeight: 700, 
                      color: selectedDeal.requirement.contact.intentScore === "high" ? "var(--color-success)" : selectedDeal.requirement.contact.intentScore === "medium" ? "var(--color-warning)" : "var(--color-danger)" 
                    }}
                  >
                    {selectedDeal.requirement.contact.intentScore || "High"}
                  </span>
                </div>
                <div><strong>Locations:</strong> {selectedDeal.requirement.locations}</div>
                <div><strong>Preference:</strong> {selectedDeal.requirement.bedrooms} BHK {selectedDeal.requirement.propertyType}</div>
                <div style={{ gridColumn: "span 2" }}>
                  <strong>Budget:</strong> {formatPrice(selectedDeal.requirement.budgetMin, selectedDeal.requirement.currency)} - {formatPrice(selectedDeal.requirement.budgetMax, selectedDeal.requirement.currency)}
                </div>
              </div>
            </div>

            {/* Multi-Property Deal Match Workspace */}
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Building size={18} color="var(--text-main)" />
                Properties Under Consideration ({selectedDeal.dealProperties.length})
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {selectedDeal.dealProperties.map((dp) => {
                  const p = dp.property;
                  const isRejected = dp.status === "rejected";
                  const isWon = dp.status === "won";
                  
                  return (
                    <div 
                      key={dp.id} 
                      style={{ 
                        padding: "1.25rem", 
                        backgroundColor: "var(--bg-card)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                        borderLeft: isWon 
                          ? "4px solid var(--color-success)" 
                          : isRejected 
                          ? "4px solid var(--color-danger)" 
                          : "1px solid var(--border-color)" 
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{p.title}</h4>
                        <span className="match-badge" style={{ marginTop: 0 }}>
                          {dp.matchScore}% Match
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.4rem 0", fontWeight: 500 }}>
                        {p.location} · {p.bedrooms} BHK · {formatPrice(p.price, p.currency)}
                      </p>

                      {dp.rejectionReason && (
                        <div style={{ fontSize: "0.8rem", color: "var(--color-danger)", background: "#fef2f2", border: "1px solid #fecaca", padding: "0.5rem 0.75rem", borderRadius: "6px", margin: "0.75rem 0", fontWeight: 500 }}>
                          <strong>Reason:</strong> {dp.rejectionReason}
                        </div>
                      )}

                      {/* Status Selector Actions */}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleUpdatePropertyStatus(p.id, "shortlisted")}
                          className={`btn ${dp.status === "shortlisted" ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", borderRadius: "8px" }}
                        >
                          Shortlist
                        </button>
                        <button
                          onClick={() => handleUpdatePropertyStatus(p.id, "visited")}
                          className={`btn ${dp.status === "visited" ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", borderRadius: "8px" }}
                        >
                          <Calendar size={12} style={{ marginRight: "0.25rem" }} />
                          Visited
                        </button>
                        
                        {!rejectionInputs[p.id] && dp.status !== "rejected" && (
                          <button
                            onClick={() => handleUpdatePropertyStatus(p.id, "rejected")}
                            className="btn btn-secondary"
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", borderRadius: "8px", borderColor: "rgba(239, 68, 68, 0.4)" }}
                          >
                            <ThumbsDown size={12} color="var(--color-danger)" style={{ marginRight: "0.25rem" }} />
                            Reject
                          </button>
                        )}

                        {dp.status !== "won" && p.status !== "sold" && (
                          <button
                            onClick={() => {
                              if (confirm(`Mark deal as WON with property: ${p.title}? This will lock the deal and mark inventory as sold.`)) {
                                handleUpdatePropertyStatus(p.id, "won");
                              }
                            }}
                            className="btn btn-secondary"
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.75rem", borderRadius: "8px", borderColor: "rgba(16, 185, 129, 0.4)" }}
                          >
                            <Check size={12} color="var(--color-success)" style={{ marginRight: "0.25rem" }} />
                            Mark Won
                          </button>
                        )}
                      </div>

                      {/* Rejection input box */}
                      {rejectionInputs[p.id] && (
                        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                          <input
                            type="text"
                            placeholder="Enter rejection reason..."
                            className="form-control"
                            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                            value={rejectionReasons[p.id] || ""}
                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [p.id]: e.target.value }))}
                          />
                          <button
                            onClick={() => handleUpdatePropertyStatus(p.id, "rejected")}
                            className="btn btn-primary"
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                          >
                            Submit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timeline Notes */}
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={18} color="var(--text-main)" />
                Timeline & Timeline Notes
              </h3>

              {/* Note input form */}
              <form onSubmit={handleAddNote} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  placeholder="Log manual follow-up or add custom note..."
                  className="form-control"
                  style={{ borderRadius: "8px" }}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ borderRadius: "8px" }}>
                  <Send size={16} />
                </button>
              </form>

              <div className="timeline">
                {activities.map((a) => {
                  const date = new Date(a.timestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  
                  let typeClass = "note";
                  if (a.type === "system") typeClass = "system";
                  else if (a.type.startsWith("whatsapp")) typeClass = "whatsapp";

                  return (
                    <div key={a.id} className="timeline-item">
                      <div className={`timeline-icon ${typeClass}`}>
                        {a.type.startsWith("whatsapp") ? "WA" : a.type === "system" ? "SYS" : "N"}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span style={{ fontWeight: 700 }}>{a.type.toUpperCase().replace("_", " ")}</span>
                          <span>{date}</span>
                        </div>
                        <div className="timeline-body" style={{ color: a.type.startsWith("whatsapp") ? "#0f766e" : "inherit" }}>
                          {a.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
