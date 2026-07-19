import React, { useState, useEffect } from "react";
// FontAwesome free icons used via CDN link in index.html

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
      {/* Property Input Form - Styled like a Manila Case file folder */}
      <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
        <h2 style={{ fontSize: "1.20rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
          <i className="fa-solid fa-building" style={{ fontSize: '20px', color: 'var(--color-navy)', marginRight: '0.5rem' }}></i>
          NEW PROPERTY DOSSIER INGEST
        </h2>

        {matchResult && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", padding: "1.25rem", color: "#166534", marginBottom: "1.5rem", display: "flex", gap: "0.75rem" }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '24px', color: '#166534', marginRight: '0.75rem', flexShrink: 0 }}></i>
            <div>
              <div style={{ fontWeight: 700 }}>Property Logged & Scored!</div>
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
              required
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Transaction Type *</label>
              <select name="type" value={form.type} onChange={handleChange} className="form-control">
                <option value="buy">For Sale (Buy)</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
            <div className="form-group">
              <label>Property Type *</label>
              <select name="propertyType" value={form.propertyType} onChange={handleChange} className="form-control">
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
              />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label>Asking Price *</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <select name="currency" value={form.currency} onChange={handleChange} className="form-control" style={{ width: "85px", flexShrink: 0 }}>
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
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select name="areaUnit" value={form.areaUnit} onChange={handleChange} className="form-control">
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
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem", padding: "0.85rem" }}
            disabled={submitting}
          >
            {submitting ? "Processing Matches..." : "Publish & Run Reverse-Matcher"}
          </button>
        </form>
      </div>

      {/* Property Inventory List - Styled like a Blueprint spec file layout */}
      <div style={{ backgroundColor: "var(--color-navy)", border: "2px solid var(--color-cyan)", borderRadius: "var(--radius-sm)", padding: "2rem", display: "flex", flexDirection: "column", maxHeight: "600px", boxShadow: "2px 4px 10px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-cyan)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(94,194,224,0.3)", paddingBottom: "0.5rem" }}>
          <i className="fa-solid fa-building" style={{ fontSize: '20px', color: 'var(--color-cyan)', marginRight: '0.5rem' }}></i>
          ACTIVE BLUEPRINT INVENTORY ({properties.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-cyan)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>Loading inventory spec sheets...</div>
        ) : (
          <div style={{ overflowY: "auto", flexGrow: 1, display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.25rem" }}>
            {properties.map((p) => {
              const isSold = p.status === "sold";
              const isHold = p.status === "on_hold";
              
              return (
                <div 
                  key={p.id} 
                  style={{ 
                    cursor: "default",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(94, 194, 224, 0.4)",
                    borderRadius: "4px",
                    padding: "1.25rem",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {/* Pinned stamps for available, on-hold, or sold */}
                  {isSold && <div className="ink-stamp closed" style={{ fontSize: "0.75rem" }}>SOLD</div>}
                  {isHold && <div className="ink-stamp closed" style={{ fontSize: "0.75rem", color: "var(--color-warning)", borderColor: "var(--color-warning)" }}>HOLD</div>}
                  {!isSold && !isHold && <div className="ink-stamp won" style={{ fontSize: "0.75rem" }}>AVAILABLE</div>}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", opacity: isSold ? 0.35 : 1 }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-sans)", color: "#ffffff" }}>{p.title}</h4>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-cyan)", marginTop: "0.25rem", fontFamily: "var(--font-mono)", opacity: isSold ? 0.35 : 1 }}>
                    {p.location}
                  </p>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginTop: "0.75rem", color: "#ffffff", fontFamily: "var(--font-mono)", opacity: isSold ? 0.35 : 1 }}>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>{p.bedrooms} BHK · {p.area} {p.areaUnit}</span>
                    <span style={{ color: "var(--color-cyan)" }}>{formatPrice(p.price, p.currency)}</span>
                  </div>
                </div>
              );
            })}
            {properties.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-cyan)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-mono)" }}>
                <i className="fa-solid fa-landmark" style={{ fontSize: '40px', marginBottom: '0.5rem' }}></i>
                No properties in inventory database index files.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
