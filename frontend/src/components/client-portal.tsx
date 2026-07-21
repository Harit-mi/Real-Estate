import { useState, useEffect } from "react";

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
      
      {/* Left Column: Portal Simulator Settings - Styled like Manila Dossier */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
            <i className="fa-solid fa-eye" style={{ color: "var(--color-navy)" }}></i>
            PORTAL LINK SIMULATOR
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontWeight: 500 }}>
            Simulate a client opening their private property recommendation portal. Select a client from your pipeline below:
          </p>

          <div className="form-group" style={{ marginBottom: "1rem" }}>
            <label>Load Portal Client Profile</label>
            <select 
              className="form-control"
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

          <div style={{ backgroundColor: "rgba(255,255,255,0.5)", border: "1px dashed rgba(23,50,77,0.2)", padding: "1.25rem", borderRadius: "4px", fontSize: "0.8rem", color: "var(--color-navy)", lineHeight: "1.5" }}>
            <strong>Testing Guidelines:</strong> Shortlisting (Thumbs Up) or rejecting (Thumbs Down) inside the phone screen on the right updates the database instantly and logs a timeline event in the CRM Sales Pipeline.
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
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
            backgroundColor: "var(--color-chalk)",
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
              backgroundColor: "var(--color-manila)", 
              borderBottom: "2px solid var(--color-navy)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              zIndex: 5
            }}
          >
            <div>
              <span style={{ fontSize: "0.6rem", color: "var(--color-thread)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font-mono)" }}>CLIENT PORTAL FEED</span>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-navy)", fontFamily: "var(--font-display)" }}>
                {activeDeal ? activeDeal.requirement.contact.name : "Client Portal"}
              </h3>
            </div>
            
            <i className="fa-solid fa-mobile-screen-button" style={{ color: "var(--color-navy)", fontSize: "16px" }}></i>
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
                      border: "1px solid rgba(23,50,77,0.15)", 
                      borderRadius: "4px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      boxShadow: "2px 2px 8px rgba(0,0,0,0.03)"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-navy)" }}>{property.title}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem", fontFamily: "var(--font-sans)" }}>{property.location} · {property.bedrooms} BHK</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-thread)", marginTop: "0.35rem", fontFamily: "var(--font-mono)" }}>
                        {property.currency} {property.price.toLocaleString()}
                      </div>
                    </div>

                    {isProcessed ? (
                      <div 
                        style={{ 
                          textAlign: "center", 
                          padding: "0.5rem", 
                          borderRadius: "4px", 
                          fontSize: "0.75rem", 
                          fontWeight: 700,
                          backgroundColor: status === "shortlisted" ? "#e2f2e6" : "#fef2f2",
                          color: status === "shortlisted" ? "#1e6b36" : "#dc2626",
                          border: status === "shortlisted" ? "1px solid #1e6b36" : "1px solid #fecaca"
                        }}
                      >
                        {status === "shortlisted" ? "✓ Shortlisted!" : "✗ Rejected"}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <input 
                          type="text" 
                          placeholder="Leave feedback comment (optional)..."
                          className="form-control"
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem", height: "auto" }}
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
                              borderRadius: "4px", 
                              color: "#dc2626", 
                              fontSize: "0.7rem", 
                              fontWeight: 700, 
                              padding: "0.4rem", 
                              cursor: "pointer" 
                            }}
                          >
                            <i className="fa-solid fa-thumbs-down" style={{ fontSize: "11px" }}></i>
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
                              backgroundColor: "#e2f2e6", 
                              border: "1px solid #bbf7d0", 
                              borderRadius: "4px", 
                              color: "#1e6b36", 
                              fontSize: "0.7rem", 
                              fontWeight: 700, 
                              padding: "0.4rem", 
                              cursor: "pointer" 
                            }}
                          >
                            <i className="fa-solid fa-thumbs-up" style={{ fontSize: "11px" }}></i>
                            Shortlist
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ margin: "auto", textAlign: "center", padding: "2rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)" }}>
                <i className="fa-solid fa-circle-info" style={{ fontSize: "24px" }}></i>
                <p style={{ fontSize: "0.75rem", fontWeight: 600 }}>No property recommendations uploaded for this contact.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
