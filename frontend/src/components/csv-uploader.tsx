import React, { useState } from "react";
import { Upload, Check, AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";

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
    <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <FileSpreadsheet size={20} color="#000000" />
        Smart Lead CSV Ingestion
      </h2>
      
      {/* File Upload Zone */}
      {!headers.length && !importResult && (
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
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
            style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", borderRadius: "8px", display: "inline-flex", gap: "0.5rem", alignItems: "center" }}
          >
            <Upload size={16} />
            {file ? file.name : "Select Lead CSV File"}
          </label>
          
          {file && (
            <button
              onClick={handleUpload}
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.25rem", fontSize: "0.85rem", borderRadius: "8px" }}
              disabled={uploading}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : "Upload & Map"}
            </button>
          )}
        </div>
      )}

      {/* Success Notification */}
      {importResult && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-md)", padding: "1.25rem 1.5rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "#166534" }}>
            <Check size={18} color="#166534" />
            CSV Import Completed Successfully!
          </div>
          <p style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 500 }}>
            Imported <strong>{importResult.importedCount}</strong> contacts with requirement profiles. 
            The bi-directional matching engine auto-generated <strong>{importResult.matchesCreated}</strong> new deals in your pipeline.
          </p>
          <button 
            className="btn btn-secondary" 
            style={{ alignSelf: "flex-start", padding: "0.4rem 0.8rem", fontSize: "0.8rem", marginTop: "0.5rem", borderRadius: "6px" }}
            onClick={() => setImportResult(null)}
          >
            Upload Another File
          </button>
        </div>
      )}

      {/* Mapping Editor */}
      {headers.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#000000", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1rem" }}>
            <AlertCircle size={16} />
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
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{f.label}</span>
                    {f.required && <span style={{ color: "var(--color-danger)", marginLeft: "0.25rem" }}>*</span>}
                  </td>
                  <td>
                    <select
                      value={mapping[f.key] || ""}
                      onChange={(e) => handleMappingChange(f.key, e.target.value)}
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
              style={{ borderRadius: "8px" }}
              disabled={importing}
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
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
              style={{ borderRadius: "8px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
