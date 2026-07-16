import React, { useState, useEffect } from "react";
import { Send, FileSpreadsheet, Mail, AlertCircle, Loader2 } from "lucide-react";

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
      
      {/* Left Column: Pick listings and compose email */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Mail size={18} color="#000000" />
          Compose Newsletter Broadcast
        </h2>

        <form onSubmit={handleBroadcast} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Campaign / Broadcast Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Ahmedabad Premium Villas Showcase" 
              className="form-control"
              style={{ borderRadius: "8px" }}
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
              style={{ borderRadius: "8px", fontSize: "0.85rem" }}
              value={emailIntro}
              onChange={(e) => setEmailIntro(e.target.value)}
              required
            />
          </div>

          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Select Listings to Showcase ({selectedIds.length})</span>
              {recipientCount !== null && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-success)", fontWeight: 700, backgroundColor: "#f0fdf4", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                  Target Recipients: {recipientCount} Leads
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
                      backgroundColor: isSelected ? "#f3f4f6" : "var(--bg-card)",
                      border: isSelected ? "1px solid #000000" : "1px solid var(--border-color)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>{p.title}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>{p.location}</div>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 800 }}>
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
            style={{ width: "100%", borderRadius: "8px", padding: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "0.5rem" }}
            disabled={sending || selectedIds.length === 0}
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Broadcasting Email Campaigns...
              </>
            ) : (
              <>
                <Send size={14} />
                Send Simulated Campaign Broadcast
              </>
            )}
          </button>
        </form>
      </div>

      {/* Right Column: Visual Email Preview Template */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FileSpreadsheet size={18} color="#000000" />
          Email Template Preview
        </h2>

        {/* Email Preview Sheet */}
        <div 
          style={{ 
            flexGrow: 1, 
            backgroundColor: "#f9fafb", 
            border: "1px solid #e5e7eb", 
            borderRadius: "12px", 
            padding: "1.5rem",
            fontSize: "0.8rem",
            lineHeight: "1.5",
            color: "#374151"
          }}
        >
          {/* Email Subject block */}
          <div style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <div><strong>Subject:</strong> {campaignName || "[Campaign Name]"}</div>
            <div><strong>From:</strong> PropMatch Global Advisory &lt;info@propmatch.ai&gt;</div>
          </div>

          {/* Email Body intro */}
          <div style={{ whiteSpace: "pre-line", marginBottom: "1.25rem", fontWeight: 500 }}>
            {emailIntro}
          </div>

          {/* Featured Properties list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {selectedIds.length > 0 ? (
              properties.filter(p => selectedIds.includes(p.id)).map(p => (
                <div key={p.id} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#111827" }}>{p.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{p.location}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: "#111827" }}>
                    {p.currency} {p.price.toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-light)", border: "1px dashed #d1d5db", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={24} />
                Select properties on the left to see featured email preview cards.
              </div>
            )}
          </div>

          {/* Email Footer */}
          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: "1.5rem", paddingTop: "0.75rem", fontSize: "0.7rem", color: "#9ca3af", textAlign: "center", fontWeight: 500 }}>
            PropMatch AI Advisory Services · 1205 S.G. Highway, Ahmedabad · Unsubscribe
          </div>
        </div>
      </div>

    </div>
  );
}
