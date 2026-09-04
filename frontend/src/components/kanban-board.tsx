import { useState, useEffect } from "react";

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

interface KanbanBoardProps {
  backendUrl: string;
  onRefreshTriggered: number;
  onDealSelectedForPhone: (contactName: string, contactPhone: string, dealId: string) => void;
}

// Map stages to Airbnb-like tabs
const TABS = [
  { key: "all", label: "All Matches", icon: "fa-earth-americas" },
  { key: "new_match", label: "New Matches", icon: "fa-wand-magic-sparkles" },
  { key: "contacted", label: "Contacted", icon: "fa-envelope-open-text" },
  { key: "shortlisted", label: "Shortlisted", icon: "fa-heart" },
  { key: "visit_scheduled", label: "Site Visits", icon: "fa-key" },
  { key: "negotiation", label: "Negotiation", icon: "fa-comments-dollar" },
  { key: "won", label: "Won", icon: "fa-trophy" },
];

export default function KanbanBoard({ backendUrl, onRefreshTriggered, onDealSelectedForPhone }: KanbanBoardProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeMatch, setActiveMatch] = useState<any>(null); // For slide-over detail

  const fetchDeals = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/deals`);
      const data = await response.json();
      setDeals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [onRefreshTriggered]);

  const filteredDeals = activeTab === "all" ? deals : deals.filter(d => d.stage === activeTab);

  // Flatten deal properties to render cards
  const allCards: { deal: Deal, dealProp: DealProperty }[] = [];
  filteredDeals.forEach(deal => {
    deal.dealProperties.forEach(dp => {
      allCards.push({ deal, dealProp: dp });
    });
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Horizontal Tabs */}
      <div style={{ 
        display: "flex", 
        gap: "2rem", 
        paddingBottom: "1.5rem", 
        borderBottom: "1px solid var(--border-color)", 
        marginBottom: "2rem",
        overflowX: "auto"
      }}>
        {TABS.map(tab => (
          <div 
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              cursor: "pointer",
              color: activeTab === tab.key ? "var(--text-main)" : "var(--text-muted)",
              borderBottom: activeTab === tab.key ? "2px solid var(--text-main)" : "2px solid transparent",
              paddingBottom: "0.5rem",
              minWidth: "max-content"
            }}
          >
            <i className={`fa-solid ${tab.icon}`} style={{ fontSize: "24px", color: activeTab === tab.key ? "var(--text-main)" : "var(--text-muted)" }}></i>
            <span style={{ fontSize: "14px", fontWeight: activeTab === tab.key ? 600 : 500 }}>{tab.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading matches…</div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
          gap: "24px",
          overflowY: "auto",
          paddingBottom: "4rem"
        }}>
          {allCards.map(({ deal, dealProp }) => (
            <div 
              key={`${deal.id}-${dealProp.property.id}`} 
              style={{ cursor: "pointer" }}
              onClick={() => setActiveMatch({ lead: deal.requirement.contact, property: dealProp.property, score: dealProp.matchScore, reasons: [] })}
            >
              <div style={{ 
                aspectRatio: "1/1", 
                borderRadius: "var(--radius-md)", 
                overflow: "hidden",
                position: "relative",
                marginBottom: "12px",
                backgroundColor: "var(--bg-corkboard)"
              }}>
                <img 
                  src={`https://picsum.photos/seed/${dealProp.property.id}/600/600`} 
                  alt={dealProp.property.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div style={{ 
                  position: "absolute", 
                  top: "12px", 
                  left: "12px", 
                  backgroundColor: "rgba(255,255,255,0.9)", 
                  padding: "4px 8px", 
                  borderRadius: "var(--radius-full)",
                  fontSize: "12px",
                  fontWeight: 600,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}>
                  {dealProp.matchScore}% Match
                </div>
                <div style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-cyan)"
                }}>
                  <i className="fa-solid fa-heart" style={{ fontSize: "24px", WebkitTextStroke: "2px white" }}></i>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {dealProp.property.location}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
                  <i className="fa-solid fa-star" style={{ fontSize: "12px" }}></i>
                  <span>4.9</span>
                </div>
              </div>
              
              <div style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "2px" }}>
                Lead: {deal.requirement.contact.name}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                {dealProp.property.bedrooms} beds · {dealProp.property.propertyType}
              </div>
              
              <div style={{ marginTop: "6px", fontSize: "16px", color: "var(--text-main)" }}>
                <span style={{ fontWeight: 600 }}>{dealProp.property.price.toLocaleString()} INR</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Panel for Detail */}
      {activeMatch && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "400px",
          height: "100vh",
          backgroundColor: "var(--bg-page)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
          zIndex: 1000,
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "22px", fontWeight: 600 }}>Match Details</h3>
            <button 
              onClick={() => setActiveMatch(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}
            >
              ✕
            </button>
          </div>

          <img 
            src={`https://picsum.photos/seed/${activeMatch.property.id}/600/400`} 
            alt="Property" 
            style={{ width: "100%", height: "240px", objectFit: "cover", borderRadius: "var(--radius-md)" }}
          />

          <div>
            <div style={{ fontSize: "24px", fontWeight: 600, color: "var(--text-main)" }}>
              {activeMatch.property.price.toLocaleString()} INR
            </div>
            <div style={{ fontSize: "16px", color: "var(--text-muted)" }}>
              {activeMatch.property.location} · {activeMatch.property.bedrooms} beds
            </div>
          </div>

          <div style={{ padding: "1.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
            <h4 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "1rem" }}>Lead Information</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Name</span>
                <span style={{ fontWeight: 500 }}>{activeMatch.lead.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Phone</span>
                <span style={{ fontWeight: 500 }}>{activeMatch.lead.phone}</span>
              </div>
            </div>
          </div>

          <button 
            style={{ 
              width: "100%", 
              padding: "14px", 
              backgroundColor: "var(--color-cyan)", 
              color: "white", 
              border: "none", 
              borderRadius: "var(--radius-md)",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              marginTop: "auto"
            }}
            onClick={() => onDealSelectedForPhone(activeMatch.lead.name, activeMatch.lead.phone, "placeholder")}
          >
            Contact Lead
          </button>
        </div>
      )}
    </div>
  );
}
