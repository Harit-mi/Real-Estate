import React, { useState, useEffect } from "react";
import { 
  MessageSquare, ShieldCheck, Send,
  CreditCard, Loader2
} from "lucide-react";

interface DashboardProps {
  backendUrl: string;
  refreshTrigger: number;
  selectedPhoneContact: { name: string; phone: string; dealId: string } | null;
}

interface Stats {
  leads: number;
  properties: number;
  deals: number;
  matches: number;
  whatsappSent: number;
}

interface Activity {
  id: string;
  type: string;
  content: string;
  timestamp: string;
}

export default function Dashboard({ backendUrl, refreshTrigger, selectedPhoneContact }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    leads: 0,
    properties: 0,
    deals: 0,
    matches: 0,
    whatsappSent: 0,
  });

  const [chatMessages, setChatMessages] = useState<Activity[]>([]);
  const [clientReplyText, setClientReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchStats = async () => {
    try {
      const resContacts = await fetch(`${backendUrl}/api/contacts`);
      const contacts = await resContacts.json();

      const resProperties = await fetch(`${backendUrl}/api/properties`);
      const properties = await resProperties.json();

      const resDeals = await fetch(`${backendUrl}/api/deals`);
      const deals = await resDeals.json();

      let totalMatches = 0;
      deals.forEach((d: any) => {
        totalMatches += d.dealProperties.length;
      });

      const resActivities = await fetch(`${backendUrl}/api/activities`);
      const activities = await resActivities.json();
      const waSent = activities.filter((a: any) => a.type === "whatsapp_out").length;

      setStats({
        leads: contacts.length,
        properties: properties.filter((p: any) => p.status === "available").length,
        deals: deals.filter((d: any) => !["won", "lost"].includes(d.stage)).length,
        matches: totalMatches,
        whatsappSent: waSent,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchChatHistory = async () => {
    if (!selectedPhoneContact) return;
    try {
      const response = await fetch(
        `${backendUrl}/api/activities?contactId=&dealId=${selectedPhoneContact.dealId}`
      );
      const data = await response.json();
      const chat = data.filter((a: any) => a.type.startsWith("whatsapp"));
      setChatMessages(chat.reverse());
    } catch (e) {
      console.error("Failed to fetch chat:", e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  useEffect(() => {
    fetchChatHistory();
  }, [selectedPhoneContact, refreshTrigger]);

  const handleSendClientReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientReplyText.trim() || !selectedPhoneContact) return;

    setSendingReply(true);
    try {
      const resDeals = await fetch(`${backendUrl}/api/deals`);
      const deals = await resDeals.json();
      const currentDeal = deals.find((d: any) => d.id === selectedPhoneContact.dealId);
      if (!currentDeal) return;

      const contactId = currentDeal.requirement.contactId;

      await fetch(`${backendUrl}/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          dealId: selectedPhoneContact.dealId,
          type: "whatsapp_in",
          content: clientReplyText,
        }),
      });

      setClientReplyText("");
      fetchChatHistory();
      fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReply(false);
    }
  };

  const simulateQuickReply = async (text: string) => {
    if (!selectedPhoneContact) return;
    setSendingReply(true);
    try {
      const resDeals = await fetch(`${backendUrl}/api/deals`);
      const deals = await resDeals.json();
      const currentDeal = deals.find((d: any) => d.id === selectedPhoneContact.dealId);
      if (!currentDeal) return;

      const contactId = currentDeal.requirement.contactId;

      await fetch(`${backendUrl}/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          dealId: selectedPhoneContact.dealId,
          type: "whatsapp_in",
          content: text,
        }),
      });

      fetchChatHistory();
      fetchStats();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      
      {/* Hello Card Row (Figma inspiration style) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "1.5rem" }}>
        
        {/* Left Welcome Card */}
        <div className="welcome-card">
          <div className="welcome-info">
            <h2>Hello Josh!</h2>
            <p>It's good to see you again. The matching engine generated <strong>{stats.matches} matches</strong> surfaced this week.</p>
          </div>
          <div className="welcome-illustration">
            {/* Minimal waving agent SVG */}
            <svg viewBox="0 0 100 100" width="100" height="100">
              <circle cx="50" cy="40" r="18" fill="#e5e7eb" stroke="#000000" strokeWidth="2.5" />
              <circle cx="45" cy="38" r="2.5" fill="#000000" />
              <circle cx="55" cy="38" r="2.5" fill="#000000" />
              <path d="M 45 48 Q 50 53 55 48" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
              {/* Waving hand */}
              <path d="M 72 28 C 72 28, 77 15, 80 18 C 83 21, 75 35, 75 35" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 28 65 C 32 55, 40 52, 50 52 C 60 52, 68 55, 72 65" fill="none" stroke="#000000" strokeWidth="2.5" />
            </svg>
          </div>
        </div>

        {/* Small License Card */}
        <div className="stat-card" style={{ height: "180px", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", gap: "0.75rem", padding: "1.5rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldCheck size={20} color="var(--color-success)" />
            <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Growth Plan</span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Usage: <strong>{stats.leads} / 1,000</strong> leads ingested this billing cycle.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            <CreditCard size={14} />
            Paddle ID: SUB-9843278
          </div>
        </div>

      </div>

      {/* Stats Cards (Bogusław Podhalicz layout) */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.leads}</div>
          <div className="stat-label">Leads<br />ingested</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.properties}</div>
          <div className="stat-label">Active<br />listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.deals}</div>
          <div className="stat-label">Deals in<br />progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.whatsappSent}</div>
          <div className="stat-label">WhatsApp<br />pushed</div>
        </div>
      </div>

      {/* Main Grid: Left side curve statistics, Right side simulated WhatsApp outreach */}
      <div className="dashboard-grid">
        
        {/* Left Side: Minimalist Graph and Premium Upgrade */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="chart-card">
            <div className="chart-header">
              <h3>Surfaced Matches</h3>
              <div className="chart-filters">
                <span className="chart-filter-item">Weekly</span>
                <span className="chart-filter-item active">Monthly</span>
              </div>
            </div>
            
            {/* Custom high-end SVG Curve line graph */}
            <div style={{ position: "relative", width: "100%", height: "160px", marginTop: "1rem" }}>
              <svg viewBox="0 0 500 150" width="100%" height="100%" style={{ overflow: "visible" }}>
                {/* Horizontal helper grid lines */}
                <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f3f5" strokeWidth="1" />
                <line x1="0" y1="70" x2="500" y2="70" stroke="#f1f3f5" strokeWidth="1" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f3f5" strokeWidth="1" />
                
                {/* Smooth spline curve path */}
                <path 
                  d="M 20,130 Q 120,90 200,105 T 380,45 T 480,30" 
                  fill="none" 
                  stroke="#000000" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />

                {/* Floating dot values and labels */}
                <circle cx="200" cy="105" r="5" fill="#ffffff" stroke="#000000" strokeWidth="2.5" />
                <rect x="180" y="70" width="40" height="20" rx="4" fill="#000000" />
                <text x="200" y="84" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">18m</text>

                <circle cx="380" cy="45" r="5" fill="#ffffff" stroke="#000000" strokeWidth="2.5" />
                <rect x="360" y="10" width="40" height="20" rx="4" fill="#000000" />
                <text x="380" y="24" fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">46m</text>
                
                {/* Bottom X-axis labels */}
                <text x="20" y="146" fill="var(--text-light)" fontSize="10" fontWeight="600" textAnchor="middle">Mon</text>
                <text x="140" y="146" fill="var(--text-light)" fontSize="10" fontWeight="600" textAnchor="middle">Wed</text>
                <text x="260" y="146" fill="var(--text-light)" fontSize="10" fontWeight="600" textAnchor="middle">Fri</text>
                <text x="380" y="146" fill="var(--text-light)" fontSize="10" fontWeight="600" textAnchor="middle">Sat</text>
                <text x="480" y="146" fill="var(--text-light)" fontSize="10" fontWeight="600" textAnchor="middle">Sun</text>
              </svg>
            </div>
          </div>

          {/* Premium banner box ( Bogusław Podhalicz "Learn even more!" styled ) */}
          <div className="premium-box">
            <div className="premium-info">
              <h4>Grow even more!</h4>
              <p style={{ margin: '0.25rem 0 1rem 0' }}>Unlock professional smart lead routing, multi-agent workspaces, and automated daily AI reporting summaries.</p>
              <button 
                className="btn btn-primary" 
                onClick={() => alert("Paddle Checkout Triggered! Redirecting to billing...")}
              >
                Go Premium
              </button>
            </div>
            <div className="premium-illustration" style={{ flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" width="70" height="70">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#000" strokeWidth="2" />
                <path d="M 30 70 L 50 30 L 70 70 Z" fill="none" stroke="#000" strokeWidth="2.5" />
                <circle cx="50" cy="55" r="5" fill="#000" />
              </svg>
            </div>
          </div>

        </div>

        {/* Right Side: Simulated Phone */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {selectedPhoneContact ? (
            <div className="phone-simulator">
              <div className="phone-header">
                <div className="phone-avatar">
                  {selectedPhoneContact.name.charAt(0)}
                </div>
                <div className="phone-chat-title">
                  <h4>{selectedPhoneContact.name}</h4>
                  <p>{selectedPhoneContact.phone}</p>
                </div>
              </div>

              <div className="phone-body">
                {chatMessages.map((m) => {
                  const isOut = m.type === "whatsapp_out";
                  const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={m.id}
                      className={`whatsapp-bubble ${isOut ? "out" : "in"}`}
                    >
                      {m.content}
                      <div className="whatsapp-time">{timeStr}</div>
                    </div>
                  );
                })}

                {chatMessages.length === 0 && (
                  <div style={{ textAlign: "center", margin: "auto", fontSize: "0.8rem", color: "#8696a0", padding: "1rem" }}>
                    No outreach messages logged for this client yet. Trigger matching by adding properties.
                  </div>
                )}
              </div>

              {/* Simulation Quick Reply Actions */}
              <div style={{ padding: "0.5rem", background: "#f5f6fa", display: "flex", gap: "0.35rem", overflowX: "auto", borderTop: "1px solid var(--border-color)" }}>
                <button
                  onClick={() => simulateQuickReply("Yes, this looks great! Let's arrange a site visit.")}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "0.35rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", color: "#000", cursor: "pointer", flexShrink: 0, fontWeight: 600 }}
                  disabled={sendingReply}
                >
                  "Yes, schedule visit"
                </button>
                <button
                  onClick={() => simulateQuickReply("No, this location doesn't work for my office commute.")}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "0.35rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", color: "#000", cursor: "pointer", flexShrink: 0, fontWeight: 600 }}
                  disabled={sendingReply}
                >
                  "No, reject location"
                </button>
                <button
                  onClick={() => simulateQuickReply("The layout is nice but the price is slightly above my max budget.")}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "0.35rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", color: "#000", cursor: "pointer", flexShrink: 0, fontWeight: 600 }}
                  disabled={sendingReply}
                >
                  "Too expensive"
                </button>
              </div>

              {/* Client Text Inputs */}
              <form onSubmit={handleSendClientReply} style={{ background: "#f5f6fa", padding: "0.75rem 1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Simulate client reply message..."
                  className="form-control"
                  style={{ background: "#fff", color: "#000", borderRadius: "20px", border: "1px solid #e5e7eb", padding: "0.5rem 1rem" }}
                  value={clientReplyText}
                  onChange={(e) => setClientReplyText(e.target.value)}
                  disabled={sendingReply}
                />
                <button
                  type="submit"
                  style={{ background: "#000000", border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", cursor: "pointer", flexShrink: 0 }}
                  disabled={sendingReply}
                >
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          ) : (
            <div 
              className="phone-simulator" 
              style={{ 
                justifyContent: "center", 
                alignItems: "center", 
                color: "var(--text-dark)", 
                padding: "2rem",
                textAlign: "center"
              }}
            >
              <MessageSquare size={48} style={{ marginBottom: "1rem", color: "var(--text-muted)" }} />
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Click on any deal card in the **Sales Pipeline** view to open the client's simulated WhatsApp interface.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
