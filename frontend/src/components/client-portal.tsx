import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Eye, Smartphone, AlertCircle } from "lucide-react";

interface Contact {
  name: string;
}

interface Requirement {
  contact: Contact;
}

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  bedrooms: number;
}

interface DealProperty {
  status: string; // pending, shortlisted, rejected, won
  property: Property;
}

interface Deal {
  id: string;
  stage: string;
  requirement: Requirement;
  dealProperties: DealProperty[];
}

interface ClientPortalProps {
  backendUrl: string;
  refreshTrigger: number;
  onFeedbackSubmitted: () => void;
}

export default function ClientPortal({ backendUrl, refreshTrigger, onFeedbackSubmitted }: ClientPortalProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null); // propertyId

  const fetchDeals = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/deals`);
      const data = await response.json();
      setDeals(data);
      if (data.length > 0 && !selectedDealId) {
        setSelectedDealId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [refreshTrigger]);

  const activeDeal = deals.find(d => d.id === selectedDealId);

  const handleFeedback = async (propertyId: string, status: "shortlisted" | "rejected") => {
    setSubmitting(propertyId);
    try {
      const response = await fetch(`${backendUrl}/api/client-portal/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: selectedDealId,
          propertyId,
          status,
          comment: feedbackComment.trim() || null
        })
      });

      if (response.ok) {
        setFeedbackComment("");
        fetchDeals();
        onFeedbackSubmitted();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2.5rem" }}>
      
      {/* Left Column: Portal Simulator Settings */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Eye size={18} color="#000000" />
            Portal Link Simulator
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontWeight: 500 }}>
            Simulate a client opening their private property recommendation portal. Select a client from your pipeline below:
          </p>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Load Portal Client Profile</label>
            <select 
              className="form-control"
              style={{ borderRadius: "8px" }}
              value={selectedDealId}
              onChange={(e) => setSelectedDealId(e.target.value)}
            >
              {deals.map(d => (
                <option key={d.id} value={d.id}>
                  {d.requirement.contact.name} (Pipeline Stage: {d.stage.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", padding: "1.25rem", borderRadius: "12px", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.5", fontWeight: 500 }}>
            <strong>How to test this live:</strong> Swiping shortlist (Thumbs Up) or reject (Thumbs Down) inside the phone screen on the right will immediately update the database and push logs into the CRM Sales Pipeline tab timeline.
          </div>
        </div>

      </div>

      {/* Right Column: Premium Smartphone Mockup Canvas */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        
        <div 
          style={{ 
            width: "360px", 
            height: "640px", 
            border: "12px solid #0a0a0a", 
            borderRadius: "40px", 
            boxShadow: "0 25px 60px rgba(0,0,0,0.15)",
            backgroundColor: "#f9fafb",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Smartphone Speaker Ear Piece */}
          <div style={{ position: "absolute", top: "10px", left: "50%", transform: "translateX(-50%)", width: "60px", height: "4px", backgroundColor: "#333", borderRadius: "2px", zIndex: 10 }} />

          {/* Smartphone Header Area */}
          <div 
            style={{ 
              padding: "1.5rem 1.25rem 1rem", 
              backgroundColor: "#ffffff", 
              borderBottom: "1px solid #e5e7eb", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              zIndex: 5
            }}
          >
            <div>
              <span style={{ fontSize: "0.6rem", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Client Portal Feed</span>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 800, color: "#111827" }}>
                {activeDeal ? activeDeal.requirement.contact.name : "Client Portal"}
              </h3>
            </div>
            
            <Smartphone size={16} color="#9ca3af" />
          </div>

          {/* Smartphone Scrollable Feed */}
          <div 
            style={{ 
              flexGrow: 1, 
              padding: "1rem", 
              overflowY: "auto", 
              display: "flex", 
              flexDirection: "column", 
              gap: "1rem" 
            }}
          >
            {activeDeal && activeDeal.dealProperties.length > 0 ? (
              activeDeal.dealProperties.map(({ property, status }) => {
                const isProcessed = status === "shortlisted" || status === "rejected";
                
                return (
                  <div 
                    key={property.id}
                    style={{ 
                      backgroundColor: "#ffffff", 
                      border: "1px solid #e5e7eb", 
                      borderRadius: "16px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.01)"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#111827" }}>{property.title}</div>
                      <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: "0.15rem" }}>{property.location} · {property.bedrooms} BHK</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#111827", marginTop: "0.35rem" }}>
                        {property.currency} {property.price.toLocaleString()}
                      </div>
                    </div>

                    {isProcessed ? (
                      <div 
                        style={{ 
                          textAlign: "center", 
                          padding: "0.5rem", 
                          borderRadius: "8px", 
                          fontSize: "0.75rem", 
                          fontWeight: 700,
                          backgroundColor: status === "shortlisted" ? "#f0fdf4" : "#fef2f2",
                          color: status === "shortlisted" ? "#16a34a" : "#dc2626",
                          border: status === "shortlisted" ? "1px solid #bbf7d0" : "1px solid #fecaca"
                        }}
                      >
                        {status === "shortlisted" ? "Shortlisted!" : "Rejected"}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <input 
                          type="text" 
                          placeholder="Leave feedback comment (optional)..."
                          className="form-control"
                          style={{ borderRadius: "8px", padding: "0.35rem 0.65rem", fontSize: "0.75rem", height: "auto" }}
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                        />
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleFeedback(property.id, "rejected")}
                            disabled={submitting !== null}
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              gap: "0.25rem",
                              backgroundColor: "#fef2f2", 
                              border: "1px solid #fecaca", 
                              borderRadius: "8px", 
                              color: "#dc2626", 
                              fontSize: "0.7rem", 
                              fontWeight: 700, 
                              padding: "0.4rem", 
                              cursor: "pointer" 
                            }}
                          >
                            <ThumbsDown size={12} />
                            Reject
                          </button>
                          
                          <button
                            onClick={() => handleFeedback(property.id, "shortlisted")}
                            disabled={submitting !== null}
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              gap: "0.25rem",
                              backgroundColor: "#f0fdf4", 
                              border: "1px solid #bbf7d0", 
                              borderRadius: "8px", 
                              color: "#16a34a", 
                              fontSize: "0.7rem", 
                              fontWeight: 700, 
                              padding: "0.4rem", 
                              cursor: "pointer" 
                            }}
                          >
                            <ThumbsUp size={12} />
                            Shortlist
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ margin: "auto", textAlign: "center", padding: "2rem", color: "#9ca3af", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={28} />
                <p style={{ fontSize: "0.75rem", fontWeight: 600 }}>No property recommendations uploaded for this contact.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
