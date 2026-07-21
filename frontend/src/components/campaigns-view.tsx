import React, { useState, useEffect } from "react";

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
}

interface CampaignsViewProps {
  backendUrl: string;
  refreshTrigger: number;
}

export default function CampaignsView({ backendUrl, refreshTrigger }: CampaignsViewProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Form states
  const [campaignName, setCampaignName] = useState("");
  const [emailIntro, setEmailIntro] = useState("Hello,\n\nWe just updated our premium housing portfolio with a couple of hot new listings that fit your active requirements parameters. Check them out below!");
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  const fetchPropertiesAndContacts = async () => {
    try {
      const propRes = await fetch(`${backendUrl}/api/properties`);
      const propData = await propRes.json();
      setProperties(propData);

      const contactRes = await fetch(`${backendUrl}/api/contacts`);
      const contactData = await contactRes.json();
      setRecipientCount(contactData.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPropertiesAndContacts();
  }, [refreshTrigger]);

  const toggleSelectProperty = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || selectedIds.length === 0) {
      alert("Please specify a campaign name and select at least one listing.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${backendUrl}/api/campaigns/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignName,
          selectedPropertyIds: selectedIds
        })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Simulated Email campaign broadcast completed successfully to all ${data.targetCount} contacts! Activity records logged to matching client profiles.`);
        setCampaignName("");
        setSelectedIds([]);
      }
    } catch (e) {
      console.error(e);
      alert("Error broadcasting campaign.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2.5rem" }}>
      
      {/* Left Column: Pick listings and compose email - Styled like Manila folder */}
      <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
          <i className="fa-solid fa-envelope" style={{ color: "var(--color-navy)" }}></i>
          COMPOSE NEWSLETTER BROADCAST
        </h2>

        <form onSubmit={handleBroadcast} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Campaign / Broadcast Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Ahmedabad Premium Villas Showcase" 
              className="form-control"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Newsletter Introduction Text *</label>
            <textarea 
              rows={4}
              className="form-control"
              style={{ fontSize: "0.85rem" }}
              value={emailIntro}
              onChange={(e) => setEmailIntro(e.target.value)}
              required
            />
          </div>

          <div style={{ borderTop: "1.5px dashed rgba(23,50,77,0.2)", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-navy)" }}>Select Listings to Showcase ({selectedIds.length})</span>
              {recipientCount !== null && (
                <span style={{ fontSize: "0.75rem", color: "#1e6b36", fontWeight: 700, backgroundColor: "#e2f2e6", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid #1e6b36" }}>
                  Target: {recipientCount} Leads
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto" }}>
              {properties.map(p => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <div 
                    key={p.id}
                    onClick={() => toggleSelectProperty(p.id)}
                    style={{ 
                      padding: "0.75rem 1rem", 
                      backgroundColor: isSelected ? "rgba(23, 50, 77, 0.08)" : "rgba(255, 255, 255, 0.7)",
                      border: isSelected ? "2px solid var(--color-navy)" : "1px solid rgba(23, 50, 77, 0.15)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-navy)" }}>{p.title}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>{p.location}</div>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--color-navy)" }}>
                      {p.currency} {p.price.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem" }}
            disabled={sending || selectedIds.length === 0}
          >
            {sending ? (
              <>
                <i className="fa-solid fa-rotate fa-spin" style={{ fontSize: "16px" }}></i>
                Broadcasting Email Campaigns...
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane" style={{ fontSize: "14px" }}></i>
                Send Simulated Campaign Broadcast
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Visual Email Preview Template - Styled like a Blueprint draft page */}
      <div style={{ backgroundColor: "var(--color-navy)", border: "2px solid var(--color-cyan)", borderRadius: "var(--radius-sm)", padding: "2rem", display: "flex", flexDirection: "column", boxShadow: "2px 4px 10px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-cyan)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(94,194,224,0.3)", paddingBottom: "0.5rem" }}>
          <i className="fa-solid fa-file-code" style={{ color: "var(--color-cyan)" }}></i>
          NEWSLETTER BLUEPRINT PREVIEW
        </h2>

        {/* Email Preview Sheet */}
        <div 
          style={{ 
            flexGrow: 1, 
            backgroundColor: "rgba(255,255,255,0.03)", 
            border: "1px solid rgba(94, 194, 224, 0.4)", 
            borderRadius: "4px", 
            padding: "1.5rem",
            fontSize: "0.8rem",
            lineHeight: "1.5",
            color: "#ffffff"
          }}
        >
          {/* Email Subject block */}
          <div style={{ borderBottom: "1px dashed rgba(94, 194, 224, 0.3)", paddingBottom: "0.75rem", marginBottom: "1rem", fontFamily: "var(--font-mono)", color: "var(--color-cyan)" }}>
            <div><strong>Subject:</strong> {campaignName || "[Campaign Name]"}</div>
            <div><strong>From:</strong> PropMatch Global Advisory &lt;info@propmatch.ai&gt;</div>
          </div>

          {/* Email Body intro */}
          <div style={{ whiteSpace: "pre-line", marginBottom: "1.25rem", fontWeight: 500, fontFamily: "var(--font-sans)", opacity: 0.9 }}>
            {emailIntro}
          </div>

          {/* Featured Properties list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {selectedIds.length > 0 ? (
              properties.filter(p => selectedIds.includes(p.id)).map(p => (
                <div key={p.id} style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(94, 194, 224, 0.3)", borderRadius: "4px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#ffffff", fontFamily: "var(--font-sans)" }}>{p.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-cyan)", fontFamily: "var(--font-mono)" }}>{p.location}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                    {p.currency} {p.price.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-cyan)", border: "1px dashed rgba(94, 194, 224, 0.4)", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)" }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "20px" }}></i>
                Select listings on the left to see featured email preview blueprints.
              </div>
            )}
          </div>

          {/* Email Footer */}
          <div style={{ borderTop: "1px dashed rgba(94, 194, 224, 0.3)", marginTop: "1.5rem", paddingTop: "0.75rem", fontSize: "0.7rem", color: "var(--color-cyan)", textAlign: "center", fontFamily: "var(--font-mono)", opacity: 0.7 }}>
            PropMatch AI Advisory Services · 1205 S.G. Highway, Ahmedabad · Unsubscribe
          </div>
        </div>
      </div>

    </div>
  );
}
