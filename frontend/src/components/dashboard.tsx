import { useState, useEffect } from "react";

interface DashboardProps {
  backendUrl: string;
  refreshTrigger: number;
  selectedPhoneContact: { name: string; phone: string; dealId: string } | null;
}

export default function Dashboard({ backendUrl, refreshTrigger }: DashboardProps) {
  const [stats, setStats] = useState({ leads: 0, properties: 0, matches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [leadsRes, propsRes, dealsRes] = await Promise.all([
          fetch(`${backendUrl}/api/leads`),
          fetch(`${backendUrl}/api/properties`),
          fetch(`${backendUrl}/api/deals`)
        ]);
        const leads = await leadsRes.json();
        const props = await propsRes.json();
        const deals = await dealsRes.json();
        
        let matchCount = 0;
        deals.forEach((d: any) => {
          matchCount += d.dealProperties?.length || 0;
        });

        setStats({
          leads: leads.length,
          properties: props.length,
          matches: matchCount
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger, backendUrl]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", height: "100%", overflowY: "auto", paddingBottom: "2rem" }}>
      <div style={{ fontSize: "32px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-1px", marginBottom: "1rem" }}>
        Good morning, PropMatch.
      </div>
      
      {loading ? (
        <div style={{ color: "var(--text-muted)" }}>Loading your marketplace...</div>
      ) : (
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          
          <div style={{ 
            flex: 1, 
            minWidth: "240px", 
            padding: "24px", 
            borderRadius: "var(--radius-lg)", 
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-page)",
            boxShadow: "0 6px 16px rgba(0,0,0,0.06)"
          }}>
            <div style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "8px" }}>Total Active Leads</div>
            <div style={{ fontSize: "40px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-1px" }}>{stats.leads}</div>
          </div>

          <div style={{ 
            flex: 1, 
            minWidth: "240px", 
            padding: "24px", 
            borderRadius: "var(--radius-lg)", 
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-page)",
            boxShadow: "0 6px 16px rgba(0,0,0,0.06)"
          }}>
            <div style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "8px" }}>Available Properties</div>
            <div style={{ fontSize: "40px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-1px" }}>{stats.properties}</div>
          </div>

          <div style={{ 
            flex: 1, 
            minWidth: "240px", 
            padding: "24px", 
            borderRadius: "var(--radius-lg)", 
            border: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-page)",
            boxShadow: "0 6px 16px rgba(0,0,0,0.06)"
          }}>
            <div style={{ fontSize: "16px", color: "var(--text-muted)", fontWeight: 500, marginBottom: "8px" }}>Generated Matches</div>
            <div style={{ fontSize: "40px", fontWeight: 700, color: "var(--color-cyan)", letterSpacing: "-1px" }}>{stats.matches}</div>
          </div>

        </div>
      )}

      <div style={{ 
        marginTop: "2rem", 
        padding: "32px", 
        borderRadius: "var(--radius-lg)", 
        backgroundColor: "var(--color-cyan)", 
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 10px 24px rgba(255, 56, 92, 0.2)"
      }}>
        <div>
          <h2 style={{ fontSize: "28px", fontWeight: 600, margin: 0, marginBottom: "8px", letterSpacing: "-0.5px" }}>Ready to close more deals?</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "16px" }}>Use the Matches tab to view curated recommendations for your leads.</p>
        </div>
        <button style={{ 
          padding: "16px 24px", 
          borderRadius: "var(--radius-sm)", 
          border: "none", 
          backgroundColor: "white", 
          color: "var(--color-cyan)", 
          fontSize: "16px", 
          fontWeight: 600,
          cursor: "pointer"
        }}>
          Explore Matches
        </button>
      </div>

    </div>
  );
}
