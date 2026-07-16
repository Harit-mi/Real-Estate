import React, { useState, useEffect } from "react";
import { PlusCircle, Building2, Landmark, CheckCircle2 } from "lucide-react";

interface Property {
  id: string;
  title: string;
  type: string;
  propertyType: string;
  bedrooms: number;
  price: number;
  currency: string;
  area: number;
  areaUnit: string;
  location: string;
  status: string;
}

interface PropertyEntryProps {
  backendUrl: string;
  onPropertyAdded: () => void;
}

export default function PropertyEntry({ backendUrl, onPropertyAdded }: PropertyEntryProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "buy",
    propertyType: "apartment",
    bedrooms: "2",
    price: "",
    currency: "INR",
    area: "",
    areaUnit: "sqft",
    location: "",
  });

  const [matchResult, setMatchResult] = useState<{
    propertyTitle: string;
    matchesCount: number;
  } | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/properties`);
      const data = await response.json();
      setProperties(data);
    } catch (e) {
      console.error("Failed to fetch properties:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.location) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setMatchResult(null);

    try {
      const response = await fetch(`${backendUrl}/api/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (response.ok) {
        setForm({
          title: "",
          type: "buy",
          propertyType: "apartment",
          bedrooms: "2",
          price: "",
          currency: "INR",
          area: "",
          areaUnit: "sqft",
          location: "",
        });
        setMatchResult({
          propertyTitle: data.property.title,
          matchesCount: data.matchesCount,
        });
        fetchProperties();
        onPropertyAdded();
      } else {
        alert("Failed to add property: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error adding property");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const symbol = currency === "INR" ? "₹" : "$";
    if (price >= 10000000) {
      return `${symbol}${(price / 10000000).toFixed(2)} Cr`;
    } else if (price >= 100000) {
      return `${symbol}${(price / 100000).toFixed(2)} L`;
    }
    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
      {/* Property Input Form */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <PlusCircle size={20} color="#000000" />
          New Property Ingest
        </h2>

        {matchResult && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-md)", padding: "1.25rem", color: "#166534", marginBottom: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <CheckCircle2 size={24} color="#166534" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700 }}>Property Registered & Scored!</div>
              <p style={{ fontSize: "0.85rem", color: "#166534", marginTop: "0.25rem", fontWeight: 500 }}>
                "{matchResult.propertyTitle}" was matched against active buyer requirements. 
                Found <strong>{matchResult.matchesCount}</strong> matching leads. Simulated WhatsApp alerts sent!
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Property Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. 3BHK Ahmedabad Highrise Luxury"
              className="form-control"
              style={{ borderRadius: "8px" }}
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Transaction Type *</label>
              <select name="type" value={form.type} onChange={handleChange} className="form-control" style={{ borderRadius: "8px" }}>
                <option value="buy">For Sale (Buy)</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Property Type *</label>
              <select name="propertyType" value={form.propertyType} onChange={handleChange} className="form-control" style={{ borderRadius: "8px" }}>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa / House</option>
                <option value="commercial">Commercial</option>
                <option value="land">Plot / Land</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Bedrooms</label>
              <input
                type="number"
                name="bedrooms"
                value={form.bedrooms}
                onChange={handleChange}
                min="0"
                className="form-control"
                style={{ borderRadius: "8px" }}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label>Asking Price *</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select name="currency" value={form.currency} onChange={handleChange} className="form-control" style={{ width: "85px", flexShrink: 0, borderRadius: "8px" }}>
                  <option value="INR">₹ (INR)</option>
                  <option value="USD">$ (USD)</option>
                  <option value="EUR">€ (EUR)</option>
                  <option value="GBP">£ (GBP)</option>
                </select>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  placeholder="Price"
                  className="form-control"
                  style={{ borderRadius: "8px" }}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Area Size</label>
              <input
                type="number"
                name="area"
                value={form.area}
                onChange={handleChange}
                placeholder="Size"
                className="form-control"
                style={{ borderRadius: "8px" }}
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select name="areaUnit" value={form.areaUnit} onChange={handleChange} className="form-control" style={{ borderRadius: "8px" }}>
                <option value="sqft">Sq. Ft.</option>
                <option value="sqyd">Sq. Yd.</option>
                <option value="sqmt">Sq. Mt.</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Location *</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Satellite, Ahmedabad"
              className="form-control"
              style={{ borderRadius: "8px" }}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem", borderRadius: "8px", padding: "0.85rem" }}
            disabled={submitting}
          >
            {submitting ? "Processing Matches..." : "Publish & Run Reverse-Matcher"}
          </button>
        </form>
      </div>

      {/* Property Inventory List */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem", display: "flex", flexDirection: "column", maxHeight: "600px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Building2 size={20} color="#000000" />
          Active Inventory ({properties.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontWeight: 600 }}>Loading inventory...</div>
        ) : (
          <div style={{ overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.25rem" }}>
            {properties.map((p) => {
              const isSold = p.status === "sold";
              const isHold = p.status === "on_hold";
              
              return (
                <div 
                  key={p.id} 
                  className="deal-card" 
                  style={{ 
                    cursor: "default",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    borderLeft: isSold 
                      ? "4px solid var(--color-danger)" 
                      : isHold 
                      ? "4px solid var(--color-warning)" 
                      : "4px solid var(--color-success)" 
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{p.title}</h4>
                    <span 
                      style={{ 
                        fontSize: "0.7rem", 
                        padding: "0.2rem 0.5rem", 
                        borderRadius: "6px",
                        fontWeight: 700,
                        background: isSold 
                          ? "#fef2f2" 
                          : isHold 
                          ? "#fffbeb" 
                          : "#f0fdf4",
                        color: isSold 
                          ? "var(--color-danger)" 
                          : isHold 
                          ? "var(--color-warning)" 
                          : "var(--color-success)",
                        border: isSold
                          ? "1px solid #fecaca"
                          : isHold
                          ? "1px solid #fef3c7"
                          : "1px solid #bbf7d0"
                      }}
                    >
                      {p.status.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", fontWeight: 500 }}>{p.location}</p>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.75rem", color: "var(--text-main)", fontWeight: 700 }}>
                    <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{p.bedrooms} BHK · {p.area} {p.areaUnit}</span>
                    <span>{formatPrice(p.price, p.currency)}</span>
                  </div>
                </div>
              );
            })}
            {properties.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-light)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
                <Landmark size={40} />
                No properties in inventory. Use form to add.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
