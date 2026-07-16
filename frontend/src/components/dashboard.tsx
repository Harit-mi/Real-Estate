import { useState, useEffect, useRef } from "react";
import { 
  Send, CheckCircle, Info, RefreshCw
} from "lucide-react";

interface DashboardProps {
  backendUrl: string;
  refreshTrigger: number;
  selectedPhoneContact: { name: string; phone: string; dealId: string } | null;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string | null;
  jobTitle: string | null;
  intentScore: string;
  requirement?: {
    type: string;
    bedrooms: number;
    budgetMin: number;
    budgetMax: number;
    locations: string;
    propertyType: string;
  };
}

interface Property {
  id: string;
  title: string;
  type: string;
  propertyType: string;
  bedrooms: number;
  price: number;
  location: string;
  area: number;
  areaUnit: string;
  status: string;
}

interface Match {
  lead: Lead;
  property: Property;
  score: number;
  reasons: string[];
}

export default function Dashboard({ backendUrl, refreshTrigger }: DashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  
  // Selected Match dossier panel
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  // SVG lines coordinates
  const [threadCoords, setThreadCoords] = useState<Array<{
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    score: number;
    lead: Lead;
    property: Property;
    reasons: string[];
  }>>([]);

  const boardRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const fetchData = async () => {
    try {
      // 1. Fetch leads (Contacts with active Requirements)
      const resLeads = await fetch(`${backendUrl}/api/contacts`);
      const rawLeads: Lead[] = await resLeads.json();
      
      // Filter leads that have requirements
      const leadsWithReqs = rawLeads.filter(l => l.requirement);
      setLeads(leadsWithReqs);

      // 2. Fetch properties
      const resProps = await fetch(`${backendUrl}/api/properties`);
      const rawProps: Property[] = await resProps.json();
      setProperties(rawProps);

      // 3. Compute matches dynamically based on our custom algorithm rules
      const computedMatches: Match[] = [];
      leadsWithReqs.forEach(lead => {
        const req = lead.requirement;
        if (!req) return;

        rawProps.forEach(prop => {
          // Check core variables
          const scoreResult = calculateMatchScore(prop, req);
          if (scoreResult.score >= 40) {
            computedMatches.push({
              lead,
              property: prop,
              score: scoreResult.score,
              reasons: scoreResult.reasons
            });
          }
        });
      });
      
      // Sort matches descending
      computedMatches.sort((a, b) => b.score - a.score);
      setMatches(computedMatches);
    } catch (e) {
      console.error("Failed to load matching board data:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Recalculate coordinates for matching lines relative to board container
  const updateCoordinates = () => {
    if (!boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const coords: any[] = [];

    // Filter matches to render lines for
    const visibleMatches = matches.filter(m => {
      const matchLead = selectedLeadId === "all" || m.lead.id === selectedLeadId;
      const matchProp = selectedPropertyId === "all" || m.property.id === selectedPropertyId;
      return matchLead && matchProp;
    });

    visibleMatches.forEach((m) => {
      const leadEl = cardRefs.current[`lead-pin-${m.lead.id}`];
      const propEl = cardRefs.current[`prop-pin-${m.property.id}`];

      if (leadEl && propEl) {
        const leadRect = leadEl.getBoundingClientRect();
        const propRect = propEl.getBoundingClientRect();

        // Calculate center of each pin relative to the board container
        const x1 = (leadRect.left + leadRect.width / 2) - boardRect.left;
        const y1 = (leadRect.top + leadRect.height / 2) - boardRect.top;
        const x2 = (propRect.left + propRect.width / 2) - boardRect.left;
        const y2 = (propRect.top + propRect.height / 2) - boardRect.top;

        coords.push({
          key: `${m.lead.id}-${m.property.id}`,
          x1, y1, x2, y2,
          score: m.score,
          lead: m.lead,
          property: m.property,
          reasons: m.reasons
        });
      }
    });

    setThreadCoords(coords);
  };

  useEffect(() => {
    // Run after DOM has calculated layout
    const timer = setTimeout(updateCoordinates, 300);
    window.addEventListener("resize", updateCoordinates);
    return () => {
      window.removeEventListener("resize", updateCoordinates);
      clearTimeout(timer);
    };
  }, [leads, properties, matches, selectedLeadId, selectedPropertyId]);

  // Matching algorithm matching backend logic
  const calculateMatchScore = (prop: Property, req: any) => {
    let score = 0;
    const reasons: string[] = [];

    const weights = {
      type: 30,
      prop_type: 25,
      config: 15,
      budget: 20,
      location: 10
    };

    // 1. Transaction Type Consistency
    const reqType = req.type.toLowerCase().trim();
    const propType = prop.type.toLowerCase().trim();

    let isTypeMatch = false;
    if (reqType === propType) {
      isTypeMatch = true;
    } else if (reqType === "buy" && propType === "sell") {
      isTypeMatch = true;
    } else if (reqType === "sell" && propType === "buy") {
      isTypeMatch = true;
    }

    if (isTypeMatch) {
      score += weights.type;
    } else {
      reasons.push("Deal model mismatch (Buy vs Rent)");
    }

    // 2. Property Type Match
    const reqPType = req.propertyType.toLowerCase();
    const propPType = prop.propertyType.toLowerCase();

    const synonyms: { [key: string]: string[] } = {
      villa: ["villa", "bungalow", "house", "independent house"],
      bungalow: ["villa", "bungalow", "house", "independent house"],
      apartment: ["apartment", "flat", "tenement"],
      office: ["office", "office space", "commercial", "shop"],
      land: ["land", "plot", "square yards"]
    };

    let typeScore = 0;
    if (reqPType === propPType) {
      typeScore = 1.0;
    } else if (synonyms[reqPType] && synonyms[reqPType].includes(propPType)) {
      typeScore = 0.8;
      reasons.push(`Similar type match (${prop.propertyType} vs ${req.propertyType})`);
    } else {
      reasons.push(`Property type mismatch (${prop.propertyType} vs ${req.propertyType})`);
    }
    score += typeScore * weights.prop_type;

    // 3. Configuration Match
    if (["office", "land"].includes(reqPType)) {
      score += weights.config;
    } else {
      if (req.bedrooms === prop.bedrooms) {
        score += weights.config;
      } else if (Math.abs(req.bedrooms - prop.bedrooms) === 1) {
        score += weights.config * 0.6;
        reasons.push(`BHK off by 1 (${prop.bedrooms} vs ${req.bedrooms})`);
      } else {
        reasons.push(`BHK mismatch (${prop.bedrooms} vs ${req.bedrooms})`);
      }
    }

    // 4. Budget Match
    if (prop.price >= req.budgetMin && prop.price <= req.budgetMax) {
      score += weights.budget;
    } else if (prop.price < req.budgetMin) {
      const diffPct = (req.budgetMin - prop.price) / req.budgetMin;
      if (diffPct < 0.25) {
        score += weights.budget * 0.9;
        reasons.push(`Price slightly under budget`);
      } else {
        score += weights.budget * 0.5;
        reasons.push(`Price significantly under budget`);
      }
    } else {
      const overBudget = prop.price - req.budgetMax;
      const excessPct = overBudget / req.budgetMax;
      if (excessPct <= 0.15) {
        score += weights.budget * (1 - (excessPct / 0.15) * 0.6);
        reasons.push(`Price slightly over budget (+${Math.round(excessPct * 100)}%)`);
      } else {
        reasons.push(`Price out of budget`);
      }
    }

    // 5. Location Match
    const propLoc = prop.location.toLowerCase();
    const reqLocs = req.locations.split(/[,\s]+/).map((l: string) => l.trim().toLowerCase()).filter(Boolean);

    let locMatched = false;
    for (const reqLoc of reqLocs) {
      if (propLoc.includes(reqLoc) || reqLoc.includes(propLoc)) {
        locMatched = true;
        break;
      }
    }

    if (locMatched) {
      score += weights.location;
    } else {
      reasons.push(`Location mismatch`);
    }

    return { score: Math.round(score), reasons };
  };

  const handleThreadClick = (m: Match) => {
    setActiveMatch(m);
    setAlertSuccess(false);
  };

  const triggerWhatsAppBroadcast = async () => {
    if (!activeMatch) return;
    setIsAlerting(true);
    try {
      // Find or create active deal for matching contact
      const resDeals = await fetch(`${backendUrl}/api/deals`);
      const deals = await resDeals.json();
      let activeDeal = deals.find((d: any) => d.requirement.contactId === activeMatch.lead.id);

      const dealId = activeDeal ? activeDeal.id : "new-deal";

      // Post outreach broadcast activity log
      await fetch(`${backendUrl}/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: activeMatch.lead.id,
          dealId: dealId,
          type: "whatsapp_out",
          content: `🟢 PropMatch Broadcast: Hi ${activeMatch.lead.name}, we found a matching property for you! "${activeMatch.property.title}" in ${activeMatch.property.location} listed at ${activeMatch.property.price.toLocaleString()} INR. Let us know if you'd like to book a site visit!`,
        }),
      });

      setAlertSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAlerting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", flexGrow: 1 }}>
      
      {/* Search Filters Blueprint Board Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", alignItems: "center", backgroundColor: "rgba(23, 50, 77, 0.03)", padding: "1rem", borderRadius: "4px", border: "1px dashed var(--color-cyan)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy)" }}>FILTER BY LEAD</label>
          <select 
            className="form-control" 
            style={{ width: "200px", padding: "0.5rem" }}
            value={selectedLeadId}
            onChange={(e) => {
              setSelectedLeadId(e.target.value);
              setActiveMatch(null);
            }}
          >
            <option value="all">[ ALL ACTIVE LEADS ]</option>
            {leads.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.intentScore.toUpperCase()})</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy)" }}>FILTER BY PROPERTY</label>
          <select 
            className="form-control" 
            style={{ width: "200px", padding: "0.5rem" }}
            value={selectedPropertyId}
            onChange={(e) => {
              setSelectedPropertyId(e.target.value);
              setActiveMatch(null);
            }}
          >
            <option value="all">[ ALL PROPERTIES ]</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {(selectedLeadId !== "all" || selectedPropertyId !== "all") && (
          <button 
            className="btn btn-secondary" 
            style={{ padding: "0.5rem 1rem", marginTop: "1rem" }}
            onClick={() => {
              setSelectedLeadId("all");
              setSelectedPropertyId("all");
              setActiveMatch(null);
            }}
          >
            CLEAR FILTERS
          </button>
        )}

        <div style={{ marginLeft: "auto", fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          {threadCoords.length} ACTIVE THREAD{threadCoords.length !== 1 ? 'S' : ''} SURFACED
        </div>
      </div>

      {/* Main Corkboard investigative layout */}
      {properties.length === 0 ? (
        /* 7. Empty states - bare corkboard with just pins */
        <div className="corkboard-canvas" style={{ minHeight: "450px", display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center", color: "#e4d9c0", maxWidth: "400px" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ width: "12px", height: "12px", background: "var(--color-thread)", borderRadius: "50%" }}></div>
              <div style={{ width: "12px", height: "12px", background: "var(--color-thread)", borderRadius: "50%" }}></div>
              <div style={{ width: "12px", height: "12px", background: "var(--color-thread)", borderRadius: "50%" }}></div>
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", marginBottom: "0.5rem" }}>INVESTIGATION ACTIVE</h3>
            <p style={{ fontSize: "0.85rem", opacity: 0.8, fontStyle: "italic", lineHeight: 1.4 }}>
              No properties logged in the database files yet. Pinned index cards will appear here. Ingest CSV lead lists or register properties to draw matching threads.
            </p>
          </div>
        </div>
      ) : (
        <div className="corkboard-canvas" ref={boardRef}>
          {/* SVG Thread Overlay */}
          <svg className="threads-overlay-svg">
            <defs>
              <style>{`
                @keyframes draw-thread {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
              `}</style>
            </defs>
            {threadCoords.map((t, idx) => {
              // Calculate thickness based on score (thin = 1.5px, strong = 6.5px)
              const thickness = 1.5 + ((t.score - 40) / 60) * 5;
              const isSelected = activeMatch && activeMatch.lead.id === t.lead.id && activeMatch.property.id === t.property.id;

              return (
                <path
                  key={t.key}
                  d={`M ${t.x1} ${t.y1} Q ${(t.x1 + t.x2)/2} ${(t.y1 + t.y2)/2 + 20} ${t.x2} ${t.y2}`}
                  fill="none"
                  strokeWidth={thickness}
                  className={`red-thread-line ${isSelected ? 'active' : ''}`}
                  onClick={() => handleThreadClick({ lead: t.lead, property: t.property, score: t.score, reasons: t.reasons })}
                  style={{
                    strokeDasharray: "1000",
                    strokeDashoffset: "1000",
                    animation: "draw-thread 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                    animationDelay: `${idx * 60}ms`,
                    opacity: isSelected ? 1 : undefined,
                    stroke: isSelected ? "#e63946" : undefined
                  }}
                />
              );
            })}
          </svg>

          {/* Left Column: Leads */}
          <div className="corkboard-column">
            <h3 style={{ color: "#f6f4ef", fontFamily: "var(--font-display)", borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: "0.5rem" }}>
              TARGET LEADS
            </h3>
            {leads
              .filter(l => selectedLeadId === "all" || l.id === selectedLeadId)
              .map(l => (
                <div 
                  key={l.id} 
                  className="index-card"
                  onClick={() => {
                    const match = matches.find(m => m.lead.id === l.id);
                    if (match) handleThreadClick(match);
                  }}
                >
                  <div className="index-card-pin" ref={el => { cardRefs.current[`lead-pin-${l.id}`] = el; }}></div>
                  <h4 className="card-title-stamped">{l.name}</h4>
                  <div className="card-field-stamped" style={{ fontSize: "0.75rem", fontStyle: "italic", marginBottom: "0.5rem" }}>
                    {l.jobTitle || "Lead Profile"} - {l.company || "N/A"}
                  </div>
                  <div className="card-field-stamped" style={{ borderTop: "1px dashed rgba(0,0,0,0.1)", paddingTop: "0.5rem" }}>
                    Pref: <strong>{l.requirement?.propertyType.toUpperCase()} ({l.requirement?.bedrooms} BHK)</strong>
                  </div>
                  <div className="card-field-stamped">
                    Budget: <strong>{l.requirement?.budgetMin.toLocaleString()}-{l.requirement?.budgetMax.toLocaleString()} INR</strong>
                  </div>
                  <div className="card-field-stamped">
                    Loc: <strong style={{ fontSize: "0.75rem" }}>{l.requirement?.locations}</strong>
                  </div>
                </div>
              ))}
          </div>

          {/* Right Column: Properties */}
          <div className="corkboard-column">
            <h3 style={{ color: "#f6f4ef", fontFamily: "var(--font-display)", borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: "0.5rem" }}>
              INVENTORY LISTINGS
            </h3>
            {properties
              .filter(p => selectedPropertyId === "all" || p.id === selectedPropertyId)
              .map(p => (
                <div 
                  key={p.id} 
                  className="index-card"
                  style={{ transform: "rotate(-0.5deg)" }}
                  onClick={() => {
                    const match = matches.find(m => m.property.id === p.id);
                    if (match) handleThreadClick(match);
                  }}
                >
                  <div className="index-card-pin" ref={el => { cardRefs.current[`prop-pin-${p.id}`] = el; }}></div>
                  <h4 className="card-title-stamped">{p.title}</h4>
                  <div className="card-field-stamped" style={{ textTransform: "uppercase", fontSize: "0.7rem", color: "var(--color-thread)" }}>
                    [{p.status}]
                  </div>
                  <div className="card-field-stamped" style={{ borderTop: "1px dashed rgba(0,0,0,0.1)", paddingTop: "0.5rem" }}>
                    Type: <strong>{p.propertyType.toUpperCase()} ({p.bedrooms} BHK)</strong>
                  </div>
                  <div className="card-field-stamped">
                    Price: <strong style={{ color: "#8b2020" }}>{p.price.toLocaleString()} INR</strong>
                  </div>
                  <div className="card-field-stamped">
                    Loc: <strong>{p.location}</strong>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 3. Lead Detail Dossier Slide-Over panel */}
      {activeMatch && (
        <div className="side-panel-overlay" onClick={() => setActiveMatch(null)}>
          <div className="side-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h3>CASE DOSSIER: {activeMatch.lead.name}</h3>
                <p style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  REF: LEAD-{activeMatch.lead.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              <button className="panel-close" onClick={() => setActiveMatch(null)}>✕</button>
            </div>

            <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {/* Client specifications */}
              <div style={{ backgroundColor: "rgba(0,0,0,0.03)", padding: "1rem", borderRadius: "4px", border: "1px solid rgba(23,50,77,0.1)" }}>
                <h4 style={{ fontSize: "0.85rem", fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>LEAD PREFERENCES</h4>
                <div className="card-field-stamped">Phone: <strong>{activeMatch.lead.phone}</strong></div>
                <div className="card-field-stamped">Email: <strong>{activeMatch.lead.email}</strong></div>
                <div className="card-field-stamped">Type: <strong>{activeMatch.lead.requirement?.type.toUpperCase()}</strong></div>
                <div className="card-field-stamped">Desired Locations: <strong>{activeMatch.lead.requirement?.locations}</strong></div>
              </div>

              {/* Match breakdown score card */}
              <div style={{ border: "2px solid var(--color-navy)", padding: "1.25rem", borderRadius: "4px", position: "relative" }}>
                <div style={{ position: "absolute", top: "-10px", right: "1rem", backgroundColor: "var(--color-manila)", padding: "0 0.5rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  COMPATIBILITY
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "2rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-thread)" }}>
                    {activeMatch.score}%
                  </div>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>MATCH MATCHMAKER</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Thread Thickness Weight</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckCircle size={14} color="#1e6b36" />
                    <span>Transaction Model Consistency (Pass)</span>
                  </div>
                  {activeMatch.reasons.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <CheckCircle size={14} color="#1e6b36" />
                      <span>Perfect matching coordinates (Budget, Location, Size)</span>
                    </div>
                  ) : (
                    activeMatch.reasons.map((r, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgba(0,0,0,0.7)" }}>
                        <Info size={14} color="var(--color-thread)" />
                        <span>{r}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* simulated timeline dossier */}
              <div>
                <h4 style={{ fontSize: "0.85rem", fontFamily: "var(--font-display)", marginBottom: "0.5rem" }}>DOSSIER HISTORY</h4>
                <div className="timeline" style={{ maxHeight: "180px", overflowY: "auto" }}>
                  <div className="timeline-item">
                    <div className="timeline-icon system">S</div>
                    <div className="timeline-content" style={{ padding: "0.5rem" }}>
                      <div className="timeline-header"><span style={{ fontWeight: 700 }}>File Opened</span><span style={{ fontSize: "0.65rem" }}>Today</span></div>
                      <div className="timeline-body">Requirement parsed and saved to SQLite index log.</div>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-icon note">N</div>
                    <div className="timeline-content" style={{ padding: "0.5rem" }}>
                      <div className="timeline-header"><span style={{ fontWeight: 700 }}>System Note</span><span style={{ fontSize: "0.65rem" }}>Today</span></div>
                      <div className="timeline-body">Client marked as "{activeMatch.lead.intentScore.toUpperCase()}" priority lead dossier.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alert agent option */}
              <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "2px dashed rgba(23,50,77,0.2)" }}>
                {alertSuccess ? (
                  <div style={{ backgroundColor: "#e2f2e6", color: "#1e6b36", padding: "1rem", borderRadius: "4px", textAlign: "center", border: "1px solid #1e6b36", fontSize: "0.85rem", fontWeight: 700 }}>
                    ✓ WHATSAPP OUTBOUND BROADCAST DISPATCHED TO SIMULATOR
                  </div>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    style={{ width: "100%", gap: "0.75rem", padding: "1rem" }}
                    onClick={triggerWhatsAppBroadcast}
                    disabled={isAlerting}
                  >
                    {isAlerting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    TRIGGER WHATSAPP NOTIFICATION
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
