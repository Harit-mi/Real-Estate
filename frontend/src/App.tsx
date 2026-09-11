import { useState, useEffect } from "react";
// Using FontAwesome icons globally via CDN
import Dashboard from "./components/dashboard";
import KanbanBoard from "./components/kanban-board";
import CSVUploader from "./components/csv-uploader";
import PropertyEntry from "./components/property-entry";
import TasksView from "./components/tasks-view";
import AnalyticsView from "./components/analytics-view";
import BillingView from "./components/billing-view";
import CopilotPanel from "./components/copilot-panel";
import InteractiveMap from "./components/interactive-map";
import DocumentsView from "./components/documents-view";
import TeamView from "./components/team-view";
import CampaignsView from "./components/campaigns-view";
import ClientPortal from "./components/client-portal";

const BACKEND_URL = "http://localhost:5001";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [, setTenantName] = useState("PropMatch Global Realty");
  const [selectedPhoneContact, setSelectedPhoneContact] = useState<{
    name: string;
    phone: string;
    dealId: string;
  } | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("case_auth") === "true";
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("case_auth", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("case_auth");
    setIsAuthenticated(false);
  };

  // Initialize DB seed on start
  useEffect(() => {
    const seedDatabase = async () => {
      setSeeding(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/tenant/seed`, {
          method: "POST",
        });
        const data = await response.json();
        if (data.success) {
          setTenantName(data.tenant.name);
          setRefreshTrigger((prev) => prev + 1);
        }
      } catch (e) {
        console.error("Failed to seed database:", e);
      } finally {
        setSeeding(false);
      }
    };
    seedDatabase();
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDealSelectedForPhone = (name: string, phone: string, dealId: string) => {
    setSelectedPhoneContact({ name, phone, dealId });
  };

    if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: 'var(--bg-page)', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={handleLogin} style={{ width: '400px', padding: '32px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: '0 6px 16px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ color: 'var(--color-cyan)', fontSize: '40px', textAlign: 'center', marginBottom: '8px' }}>
            <i className="fa-brands fa-airbnb"></i>
          </div>
          
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, textAlign: 'center', margin: 0 }}>Welcome to PropMatch</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>Log in to access your property dashboard.</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <input 
                type="email" 
                required 
                defaultValue="harit.mishra@propmatch.ai" 
                placeholder="Email address"
                style={{ width: '100%', padding: '16px', border: 'none', borderBottom: '1px solid var(--border-color)', outline: 'none', fontSize: '16px' }}
              />
              <input 
                type="password" 
                required 
                defaultValue="PM-8751-2026" 
                placeholder="Password"
                style={{ width: '100%', padding: '16px', border: 'none', outline: 'none', fontSize: '16px' }}
              />
            </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', textAlign: 'center', display: 'block' }}>
            Continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sleek Dark Floating Sidebar (Figma style) */}
            {/* Top Nav (Airbnb style) */}
      <div className="sidebar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', height: '80px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-page)', width: '100%', flexDirection: 'row' }}>
        <div style={{ color: 'var(--color-cyan)', fontSize: '32px', cursor: 'pointer' }} onClick={() => setActiveTab("dashboard")}>
          <i className="fa-brands fa-airbnb"></i>
          <span style={{ fontSize: '24px', fontWeight: 700, marginLeft: '8px', letterSpacing: '-0.5px' }}>propmatch</span>
        </div>

        {/* Search Pill */}
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', borderRadius: '9999px', padding: '8px 8px 8px 24px', boxShadow: '0 1px 2px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)', gap: '16px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
          <div onClick={() => setActiveTab("pipeline")} style={{ fontWeight: 500, fontSize: '14px' }}>Matches</div>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
          <div onClick={() => setActiveTab("properties")} style={{ fontWeight: 500, fontSize: '14px' }}>Properties</div>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
          <div onClick={() => setActiveTab("csv-ingest")} style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Add Leads</div>
          <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--color-cyan)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginLeft: '8px' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '12px' }}></i>
          </div>
        </div>

        {/* User Utilities */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontWeight: 500, fontSize: '14px', cursor: 'pointer', padding: '12px', borderRadius: '24px' }} className="hover-bg" onClick={() => setActiveTab("analytics")}>
            Analytics
          </div>
          <div style={{ cursor: 'pointer', padding: '12px', borderRadius: '50%' }} className="hover-bg" onClick={triggerRefresh}>
            <i className={`fa-solid fa-rotate ${seeding ? "fa-spin" : ""}`} style={{ fontSize: '16px' }}></i>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '8px 12px', cursor: 'pointer', transition: 'box-shadow 0.2s' }} onClick={handleLogout}>
            <i className="fa-solid fa-bars" style={{ fontSize: '14px', color: 'var(--text-main)' }}></i>
            <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-user" style={{ fontSize: '14px' }}></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        

        {/* Tab Router Panels */}
        {activeTab === "dashboard" && (
          <Dashboard 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
            selectedPhoneContact={selectedPhoneContact}
          />
        )}
        {activeTab === "pipeline" && (
          <KanbanBoard
            backendUrl={BACKEND_URL}
            onRefreshTriggered={refreshTrigger}
            onDealSelectedForPhone={handleDealSelectedForPhone}
          />
        )}
        {activeTab === "csv-ingest" && (
          <CSVUploader 
            backendUrl={BACKEND_URL} 
            onImportComplete={triggerRefresh} 
          />
        )}
        {activeTab === "properties" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <InteractiveMap backendUrl={BACKEND_URL} refreshTrigger={refreshTrigger} />
            <PropertyEntry 
              backendUrl={BACKEND_URL} 
              onPropertyAdded={triggerRefresh} 
            />
          </div>
        )}
        {activeTab === "tasks" && (
          <TasksView 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
            onTaskChange={triggerRefresh}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsView 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
          />
        )}
        {activeTab === "billing" && (
          <BillingView 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
            onPlanUpgraded={triggerRefresh}
          />
        )}
        {activeTab === "documents" && (
          <DocumentsView 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
          />
        )}
        {activeTab === "team" && (
          <TeamView 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
          />
        )}
        {activeTab === "campaigns" && (
          <CampaignsView 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
          />
        )}
        {activeTab === "portal" && (
          <ClientPortal 
            backendUrl={BACKEND_URL} 
            refreshTrigger={refreshTrigger} 
            onFeedbackSubmitted={triggerRefresh}
          />
        )}
      </div>

      {/* Global AI Copilot Floating Drawer Button */}
      <CopilotPanel backendUrl={BACKEND_URL} />
    </div>
  );
}

export default App;
