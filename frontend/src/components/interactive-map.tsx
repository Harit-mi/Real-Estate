import { useState, useEffect } from "react";
import { MapPin, Building, Sparkles } from "lucide-react";

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
    <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <MapPin size={20} color="#000000" />
          Ahmedabad Local Sub-Market Map
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem", fontWeight: 500 }}>
          Interactive geographical visual overlay representing inventory density across local residential nodes.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "2rem" }}>
        
        {/* SVG Map Canvas */}
        <div 
          style={{ 
            backgroundColor: "var(--bg-card)", 
            borderRadius: "var(--radius-md)", 
            border: "1px solid var(--border-color)",
            position: "relative",
            overflow: "hidden",
            height: "320px"
          }}
        >
          {/* Legend */}
          <div style={{ position: "absolute", top: "1rem", left: "1rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 600, display: "flex", flexDirection: "column", gap: "0.25rem", zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-success)" }} /> Available Listing
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-danger)" }} /> Sold Inventory
            </div>
          </div>

          <svg viewBox="0 0 500 300" width="100%" height="100%" style={{ overflow: "visible" }}>
            {/* Draw connecting roads */}
            <path 
              d="M 80,110 Q 180,160 260,200 T 380,50" 
              fill="none" 
              stroke="#e5e7eb" 
              strokeWidth="4" 
              strokeDasharray="4 4"
            />
            <path 
              d="M 150,60 L 180,160 L 70,220" 
              fill="none" 
              stroke="#e5e7eb" 
              strokeWidth="4" 
            />
            <path 
              d="M 280,100 L 260,200" 
              fill="none" 
              stroke="#e5e7eb" 
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
                    <circle r="12" fill="var(--color-success)" opacity="0.2" className="animate-ping" />
                  )}
                  
                  {/* Outer circle shape */}
                  <circle 
                    r={isSelected ? "10" : "7"} 
                    fill={isSelected ? "#000000" : "#ffffff"} 
                    stroke={isSelected ? "#ffffff" : "#000000"} 
                    strokeWidth={isSelected ? "2.5" : "2"} 
                  />

                  {/* Label */}
                  <text 
                    y="-15" 
                    textAnchor="middle" 
                    fill="#000000" 
                    fontSize="9.5" 
                    fontWeight={isSelected ? "800" : "600"}
                  >
                    {node.name} ({nodeProps.length})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node Detail List Pane */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "320px", overflowY: "auto" }}>
          {selectedNode ? (
            <>
              <div style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{selectedNode.name} Cluster</h3>
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
                      backgroundColor: "var(--bg-card)", 
                      border: "1px solid var(--border-color)", 
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{p.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                        {p.currency} {p.price.toLocaleString()}
                      </div>
                    </div>
                    <span 
                      style={{ 
                        fontSize: "0.65rem", 
                        fontWeight: 700, 
                        color: p.status === "available" ? "var(--color-success)" : "var(--color-danger)",
                        backgroundColor: p.status === "available" ? "#f0fdf4" : "#fef2f2",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        border: p.status === "available" ? "1px solid #bbf7d0" : "1px solid #fecaca"
                      }}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                ))}

                {getPropsForNode(selectedNode.name).length === 0 && (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-light)", fontSize: "0.8rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                    <Building size={28} />
                    No property listings registered in this sub-market region.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
              <Sparkles size={32} style={{ marginBottom: "0.75rem", color: "var(--text-light)" }} />
              <p style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                Click on any node in the geographical map canvas to load property inventory distribution details.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
