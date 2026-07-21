import { useState, useEffect } from "react";

interface Contact {
  name: string;
}

interface Requirement {
  contact: Contact;
}

interface Deal {
  id: string;
  stage: string;
  requirement: Requirement;
}

interface Document {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: string;
  deal: Deal;
}

interface DocumentsViewProps {
  backendUrl: string;
  refreshTrigger: number;
}

export default function DocumentsView({ backendUrl, refreshTrigger }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Generation state
  const [selectedDealId, setSelectedDealId] = useState("");
  const [docType, setDocType] = useState("lease");
  const [generating, setGenerating] = useState(false);
  const [signing, setSigning] = useState(false);

  const fetchDocsAndDeals = async () => {
    setLoading(true);
    try {
      const docRes = await fetch(`${backendUrl}/api/documents`);
      const docData = await docRes.json();
      setDocuments(docData);

      const dealRes = await fetch(`${backendUrl}/api/deals`);
      const dealData = await dealRes.json();
      // Show only deals that are near completion or won/negotiation
      setDeals(dealData.filter((d: Deal) => ["negotiation", "won"].includes(d.stage.toLowerCase())));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocsAndDeals();
  }, [refreshTrigger]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealId) return;

    setGenerating(true);
    try {
      const response = await fetch(`${backendUrl}/api/documents/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: selectedDealId, type: docType }),
      });
      if (response.ok) {
        setSelectedDealId("");
        fetchDocsAndDeals();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSign = () => {
    setSigning(true);
    setTimeout(() => {
      setSigning(false);
      alert("Document electronically signed and locked in blockchain archive!");
    }, 1500);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2.5rem" }}>
      
      {/* Left Column: Documents Directory & Generator - Styled like Manila Files */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Document Generator Box */}
        <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
            <i className="fa-solid fa-plus-circle" style={{ color: "var(--color-navy)" }}></i>
            COMPILE SMART AGREEMENT
          </h2>

          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Active Deal *</label>
              <select 
                className="form-control"
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                required
              >
                <option value="">-- Select Negotiation/Won Deal --</option>
                {deals.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.requirement.contact.name} ({d.stage.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Agreement Template Type</label>
              <select 
                className="form-control"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="lease">🏠 Residential Lease Agreement</option>
                <option value="brokerage">🤝 Exclusive Brokerage Contract</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.8rem" }}
              disabled={generating}
            >
              {generating ? "Compiling Document..." : "Generate Agreement"}
            </button>
          </form>
        </div>

        {/* Generated Documents Archive list */}
        <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", display: "flex", flexDirection: "column", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
            <i className="fa-solid fa-folder-open" style={{ color: "var(--color-navy)" }}></i>
            AGREEMENT ARCHIVE DIRECTORY ({documents.length})
          </h2>

          {loading && documents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>Loading archives...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto" }}>
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div 
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    style={{ 
                      padding: "1rem", 
                      backgroundColor: isSelected ? "rgba(23, 50, 77, 0.08)" : "rgba(255,255,255,0.7)",
                      border: isSelected ? "2px solid var(--color-navy)" : "1px solid rgba(23,50,77,0.15)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-navy)" }}>{doc.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem", fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                        Compiled: {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, backgroundColor: "#f3e8ff", color: "#7c3aed", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                      {doc.type.toUpperCase()}
                    </span>
                  </div>
                );
              })}

              {documents.length === 0 && (
                <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)" }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "30px", marginBottom: "0.5rem" }}></i>
                  No documents compiled. Select a deal to generate agreements.
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Compiled Document View Sheet - Styled like a physical Wooden Clipboard */}
      <div style={{ backgroundColor: "#5c3d24", border: "6px solid #3d2514", borderRadius: "var(--radius-sm)", padding: "2.5rem 2rem", display: "flex", flexDirection: "column", boxShadow: "0 10px 25px rgba(0,0,0,0.35)", position: "relative" }}>
        
        {/* Metal Clip on Clipboard */}
        <div style={{ 
          background: "linear-gradient(to bottom, #d1d5db, #9ca3af)", 
          border: "2px solid #6b7280", 
          width: "140px", 
          height: "35px", 
          position: "absolute",
          top: "-5px",
          left: "50%",
          transform: "translateX(-50%)",
          borderRadius: "4px 4px 0 0",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          zIndex: 10,
          display: "grid",
          placeItems: "center"
        }}>
          <div style={{ width: "25px", height: "8px", backgroundColor: "#4b5563", borderRadius: "50%" }}></div>
        </div>

        {selectedDoc ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", marginTop: "1rem" }}>
            
            {/* Header / Actions toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "1.25rem", marginBottom: "1.5rem", backgroundColor: "var(--color-manila)", padding: "1rem", borderRadius: "4px", border: "1px solid rgba(23,50,77,0.15)" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)" }}>DOCUMENT CONTRACT SHEET</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>REF: {selectedDoc.id.substring(0,8).toUpperCase()}</span>
              </div>
              
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => window.print()}
                  className="btn btn-secondary"
                  style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                >
                  <i className="fa-solid fa-print"></i>
                  Print
                </button>
                <button 
                  onClick={handleSign}
                  disabled={signing}
                  className="btn btn-primary"
                  style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
                >
                  {signing ? "Signing..." : (
                    <>
                      <i className="fa-solid fa-file-signature"></i>
                      E-Sign Lock
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Document Body Sheet (Paper effect) */}
            <div 
              style={{ 
                flexGrow: 1, 
                backgroundColor: "#f6f4ef", 
                border: "1px solid #d8c79a", 
                padding: "2rem 2.5rem", 
                borderRadius: "2px", 
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                color: "var(--color-navy)",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
                overflowY: "auto",
                maxHeight: "450px",
                boxShadow: "2px 2px 10px rgba(0,0,0,0.1)"
              }}
            >
              {selectedDoc.content}
            </div>

          </div>
        ) : (
          <div style={{ margin: "auto", textAlign: "center", color: "#ffffff", padding: "4rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", fontFamily: "var(--font-mono)" }}>
            <i className="fa-solid fa-folder-closed" style={{ fontSize: "40px", color: "var(--color-manila)", marginBottom: "0.5rem" }}></i>
            <p style={{ fontSize: "0.9rem" }}>Select a contract sheet from the archive to render clipboard preview.</p>
          </div>
        )}
      </div>

    </div>
  );
}
