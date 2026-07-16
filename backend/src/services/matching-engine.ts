import { prisma } from "../utils/db";

export interface MatchResult {
  propertyId: string;
  requirementId: string;
  score: number;
  breakdown: {
    bedrooms: number;
    price: number;
    location: number;
  };
}

/**
 * Calculates a match score (0-100) between a Requirement and a Property.
 */
export function calculateMatchScore(
  req: {
    type: string;
    propertyType: string;
    bedrooms: number;
    budgetMin: number;
    budgetMax: number;
    locations: string;
    currency: string;
  },
  prop: {
    type: string;
    propertyType: string;
    bedrooms: number;
    price: number;
    location: string;
    currency: string;
  }
): { score: number; breakdown: { bedrooms: number; price: number; location: number } } {
  const breakdown = { bedrooms: 0, price: 0, location: 0 };

  // Hard constraints: Requirement type (buy/rent) and property type must match exactly
  if (req.type.toLowerCase() !== prop.type.toLowerCase()) {
    return { score: 0, breakdown };
  }

  // Handle case differences and spaces in property type (e.g. "apartment" vs "Apartment")
  const reqPropType = req.propertyType.toLowerCase().replace(/\s+/g, "");
  const propPropType = prop.propertyType.toLowerCase().replace(/\s+/g, "");
  if (reqPropType !== propPropType) {
    return { score: 0, breakdown };
  }

  // 1. Bedrooms match (Max: 30 points)
  if (req.bedrooms === prop.bedrooms) {
    breakdown.bedrooms = 30;
  } else if (Math.abs(req.bedrooms - prop.bedrooms) === 1) {
    breakdown.bedrooms = 15;
  }

  // 2. Budget match (Max: 40 points)
  // Check if currencies match. For simplicity, assume conversion if they differ,
  // but in v1 we enforce same currency matching or log standard values.
  let propPrice = prop.price;
  if (req.currency !== prop.currency) {
    // Simple mock currency converter
    if (req.currency === "INR" && prop.currency === "USD") propPrice = prop.price * 83;
    else if (req.currency === "USD" && prop.currency === "INR") propPrice = prop.price / 83;
    else if (req.currency === "EUR" && prop.currency === "USD") propPrice = prop.price * 1.08;
    else if (req.currency === "USD" && prop.currency === "EUR") propPrice = prop.price / 1.08;
  }

  if (propPrice >= req.budgetMin && propPrice <= req.budgetMax) {
    breakdown.price = 40;
  } else {
    // Check for margins (15% grace range)
    const lowerMargin = req.budgetMin * 0.85;
    const upperMargin = req.budgetMax * 1.15;
    if (propPrice >= lowerMargin && propPrice <= upperMargin) {
      breakdown.price = 20;
    }
  }

  // 3. Location match (Max: 30 points)
  const propLoc = prop.location.toLowerCase().trim();
  const reqLocs = req.locations
    .toLowerCase()
    .split(",")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let locationScore = 0;
  for (const loc of reqLocs) {
    if (propLoc.includes(loc) || loc.includes(propLoc)) {
      locationScore = 30;
      break;
    }
  }

  // If no exact substring match, look for word intersection
  if (locationScore === 0) {
    const propWords = propLoc.split(/\s+/);
    for (const loc of reqLocs) {
      const locWords = loc.split(/\s+/);
      const intersection = propWords.filter((w) => w.length > 2 && locWords.includes(w));
      if (intersection.length > 0) {
        locationScore = 15;
        break;
      }
    }
  }

  breakdown.location = locationScore;

  const totalScore = breakdown.bedrooms + breakdown.price + breakdown.location;
  return { score: totalScore, breakdown };
}

/**
 * Triggered when a new lead requirement is created: match it against all available properties.
 */
export async function matchLeadToProperties(
  requirementId: string,
  threshold = 65
): Promise<MatchResult[]> {
  const req = await prisma.requirement.findUnique({
    where: { id: requirementId },
    include: { contact: true },
  });

  if (!req || req.status !== "active") return [];

  // Find all available properties for this tenant
  const properties = await prisma.property.findMany({
    where: {
      tenantId: req.tenantId,
      status: "available",
    },
  });

  const matches: MatchResult[] = [];

  // Find default agent for this tenant to assign the deal to if one doesn't exist
  const defaultAgent = await prisma.user.findFirst({
    where: { tenantId: req.tenantId },
  });
  if (!defaultAgent) return [];

  // Check if there is already an active deal for this requirement
  let deal = await prisma.deal.findFirst({
    where: {
      requirementId: req.id,
      stage: { notIn: ["won", "lost"] },
    },
  });

  for (const prop of properties) {
    const { score, breakdown } = calculateMatchScore(req, prop);
    if (score >= threshold) {
      matches.push({
        propertyId: prop.id,
        requirementId: req.id,
        score,
        breakdown,
      });

      // Create Deal if it doesn't exist
      if (!deal) {
        deal = await prisma.deal.create({
          data: {
            requirementId: req.id,
            stage: "new_match",
            ownerAgentId: defaultAgent.id,
            tenantId: req.tenantId,
          },
        });
      }

      // Check if property already linked to deal
      const existingLink = await prisma.dealProperty.findFirst({
        where: {
          dealId: deal.id,
          propertyId: prop.id,
        },
      });

      if (!existingLink) {
        const dealProp = await prisma.dealProperty.create({
          data: {
            dealId: deal.id,
            propertyId: prop.id,
            status: "interested",
            matchScore: score,
          },
        });

        // Add System Match Activity
        await prisma.activity.create({
          data: {
            contactId: req.contactId,
            dealId: deal.id,
            dealPropertyId: dealProp.id,
            type: "system",
            content: `Property match identified: ${prop.title} (${score}% match). Bedrooms: +${breakdown.bedrooms}, Price: +${breakdown.price}, Location: +${breakdown.location}`,
            tenantId: req.tenantId,
          },
        });

        // Simulate sending WhatsApp Notification
        const currencySymbol = prop.currency === "INR" ? "₹" : "$";
        const formattedPrice = prop.price >= 10000000
          ? `${(prop.price / 10000000).toFixed(2)} Cr`
          : prop.price >= 100000
          ? `${(prop.price / 100000).toFixed(2)} L`
          : prop.price.toLocaleString();

        const messageContent = `Hi ${req.contact.name}! We've found a new listing that matches your criteria: *${prop.title}* in ${prop.location}. Details: ${prop.bedrooms} BHK | Price: ${currencySymbol}${formattedPrice}. Would you like to schedule a visit?`;

        await prisma.activity.create({
          data: {
            contactId: req.contactId,
            dealId: deal.id,
            dealPropertyId: dealProp.id,
            type: "whatsapp_out",
            content: messageContent,
            tenantId: req.tenantId,
          },
        });
      }
    }
  }

  return matches;
}

/**
 * Triggered when a new property is added: match it against all open requirements.
 */
export async function matchPropertyToLeads(
  propertyId: string,
  threshold = 65
): Promise<MatchResult[]> {
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!prop || prop.status !== "available") return [];

  // Find all active requirements
  const requirements = await prisma.requirement.findMany({
    where: {
      tenantId: prop.tenantId,
      status: "active",
    },
    include: {
      contact: true,
    },
  });

  const matches: MatchResult[] = [];

  const defaultAgent = await prisma.user.findFirst({
    where: { tenantId: prop.tenantId },
  });
  if (!defaultAgent) return [];

  for (const req of requirements) {
    const { score, breakdown } = calculateMatchScore(req, prop);
    if (score >= threshold) {
      matches.push({
        propertyId: prop.id,
        requirementId: req.id,
        score,
        breakdown,
      });

      // Find or create active deal for this requirement
      let deal = await prisma.deal.findFirst({
        where: {
          requirementId: req.id,
          stage: { notIn: ["won", "lost"] },
        },
      });

      if (!deal) {
        deal = await prisma.deal.create({
          data: {
            requirementId: req.id,
            stage: "new_match",
            ownerAgentId: defaultAgent.id,
            tenantId: prop.tenantId,
          },
        });
      }

      // Check if property already linked to deal
      const existingLink = await prisma.dealProperty.findFirst({
        where: {
          dealId: deal.id,
          propertyId: prop.id,
        },
      });

      if (!existingLink) {
        const dealProp = await prisma.dealProperty.create({
          data: {
            dealId: deal.id,
            propertyId: prop.id,
            status: "interested",
            matchScore: score,
          },
        });

        // Add System Match Activity
        await prisma.activity.create({
          data: {
            contactId: req.contactId,
            dealId: deal.id,
            dealPropertyId: dealProp.id,
            type: "system",
            content: `New property uploaded: ${prop.title} scored ${score}% against this requirement. Bedrooms: +${breakdown.bedrooms}, Price: +${breakdown.price}, Location: +${breakdown.location}`,
            tenantId: prop.tenantId,
          },
        });

        // Simulate sending WhatsApp Notification
        const currencySymbol = prop.currency === "INR" ? "₹" : "$";
        const formattedPrice = prop.price >= 10000000
          ? `${(prop.price / 10000000).toFixed(2)} Cr`
          : prop.price >= 100000
          ? `${(prop.price / 100000).toFixed(2)} L`
          : prop.price.toLocaleString();

        const messageContent = `Hi ${req.contact.name}! We have just listed a property matching your requirements: *${prop.title}* in ${prop.location}. Details: ${prop.bedrooms} BHK | Price: ${currencySymbol}${formattedPrice}. Would you like to schedule a visit?`;

        await prisma.activity.create({
          data: {
            contactId: req.contactId,
            dealId: deal.id,
            dealPropertyId: dealProp.id,
            type: "whatsapp_out",
            content: messageContent,
            tenantId: prop.tenantId,
          },
        });
      }
    }
  }

  return matches;
}
