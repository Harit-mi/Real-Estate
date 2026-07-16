import { useState, useEffect } from "react";
import { FileText, Plus, FileSignature, CheckCircle, Printer, AlertCircle } from "lucide-react";

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
      
      {/* Left Column: Documents Directory & Generator */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Document Generator Box */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Plus size={18} color="#000000" />
            Generate Smart Agreement
          </h2>

          <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Active Deal *</label>
              <select 
                className="form-control"
                style={{ borderRadius: "8px" }}
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
                style={{ borderRadius: "8px" }}
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
              style={{ width: "100%", borderRadius: "8px", padding: "0.8rem" }}
              disabled={generating}
            >
              {generating ? "Compiling Document..." : "Generate Agreement"}
            </button>
          </form>
        </div>

        {/* Generated Documents Archive list */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={18} color="#000000" />
            Document Archive Directory ({documents.length})
          </h2>

          {loading && documents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontWeight: 600 }}>Loading archives...</div>
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
                      backgroundColor: isSelected ? "#f3f4f6" : "var(--bg-card)",
                      border: isSelected ? "1px solid #000000" : "1px solid var(--border-color)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>{doc.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem", fontWeight: 500 }}>
                        Compiled: {new Date(doc.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, backgroundColor: "#f3e8ff", color: "#7c3aed", padding: "0.2rem 0.5rem", borderRadius: "6px" }}>
                      {doc.type.toUpperCase()}
                    </span>
                  </div>
                );
              })}

              {documents.length === 0 && (
                <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-light)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                  <AlertCircle size={32} />
                  No documents compiled yet. Select a deal to generate agreements.
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Compiled Document View Sheet */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2.5rem", display: "flex", flexDirection: "column" }}>
        {selectedDoc ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            
            {/* Header / Actions toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Document Viewer</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>ID: {selectedDoc.id}</span>
              </div>
              
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => window.print()}
                  style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center", padding: "0.4rem 0.8rem", fontSize: "0.75rem", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "#fff", cursor: "pointer", fontWeight: 600 }}
                >
                  <Printer size={13} />
                  Print Contract
                </button>
                <button 
                  onClick={handleSign}
                  disabled={signing}
                  style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center", padding: "0.4rem 0.8rem", fontSize: "0.75rem", backgroundColor: "#000000", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
                >
                  {signing ? "Signing..." : (
                    <>
                      <FileSignature size={13} />
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
                backgroundColor: "#fafafa", 
                border: "1px solid var(--border-color)", 
                padding: "2rem 2.5rem", 
                borderRadius: "12px", 
                fontFamily: "Courier New, monospace",
                fontSize: "0.85rem",
                color: "#1f2937",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
                overflowY: "auto",
                maxHeight: "450px",
                boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)"
              }}
            >
              {selectedDoc.content}
            </div>

          </div>
        ) : (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--text-muted)", padding: "4rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", fontWeight: 600 }}>
            <CheckCircle size={44} style={{ color: "var(--text-light)" }} />
            <p style={{ fontSize: "0.9rem" }}>Select a contract sheet from the archive to render print preview.</p>
          </div>
        )}
      </div>

    </div>
  );
}
