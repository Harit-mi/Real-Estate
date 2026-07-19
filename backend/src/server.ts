import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getCSVHeaders, parseCSVWithMapping, ColumnMapping } from "./services/csv-parser";
import { matchLeadToProperties, matchPropertyToLeads } from "./services/matching-engine";
import { normalizePhone, parseBudget } from "./utils/normalize";
import { prisma } from "./utils/db";
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and parsing of JSON/URL bodies
app.use(cors());
app.use(express.json());

// Set up storage directory for CSV uploads
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// -------------------------------------------------------------
// Seeding & Tenant Management
// -------------------------------------------------------------

/**
 * Endpoint to seed a default Tenant and default Agent.
 */
app.post("/api/tenant/seed", async (req, res) => {
  try {
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: "PropMatch Global Realty",
          subscriptionTier: "growth", // starter, growth, scale
          maxLeads: 5000,
        },
      });
    }

    let agent = await prisma.user.findFirst({
      where: { tenantId: tenant.id },
    });
    if (!agent) {
      agent = await prisma.user.create({
        data: {
          name: "Harit Mishra",
          email: "harit.mishra@propmatch.ai",
          phone: "+919876543210",
          role: "owner",
          tenantId: tenant.id,
        },
      });
    }

    // Seed default tasks
    const taskCount = await prisma.task.count();
    if (taskCount === 0) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(11, 0, 0, 0);

      const todayFourPM = new Date();
      todayFourPM.setHours(16, 0, 0, 0);

      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);
      dayAfter.setHours(14, 0, 0, 0);

      const contacts = await prisma.contact.findMany({ where: { tenantId: tenant.id } });
      const aadi = contacts.find(c => c.name.includes("Aadi"));
      const aarini = contacts.find(c => c.name.includes("Aarini"));
      const anvi = contacts.find(c => c.name.includes("Anvi"));

      await prisma.task.createMany({
        data: [
          {
            title: "Site visit: Bopal Green Villa",
            type: "visit",
            date: tomorrow,
            status: "pending",
            contactId: aarini?.id || null,
            tenantId: tenant.id
          },
          {
            title: "Initial follow-up call",
            type: "call",
            date: todayFourPM,
            status: "pending",
            contactId: aadi?.id || null,
            tenantId: tenant.id
          },
          {
            title: "Negotiation meeting",
            type: "negotiation",
            date: dayAfter,
            status: "pending",
            contactId: anvi?.id || null,
            tenantId: tenant.id
          }
        ]
      });
    }

    // Enrich seeded contacts
    const contactsToEnrich = await prisma.contact.findMany({ where: { tenantId: tenant.id } });
    for (const c of contactsToEnrich) {
      let jobTitle = c.jobTitle;
      let company = c.company;
      let intentScore = c.intentScore;

      if (!jobTitle) {
        if (c.name.toLowerCase().includes("aarini")) {
          jobTitle = "Creative Director";
          company = "Studio Chinar";
          intentScore = "high";
        } else if (c.name.toLowerCase().includes("aadi")) {
          jobTitle = "Senior Tech Architect";
          company = "Nvidia Corporation";
          intentScore = "medium";
        } else if (c.name.toLowerCase().includes("anvi")) {
          jobTitle = "Venture Partner";
          company = "Elevation Capital";
          intentScore = "high";
        } else if (c.name.toLowerCase().includes("aarav")) {
          jobTitle = "Co-Founder & CEO";
          company = "Sandalwood Inc";
          intentScore = "medium";
        } else {
          jobTitle = "Product Lead";
          company = "Google Ahmedabad";
          intentScore = "high";
        }

        await prisma.contact.update({
          where: { id: c.id },
          data: { jobTitle, company, intentScore }
        });
      }
    }

    res.json({ success: true, tenant, agent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Middleware to auto-inject the default Tenant ID for this MVP.
 */
const getTenantId = async (): Promise<string> => {
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "PropMatch Global Realty",
        subscriptionTier: "growth",
        maxLeads: 5000,
      },
    });
  }
  return tenant.id;
};

app.get("/api/tenant/info", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: { contacts: true, properties: true, deals: true },
        },
      },
    });

    const agent = await prisma.user.findFirst({ where: { tenantId } });

    res.json({ tenant, agent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Contacts & Requirements
// -------------------------------------------------------------

/**
 * Fetch all contacts with requirements and recent activities.
 */
app.get("/api/contacts", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      include: {
        requirements: true,
        activities: {
          orderBy: { timestamp: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(contacts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new Contact and Requirement, then trigger matches.
 */
app.post("/api/contacts", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { name, phone, email, source, requirement } = req.body;

    if (!name || !phone || !requirement) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const normalizedPhone = normalizePhone(phone);

    // Create contact and requirement in transaction
    const contact = await prisma.contact.create({
      data: {
        name,
        phone: normalizedPhone,
        email,
        source: source || "Manual",
        tenantId,
        requirements: {
          create: {
            type: requirement.type || "buy",
            bedrooms: requirement.bedrooms || 2,
            budgetMin: parseFloat(requirement.budgetMin) || 0,
            budgetMax: parseFloat(requirement.budgetMax) || 0,
            currency: requirement.currency || "INR",
            locations: requirement.locations || "General",
            propertyType: requirement.propertyType || "apartment",
            timeline: requirement.timeline || "Immediate",
            tenantId,
          },
        },
      },
      include: {
        requirements: true,
      },
    });

    const createdReq = contact.requirements[0];

    // Trigger matching engine
    const matches = await matchLeadToProperties(createdReq.id);

    res.json({ contact, matchesCount: matches.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Properties (Inventory)
// -------------------------------------------------------------

app.get("/api/properties", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const properties = await prisma.property.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json(properties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/properties", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { title, type, propertyType, bedrooms, price, currency, area, areaUnit, location } = req.body;

    if (!title || !type || !propertyType || !price || !location) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const property = await prisma.property.create({
      data: {
        title,
        type,
        propertyType: propertyType.toLowerCase().replace(/\s+/g, ""),
        bedrooms: parseInt(bedrooms) || 0,
        price: parseFloat(price),
        currency: currency || "INR",
        area: parseFloat(area) || 0,
        areaUnit: areaUnit || "sqft",
        location,
        tenantId,
      },
    });

    // Trigger matching engine
    const matches = await matchPropertyToLeads(property.id);

    res.json({ property, matchesCount: matches.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Deals & Sales Pipeline
// -------------------------------------------------------------

/**
 * Fetch all deals, grouped with contacts, requirements, and properties.
 */
app.get("/api/deals", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const deals = await prisma.deal.findMany({
      where: { tenantId },
      include: {
        requirement: {
          include: { contact: true },
        },
        dealProperties: {
          include: { property: true },
        },
        ownerAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(deals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update Deal Stage.
 */
app.patch("/api/deals/:id/stage", async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const oldDeal = await prisma.deal.findUnique({
      where: { id },
      include: { requirement: { include: { contact: true } } },
    });

    if (!oldDeal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data: {
        stage,
        closedAt: ["won", "lost"].includes(stage.toLowerCase()) ? new Date() : null,
      },
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        contactId: oldDeal.requirement.contactId,
        dealId: id,
        type: "stage_change",
        content: `Deal stage changed from "${oldDeal.stage}" to "${stage}"`,
        tenantId: oldDeal.tenantId,
      },
    });

    res.json(updatedDeal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update status of property within a Deal.
 */
app.patch("/api/deals/:dealId/properties/:propertyId/status", async (req, res) => {
  try {
    const { dealId, propertyId } = req.params;
    const { status, rejectionReason } = req.body; // shortlisted, visited, rejected, won, lost

    const dealProperty = await prisma.dealProperty.findFirst({
      where: { dealId, propertyId },
      include: {
        property: true,
        deal: {
          include: { requirement: { include: { contact: true } } },
        },
      },
    });

    if (!dealProperty) {
      return res.status(404).json({ error: "Property association not found inside deal" });
    }

    // Update the association status
    const updatedAssociation = await prisma.dealProperty.update({
      where: { id: dealProperty.id },
      data: {
        status,
        rejectionReason: status === "rejected" ? rejectionReason : null,
      },
    });

    // Write Activity timeline record
    await prisma.activity.create({
      data: {
        contactId: dealProperty.deal.requirement.contactId,
        dealId,
        dealPropertyId: dealProperty.id,
        type: "note",
        content: `Property "${dealProperty.property.title}" updated to status: "${status}"` + 
                 (status === "rejected" ? `. Reason: "${rejectionReason}"` : ""),
        tenantId: dealProperty.deal.tenantId,
      },
    });

    // Handle "won" logic
    if (status === "won") {
      // 1. Move Deal Stage to "won"
      await prisma.deal.update({
        where: { id: dealId },
        data: { stage: "won", closedAt: new Date() },
      });

      // 2. Mark Property status as "sold"
      await prisma.property.update({
        where: { id: propertyId },
        data: { status: "sold" },
      });

      // 3. Mark other properties linked to THIS deal as "lost"
      await prisma.dealProperty.updateMany({
        where: {
          dealId,
          propertyId: { not: propertyId },
        },
        data: { status: "lost" },
      });

      // 4. Mark THIS property as "lost" in other deals
      await prisma.dealProperty.updateMany({
        where: {
          dealId: { not: dealId },
          propertyId,
        },
        data: { status: "lost" },
      });

      // Log conversion activity
      await prisma.activity.create({
        data: {
          contactId: dealProperty.deal.requirement.contactId,
          dealId,
          type: "system",
          content: `Deal WON! Contact purchased property "${dealProperty.property.title}". Other properties in this deal marked as lost.`,
          tenantId: dealProperty.deal.tenantId,
        },
      });
    }

    res.json(updatedAssociation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Activities & Timeline
// -------------------------------------------------------------

app.get("/api/activities", async (req, res) => {
  try {
    const { contactId, dealId } = req.query;
    const tenantId = await getTenantId();

    const whereClause: any = { tenantId };
    if (contactId) whereClause.contactId = String(contactId);
    if (dealId) whereClause.dealId = String(dealId);

    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        agent: true,
      },
      orderBy: { timestamp: "desc" },
    });
    res.json(activities);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/activities", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const { contactId, dealId, type, content, agentId } = req.body;

    if (!contactId || !type || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const activity = await prisma.activity.create({
      data: {
        contactId,
        dealId,
        type,
        content,
        agentId,
        tenantId,
      },
    });

    res.json(activity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// CSV Ingestion Endpoints
// -------------------------------------------------------------

/**
 * Endpoint to upload a CSV and get its headers.
 */
app.post("/api/csv/upload", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const headers = await getCSVHeaders(filePath);

    res.json({
      success: true,
      fileName: req.file.filename,
      filePath,
      headers,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to import parsed CSV leads using provided column mapping.
 */
app.post("/api/csv/import", async (req, res) => {
  try {
    const { filePath, mapping } = req.body;
    const tenantId = await getTenantId();

    if (!filePath || !mapping) {
      return res.status(400).json({ error: "Missing filePath or mapping configuration" });
    }

    // SEC-01 Path Traversal Mitigation: Strip directory segments and restrict to uploadDir
    const safeFileName = path.basename(filePath);
    const resolvedPath = path.join(uploadDir, safeFileName);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "Uploaded CSV file not found on disk" });
    }

    const parsedLeads = await parseCSVWithMapping(resolvedPath, mapping as ColumnMapping);

    let importCount = 0;
    let matchesTriggered = 0;

    // Transactionally write each parsed lead to contact/requirement tables
    for (const lead of parsedLeads) {
      try {
        const contact = await prisma.contact.create({
          data: {
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            source: lead.source || "CSV Import",
            tenantId,
            requirements: lead.requirement
              ? {
                  create: {
                    type: lead.requirement.type,
                    bedrooms: lead.requirement.bedrooms,
                    budgetMin: lead.requirement.budgetMin,
                    budgetMax: lead.requirement.budgetMax,
                    currency: lead.requirement.currency,
                    locations: lead.requirement.locations,
                    propertyType: lead.requirement.propertyType,
                    timeline: lead.requirement.timeline,
                    tenantId,
                  },
                }
              : undefined,
          },
          include: {
            requirements: true,
          },
        });

        importCount++;

        // Trigger matching engine
        if (contact.requirements && contact.requirements.length > 0) {
          const reqId = contact.requirements[0].id;
          const matches = await matchLeadToProperties(reqId);
          matchesTriggered += matches.length;
        }
      } catch (err) {
        console.error("Failed to import individual lead:", lead.name, err);
      }
    }

    // Clean up file from disk
    try {
      fs.unlinkSync(resolvedPath);
    } catch (e) {
      // Ignored
    }

    res.json({
      success: true,
      importedCount: importCount,
      matchesCreated: matchesTriggered,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Tasks Management Endpoints ---
app.get("/api/tasks", async (req, res) => {
  try {
    const tenantId = await getTenantId();
    const tasks = await prisma.task.findMany({
      where: { tenantId },
      include: {
        contact: true,
        deal: {
          include: {
            requirement: {
              include: { contact: true }
            }
          }
        }
      },
      orderBy: { date: "asc" }
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  try {
    const { title, type, date, contactId, dealId } = req.body;
    const tenantId = await getTenantId();
    const task = await prisma.task.create({
      data: {
        title,
        type,
        date: new Date(date),
        status: "pending",
        contactId: contactId || null,
        dealId: dealId || null,
        tenantId
      }
    });

    // Also log task creation to timeline activity
    if (contactId) {
      await prisma.activity.create({
        data: {
          tenantId,
          contactId,
          dealId: dealId || null,
          type: "system",
          content: `Task scheduled: "${title}" on ${new Date(date).toLocaleDateString()}`
        }
      });
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/tasks/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const task = await prisma.task.update({
      where: { id },
      data: { status }
    });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Paddle Billing / Subscription Endpoint ---
app.post("/api/tenant/subscription", async (req, res) => {
  try {
    const { tier } = req.body; // starter, growth, scale
    const tenantId = await getTenantId();
    
    let maxLeads = 1000;
    if (tier === "growth") maxLeads = 5000;
    else if (tier === "scale") maxLeads = 15000;

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionTier: tier,
        maxLeads
      }
    });

    res.json({ success: true, tenant });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- AI Copilot Query Engine ---
app.post("/api/copilot/query", async (req, res) => {
  try {
    const { prompt } = req.body;
    const tenantId = await getTenantId();
    const query = prompt.toLowerCase();

    let reply = "";
    let dataPayload: any = null;

    if (query.includes("property") || query.includes("listing") || query.includes("inventory")) {
      const properties = await prisma.property.findMany({ where: { tenantId } });
      reply = `I found **${properties.length} active listings** in your inventory. Here are the top items:\n` +
        properties.map(p => `- **${p.title}** in ${p.location} (Asking: ${p.currency} ${p.price.toLocaleString()}, Status: ${p.status})`).join("\n");
      dataPayload = properties;
    } 
    else if (query.includes("lead") || query.includes("contact") || query.includes("buyer")) {
      const contacts = await prisma.contact.findMany({
        where: { tenantId },
        include: { requirements: true }
      });
      reply = `You have **${contacts.length} ingested leads** in your CRM database. Here is a quick breakdown:\n` +
        contacts.map(c => `- **${c.name}** (${c.phone}, Source: ${c.source || 'CSV'})`).join("\n");
      dataPayload = contacts;
    }
    else if (query.includes("deal") || query.includes("match") || query.includes("pipeline")) {
      const deals = await prisma.deal.findMany({
        where: { tenantId },
        include: {
          requirement: { include: { contact: true } },
          dealProperties: { include: { property: true } }
        }
      });
      reply = `There are **${deals.length} active matching deals** in the pipeline. Details:\n` +
        deals.map(d => `- **${d.requirement.contact.name}**: ${d.stage.toUpperCase().replace("_", " ")} (${d.dealProperties.length} property options matches found)`).join("\n");
      dataPayload = deals;
    }
    else if (query.includes("draft") || query.includes("template") || query.includes("write") || query.includes("whatsapp")) {
      // Look for a contact name in database
      const contacts = await prisma.contact.findMany({
        where: { tenantId },
        include: { requirements: true }
      });
      
      let matchedContact = contacts.find(c => query.includes(c.name.toLowerCase().split(" ")[0]));
      
      // Fallback to first contact if none matches
      if (!matchedContact && contacts.length > 0) {
        matchedContact = contacts[0];
      }

      if (matchedContact) {
        const deals = await prisma.deal.findMany({
          where: { tenantId, requirement: { contactId: matchedContact.id } },
          include: { dealProperties: { include: { property: true } } }
        });

        const propertyTitle = deals[0]?.dealProperties[0]?.property.title || "premium listings";
        const price = deals[0]?.dealProperties[0]?.property.price || 0;
        const currency = deals[0]?.dealProperties[0]?.property.currency || "INR";

        const priceStr = price > 0 ? `${currency} ${price.toLocaleString()}` : "custom terms";

        reply = `Here is a custom outreach draft for **${matchedContact.name}** regarding **${propertyTitle}**:\n\n` +
          `> "Hello ${matchedContact.name},\n` +
          `> I have matching news regarding your housing search! We just updated our inventory with a hot property: *${propertyTitle}* priced at *${priceStr}*. Let me know if you would like to arrange a site tour this week! - PropMatch AI Agent"\n\n` +
          `Click the **Outreach Simulator** to test sending this templates live.`;
        dataPayload = { contact: matchedContact, template: reply };
      } else {
        reply = "You don't have any leads in the database yet to draft message templates for. Ingest a CSV database first!";
      }
    }
    else {
      reply = "Hi! I am the **PropMatch AI Copilot**. I can help you search files and draft communications.\n\n" +
        "Try asking me:\n" +
        "- *'List all active properties in inventory'*\n" +
        "- *'Show active leads database'*\n" +
        "- *'What matching deals are in the pipeline?'*\n" +
        "- *'Draft a WhatsApp template for Aadi'*";
    }

    res.json({ reply, data: dataPayload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Client Portal Feedback Endpoint ---
app.post("/api/client-portal/feedback", async (req, res) => {
  try {
    const { dealId, propertyId, status, comment } = req.body; // status: shortlisted, rejected
    const tenantId = await getTenantId();

    const dealProp = await prisma.dealProperty.findFirst({
      where: { dealId, propertyId },
      include: {
        deal: {
          include: {
            requirement: { include: { contact: true } }
          }
        },
        property: true
      }
    });

    if (!dealProp) {
      return res.status(404).json({ error: "Deal property mapping not found" });
    }

    const updated = await prisma.dealProperty.update({
      where: { id: dealProp.id },
      data: { status }
    });

    // Also update main deal stage based on client feedback
    let nextStage = dealProp.deal.stage;
    if (status === "shortlisted") {
      nextStage = "shortlisted";
    }

    await prisma.deal.update({
      where: { id: dealId },
      data: { stage: nextStage }
    });

    // Create system activities log
    await prisma.activity.create({
      data: {
        contactId: dealProp.deal.requirement.contactId,
        dealId,
        type: "client_feedback",
        content: `Client ${dealProp.deal.requirement.contact.name} marked "${dealProp.property.title}" as ${status.toUpperCase()}.${comment ? ` Comment: "${comment}"` : ""}`,
        tenantId
      }
    });

    res.json({ success: true, updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Documents Management Endpoints ---
app.get("/api/documents", async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      include: {
        deal: {
          include: {
            requirement: { include: { contact: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/documents/generate", async (req, res) => {
  try {
    const { dealId, type } = req.body; // type: lease, brokerage
    const tenantId = await getTenantId();

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        requirement: { include: { contact: true } },
        dealProperties: {
          include: { property: true }
        }
      }
    });

    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }

    const contactName = deal.requirement.contact.name;
    const propertyTitle = deal.dealProperties[0]?.property.title || "Premium Villa Cluster";
    const location = deal.dealProperties[0]?.property.location || "Ahmedabad, Gujarat";
    const priceVal = deal.dealProperties[0]?.property.price || 12000000;
    const currencyStr = deal.dealProperties[0]?.property.currency || "INR";

    let title = "";
    let content = "";

    if (type === "lease") {
      title = `Residential Lease Agreement - ${contactName}`;
      content = `
# RESIDENTIAL LEASE AGREEMENT

This Lease Agreement is executed on ${new Date().toLocaleDateString()} between:
**Lessor**: PropMatch Realty Advisory (acting as Broker Agent)
**Lessee**: ${contactName}

## 1. PREMISES
The Lessor leases to Lessee the property: **${propertyTitle}** located at **${location}**.

## 2. TERM & RENTAL
The lease shall be for 11 Months. The Lessee agrees to pay rent of **${currencyStr} ${(priceVal * 0.005).toLocaleString()}/month** on or before the 5th day of every calendar month.

## 3. SECURITY DEPOSIT
The Lessee shall pay a security deposit of **${currencyStr} ${(priceVal * 0.015).toLocaleString()}** upon signing.

---
*Signed Electronically*
**Lessor Representative**: PropMatch Agent
**Lessee**: ${contactName}
      `;
    } else {
      title = `Exclusive Brokerage Agreement - ${contactName}`;
      content = `
# EXCLUSIVE BROKERAGE CONTRACT

This Brokerage Agreement is executed on ${new Date().toLocaleDateString()} between:
**Agency**: PropMatch Global Realty
**Client**: ${contactName}

## 1. ENGAGEMENT
The Client engages PropMatch Global Realty to locate and facilitate purchase of property matching client parameters in Ahmedabad.

## 2. AGENCY FEE / COMMISSION
The Client agrees to pay a fixed brokerage fee of **2.0% (Two Percent)** of the final transaction price of **${propertyTitle}** (valued at **${currencyStr} ${priceVal.toLocaleString()}**), amounting to **${currencyStr} ${(priceVal * 0.02).toLocaleString()}**, upon signing of the sale deed.

---
*Signed Electronically*
**Broker**: PropMatch Advisor
**Client**: ${contactName}
      `;
    }

    const doc = await prisma.document.create({
      data: {
        title,
        type,
        content: content.trim(),
        dealId
      }
    });

    // Create activity timeline log
    await prisma.activity.create({
      data: {
        contactId: deal.requirement.contactId,
        dealId,
        type: "system",
        content: `Generated ${type.toUpperCase()} contract: "${title}"`,
        tenantId
      }
    });

    res.json(doc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Team Leaderboard Endpoint ---
app.get("/api/agents/leaderboard", async (req, res) => {
  try {
    const tenantId = await getTenantId();

    // Make sure we have Sarah and Rajesh seeded for the leaderboard mockup
    let sarah = await prisma.user.findFirst({ where: { email: "sarah.jenkins@propmatch.ai" } });
    if (!sarah) {
      sarah = await prisma.user.create({
        data: {
          name: "Sarah Jenkins",
          email: "sarah.jenkins@propmatch.ai",
          phone: "+919988776655",
          role: "agent",
          tenantId
        }
      });
    }

    let rajesh = await prisma.user.findFirst({ where: { email: "rajesh.patel@propmatch.ai" } });
    if (!rajesh) {
      rajesh = await prisma.user.create({
        data: {
          name: "Rajesh Patel",
          email: "rajesh.patel@propmatch.ai",
          phone: "+919977553311",
          role: "agent",
          tenantId
        }
      });
    }

    const currentAgent = await prisma.user.findFirst({ where: { role: "owner", tenantId } }) 
      || await prisma.user.findFirst({ where: { tenantId } });

    // Count real won deals from DB for current agent
    const realWonDeals = await prisma.deal.findMany({
      where: { tenantId, stage: "won" },
      include: { dealProperties: { include: { property: true } } }
    });

    let currentAgentVolume = 0;
    realWonDeals.forEach(d => {
      const wonProp = d.dealProperties.find(dp => dp.status === "won");
      if (wonProp) currentAgentVolume += wonProp.property.price;
    });

    // Seed some static won amounts to give variety
    const leaderboard = [
      {
        id: currentAgent?.id || "1",
        name: currentAgent?.name || "Harit Mishra",
        role: "Principal Broker",
        dealsClosed: realWonDeals.length > 0 ? realWonDeals.length : 3,
        salesVolume: currentAgentVolume > 0 ? currentAgentVolume : 28000000, 
        commissionEarned: (currentAgentVolume > 0 ? currentAgentVolume : 28000000) * 0.02
      },
      {
        id: sarah.id,
        name: sarah.name,
        role: "Senior Sales Associate",
        dealsClosed: 4,
        salesVolume: 38000000, 
        commissionEarned: 38000000 * 0.02
      },
      {
        id: rajesh.id,
        name: rajesh.name,
        role: "Sub-Market Agent",
        dealsClosed: 2,
        salesVolume: 16000000, 
        commissionEarned: 16000000 * 0.02
      }
    ];

    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Campaigns Endpoint ---
app.post("/api/campaigns/broadcast", async (req, res) => {
  try {
    const { campaignName, selectedPropertyIds } = req.body;
    const tenantId = await getTenantId();

    const properties = await prisma.property.findMany({
      where: { id: { in: selectedPropertyIds } }
    });

    const contacts = await prisma.contact.findMany({ where: { tenantId } });

    // Create system activity for each contact logging the broadcast
    for (const contact of contacts) {
      await prisma.activity.create({
        data: {
          contactId: contact.id,
          type: "campaign",
          content: `Broadcast Campaign "${campaignName}" sent. Showcasing properties: ${properties.map(p => p.title).join(", ")}`,
          tenantId
        }
      });
    }

    res.json({ success: true, targetCount: contacts.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, async () => {
  console.log(`PropMatch AI Backend running on port ${PORT}`);
  // Run seed check
  try {
    const tenantId = await getTenantId();
    console.log(`Tenant system active. ID: ${tenantId}`);
  } catch (e) {
    console.error("Prisma startup check failed:", e);
  }
});
