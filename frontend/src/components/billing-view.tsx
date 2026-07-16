import { useState, useEffect } from "react";
import { CreditCard, Shield, Loader2, Sparkles } from "lucide-react";

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
      
      {/* Left side: Current status */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Shield size={18} color="#000000" />
            CRM Quota Licenses
          </h2>

          {loading && !tenant ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 600 }}>Loading licensing...</div>
          ) : tenant ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontWeight: 500 }}>
              <div style={{ padding: "1.25rem", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Current Subscription Tier</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem", textTransform: "capitalize" }}>
                  {tenant.subscriptionTier}
                </div>
              </div>
              <div style={{ padding: "1.25rem", backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Lead Ingestion Limit</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, marginTop: "0.25rem" }}>
                  {tenant.maxLeads.toLocaleString()} Leads
                </div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "0.5rem", fontWeight: 600 }}>
                Licensing managed via mock Paddle Checkout SDK integration.
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Right side: Upgrades grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Plan Upgrades & Pricing
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem", fontWeight: 500 }}>
            Choose a plan to upgrade your lead database capacity instantly.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {PLANS.map((p) => {
              const isActive = tenant?.subscriptionTier === p.key;
              
              return (
                <div 
                  key={p.key} 
                  style={{ 
                    padding: "1.25rem", 
                    backgroundColor: "var(--bg-card)", 
                    border: isActive ? "2px solid #000000" : "1px solid var(--border-color)", 
                    borderRadius: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{p.name}</span>
                      {isActive && (
                        <span style={{ fontSize: "0.65rem", backgroundColor: "#000000", color: "#ffffff", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 700 }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", fontWeight: 500 }}>{p.desc}</p>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, marginTop: "0.5rem", color: "#000" }}>
                      Quota limit: {p.cap.toLocaleString()} leads
                    </div>
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "1.3rem", fontWeight: 800 }}>{p.price}<span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/mo</span></span>
                    {!isActive && (
                      <button 
                        onClick={() => setShowCheckout(p.key)}
                        className="btn btn-primary"
                        style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", borderRadius: "6px" }}
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
            style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(3px)", zIndex: 200 }} 
            onClick={() => setShowCheckout(null)}
          />
          <div 
            style={{ 
              position: "fixed", 
              top: "50%", 
              left: "50%", 
              transform: "translate(-50%, -50%)", 
              width: "420px", 
              backgroundColor: "#ffffff", 
              borderRadius: "24px", 
              boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
              border: "1px solid var(--border-color)",
              padding: "2.25rem",
              zIndex: 201,
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CreditCard size={18} />
                <span style={{ fontWeight: 800, fontSize: "1rem" }}>Paddle Secure Checkout</span>
              </div>
              <button 
                onClick={() => setShowCheckout(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)" }}
              >
                Close
              </button>
            </div>

            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Upgrading to:</div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", textTransform: "capitalize" }}>{showCheckout} Tier</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem" }}>
                {PLANS.find(p => p.key === showCheckout)?.price}
              </div>
            </div>

            <form onSubmit={handlePurchase} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Card Number</label>
                <input 
                  type="text" 
                  className="form-control" 
                  style={{ borderRadius: "8px" }}
                  value={cardNumber} 
                  onChange={(e) => setCardNumber(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Expiry Date</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ borderRadius: "8px" }}
                    value={expiry} 
                    onChange={(e) => setExpiry(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>CVV</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    style={{ borderRadius: "8px" }}
                    value={cvv} 
                    onChange={(e) => setCvv(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "0.5rem", borderRadius: "8px", padding: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center", justifyContent: "center" }}
                disabled={checkoutSubmitting}
              >
                {checkoutSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Authorizing Payment...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} style={{ fill: "#ffffff" }} />
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
