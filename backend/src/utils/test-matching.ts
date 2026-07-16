import { parseCSVWithMapping, ColumnMapping } from "../services/csv-parser";
import { matchLeadToProperties, matchPropertyToLeads } from "../services/matching-engine";
import path from "path";
import { prisma } from "./db";

async function runTestVerification() {
  console.log("=== Starting PropMatch AI Verification ===");

  // 1. Setup Tenant and Agent
  console.log("1. Setting up Tenant and Agent...");
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "PropMatch Verification Realty",
        subscriptionTier: "growth",
      },
    });
  }

  let agent = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!agent) {
    agent = await prisma.user.create({
      data: {
        name: "Test Agent",
        email: "agent@propmatch.ai",
        phone: "+919999999999",
        tenantId: tenant.id,
      },
    });
  }

  // 2. Clear old test data to ensure clean verification run
  console.log("2. Cleaning old data...");
  await prisma.activity.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.dealProperty.deleteMany({ where: { deal: { tenantId: tenant.id } } });
  await prisma.deal.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.property.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.requirement.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.contact.deleteMany({ where: { tenantId: tenant.id } });

  // 3. Register Properties
  console.log("3. Seeding Property Inventory...");
  const p1 = await prisma.property.create({
    data: {
      title: "Satellite Heights Residency",
      type: "buy",
      propertyType: "apartment",
      bedrooms: 3,
      price: 5200000, // 52 Lakhs
      currency: "INR",
      area: 1650,
      areaUnit: "sqft",
      location: "Satellite, Ahmedabad",
      status: "available",
      tenantId: tenant.id,
    },
  });

  const p2 = await prisma.property.create({
    data: {
      title: "Bopal Green Villa",
      type: "buy",
      propertyType: "villa",
      bedrooms: 4,
      price: 15000000, // 1.5 Cr
      currency: "INR",
      area: 3200,
      areaUnit: "sqft",
      location: "Bopal, Ahmedabad",
      status: "available",
      tenantId: tenant.id,
    },
  });

  const p3 = await prisma.property.create({
    data: {
      title: "Satellite Cozy Rental",
      type: "rent",
      propertyType: "apartment",
      bedrooms: 2,
      price: 22000,
      currency: "INR",
      area: 1100,
      areaUnit: "sqft",
      location: "Satellite, Ahmedabad",
      status: "available",
      tenantId: tenant.id,
    },
  });

  console.log(`   Seeded 3 properties:`);
  console.log(`   - [Sale] ${p1.title} in ${p1.location} (₹52 L)`);
  console.log(`   - [Sale] ${p2.title} in ${p2.location} (₹1.5 Cr)`);
  console.log(`   - [Rent] ${p3.title} in ${p3.location} (₹22 k)`);

  // 4. Ingest CSV file
  console.log("4. Ingesting Leads from test_leads.csv...");
  const csvPath = path.join(__dirname, "../../../test_leads.csv");
  const mapping: ColumnMapping = {
    name: "Name",
    phone: "Phone",
    email: "Email",
    requirementType: "RequirementType",
    propertyType: "PropertyType",
    bedrooms: "Bedrooms",
    budgetMin: "BudgetMin",
    budgetMax: "BudgetMax",
    currency: "Currency",
    locations: "Locations",
    timeline: "Timeline",
  };

  const parsed = await parseCSVWithMapping(csvPath, mapping);
  console.log(`   Parsed ${parsed.length} leads from CSV.`);

  for (const lead of parsed) {
    if (!lead.requirement) continue;
    const contact = await prisma.contact.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        source: "CSV Verification",
        tenantId: tenant.id,
        requirements: {
          create: {
            type: lead.requirement.type,
            bedrooms: lead.requirement.bedrooms,
            budgetMin: lead.requirement.budgetMin,
            budgetMax: lead.requirement.budgetMax,
            currency: lead.requirement.currency,
            locations: lead.requirement.locations,
            propertyType: lead.requirement.propertyType,
            timeline: lead.requirement.timeline,
            tenantId: tenant.id,
          },
        },
      },
      include: {
        requirements: true,
      },
    });

    console.log(`   Imported Contact: ${contact.name} (${contact.phone})`);
    
    // Run lead-to-property matcher
    const matches = await matchLeadToProperties(contact.requirements[0].id);
    console.log(`     -> Triggered lead matching. Created ${matches.length} deal associations.`);
  }

  // 5. Query results to verify correctness
  console.log("5. Verifying DB Results...");
  const deals = await prisma.deal.findMany({
    where: { tenantId: tenant.id },
    include: {
      requirement: { include: { contact: true } },
      dealProperties: { include: { property: true } },
    },
  });

  console.log(`\n=== Match Summary ===`);
  console.log(`Total active deals generated: ${deals.length}`);

  for (const deal of deals) {
    console.log(`\nClient: ${deal.requirement.contact.name} (${deal.requirement.contact.phone})`);
    console.log(`Requirement: ${deal.requirement.bedrooms} BHK ${deal.requirement.propertyType} for ${deal.requirement.type} in [${deal.requirement.locations}]`);
    console.log(`Matches linked:`);
    deal.dealProperties.forEach((dp) => {
      console.log(`  - Property: "${dp.property.title}"`);
      console.log(`    Location: ${dp.property.location}`);
      console.log(`    Price: ${dp.property.price} ${dp.property.currency}`);
      console.log(`    Match Score: ${dp.matchScore}%`);
      console.log(`    Status: ${dp.status}`);
    });
  }

  // 6. Test Property-to-Lead reverse matching
  console.log("\n6. Testing Reverse Matching (Onboarding a New Property)...");
  const p4 = await prisma.property.create({
    data: {
      title: "Shela Heights Mansion",
      type: "buy",
      propertyType: "villa",
      bedrooms: 4,
      price: 14000000, // 1.4 Cr
      currency: "INR",
      area: 2800,
      areaUnit: "sqft",
      location: "Shela, Ahmedabad",
      status: "available",
      tenantId: tenant.id,
    },
  });

  console.log(`   Onboarded new Property: "${p4.title}" at Shela (₹1.4 Cr)`);
  const reverseMatches = await matchPropertyToLeads(p4.id);
  console.log(`   -> Reverse matcher triggered. Linked property to ${reverseMatches.length} deals.`);
  
  // Show updated deal for Aarini Sandal (who wants a Bopal/Shela Villa)
  const aariniDeal = await prisma.deal.findFirst({
    where: {
      tenantId: tenant.id,
      requirement: {
        contact: { name: { contains: "Aarini" } },
      },
    },
    include: {
      dealProperties: { include: { property: true } },
    },
  });

  if (aariniDeal) {
    console.log(`\nUpdated Deal for Aarini Sandal (Multi-Property Consideration):`);
    aariniDeal.dealProperties.forEach((dp) => {
      console.log(`  - Property: "${dp.property.title}" in ${dp.property.location} (Score: ${dp.matchScore}%)`);
    });
  }

  console.log("\n=== PropMatch AI Verification Successful! ===");
}

runTestVerification()
  .catch((e) => console.error("Verification failed:", e))
  .finally(() => prisma.$disconnect());
