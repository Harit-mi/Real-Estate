import React, { useState } from "react";
// FontAwesome free icons package used via CDN link in index.html

interface CSVUploaderProps {
  backendUrl: string;
  onImportComplete: () => void;
}

export default function CSVUploader({ backendUrl, onImportComplete }: CSVUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploadedFilePath, setUploadedFilePath] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: "",
    phone: "",
    email: "",
    source: "",
    requirementType: "",
    propertyType: "",
    bedrooms: "",
    budgetMin: "",
    budgetMax: "",
    currency: "",
    locations: "",
  });

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedCount: number;
    matchesCreated: number;
  } | null>(null);

  const fields = [
    { key: "name", label: "Contact Full Name", required: true },
    { key: "phone", label: "Phone Number (Mobile)", required: true },
    { key: "email", label: "Email Address", required: false },
    { key: "source", label: "Lead Source", required: false },
    { key: "requirementType", label: "Requirement Type (Buy/Rent)", required: false },
    { key: "propertyType", label: "Property Type (e.g. Apartment, Villa)", required: false },
    { key: "bedrooms", label: "Bedrooms (BHK Count)", required: false },
    { key: "budgetMin", label: "Minimum Budget", required: false },
    { key: "budgetMax", label: "Maximum Budget", required: false },
    { key: "currency", label: "Currency", required: false },
    { key: "locations", label: "Preferred Locations", required: false },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setHeaders([]);
      setImportResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("csvFile", file);

    try {
      const response = await fetch(`${backendUrl}/api/csv/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setHeaders(data.headers);
        setUploadedFilePath(data.filePath);

        const newMapping = { ...mapping };
        data.headers.forEach((header: string) => {
          const h = header.toLowerCase().replace(/[\s_-]+/g, "");
          if (h.includes("name") || h === "fullname" || h === "leadname") newMapping.name = header;
          else if (h.includes("phone") || h === "mobile" || h === "contact" || h === "mob") newMapping.phone = header;
          else if (h.includes("email") || h === "mail") newMapping.email = header;
          else if (h.includes("source") || h === "leadsource") newMapping.source = header;
          else if (h.includes("type") && (h.includes("req") || h.includes("buy"))) newMapping.requirementType = header;
          else if (h.includes("property") || h.includes("prop")) newMapping.propertyType = header;
          else if (h.includes("bed") || h.includes("bhk") || h === "rooms") newMapping.bedrooms = header;
          else if (h.includes("min") || h.includes("budget") && !h.includes("max")) newMapping.budgetMin = header;
          else if (h.includes("max") || h.includes("budget") && h.includes("max")) newMapping.budgetMax = header;
          else if (h.includes("currency") || h === "curr") newMapping.currency = header;
          else if (h.includes("location") || h === "loc" || h.includes("area")) newMapping.locations = header;
        });
        setMapping(newMapping);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error uploading file");
    } finally {
      setUploading(false);
    }
  };

  const handleMappingChange = (fieldKey: string, csvHeader: string) => {
    setMapping((prev) => ({ ...prev, [fieldKey]: csvHeader }));
  };

  const handleImport = async () => {
    if (!mapping.name || !mapping.phone) {
      alert("Please map the required fields: Full Name and Phone Number");
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(`${backendUrl}/api/csv/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: uploadedFilePath,
          mapping: mapping,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setImportResult({
          success: true,
          importedCount: data.importedCount,
          matchesCreated: data.matchesCreated,
        });
        setFile(null);
        setHeaders([]);
        onImportComplete();
      } else {
        alert("Import failed: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error importing leads");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", marginBottom: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)", position: "relative" }}>
      <div style={{ position: "absolute", top: "1rem", right: "2rem", border: "2px dashed var(--color-thread)", color: "var(--color-thread)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700, padding: "0.25rem 0.5rem", transform: "rotate(4deg)" }}>
        [ INCOMING_DOSSIER_INTAKE ]
      </div>

      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
        <i className="fa-solid fa-file-csv" style={{ fontSize: '20px', color: 'var(--color-navy)', marginRight: '0.5rem' }}></i>
        BULK DOSSIER CSV INGESTION
      </h2>
      
      {/* File Upload Zone */}
      {!headers.length && !importResult && (
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", backgroundColor: "rgba(255,255,255,0.4)", padding: "1.5rem", borderRadius: "4px", border: "1px dashed rgba(23,50,77,0.3)" }}>
          <input
            type="file"
            accept=".csv"
            id="csv-file-input"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <label
            htmlFor="csv-file-input"
            className="btn btn-secondary"
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", display: "inline-flex", gap: "0.5rem", alignItems: "center" }}
          >
            <i className="fa-solid fa-upload" style={{ fontSize: '16px', marginRight: '0.5rem' }}></i>
            {file ? file.name : "Select Lead CSV Document File"}
          </label>
          
          {file && (
            <button
              onClick={handleUpload}
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem" }}
              disabled={uploading}
            >
              {uploading ? <i className="fa-solid fa-rotate fa-spin" style={{ fontSize: '16px' }}></i> : "Unseal & Match"}
            </button>
          )}
        </div>
      )}

      {/* Success Notification */}
      {importResult && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", padding: "1.25rem 1.5rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#166534" }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '18px', color: '#166534', marginRight: '0.5rem' }}></i>
            CSV Import Completed Successfully!
          </div>
          <p style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 500 }}>
            Imported <strong>{importResult.importedCount}</strong> contacts with requirement profiles. 
            The bi-directional matching engine auto-generated <strong>{importResult.matchesCreated}</strong> new deals in your pipeline.
          </p>
          <button 
            className="btn btn-secondary" 
            style={{ alignSelf: "flex-start", padding: "0.4rem 0.8rem", fontSize: "0.8rem", marginTop: "0.5rem" }}
            onClick={() => setImportResult(null)}
          >
            Upload Another File
          </button>
        </div>
      )}

      {/* Mapping Editor */}
      {headers.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-navy)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1rem", fontFamily: "var(--font-display)" }}>
            <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '16px', marginRight: '0.5rem' }}></i>
            Map CSV Columns to PropMatch Fields
          </div>
          
          <table className="mapper-table">
            <thead>
              <tr>
                <th>CRM Field Name</th>
                <th>CSV Header Match</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.key}>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem", fontFamily: "var(--font-sans)", color: "var(--color-navy)" }}>{f.label}</span>
                    {f.required && <span style={{ color: "var(--color-thread)", marginLeft: "0.25rem" }}>*</span>}
                  </td>
                  <td>
                    <select
                      value={mapping[f.key] || ""}
                      onChange={(e) => handleMappingChange(f.key, e.target.value)}
                      className="form-control"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)", width: "200px" }}
                    >
                      <option value="">-- Do Not Import --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            <button
              onClick={handleImport}
              className="btn btn-primary"
              disabled={importing}
            >
              {importing ? (
                <>
                  <i className="fa-solid fa-rotate fa-spin" style={{ fontSize: '16px', marginRight: '0.5rem' }}></i>
                  Importing & Running Matcher...
                </>
              ) : (
                "Execute Ingest & Matching"
              )}
            </button>
            <button
              onClick={() => {
                setHeaders([]);
                setFile(null);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
