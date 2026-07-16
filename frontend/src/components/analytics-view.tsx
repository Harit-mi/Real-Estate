import { useState, useEffect } from "react";
import { BarChart3, Target, Sparkles } from "lucide-react";

interface AnalyticsViewProps {
  backendUrl: string;
  refreshTrigger: number;
}

interface Deal {
  id: string;
  stage: string;
  dealProperties: Array<{
    matchScore: number;
    status: string;
    property: { price: number; currency: string };
  }>;
}

export default function AnalyticsView({ backendUrl, refreshTrigger }: AnalyticsViewProps) {
  const [deals, setDeals] = useState<Deal[]>([]);

  const fetchDeals = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/deals`);
      const data = await response.json();
      setDeals(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, [refreshTrigger]);

  // Calculations for deal funnel
  const getStageCount = (stageKey: string) => {
    return deals.filter((d) => d.stage === stageKey).length;
  };

  const STAGES_FUNNEL = [
    { key: "new_match", label: "New Matches Identified" },
    { key: "contacted", label: "Contacted Leads" },
    { key: "shortlisted", label: "Shortlisted Properties" },
    { key: "visit_scheduled", label: "Site Visits Tour" },
    { key: "negotiation", label: "Final Negotiations" },
    { key: "won", label: "Successfully Closed (Won)" },
  ];

  const maxStageCount = Math.max(...STAGES_FUNNEL.map(sf => getStageCount(sf.key)), 1);

  // Calculations for revenue target meter (2% Commission on Won Deals)
  const wonDeals = deals.filter(d => d.stage === "won");
  let totalVolume = 0;
  wonDeals.forEach(d => {
    const wonProp = d.dealProperties.find(dp => dp.status === "won");
    if (wonProp) {
      totalVolume += wonProp.property.price;
    }
  });

  const estimatedCommission = totalVolume * 0.02; // 2% fee
  const targetCommission = 250000; // INR 2.5 Lakhs target
  const targetPercent = Math.min((estimatedCommission / targetCommission) * 100, 100);

  // Match score distributions
  let highMatch = 0; // 90%+
  let midMatch = 0;  // 70-90%
  let lowMatch = 0;  // <70%

  deals.forEach(d => {
    d.dealProperties.forEach(dp => {
      if (dp.matchScore >= 90) highMatch++;
      else if (dp.matchScore >= 70) midMatch++;
      else lowMatch++;
    });
  });

  const totalMatches = highMatch + midMatch + lowMatch || 1;

  const formatCurrency = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
      
      {/* Left side: Funnel and revenue target */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Deal Stage Funnel */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <BarChart3 size={18} color="#000000" />
            Active Deal Conversion Funnel
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {STAGES_FUNNEL.map((sf) => {
              const count = getStageCount(sf.key);
              const percentWidth = Math.max((count / maxStageCount) * 100, 5); // Fallback to thin line if 0
              
              return (
                <div key={sf.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    <span>{sf.label}</span>
                    <span style={{ color: "#000000", fontWeight: 700 }}>{count} deals</span>
                  </div>
                  <div style={{ width: "100%", height: "24px", backgroundColor: "var(--bg-card)", borderRadius: "6px", overflow: "hidden" }}>
                    <div 
                      style={{ 
                        width: `${percentWidth}%`, 
                        height: "100%", 
                        backgroundColor: sf.key === "won" ? "var(--color-success)" : "#000000", 
                        transition: "width 0.5s ease-out" 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target commission meter */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Target size={18} color="#000000" />
            Revenue Target & Commission Fee
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div style={{ padding: "1.25rem", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Won Commission (2% Fee)</span>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem" }}>
                  {formatCurrency(estimatedCommission)}
                </div>
              </div>
              <div style={{ padding: "1.25rem", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Target Quota Limit</span>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem" }}>
                  {formatCurrency(targetCommission)}
                </div>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                <span>Sales target completion progress</span>
                <span>{targetPercent.toFixed(1)}%</span>
              </div>
              <div style={{ width: "100%", height: "12px", backgroundColor: "var(--bg-card)", borderRadius: "6px", overflow: "hidden" }}>
                <div 
                  style={{ 
                    width: `${targetPercent}%`, 
                    height: "100%", 
                    backgroundColor: "var(--color-success)", 
                    transition: "width 0.5s ease-out" 
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Right side: Match score accuracy breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", height: "100%" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={18} color="#000000" />
            Matching Accuracy Distribution
          </h2>

          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "2rem", fontWeight: 500 }}>
            Bi-directional engine scores matching compatibility. High-accuracy matches trigger automated WhatsApp notifications instantly.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* High matches bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-success)" }} />
                  High Match (90% - 100%)
                </span>
                <span style={{ fontWeight: 700 }}>{((highMatch / totalMatches) * 100).toFixed(0)}%</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-light)", marginBottom: "0.5rem", fontWeight: 500 }}>
                Strong matches that fulfill all bedroom, budget, and sub-market location requirements.
              </p>
              <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-card)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${(highMatch / totalMatches) * 100}%`, height: "100%", backgroundColor: "var(--color-success)" }} />
              </div>
            </div>

            {/* Mid matches bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-warning)" }} />
                  Partial Match (70% - 89%)
                </span>
                <span style={{ fontWeight: 700 }}>{((midMatch / totalMatches) * 100).toFixed(0)}%</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-light)", marginBottom: "0.5rem", fontWeight: 500 }}>
                Minor compromises in budget bounds or bordering neighborhood sub-markets.
              </p>
              <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-card)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${(midMatch / totalMatches) * 100}%`, height: "100%", backgroundColor: "var(--color-warning)" }} />
              </div>
            </div>

            {/* Low matches bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--color-danger)" }} />
                  Low Match (&lt; 70%)
                </span>
                <span style={{ fontWeight: 700 }}>{((lowMatch / totalMatches) * 100).toFixed(0)}%</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-light)", marginBottom: "0.5rem", fontWeight: 500 }}>
                Large budget discrepancy or disjointed locations. Pushed as passive options.
              </p>
              <div style={{ width: "100%", height: "8px", backgroundColor: "var(--bg-card)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ width: `${(lowMatch / totalMatches) * 100}%`, height: "100%", backgroundColor: "var(--color-danger)" }} />
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
