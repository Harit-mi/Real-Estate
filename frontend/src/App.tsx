import { useState, useEffect } from "react";
import { 
  Building2, Users, LayoutDashboard, FileSpreadsheet, 
  RefreshCw, Calendar, BarChart3, CreditCard,
  FileText, Award, Mail, Smartphone
} from "lucide-react";
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
  const [tenantName, setTenantName] = useState("PropMatch Global Realty");
  const [selectedPhoneContact, setSelectedPhoneContact] = useState<{
    name: string;
    phone: string;
    dealId: string;
  } | null>(null);

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

  return (
    <div className="app-container">
      {/* Sleek Dark Floating Sidebar (Figma style) */}
      <div className="sidebar">
        <div className="sidebar-nav">
          <div className="logo-container">
            <span className="logo-text">P.</span>
          </div>

          <div
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
            data-tooltip="Dashboard"
          >
            <LayoutDashboard size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "pipeline" ? "active" : ""}`}
            onClick={() => setActiveTab("pipeline")}
            data-tooltip="Sales Pipeline"
          >
            <Users size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "csv-ingest" ? "active" : ""}`}
            onClick={() => setActiveTab("csv-ingest")}
            data-tooltip="CSV Lead Ingest"
          >
            <FileSpreadsheet size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "properties" ? "active" : ""}`}
            onClick={() => setActiveTab("properties")}
            data-tooltip="Property Inventory"
          >
            <Building2 size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
            data-tooltip="Task Schedule"
          >
            <Calendar size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
            data-tooltip="CRM Analytics"
          >
            <BarChart3 size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "billing" ? "active" : ""}`}
            onClick={() => setActiveTab("billing")}
            data-tooltip="Paddle Billing"
          >
            <CreditCard size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "documents" ? "active" : ""}`}
            onClick={() => setActiveTab("documents")}
            data-tooltip="Document Hub"
          >
            <FileText size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "team" ? "active" : ""}`}
            onClick={() => setActiveTab("team")}
            data-tooltip="Team Leaderboard"
          >
            <Award size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "campaigns" ? "active" : ""}`}
            onClick={() => setActiveTab("campaigns")}
            data-tooltip="Email Campaigns"
          >
            <Mail size={20} />
          </div>
          <div
            className={`nav-item ${activeTab === "portal" ? "active" : ""}`}
            onClick={() => setActiveTab("portal")}
            data-tooltip="Client Portal Simulator"
          >
            <Smartphone size={20} />
          </div>
        </div>

        <div className="sidebar-nav" style={{ flexGrow: 0, gap: '1rem' }}>
          <div 
            className="nav-item" 
            onClick={triggerRefresh} 
            data-tooltip={seeding ? "Activating Org..." : `Sync CRM Core (${tenantName})`}
          >
            <RefreshCw size={18} className={seeding ? "animate-spin" : ""} />
          </div>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-title">
            {activeTab === "dashboard" && (
              <>
                <h1>CRM Dashboard</h1>
                <p>Welcome to PropMatch Smart Real Estate Intelligence Engine</p>
              </>
            )}
            {activeTab === "pipeline" && (
              <>
                <h1>Pipeline & Deals</h1>
                <p>Track matching and sales pipeline progress across multi-property deals</p>
              </>
            )}
            {activeTab === "csv-ingest" && (
              <>
                <h1>CSV Lead Import</h1>
                <p>Ingest bulk lead requirements from Excel spreadsheets without APIs</p>
              </>
            )}
            {activeTab === "properties" && (
              <>
                <h1>Inventory & Market Map</h1>
                <p>Register property listings to reverse-match with buyers and visualize geographical distribution</p>
              </>
            )}
            {activeTab === "tasks" && (
              <>
                <h1>Event Schedule</h1>
                <p>Log client follow-ups, tours, and site visits inside the local database</p>
              </>
            )}
            {activeTab === "analytics" && (
              <>
                <h1>CRM Analytics</h1>
                <p>Track matching accuracy distributions and real-time deal stage pipelines</p>
              </>
            )}
            {activeTab === "billing" && (
              <>
                <h1>Paddle Billing & Quota Limit Simulator</h1>
                <p>Manage subscription licenses and upgrade lead database capacity</p>
              </>
            )}
            {activeTab === "documents" && (
              <>
                <h1>Document Management Hub</h1>
                <p>Auto-generate rental agreement templates and sales deeds for won deals</p>
              </>
            )}
            {activeTab === "team" && (
              <>
                <h1>Team Leaderboard & splits</h1>
                <p>Track closed transaction volumes and commission splits across brokerage desk agents</p>
              </>
            )}
            {activeTab === "campaigns" && (
              <>
                <h1>Marketing Campaigns</h1>
                <p>Compose newsletter broadcasts showcasing property inventories to cold leads</p>
              </>
            )}
            {activeTab === "portal" && (
              <>
                <h1>Shareable Client Portal</h1>
                <p>Simulate client swipe feedback on matched recommendations (bi-directional sync)</p>
              </>
            )}
          </div>
        </div>

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
