import fs from "fs";
import csv from "csv-parser";
import { normalizePhone, parseBudget } from "../utils/normalize";

export interface ColumnMapping {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  requirementType?: string; // buy/rent
  propertyType?: string; // apartment, villa, etc.
  bedrooms?: string;
  budgetMin?: string;
  budgetMax?: string;
  currency?: string;
  locations?: string; // location tags
  timeline?: string;
}

export interface ParsedLead {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  requirement?: {
    type: string; // buy / rent
    bedrooms: number;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    locations: string;
    propertyType: string;
    timeline?: string;
  };
}

/**
 * Reads a CSV file's headers to present to the frontend for mapping.
 */
export function getCSVHeaders(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const headers: string[] = [];
    const stream = fs.createReadStream(filePath);

    stream
      .pipe(csv())
      .on("headers", (headerList) => {
        headers.push(...headerList);
        stream.destroy(); // Stop reading after headers are retrieved
        resolve(headers);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

/**
 * Parses the CSV file using the provided column mapping.
 */
export function parseCSVWithMapping(
  filePath: string,
  mapping: ColumnMapping,
  defaultCurrency = "INR"
): Promise<ParsedLead[]> {
  return new Promise((resolve, reject) => {
    const results: ParsedLead[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => {
        try {
          // Extract contact details
          const name = row[mapping.name]?.toString().trim() || "Imported Lead";
          const rawPhone = row[mapping.phone]?.toString().trim() || "";

          if (!rawPhone) {
            return; // Skip row if phone number is empty
          }

          const phone = normalizePhone(rawPhone);
          const email = mapping.email ? row[mapping.email]?.toString().trim() : undefined;
          const source = mapping.source ? row[mapping.source]?.toString().trim() : "CSV Import";

          // Extract requirement details
          const reqTypeRaw = mapping.requirementType ? row[mapping.requirementType]?.toString().trim() : "buy";
          const type = reqTypeRaw.toLowerCase().includes("rent") ? "rent" : "buy";

          const bedroomsRaw = mapping.bedrooms ? parseInt(row[mapping.bedrooms]?.toString().replace(/\D/g, ""), 10) : 2;
          const bedrooms = isNaN(bedroomsRaw) ? 2 : bedroomsRaw;

          const currency = mapping.currency ? row[mapping.currency]?.toString().trim() : defaultCurrency;

          const budgetMinRaw = mapping.budgetMin ? row[mapping.budgetMin]?.toString().trim() : "0";
          const budgetMaxRaw = mapping.budgetMax ? row[mapping.budgetMax]?.toString().trim() : "0";

          const parsedMin = parseBudget(budgetMinRaw, currency);
          const parsedMax = parseBudget(budgetMaxRaw, currency);

          const locations = mapping.locations ? row[mapping.locations]?.toString().trim() : "General";
          const propertyTypeRaw = mapping.propertyType ? row[mapping.propertyType]?.toString().trim() : "apartment";
          // Standardize property types to lower case
          const propertyType = propertyTypeRaw.toLowerCase().replace(/\s+/g, "");

          const timeline = mapping.timeline ? row[mapping.timeline]?.toString().trim() : undefined;

          results.push({
            name,
            phone,
            email: email || null,
            source: source || "CSV Import",
            requirement: {
              type,
              bedrooms,
              budgetMin: parsedMin.value || 0,
              budgetMax: parsedMax.value || parsedMin.value * 1.5 || 10000000, // if max is missing, estimate 1.5x min or 1cr
              currency: parsedMax.currency || parsedMin.currency || defaultCurrency,
              locations: locations || "Any",
              propertyType: propertyType || "apartment",
              timeline: timeline || "Immediate",
            },
          });
        } catch (e) {
          console.error("Error parsing row: ", row, e);
          // Continue processing other rows
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}
