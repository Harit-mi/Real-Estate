import { useState, useEffect } from "react";
import { Users, Award, ShieldAlert, TrendingUp } from "lucide-react";

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
      return `₹${(val / 100000).toFixed(2)} Lakhs`;
    }
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2.5rem" }}>
      
      {/* Left Column: Team Directory & Sales Performance */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", display: "flex", flexDirection: "column" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={18} color="#000000" />
          Agency Team Directory & Sales Leaderboard
        </h2>

        {loading && leaderboard.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontWeight: 600 }}>Loading agency metrics...</div>
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
                    backgroundColor: "var(--bg-card)", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "16px",
                    position: "relative"
                  }}
                >
                  {/* Gold Rank Ribbon for Number 1 */}
                  {isFirst && (
                    <div style={{ position: "absolute", top: "1rem", right: "1rem", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.7rem", fontWeight: 700, backgroundColor: "#fef3c7", color: "#d97706", padding: "0.25rem 0.5rem", borderRadius: "6px", border: "1px solid #fde68a" }}>
                      <Award size={12} />
                      Top Producer
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                    {/* Circle rank index */}
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: isFirst ? "#000" : "#e5e7eb", color: isFirst ? "#fff" : "#000", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.85rem" }}>
                      {index + 1}
                    </div>

                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800 }}>{agent.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{agent.role}</div>
                    </div>
                  </div>

                  {/* Volume bar progress chart */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.35rem" }}>
                      <span>Closed Deals Volume</span>
                      <span style={{ color: "#000000" }}>{formatCurrency(agent.salesVolume)} ({agent.dealsClosed} deals)</span>
                    </div>
                    
                    <div style={{ width: "100%", height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                      <div 
                        style={{ 
                          width: `${pctWidth}%`, 
                          height: "100%", 
                          backgroundColor: isFirst ? "var(--color-success)" : "#000", 
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

      {/* Right Column: Commission Splits & Splits Policy */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Commission Splits Calculator details */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={18} color="#000000" />
            Commission splits details
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>Agent Commission Split</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Retention rate kept by closed agents</div>
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>70%</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>Brokerage Desk Desk Split</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Corporate split desk fees</div>
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>30%</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.5rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>Average Service Fee</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Fixed commission rate on property price</div>
              </div>
              <span style={{ fontSize: "1.2rem", fontWeight: 800 }}>2.0%</span>
            </div>

          </div>
        </div>

        {/* Agency Desk Alert Policy */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldAlert size={18} color="#000000" />
            Broker Desk Policy
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.5", fontWeight: 500 }}>
            Sales volume benchmarks are updated dynamically at the end of each fiscal month. Transaction splits upgrade to an 80/20 ratio for agents exceeding ₹5.00 Cr in closed transactions.
          </p>
        </div>

      </div>

    </div>
  );
}
