import { useState, useEffect } from "react";

interface AgentLeaderboard {
  id: string;
  name: string;
  role: string;
  dealsClosed: number;
  salesVolume: number;
  commissionEarned: number;
}

interface TeamViewProps {
  backendUrl: string;
  refreshTrigger: number;
}

export default function TeamView({ backendUrl, refreshTrigger }: TeamViewProps) {
  const [leaderboard, setLeaderboard] = useState<AgentLeaderboard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/agents/leaderboard`);
      const data = await response.json();
      // Sort by sales volume descending
      setLeaderboard(data.sort((a: AgentLeaderboard, b: AgentLeaderboard) => b.salesVolume - a.salesVolume));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [refreshTrigger]);

  const maxVolume = Math.max(...leaderboard.map(a => a.salesVolume), 1);

  const formatCurrency = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    } else if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2.5rem" }}>
      
      {/* Left Column: Team Directory & Sales Performance - Styled like a Manila bulletin notice */}
      <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", display: "flex", flexDirection: "column", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
          <i className="fa-solid fa-users" style={{ color: "var(--color-navy)" }}></i>
          AGENCY TEAM DIRECTORY & LEADERBOARD
        </h2>

        {loading && leaderboard.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>Loading agency metrics...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {leaderboard.map((agent, index) => {
              const pctWidth = (agent.salesVolume / maxVolume) * 100;
              const isFirst = index === 0;

              return (
                <div 
                  key={agent.id}
                  style={{ 
                    padding: "1.25rem", 
                    backgroundColor: "rgba(255, 255, 255, 0.7)", 
                    border: "1px solid rgba(23,50,77,0.15)", 
                    borderRadius: "4px",
                    position: "relative"
                  }}
                >
                  {/* Gold Rank Ribbon for Number 1 */}
                  {isFirst && (
                    <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#fef3c7", color: "#d97706", padding: "0.25rem 0.5rem", borderRadius: "4px", border: "1px solid #fde68a" }}>
                      <i className="fa-solid fa-trophy" style={{ fontSize: "11px" }}></i>
                      Top Producer
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    {/* Circle rank index */}
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: isFirst ? "var(--color-navy)" : "rgba(0,0,0,0.1)", color: isFirst ? "#fff" : "var(--color-navy)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
                      {index + 1}
                    </div>

                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--color-navy)" }}>{agent.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{agent.role}</div>
                    </div>
                  </div>

                  {/* Volume bar progress chart */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.35rem", fontFamily: "var(--font-mono)" }}>
                      <span>Closed Deals Volume</span>
                      <span style={{ color: "var(--color-navy)" }}>{formatCurrency(agent.salesVolume)} ({agent.dealsClosed} deals)</span>
                    </div>
                    
                    <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(0,0,0,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${pctWidth}%`, 
                          height: "100%", 
                          backgroundColor: isFirst ? "var(--color-thread)" : "var(--color-navy)", 
                          transition: "width 0.4s ease-out" 
                        }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Commission Splits & Splits Policy - Styled like Blueprint Ingest */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Commission Splits Calculator details */}
        <div style={{ backgroundColor: "var(--color-navy)", border: "2px solid var(--color-cyan)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-cyan)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(94,194,224,0.3)", paddingBottom: "0.5rem" }}>
            <i className="fa-solid fa-chart-line" style={{ color: "var(--color-cyan)" }}></i>
            COMMISSION SPLITS POLICY
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(94,194,224,0.2)", paddingBottom: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>Agent Commission Split</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-cyan)", fontFamily: "var(--font-sans)", opacity: 0.8 }}>Retention rate kept by closed agents</div>
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-cyan)", fontFamily: "var(--font-mono)" }}>70%</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed rgba(94,194,224,0.2)", paddingBottom: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>Brokerage Desk Desk Split</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-cyan)", fontFamily: "var(--font-sans)", opacity: 0.8 }}>Corporate split desk fees</div>
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-cyan)", fontFamily: "var(--font-mono)" }}>30%</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffffff" }}>Average Service Fee</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-cyan)", fontFamily: "var(--font-sans)", opacity: 0.8 }}>Fixed commission rate on property price</div>
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-cyan)", fontFamily: "var(--font-mono)" }}>2.0%</span>
            </div>

          </div>
        </div>

        {/* Agency Desk Alert Policy */}
        <div style={{ backgroundColor: "var(--color-navy)", border: "2px solid var(--color-cyan)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-cyan)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(94,194,224,0.3)", paddingBottom: "0.5rem" }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: "var(--color-cyan)" }}></i>
            BROKER DESK DIRECTIVE
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#ffffff", fontFamily: "var(--font-sans)", lineHeight: "1.5", opacity: 0.8 }}>
            Sales volume benchmarks are updated dynamically at the end of each fiscal month. Transaction splits upgrade to an 80/20 ratio for agents exceeding ₹5.00 Cr in closed transactions.
          </p>
        </div>

      </div>

    </div>
  );
}
