// ─── Local Medicine Database Service ─────────────────────────
//
// Loads the 246K Indian Medicine Database CSV into memory at module
// init and provides ultra-fast (<10ms) multi-token search with
// scoring. Replaces the old external myUpchar Drug Master API +
// hardcoded fallback database entirely.
//
// Usage:
//   import { searchMedicineDatabase } from "@/lib/medicine-db";
//   const results = searchMedicineDatabase("dolo 650");

import fs from "fs";
import path from "path";

// ─── Public types ────────────────────────────────────────────

export type MedicineDatabaseResult = {
  name: string;
  genericName: string;
  manufacturer: string;
  composition: string;
  dosageForm: string;
  strength: string;
  packSize: string;
  schedule: string;
  requiresPrescription: boolean;
  gstRate: number;
  hsnCode: string;
  mrpPaisa: number;
  source: "local";
};

// ─── CSV row shape ───────────────────────────────────────────

interface CsvRow {
  id: string;
  medicine_name: string;
  mrp_inr: string;
  manufacturer: string;
  type: string;
  pack_size: string;
  composition: string;
  gst_rate: string;
}

// ─── Indexed entry for O(1)-per-query search ─────────────────

interface IndexedEntry {
  name: string;
  manufacturer: string;
  composition: string;
  packSize: string;
  mrpPaisa: number;
  gstRate: number;
  dosageForm: string;
  strength: string;
  /** Pre-built lowercase search string for fast multi-token matching */
  _search: string;
  /** Lowercase name for scoring */
  _nameLower: string;
}

// ─── CSV Parser (handles quoted fields with commas) ──────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── Dosage form extraction from medicine name ───────────────

function extractDosageForm(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tablet")) return "Tablet";
  if (n.includes("capsule")) return "Capsule";
  if (n.includes("syrup")) return "Syrup";
  if (n.includes("injection") || n.includes("infusion")) return "Injection";
  if (n.includes("cream")) return "Cream";
  if (n.includes("ointment")) return "Ointment";
  if (n.includes("drop")) return "Drops";
  if (n.includes("inhaler") || n.includes("rotacap")) return "Inhaler";
  if (n.includes("gel")) return "Gel";
  if (n.includes("spray")) return "Spray";
  if (n.includes("suspension") || n.includes("oral suspension")) return "Suspension";
  if (n.includes("sachet") || n.includes("powder") || n.includes("dusting")) return "Powder";
  if (n.includes("solution") || n.includes("liquid") || n.includes("lotion")) return "Solution";
  if (n.includes("respules")) return "Respules";
  if (n.includes("emulsion")) return "Emulsion";
  if (n.includes("eye")) return "Drops";
  if (n.includes("nasal")) return "Spray";
  if (n.includes("ear")) return "Drops";
  if (n.includes("penfill") || n.includes("flexpen") || n.includes("cartridge")) return "Injection";
  if (n.includes("lacquer")) return "Solution";
  if (n.includes("lozenges") || n.includes("lozenge")) return "Tablet";
  if (n.includes("mdi")) return "Inhaler";
  return "Other";
}

// ─── Strength extraction from medicine name ──────────────────

function extractStrength(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|gm|g|ml|iu|%|mg\/ml|mg\/5ml|gm\/5ml|mcg\/dose))/i);
  return match ? match[1] : "";
}

// ─── GST rate parser ("5%" → 5) ──────────────────────────────

function parseGstRate(raw: string): number {
  const num = parseInt(raw.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return 5; // default for medicines
  // Clamp to valid GST rates
  const valid = [0, 5, 12, 18, 28];
  return valid.includes(num) ? num : 5;
}

// ─── Load and index the CSV ──────────────────────────────────
//
// Runs once at module load time. The CSV is ~30MB, and indexing
// takes ~2-3 seconds on first access. After that, search is O(n)
// over the pre-built index but with simple string ops (~5-10ms).

let _index: IndexedEntry[] | null = null;
let _loadError: string | null = null;

function getIndex(): IndexedEntry[] {
  if (_index) return _index;
  if (_loadError) return [];

  try {
    const csvPath = path.join(process.cwd(), "Indian_Medicine_Database_246k.csv");
    
    if (!fs.existsSync(csvPath)) {
      _loadError = `CSV file not found at ${csvPath}`;
      console.error(`[medicine-db] ${_loadError}`);
      return [];
    }

    const raw = fs.readFileSync(csvPath, "utf-8");
    const lines = raw.split(/\r?\n/);
    
    // Skip header line
    const entries: IndexedEntry[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = parseCsvLine(line);
      if (fields.length < 7) continue;

      // Fields: id, medicine_name, mrp_inr, manufacturer, type, pack_size, composition, gst_rate
      const name = fields[1] || "";
      const mrpStr = fields[2] || "0";
      const manufacturer = fields[3] || "";
      const packSize = fields[5] || "";
      const composition = fields[6] || "";
      const gstRateRaw = fields[7] || "5%";

      if (!name) continue;

      const mrp = parseFloat(mrpStr);
      const mrpPaisa = isNaN(mrp) ? 0 : Math.round(mrp * 100);
      const gstRate = parseGstRate(gstRateRaw);
      const dosageForm = extractDosageForm(name);
      const strength = extractStrength(name);
      const nameLower = name.toLowerCase();

      entries.push({
        name,
        manufacturer,
        composition,
        packSize,
        mrpPaisa,
        gstRate,
        dosageForm,
        strength,
        _search: `${nameLower} ${composition.toLowerCase()} ${manufacturer.toLowerCase()}`,
        _nameLower: nameLower,
      });
    }

    _index = entries;
    console.log(`[medicine-db] Loaded ${entries.length} medicines from CSV`);
    return entries;
  } catch (err) {
    _loadError = `Failed to load CSV: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[medicine-db] ${_loadError}`);
    return [];
  }
}

// ─── Public API: searchMedicineDatabase ──────────────────────

/**
 * Search the local 246K medicine database using multi-token matching.
 * Every token in the query must appear somewhere in the entry's
 * search text (name + composition + manufacturer).
 *
 * Results are scored:
 *   3 = name starts with full query
 *   2 = name contains full query
 *   1 = match via composition/manufacturer only
 *
 * Returns at most 25 results, sorted by score then alphabetically.
 */
export function searchMedicineDatabase(query: string): MedicineDatabaseResult[] {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized.length < 2) return [];

  const tokens = normalized.split(" ").filter((t) => t.length >= 1);
  if (tokens.length === 0) return [];

  const index = getIndex();
  const matches: { entry: IndexedEntry; score: number }[] = [];

  for (let i = 0; i < index.length; i++) {
    const entry = index[i];
    
    // All tokens must match somewhere in the search string
    let allMatch = true;
    for (let j = 0; j < tokens.length; j++) {
      if (!entry._search.includes(tokens[j])) {
        allMatch = false;
        break;
      }
    }
    if (!allMatch) continue;

    // Scoring: exact name prefix > name contains > generic/manufacturer match
    let score = 0;
    if (entry._nameLower.startsWith(normalized)) score = 3;
    else if (entry._nameLower.includes(normalized)) score = 2;
    else score = 1;

    matches.push({ entry, score });

    // Early termination: once we have enough high-quality matches, stop scanning
    if (matches.length >= 200) break;
  }

  // Sort by score (desc), then name alphabetically
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.name.localeCompare(b.entry.name);
  });

  return matches.slice(0, 25).map((m) => entryToResult(m.entry));
}

// ─── Convert indexed entry to public result ──────────────────

function entryToResult(entry: IndexedEntry): MedicineDatabaseResult {
  return {
    name: entry.name,
    genericName: entry.composition, // composition serves as genericName/salt
    manufacturer: entry.manufacturer,
    composition: entry.composition,
    dosageForm: entry.dosageForm,
    strength: entry.strength,
    packSize: entry.packSize,
    schedule: "G", // CSV doesn't provide schedule — default General
    requiresPrescription: false,
    gstRate: entry.gstRate,
    hsnCode: "30049099", // Default HSN for pharmaceutical preparations
    mrpPaisa: entry.mrpPaisa,
    source: "local",
  };
}
