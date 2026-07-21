import { useState, useEffect } from "react";

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  status: string;
}

interface InteractiveMapProps {
  backendUrl: string;
  refreshTrigger: number;
}

interface MarketNode {
  name: string;
  x: number;
  y: number;
  description: string;
}

const MARKET_NODES: MarketNode[] = [
  { name: "Bopal", x: 80, y: 110, description: "Western suburbs residential hub" },
  { name: "Shela", x: 70, y: 220, description: "Premium villas and low-density luxury mansions" },
  { name: "Satellite", x: 260, y: 200, description: "Prime high-density commercial/apartment zone" },
  { name: "Vastrapur", x: 280, y: 100, description: "Affluent central residential with lake views" },
  { name: "Bodakdev", x: 180, y: 160, description: "High-end corporate offices and super-luxury flats" },
  { name: "Ghatlodia", x: 150, y: 60, description: "Affordable middle-income housing sector" },
  { name: "Naranpura", x: 380, y: 50, description: "Established northern traditional core" },
];

export default function InteractiveMap({ backendUrl, refreshTrigger }: InteractiveMapProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedNode, setSelectedNode] = useState<MarketNode | null>(null);

  const fetchProperties = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/properties`);
      const data = await response.json();
      setProperties(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [refreshTrigger]);

  // Group properties by matching text location
  const getPropsForNode = (nodeName: string) => {
    return properties.filter((p) =>
      p.location.toLowerCase().includes(nodeName.toLowerCase())
    );
  };

  return (
    <div style={{ backgroundColor: "var(--color-navy)", border: "2px solid var(--color-cyan)", borderRadius: "var(--radius-sm)", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.3)" }}>
      <div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-cyan)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-map-location-dot" style={{ color: "var(--color-cyan)" }}></i>
          AHMEDABAD REGIONAL SUB-MARKET MAP
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--color-cyan)", marginTop: "0.25rem", opacity: 0.8 }}>
          Interactive geographical visual overlay representing inventory density across local residential nodes.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2rem" }}>
        
        {/* SVG Map Canvas - Blueprint style */}
        <div 
          style={{ 
            backgroundColor: "rgba(255,255,255,0.02)", 
            borderRadius: "4px", 
            border: "1px solid rgba(94, 194, 224, 0.4)",
            position: "relative",
            overflow: "hidden",
            height: "320px"
          }}
        >
          {/* Legend */}
          <div style={{ position: "absolute", top: "1rem", left: "1rem", backgroundColor: "var(--color-navy)", border: "1px solid rgba(94, 194, 224, 0.3)", padding: "0.5rem 0.75rem", borderRadius: "4px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem", zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-cyan)" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-cyan)" }} /> Active Listings
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-thread)" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-thread)" }} /> Sold/Hold
            </div>
          </div>

          <svg viewBox="0 0 500 300" width="100%" height="100%" style={{ overflow: "visible" }}>
            {/* Draw connecting roads */}
            <path 
              d="M 80,110 Q 180,160 260,200 T 380,50" 
              fill="none" 
              stroke="rgba(94, 194, 224, 0.2)" 
              strokeWidth="4" 
              strokeDasharray="4 4"
            />
            <path 
              d="M 150,60 L 180,160 L 70,220" 
              fill="none" 
              stroke="rgba(94, 194, 224, 0.2)" 
              strokeWidth="4" 
            />
            <path 
              d="M 280,100 L 260,200" 
              fill="none" 
              stroke="rgba(94, 194, 224, 0.2)" 
              strokeWidth="3" 
            />

            {/* Draw nodes */}
            {MARKET_NODES.map((node) => {
              const nodeProps = getPropsForNode(node.name);
              const activeCount = nodeProps.filter(p => p.status === "available").length;
              const isSelected = selectedNode?.name === node.name;

              return (
                <g 
                  key={node.name} 
                  transform={`translate(${node.x}, ${node.y})`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedNode(node)}
                >
                  {/* Blinking pulses for active listings */}
                  {activeCount > 0 && (
                    <circle r="12" fill="var(--color-cyan)" opacity="0.3" className="animate-ping" />
                  )}
                  
                  {/* Outer circle shape */}
                  <circle 
                    r={isSelected ? "10" : "7"} 
                    fill={isSelected ? "var(--color-cyan)" : "var(--color-navy)"} 
                    stroke="var(--color-cyan)" 
                    strokeWidth={isSelected ? "2.5" : "2"} 
                  />

                  {/* Label */}
                  <text 
                    y="-15" 
                    textAnchor="middle" 
                    fill="#ffffff" 
                    fontSize="9.5" 
                    fontWeight={isSelected ? "800" : "600"}
                    fontFamily="var(--font-mono)"
                  >
                    {node.name} ({nodeProps.length})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node Detail List Pane - Styled like Manila card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "320px", overflowY: "auto", backgroundColor: "var(--color-manila)", border: "1px solid rgba(23,50,77,0.15)", borderRadius: "4px", padding: "1.25rem", boxShadow: "2px 2px 10px rgba(0,0,0,0.1)" }}>
          {selectedNode ? (
            <>
              <div style={{ paddingBottom: "0.75rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-navy)", fontFamily: "var(--font-display)" }}>{selectedNode.name.toUpperCase()} REGION</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem", fontWeight: 500 }}>
                  {selectedNode.description}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {getPropsForNode(selectedNode.name).map((p) => (
                  <div 
                    key={p.id} 
                    style={{ 
                      padding: "0.75rem 1rem", 
                      backgroundColor: "rgba(255,255,255,0.7)", 
                      border: "1px solid rgba(23,50,77,0.15)", 
                      borderRadius: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-navy)" }}>{p.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-thread)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        {p.currency} {p.price.toLocaleString()}
                      </div>
                    </div>
                    <span 
                      style={{ 
                        fontSize: "0.65rem", 
                        fontWeight: 700, 
                        color: p.status === "available" ? "#1e6b36" : "var(--color-thread)",
                        backgroundColor: p.status === "available" ? "#e2f2e6" : "#fef2f2",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        border: p.status === "available" ? "1px solid #1e6b36" : "1px solid var(--color-thread)"
                      }}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                ))}

                {getPropsForNode(selectedNode.name).length === 0 && (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.8rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)" }}>
                    <i className="fa-solid fa-building-circle-exclamation" style={{ fontSize: "28px" }}></i>
                    No property listings registered in this sub-market region.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--color-navy)", padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", fontFamily: "var(--font-mono)" }}>
              <i className="fa-solid fa-star fa-spin" style={{ fontSize: "32px", color: "var(--color-thread)" }}></i>
              <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                Select a sub-market node on the blueprint map canvas to load property inventory distribution.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
