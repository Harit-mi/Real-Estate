import { useState, useEffect } from "react";

interface Tenant {
  id: string;
  name: string;
  subscriptionTier: string;
  maxLeads: number;
}

interface BillingViewProps {
  backendUrl: string;
  refreshTrigger: number;
  onPlanUpgraded: () => void;
}

export default function BillingView({ backendUrl, refreshTrigger, onPlanUpgraded }: BillingViewProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState<string | null>(null); // starter, growth, scale
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);

  // Form states
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [expiry, setExpiry] = useState("09/28");
  const [cvv, setCvv] = useState("123");

  const fetchTenantInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/tenant/info`);
      const data = await response.json();
      if (data.tenant) {
        setTenant(data.tenant);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantInfo();
  }, [refreshTrigger]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckout) return;

    setCheckoutSubmitting(true);
    try {
      const response = await fetch(`${backendUrl}/api/tenant/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: showCheckout }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCheckout(null);
        fetchTenantInfo();
        onPlanUpgraded();
      } else {
        alert("Upgrade failed");
      }
    } catch (e) {
      console.error(e);
      alert("Error upgrading subscription");
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const PLANS = [
    { key: "starter", name: "Starter Core", price: "$29", cap: 1000, desc: "For independent real estate brokers" },
    { key: "growth", name: "Growth Premium", price: "$79", cap: 5000, desc: "Perfect for growing mid-sized broker agencies" },
    { key: "scale", name: "Enterprise Scale", price: "$199", cap: 15000, desc: "For scaling real estate consultancies and franchises" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "2.5rem" }}>
      
      {/* Left side: Current status - Styled like Manila envelope folder */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ backgroundColor: "var(--color-manila)", border: "2px solid var(--color-navy)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.15)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-navy)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", borderBottom: "1.5px dashed rgba(23,50,77,0.2)", paddingBottom: "0.5rem" }}>
            <i className="fa-solid fa-shield-halved" style={{ color: "var(--color-navy)" }}></i>
            CRM LICENSE QUOTAS
          </h2>

          {loading && !tenant ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>Scanning licenses...</div>
          ) : tenant ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "1.25rem", backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(23,50,77,0.15)", borderRadius: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Current Subscription Tier</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--color-navy)", textTransform: "capitalize", fontFamily: "var(--font-display)" }}>
                  {tenant.subscriptionTier}
                </div>
              </div>
              <div style={{ padding: "1.25rem", backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(23,50,77,0.15)", borderRadius: "4px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Lead Ingestion Capacity</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--color-navy)", fontFamily: "var(--font-mono)" }}>
                  {tenant.maxLeads.toLocaleString()} Leads
                </div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", fontFamily: "var(--font-mono)", textAlign: "center" }}>
                Licensing managed via Paddle Sandbox Gateway.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right side: Upgrades grid - Styled like Blueprint spec card indexes */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ backgroundColor: "var(--color-navy)", border: "2px solid var(--color-cyan)", borderRadius: "var(--radius-sm)", padding: "2rem", boxShadow: "2px 4px 10px rgba(0,0,0,0.3)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-cyan)", marginBottom: "0.5rem" }}>
            CAPACITY LICENSE UPGRADES
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-cyan)", marginBottom: "1.5rem", opacity: 0.8 }}>
            Upgrade active lead capacity slots instantly.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {PLANS.map((p) => {
              const isActive = tenant?.subscriptionTier === p.key;
              
              return (
                <div 
                  key={p.key} 
                  style={{ 
                    padding: "1.25rem", 
                    backgroundColor: "rgba(255, 255, 255, 0.02)", 
                    border: isActive ? "2px solid var(--color-cyan)" : "1px solid rgba(94, 194, 224, 0.3)", 
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff" }}>{p.name}</span>
                      {isActive && (
                        <span style={{ fontSize: "0.65rem", backgroundColor: "var(--color-cyan)", color: "var(--color-navy)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--color-cyan)", marginTop: "0.25rem", opacity: 0.8 }}>{p.desc}</p>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--color-cyan)", fontFamily: "var(--font-mono)" }}>
                      Limit: {p.cap.toLocaleString()} leads
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ffffff", fontFamily: "var(--font-mono)" }}>{p.price}<span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>/mo</span></span>
                    {!isActive && (
                      <button 
                        onClick={() => setShowCheckout(p.key)}
                        className="btn btn-primary"
                        style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mock Paddle Payment Checkout Modal dialog */}
      {showCheckout && (
        <>
          <div 
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)", zIndex: 200 }} 
            onClick={() => setShowCheckout(null)}
          />
          <div 
            style={{ 
              position: "fixed", 
              top: "50%", 
              left: "50%", 
              transform: "translate(-50%, -50%)", 
              width: "420px", 
              backgroundColor: "var(--color-navy)", 
              borderRadius: "4px", 
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              border: "2px solid var(--color-cyan)",
              padding: "2.25rem",
              zIndex: 201,
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "var(--font-display)", color: "var(--color-cyan)", fontWeight: 700 }}>
                <i className="fa-solid fa-credit-card"></i>
                <span style={{ fontSize: "1rem" }}>PADDLE SECURE GATEWAY</span>
              </div>
              <button 
                onClick={() => setShowCheckout(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-cyan)", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}
              >
                [CLOSE]
              </button>
            </div>

            <div style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(94, 194, 224, 0.3)", borderRadius: "4px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-cyan)", opacity: 0.8 }}>Upgrading to:</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", textTransform: "capitalize", color: "#ffffff" }}>{showCheckout} Tier</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#ffffff", fontFamily: "var(--font-mono)" }}>
                {PLANS.find(p => p.key === showCheckout)?.price}
              </div>
            </div>

            <form onSubmit={handlePurchase} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ color: "var(--color-cyan)" }}>Card Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cardNumber} 
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{ backgroundColor: "#0b132b", border: "1px solid rgba(94, 194, 224, 0.4)", color: "#ffffff", fontFamily: "var(--font-mono)" }}
                  required 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: "var(--color-cyan)" }}>Expiry Date</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={expiry} 
                    onChange={(e) => setExpiry(e.target.value)}
                    style={{ backgroundColor: "#0b132b", border: "1px solid rgba(94, 194, 224, 0.4)", color: "#ffffff", fontFamily: "var(--font-mono)" }}
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: "var(--color-cyan)" }}>CVV</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={cvv} 
                    onChange={(e) => setCvv(e.target.value)}
                    style={{ backgroundColor: "#0b132b", border: "1px solid rgba(94, 194, 224, 0.4)", color: "#ffffff", fontFamily: "var(--font-mono)" }}
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "0.5rem", padding: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}
                disabled={checkoutSubmitting}
              >
                {checkoutSubmitting ? (
                  <>
                    <i className="fa-solid fa-rotate fa-spin"></i>
                    Authorizing Payment...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-bolt"></i>
                    Purchase Upgrade
                  </>
                )}
              </button>
            </form>
          </div>
        </>
      )}

    </div>
  );
}
