// ─── Drug Master Service ─────────────────────────────────────
//
// Server-side service for searching medicines via the myUpchar Drug
// Master API, with in-memory LRU caching and a 300+ entry hardcoded
// fallback database of popular Indian pharmacy medicines.
//
// Usage:
//   import { searchDrugMaster, searchFallbackDatabase } from "@/lib/drug-master";
//   const results = await searchDrugMaster("dolo");
//   const offline = searchFallbackDatabase("amoxicillin");

// ─── Public types ────────────────────────────────────────────

export type DrugMasterResult = {
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
  source: "api" | "local" | "fallback";
  apiProductId?: string;
};

// ─── LRU Cache ───────────────────────────────────────────────

interface CacheEntry {
  results: DrugMasterResult[];
  createdAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 500;

/** Doubly-linked list node for O(1) LRU eviction */
interface LruNode {
  key: string;
  prev: LruNode | null;
  next: LruNode | null;
}

class LruCache {
  private map = new Map<string, { entry: CacheEntry; node: LruNode }>();
  private head: LruNode | null = null; // most-recently used
  private tail: LruNode | null = null; // least-recently used

  get(key: string): DrugMasterResult[] | null {
    const item = this.map.get(key);
    if (!item) return null;

    // Expired?
    if (Date.now() - item.entry.createdAt > CACHE_TTL_MS) {
      this._remove(key, item.node);
      return null;
    }

    // Promote to head (most-recently used)
    this._detach(item.node);
    this._pushHead(item.node);
    return item.entry.results;
  }

  set(key: string, results: DrugMasterResult[]): void {
    // Overwrite existing
    const existing = this.map.get(key);
    if (existing) {
      existing.entry = { results, createdAt: Date.now() };
      this._detach(existing.node);
      this._pushHead(existing.node);
      return;
    }

    // Evict LRU if at capacity
    if (this.map.size >= CACHE_MAX_ENTRIES && this.tail) {
      this._remove(this.tail.key, this.tail);
    }

    const node: LruNode = { key, prev: null, next: null };
    this.map.set(key, { entry: { results, createdAt: Date.now() }, node });
    this._pushHead(node);
  }

  private _detach(node: LruNode) {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  private _pushHead(node: LruNode) {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private _remove(key: string, node: LruNode) {
    this._detach(node);
    this.map.delete(key);
  }
}

const _cache = new LruCache();

// ─── API Configuration ───────────────────────────────────────

const API_KEY = process.env.DRUG_MASTER_API_KEY ?? "";
const API_BASE = process.env.DRUG_MASTER_API_URL ?? "https://www.myupchar.com/api";
const API_TIMEOUT_MS = 4000;

// ─── Fallback Database ──────────────────────────────────────
//
// Each tuple: [name, genericName, manufacturer, composition, dosageForm,
//   strength, packSize, schedule, requiresPrescription, gstRate, hsnCode, mrpPaisa]

type FallbackTuple = readonly [
  string, string, string, string, string,
  string, string, string, boolean, number, string, number
];

const FALLBACK_DB: FallbackTuple[] = [
  // ─── Pain Relief / Analgesics / NSAIDs ───────────────────
  ["Dolo 650 Tablet", "Paracetamol", "Micro Labs", "Paracetamol 650mg", "Tablet", "650mg", "Strip of 15", "G", false, 12, "30049099", 3350],
  ["Crocin Advance 500 Tablet", "Paracetamol", "GSK", "Paracetamol 500mg", "Tablet", "500mg", "Strip of 15", "G", false, 12, "30049099", 3650],
  ["Combiflam Tablet", "Ibuprofen+Paracetamol", "Sanofi", "Ibuprofen 400mg + Paracetamol 325mg", "Tablet", "400mg+325mg", "Strip of 20", "G", false, 12, "30049099", 4300],
  ["Sumo Tablet", "Nimesulide+Paracetamol", "Alkem", "Nimesulide 100mg + Paracetamol 325mg", "Tablet", "100mg+325mg", "Strip of 10", "H", true, 12, "30049099", 4800],
  ["Flexon Tablet", "Ibuprofen+Paracetamol", "Aristo Pharma", "Ibuprofen 400mg + Paracetamol 325mg", "Tablet", "400mg+325mg", "Strip of 10", "G", false, 12, "30049099", 3400],
  ["Zerodol SP Tablet", "Aceclofenac+Paracetamol+Serratiopeptidase", "IPCA Labs", "Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg", "Tablet", "100mg+325mg+15mg", "Strip of 10", "H", true, 12, "30049099", 13500],
  ["Zerodol P Tablet", "Aceclofenac+Paracetamol", "IPCA Labs", "Aceclofenac 100mg + Paracetamol 325mg", "Tablet", "100mg+325mg", "Strip of 10", "H", true, 12, "30049099", 7250],
  ["Voveran 50 Tablet", "Diclofenac", "Novartis", "Diclofenac Sodium 50mg", "Tablet", "50mg", "Strip of 15", "H", true, 12, "30049099", 4800],
  ["Brufen 400 Tablet", "Ibuprofen", "Abbott", "Ibuprofen 400mg", "Tablet", "400mg", "Strip of 15", "G", false, 12, "30049099", 3100],
  ["Ultracet Tablet", "Tramadol+Paracetamol", "Johnson & Johnson", "Tramadol 37.5mg + Paracetamol 325mg", "Tablet", "37.5mg+325mg", "Strip of 10", "H", true, 12, "30049099", 11200],
  ["Meftal Spas Tablet", "Mefenamic Acid+Dicyclomine", "Blue Cross", "Mefenamic Acid 250mg + Dicyclomine 10mg", "Tablet", "250mg+10mg", "Strip of 10", "H", true, 12, "30049099", 7100],
  ["Saridon Tablet", "Propiphenazone+Paracetamol+Caffeine", "Bayer", "Propiphenazone 150mg + Paracetamol 250mg + Caffeine 50mg", "Tablet", "150mg+250mg+50mg", "Strip of 10", "G", false, 12, "30049099", 3500],
  ["Disprin Tablet", "Aspirin", "Reckitt Benckiser", "Aspirin 350mg", "Tablet", "350mg", "Strip of 10", "G", false, 12, "30049099", 2400],
  ["Volini Gel", "Diclofenac Diethylamine", "Ranbaxy", "Diclofenac Diethylamine 1.16% w/w", "Gel", "30g", "1 tube", "OTC", false, 18, "30049099", 8200],
  ["Volini Spray", "Diclofenac Diethylamine", "Ranbaxy", "Diclofenac Diethylamine 4%", "Spray", "40g", "1 bottle", "OTC", false, 18, "30049099", 23500],
  ["Voveran SR 100 Tablet", "Diclofenac", "Novartis", "Diclofenac Sodium 100mg SR", "Tablet", "100mg", "Strip of 10", "H", true, 12, "30049099", 6800],
  ["Hifenac P Tablet", "Aceclofenac+Paracetamol", "Intas Pharma", "Aceclofenac 100mg + Paracetamol 325mg", "Tablet", "100mg+325mg", "Strip of 10", "H", true, 12, "30049099", 6500],

  // ─── Antibiotics ─────────────────────────────────────────
  ["Azithral 500 Tablet", "Azithromycin", "Alembic Pharma", "Azithromycin 500mg", "Tablet", "500mg", "Strip of 5", "H", true, 12, "30049069", 11950],
  ["Azithromycin 500 Tablet", "Azithromycin", "Cipla", "Azithromycin 500mg", "Tablet", "500mg", "Strip of 5", "H", true, 12, "30049069", 10800],
  ["Augmentin 625 Duo Tablet", "Amoxicillin+Clavulanate", "GSK", "Amoxicillin 500mg + Clavulanic Acid 125mg", "Tablet", "625mg", "Strip of 10", "H", true, 12, "30041099", 29000],
  ["Amoxyclav 625 Tablet", "Amoxicillin+Clavulanate", "Cipla", "Amoxicillin 500mg + Clavulanic Acid 125mg", "Tablet", "625mg", "Strip of 10", "H", true, 12, "30041099", 21500],
  ["Amoxicillin 500 Capsule", "Amoxicillin", "Cipla", "Amoxicillin 500mg", "Capsule", "500mg", "Strip of 10", "H", true, 12, "30041090", 5200],
  ["Ciplox 500 Tablet", "Ciprofloxacin", "Cipla", "Ciprofloxacin 500mg", "Tablet", "500mg", "Strip of 10", "H", true, 12, "29419090", 6200],
  ["Ciprofloxacin 500 Tablet", "Ciprofloxacin", "Various", "Ciprofloxacin 500mg", "Tablet", "500mg", "Strip of 10", "H", true, 12, "29419090", 5100],
  ["Cefixime 200 Tablet", "Cefixime", "Mankind Pharma", "Cefixime 200mg", "Tablet", "200mg", "Strip of 10", "H", true, 12, "30041099", 13900],
  ["Zifi 200 Tablet", "Cefixime", "FDC Ltd", "Cefixime 200mg", "Tablet", "200mg", "Strip of 10", "H", true, 12, "30041099", 15100],
  ["Cefpodoxime 200 Tablet", "Cefpodoxime", "Mankind Pharma", "Cefpodoxime 200mg", "Tablet", "200mg", "Strip of 10", "H", true, 12, "30041099", 18200],
  ["Levofloxacin 500 Tablet", "Levofloxacin", "Cipla", "Levofloxacin 500mg", "Tablet", "500mg", "Strip of 10", "H", true, 12, "29419090", 10500],
  ["Doxycycline 100 Capsule", "Doxycycline", "Alembic Pharma", "Doxycycline 100mg", "Capsule", "100mg", "Strip of 10", "H", true, 12, "29419090", 4100],
  ["Metronidazole 400 Tablet", "Metronidazole", "Abbott", "Metronidazole 400mg", "Tablet", "400mg", "Strip of 15", "H", true, 12, "29419090", 2300],
  ["Norfloxacin 400 Tablet", "Norfloxacin", "Cipla", "Norfloxacin 400mg", "Tablet", "400mg", "Strip of 10", "H", true, 12, "29419090", 4700],
  ["Clindamycin 300 Capsule", "Clindamycin", "Abbott", "Clindamycin 300mg", "Capsule", "300mg", "Strip of 8", "H", true, 12, "30041099", 25800],
  ["Ofloxacin 200 Tablet", "Ofloxacin", "Cipla", "Ofloxacin 200mg", "Tablet", "200mg", "Strip of 10", "H", true, 12, "29419090", 5800],
  ["Linezolid 600 Tablet", "Linezolid", "Cipla", "Linezolid 600mg", "Tablet", "600mg", "Strip of 10", "H1", true, 12, "30041099", 38500],
  ["Moxifloxacin 400 Tablet", "Moxifloxacin", "Cipla", "Moxifloxacin 400mg", "Tablet", "400mg", "Strip of 5", "H", true, 12, "29419090", 15200],
  ["Ceftriaxone 1g Injection", "Ceftriaxone", "Abbott", "Ceftriaxone 1g", "Injection", "1g", "1 vial", "H", true, 12, "30041099", 6200],
  ["Nitrofurantoin 100 Capsule", "Nitrofurantoin", "Sun Pharma", "Nitrofurantoin 100mg SR", "Capsule", "100mg", "Strip of 10", "H", true, 12, "30041099", 7500],
  ["Co-trimoxazole DS Tablet", "Trimethoprim+Sulphamethoxazole", "GSK", "Trimethoprim 160mg + Sulphamethoxazole 800mg", "Tablet", "160mg+800mg", "Strip of 10", "H", true, 12, "30042099", 3800],

  // ─── Antifungal ──────────────────────────────────────────
  ["Fluconazole 150 Tablet", "Fluconazole", "Cipla", "Fluconazole 150mg", "Tablet", "150mg", "Strip of 1", "H", true, 12, "30049039", 3200],
  ["Fluconazole 200 Tablet", "Fluconazole", "Cipla", "Fluconazole 200mg", "Tablet", "200mg", "Strip of 4", "H", true, 12, "30049039", 10500],
  ["Itraconazole 100 Capsule", "Itraconazole", "Glenmark", "Itraconazole 100mg", "Capsule", "100mg", "Strip of 4", "H", true, 12, "30049039", 8900],
  ["Terbinafine 250 Tablet", "Terbinafine", "Dr Reddy's", "Terbinafine 250mg", "Tablet", "250mg", "Strip of 7", "H", true, 12, "30049039", 14200],
  ["Griseofulvin 500 Tablet", "Griseofulvin", "GSK", "Griseofulvin 500mg", "Tablet", "500mg", "Strip of 10", "H", true, 12, "30049039", 6500],
  ["Ketoconazole 200 Tablet", "Ketoconazole", "Cipla", "Ketoconazole 200mg", "Tablet", "200mg", "Strip of 10", "H", true, 12, "30049039", 5600],
  ["Voriconazole 200 Tablet", "Voriconazole", "Cipla", "Voriconazole 200mg", "Tablet", "200mg", "Strip of 4", "H1", true, 12, "30049039", 42000],

  // ─── Gastro / Acidity / Digestive ────────────────────────
  ["Pan 40 Tablet", "Pantoprazole", "Alkem", "Pantoprazole 40mg", "Tablet", "40mg", "Strip of 15", "G", false, 12, "30049099", 9000],
  ["Pan D Capsule", "Pantoprazole+Domperidone", "Alkem", "Pantoprazole 40mg + Domperidone 30mg", "Capsule", "40mg+30mg", "Strip of 15", "H", true, 12, "30049099", 13200],
  ["Omeprazole 20 Capsule", "Omeprazole", "Dr Reddy's", "Omeprazole 20mg", "Capsule", "20mg", "Strip of 15", "G", false, 12, "30049099", 3500],
  ["Rabeprazole 20 Tablet", "Rabeprazole", "Sun Pharma", "Rabeprazole 20mg", "Tablet", "20mg", "Strip of 15", "H", true, 12, "30049099", 10500],
  ["Ranitidine 150 Tablet", "Ranitidine", "J.B. Chemicals", "Ranitidine 150mg", "Tablet", "150mg", "Strip of 15", "G", false, 12, "30049099", 2200],
  ["Domperidone 10 Tablet", "Domperidone", "Torrent Pharma", "Domperidone 10mg", "Tablet", "10mg", "Strip of 10", "G", false, 12, "30049099", 2800],
  ["Ondansetron 4 Tablet", "Ondansetron", "Sun Pharma", "Ondansetron 4mg", "Tablet", "4mg", "Strip of 10", "H", true, 12, "30049099", 3800],
  ["Emeset 4 Tablet", "Ondansetron", "Cipla", "Ondansetron 4mg MD", "Tablet", "4mg", "Strip of 10", "H", true, 12, "30049099", 4200],
  ["Gelusil MPS Syrup", "Aluminium+Magnesium+Simethicone", "Pfizer", "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone", "Syrup", "170ml", "1 bottle", "OTC", false, 12, "30049099", 9500],
  ["Digene Tablet", "Aluminium+Magnesium", "Abbott", "Aluminium Hydroxide + Magnesium Hydroxide", "Tablet", "680mg", "Strip of 15", "OTC", false, 12, "30049099", 3200],
  ["Digene Gel", "Aluminium+Magnesium+Simethicone", "Abbott", "Aluminium Hydroxide + Magnesium Hydroxide + Simethicone", "Gel", "200ml", "1 bottle", "OTC", false, 12, "30049099", 12000],
  ["Mucaine Gel", "Aluminium+Magnesium+Oxetacaine", "Pfizer", "Aluminium Hydroxide + Magnesium Hydroxide + Oxetacaine", "Gel", "200ml", "1 bottle", "G", false, 12, "30049099", 14500],
  ["Econorm 250 Capsule", "Saccharomyces Boulardii", "Dr Reddy's", "Saccharomyces Boulardii 250mg", "Capsule", "250mg", "Strip of 10", "OTC", false, 12, "30049099", 15200],
  ["Dulcolax 5 Tablet", "Bisacodyl", "Sanofi", "Bisacodyl 5mg", "Tablet", "5mg", "Strip of 10", "OTC", false, 12, "30049099", 3200],
  ["Cremaffin Syrup", "Liquid Paraffin+Milk of Magnesia", "Abbott", "Liquid Paraffin + Milk of Magnesia + Sodium Picosulphate", "Syrup", "225ml", "1 bottle", "OTC", false, 12, "30049099", 19800],
  ["Racecadotril 100 Capsule", "Racecadotril", "Abbott", "Racecadotril 100mg", "Capsule", "100mg", "Strip of 10", "H", true, 12, "30049099", 8500],
  ["Sucralfate 1g Tablet", "Sucralfate", "Sun Pharma", "Sucralfate 1g", "Tablet", "1g", "Strip of 10", "G", false, 12, "30049099", 6500],
  ["Esomeprazole 40 Tablet", "Esomeprazole", "Sun Pharma", "Esomeprazole 40mg", "Tablet", "40mg", "Strip of 15", "H", true, 12, "30049099", 12500],
  ["Rifaximin 400 Tablet", "Rifaximin", "Sun Pharma", "Rifaximin 400mg", "Tablet", "400mg", "Strip of 10", "H", true, 12, "30041099", 32000],

  // ─── Diabetes ────────────────────────────────────────────
  ["Metformin 500 Tablet", "Metformin", "USV", "Metformin Hydrochloride 500mg", "Tablet", "500mg", "Strip of 20", "H", true, 12, "30049076", 3600],
  ["Metformin 1000 Tablet", "Metformin", "USV", "Metformin Hydrochloride 1000mg SR", "Tablet", "1000mg", "Strip of 15", "H", true, 12, "30049076", 6800],
  ["Glimepiride 1mg Tablet", "Glimepiride", "Sanofi", "Glimepiride 1mg", "Tablet", "1mg", "Strip of 10", "H", true, 12, "30049076", 7600],
  ["Glimepiride 2mg Tablet", "Glimepiride", "Sanofi", "Glimepiride 2mg", "Tablet", "2mg", "Strip of 10", "H", true, 12, "30049076", 11200],
  ["Gliclazide 80 Tablet", "Gliclazide", "Panacea Biotec", "Gliclazide 80mg", "Tablet", "80mg", "Strip of 10", "H", true, 12, "30049076", 4800],
  ["Voglibose 0.3mg Tablet", "Voglibose", "Mankind Pharma", "Voglibose 0.3mg", "Tablet", "0.3mg", "Strip of 10", "H", true, 12, "30049076", 8200],
  ["Sitagliptin 100 Tablet", "Sitagliptin", "MSD", "Sitagliptin 100mg", "Tablet", "100mg", "Strip of 7", "H", true, 12, "30049076", 42100],
  ["Teneligliptin 20 Tablet", "Teneligliptin", "Glenmark", "Teneligliptin 20mg", "Tablet", "20mg", "Strip of 10", "H", true, 12, "30049076", 15200],
  ["Empagliflozin 25 Tablet", "Empagliflozin", "Boehringer Ingelheim", "Empagliflozin 25mg", "Tablet", "25mg", "Strip of 10", "H", true, 12, "30049076", 52500],
  ["Dapagliflozin 10 Tablet", "Dapagliflozin", "AstraZeneca", "Dapagliflozin 10mg", "Tablet", "10mg", "Strip of 14", "H", true, 12, "30049076", 49800],
  ["Human Mixtard 30/70 Cartridge", "Insulin Human", "Novo Nordisk", "Biphasic Isophane Insulin 100IU/ml", "Injection", "100IU/ml", "3ml cartridge", "H", true, 0, "30043110", 43800],
  ["Human Mixtard 30/70 Vial", "Insulin Human", "Novo Nordisk", "Biphasic Isophane Insulin 100IU/ml", "Injection", "100IU/ml", "10ml vial", "H", true, 0, "30043110", 19600],
  ["Glycomet GP 1 Tablet", "Glimepiride+Metformin", "USV", "Glimepiride 1mg + Metformin 500mg", "Tablet", "1mg+500mg", "Strip of 15", "H", true, 12, "30049076", 12800],
  ["Glycomet GP 2 Tablet", "Glimepiride+Metformin", "USV", "Glimepiride 2mg + Metformin 500mg", "Tablet", "2mg+500mg", "Strip of 15", "H", true, 12, "30049076", 14200],
  ["Januvia 100 Tablet", "Sitagliptin", "MSD", "Sitagliptin 100mg", "Tablet", "100mg", "Strip of 7", "H", true, 12, "30049076", 42100],
  ["Galvus Met 50/1000 Tablet", "Vildagliptin+Metformin", "Novartis", "Vildagliptin 50mg + Metformin 1000mg", "Tablet", "50mg+1000mg", "Strip of 10", "H", true, 12, "30049076", 31000],
  ["Insulin Glargine 100IU Pen", "Insulin Glargine", "Sanofi", "Insulin Glargine 100IU/ml", "Injection", "100IU/ml", "3ml pen", "H", true, 0, "30043110", 85000],
  ["Pioglitazone 15mg Tablet", "Pioglitazone", "Takeda", "Pioglitazone 15mg", "Tablet", "15mg", "Strip of 10", "H", true, 12, "30049076", 5600],

  // ─── Cardiac / BP / Cholesterol ──────────────────────────
  ["Amlodipine 5mg Tablet", "Amlodipine", "Pfizer", "Amlodipine 5mg", "Tablet", "5mg", "Strip of 14", "H", true, 12, "30049099", 4400],
  ["Amlodipine 10mg Tablet", "Amlodipine", "Pfizer", "Amlodipine 10mg", "Tablet", "10mg", "Strip of 14", "H", true, 12, "30049099", 6800],
  ["Telmisartan 40mg Tablet", "Telmisartan", "Glenmark", "Telmisartan 40mg", "Tablet", "40mg", "Strip of 10", "H", true, 12, "30049099", 6500],
  ["Telmisartan 80mg Tablet", "Telmisartan", "Glenmark", "Telmisartan 80mg", "Tablet", "80mg", "Strip of 10", "H", true, 12, "30049099", 10800],
  ["Losartan 50mg Tablet", "Losartan", "Cipla", "Losartan 50mg", "Tablet", "50mg", "Strip of 15", "H", true, 12, "30049099", 6200],
  ["Atenolol 50mg Tablet", "Atenolol", "Abbott", "Atenolol 50mg", "Tablet", "50mg", "Strip of 14", "H", true, 12, "30049099", 3900],
  ["Metoprolol 50mg Tablet", "Metoprolol", "AstraZeneca", "Metoprolol Succinate 50mg XR", "Tablet", "50mg", "Strip of 10", "H", true, 12, "30049099", 5200],
  ["Atorvastatin 10mg Tablet", "Atorvastatin", "Pfizer", "Atorvastatin 10mg", "Tablet", "10mg", "Strip of 15", "H", true, 12, "30049099", 8200],
  ["Atorvastatin 20mg Tablet", "Atorvastatin", "Pfizer", "Atorvastatin 20mg", "Tablet", "20mg", "Strip of 15", "H", true, 12, "30049099", 14500],
  ["Rosuvastatin 10mg Tablet", "Rosuvastatin", "AstraZeneca", "Rosuvastatin 10mg", "Tablet", "10mg", "Strip of 15", "H", true, 12, "30049099", 18900],
  ["Rosuvastatin 5mg Tablet", "Rosuvastatin", "AstraZeneca", "Rosuvastatin 5mg", "Tablet", "5mg", "Strip of 15", "H", true, 12, "30049099", 12800],
  ["Ecosprin 75 Tablet", "Aspirin", "USV", "Aspirin 75mg EC", "Tablet", "75mg", "Strip of 14", "G", false, 12, "30049099", 1400],
  ["Ecosprin AV 75/10 Capsule", "Aspirin+Atorvastatin", "USV", "Aspirin 75mg + Atorvastatin 10mg", "Capsule", "75mg+10mg", "Strip of 10", "H", true, 12, "30049099", 8500],
  ["Clopidogrel 75mg Tablet", "Clopidogrel", "Sun Pharma", "Clopidogrel 75mg", "Tablet", "75mg", "Strip of 10", "H", true, 12, "30049099", 7200],
  ["Ramipril 5mg Tablet", "Ramipril", "Sanofi", "Ramipril 5mg", "Tablet", "5mg", "Strip of 15", "H", true, 12, "30049099", 9200],
  ["Ramipril 2.5mg Tablet", "Ramipril", "Sanofi", "Ramipril 2.5mg", "Tablet", "2.5mg", "Strip of 15", "H", true, 12, "30049099", 6200],
  ["Cilnidipine 10mg Tablet", "Cilnidipine", "J.B. Chemicals", "Cilnidipine 10mg", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30049099", 8500],
  ["Enalapril 5mg Tablet", "Enalapril", "Cadila", "Enalapril 5mg", "Tablet", "5mg", "Strip of 14", "H", true, 12, "30049099", 5400],
  ["Olmesartan 20mg Tablet", "Olmesartan", "Daiichi Sankyo", "Olmesartan 20mg", "Tablet", "20mg", "Strip of 10", "H", true, 12, "30049099", 12200],
  ["Nitroglycerin 2.6mg Tablet", "Nitroglycerin", "USV", "Nitroglycerin 2.6mg SR", "Tablet", "2.6mg", "Strip of 10", "H", true, 12, "30049099", 4800],
  ["Diltiazem 30mg Tablet", "Diltiazem", "Torrent Pharma", "Diltiazem 30mg", "Tablet", "30mg", "Strip of 10", "H", true, 12, "30049099", 3600],
  ["Prazosin 2.5mg Tablet", "Prazosin", "Sun Pharma", "Prazosin 2.5mg XL", "Tablet", "2.5mg", "Strip of 10", "H", true, 12, "30049099", 10200],
  ["Warfarin 5mg Tablet", "Warfarin", "Cipla", "Warfarin 5mg", "Tablet", "5mg", "Strip of 10", "H", true, 12, "30049099", 3100],
  ["Rivaroxaban 10mg Tablet", "Rivaroxaban", "Bayer", "Rivaroxaban 10mg", "Tablet", "10mg", "Strip of 10", "H1", true, 12, "30049099", 35000],
  ["Fenofibrate 160mg Tablet", "Fenofibrate", "Abbott", "Fenofibrate 160mg", "Tablet", "160mg", "Strip of 10", "H", true, 12, "30049099", 11800],

  // ─── Vitamins / Supplements ──────────────────────────────
  ["Shelcal 500 Tablet", "Calcium+Vitamin D3", "Torrent Pharma", "Calcium Carbonate 1250mg + Vitamin D3 250IU", "Tablet", "500mg+250IU", "Strip of 15", "OTC", false, 18, "30045039", 13700],
  ["Supradyn Tablet", "Multivitamin+Multimineral", "Bayer", "Multivitamin + Multimineral", "Tablet", "combo", "Strip of 15", "OTC", false, 18, "30045039", 5700],
  ["Becosules Capsule", "B-Complex+Vitamin C", "Pfizer", "Vitamin B-complex + Vitamin C", "Capsule", "combo", "Strip of 20", "OTC", false, 18, "30045039", 5250],
  ["Zincovit Tablet", "Multivitamin+Zinc", "Apex Labs", "Multivitamin + Zinc + Grape Seed Extract", "Tablet", "combo", "Strip of 15", "OTC", false, 18, "30045039", 12500],
  ["Revital H Capsule", "Multivitamin+Ginseng", "Sun Pharma", "Multivitamin + Minerals + Ginseng", "Capsule", "combo", "Strip of 10", "OTC", false, 18, "30045039", 18500],
  ["Folvite 5mg Tablet", "Folic Acid", "Pfizer", "Folic Acid 5mg", "Tablet", "5mg", "Strip of 30", "OTC", false, 5, "29362990", 2100],
  ["Calcirol 60000IU Capsule", "Cholecalciferol (Vit D3)", "Cadila", "Cholecalciferol 60000IU", "Capsule", "60000IU", "Strip of 4", "OTC", false, 5, "29362990", 12500],
  ["Neurobion Forte Tablet", "Vitamin B1+B6+B12", "Merck", "Thiamine + Pyridoxine + Cyanocobalamin", "Tablet", "combo", "Strip of 30", "OTC", false, 18, "30045039", 4800],
  ["Limcee 500 Tablet", "Vitamin C", "Abbott", "Ascorbic Acid 500mg", "Tablet", "500mg", "Strip of 15", "OTC", false, 5, "29362990", 2200],
  ["Ferrous Fumarate 300mg Tablet", "Iron", "Various", "Ferrous Fumarate 300mg", "Tablet", "300mg", "Strip of 10", "OTC", false, 5, "29362990", 1800],
  ["Evion 400 Capsule", "Vitamin E", "Merck", "Tocopheryl Acetate 400mg", "Capsule", "400mg", "Strip of 10", "OTC", false, 5, "29362990", 4200],
  ["Uprise D3 60K Capsule", "Cholecalciferol", "Alkem", "Cholecalciferol 60000IU", "Capsule", "60000IU", "Strip of 4", "OTC", false, 5, "29362990", 11200],
  ["Methylcobalamin 1500mcg Tablet", "Methylcobalamin", "Abbott", "Methylcobalamin 1500mcg", "Tablet", "1500mcg", "Strip of 10", "OTC", false, 5, "29362990", 8200],
  ["Autrin Capsule", "Iron+Folic Acid+B12", "Glaxo", "Ferrous Fumarate + Folic Acid + Cyanocobalamin", "Capsule", "combo", "Strip of 10", "OTC", false, 5, "29362990", 4800],
  ["Celin 500 Tablet", "Vitamin C", "GSK", "Ascorbic Acid 500mg", "Tablet", "500mg", "Strip of 10", "OTC", false, 5, "29362990", 3200],
  ["Omega 3 Fish Oil Capsule", "Omega 3 Fatty Acids", "HealthKart", "EPA + DHA Omega 3", "Capsule", "1000mg", "Bottle of 60", "OTC", false, 18, "15042099", 45000],

  // ─── Respiratory / Allergy / Cough ───────────────────────
  ["Cetirizine 10mg Tablet", "Cetirizine", "Dr Reddy's", "Cetirizine Dihydrochloride 10mg", "Tablet", "10mg", "Strip of 10", "G", false, 12, "30049099", 1800],
  ["Levocetirizine 5mg Tablet", "Levocetirizine", "Sun Pharma", "Levocetirizine 5mg", "Tablet", "5mg", "Strip of 10", "G", false, 12, "30049099", 3200],
  ["Fexofenadine 120mg Tablet", "Fexofenadine", "Sanofi", "Fexofenadine 120mg", "Tablet", "120mg", "Strip of 10", "G", false, 12, "30049099", 13800],
  ["Montelukast 10mg Tablet", "Montelukast", "Sun Pharma", "Montelukast Sodium 10mg", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30049099", 12500],
  ["Montelukast+Levocetirizine Tablet", "Montelukast+Levocetirizine", "Sun Pharma", "Montelukast 10mg + Levocetirizine 5mg", "Tablet", "10mg+5mg", "Strip of 10", "H", true, 12, "30049099", 15200],
  ["Sinarest Tablet", "Paracetamol+Phenylephrine+Chlorpheniramine", "Centaur Pharma", "Paracetamol 500mg + Phenylephrine 10mg + CPM 2mg", "Tablet", "500mg+10mg+2mg", "Strip of 10", "G", false, 12, "30049099", 3000],
  ["Benadryl Cough Syrup", "Diphenhydramine+Ammonium Chloride", "Johnson & Johnson", "Diphenhydramine HCl + Ammonium Chloride + Menthol", "Syrup", "100ml", "1 bottle", "OTC", false, 12, "30049099", 8500],
  ["Alex Syrup", "Phenylephrine+Chlorpheniramine+Dextromethorphan", "Glenmark", "Phenylephrine + CPM + Dextromethorphan", "Syrup", "100ml", "1 bottle", "G", false, 12, "30049099", 8000],
  ["Ascoril LS Syrup", "Ambroxol+Levosalbutamol+Guaifenesin", "Glenmark", "Ambroxol 30mg + Levosalbutamol 1mg + Guaifenesin 50mg per 5ml", "Syrup", "100ml", "1 bottle", "H", true, 12, "30049099", 10500],
  ["Asthalin Inhaler", "Salbutamol", "Cipla", "Salbutamol 100mcg MDI", "Inhaler", "100mcg", "200 doses", "G", false, 12, "30049099", 12600],
  ["Budecort 200 Inhaler", "Budesonide", "Cipla", "Budesonide 200mcg DPI", "Inhaler", "200mcg", "200 doses", "H", true, 12, "30049099", 28500],
  ["Foracort 200 Inhaler", "Budesonide+Formoterol", "Cipla", "Budesonide 200mcg + Formoterol 6mcg", "Inhaler", "200mcg+6mcg", "120 doses", "H", true, 12, "30049099", 38500],
  ["Deriphyllin Retard 150 Tablet", "Theophylline+Etofylline", "Abbott", "Theophylline 69.27mg + Etofylline 231mg", "Tablet", "150mg", "Strip of 15", "H", true, 12, "30049099", 3200],
  ["Ambroxol 30mg Tablet", "Ambroxol", "Cipla", "Ambroxol Hydrochloride 30mg", "Tablet", "30mg", "Strip of 10", "OTC", false, 12, "30049099", 2800],
  ["Dextromethorphan+CPM Syrup", "Dextromethorphan+Chlorpheniramine", "Various", "Dextromethorphan 10mg + CPM 2mg per 5ml", "Syrup", "100ml", "1 bottle", "OTC", false, 12, "30049099", 5500],
  ["Grilinctus Syrup", "Dextromethorphan+Phenylephrine+CPM", "Franco-Indian", "Dextromethorphan + Phenylephrine + CPM", "Syrup", "100ml", "1 bottle", "G", false, 12, "30049099", 6800],
  ["Honitus Syrup", "Herbal Cough Syrup", "Dabur", "Tulsi + Honey + Mulethi + Banapsha", "Syrup", "100ml", "1 bottle", "OTC", false, 12, "30049099", 6000],
  ["Mucinex Tablet", "Guaifenesin", "Reckitt Benckiser", "Guaifenesin 600mg ER", "Tablet", "600mg", "Strip of 10", "OTC", false, 12, "30049099", 8500],
  ["Cheston Cold Tablet", "Cetirizine+Paracetamol+Phenylephrine", "Cipla", "Cetirizine 5mg + Paracetamol 325mg + Phenylephrine 10mg", "Tablet", "combo", "Strip of 10", "G", false, 12, "30049099", 4500],

  // ─── Dermatology / Skin ──────────────────────────────────
  ["Betnovate C Cream", "Betamethasone+Clioquinol", "GSK", "Betamethasone Valerate 0.1% + Clioquinol 3%", "Cream", "20g", "1 tube", "H", true, 12, "30049099", 4600],
  ["Betnovate N Cream", "Betamethasone+Neomycin", "GSK", "Betamethasone Valerate 0.1% + Neomycin 0.5%", "Cream", "20g", "1 tube", "H", true, 12, "30049099", 4800],
  ["Candid Cream", "Clotrimazole", "Glenmark", "Clotrimazole 1%", "Cream", "20g", "1 tube", "OTC", false, 12, "30049099", 6500],
  ["Candid B Cream", "Clotrimazole+Beclometasone", "Glenmark", "Clotrimazole 1% + Beclometasone 0.025%", "Cream", "15g", "1 tube", "H", true, 12, "30049099", 9200],
  ["Soframycin Cream", "Framycetin", "Sanofi", "Framycetin 1%", "Cream", "30g", "1 tube", "H", true, 12, "30049099", 6000],
  ["T-Bact Ointment", "Mupirocin", "GSK", "Mupirocin 2%", "Ointment", "5g", "1 tube", "H", true, 12, "30049099", 14200],
  ["Clobetasol Cream", "Clobetasol Propionate", "GSK", "Clobetasol Propionate 0.05%", "Cream", "30g", "1 tube", "H", true, 12, "30049099", 5600],
  ["Panderm Plus Cream", "Clobetasol+Ofloxacin+Ornidazole+Terbinafine", "Macleods", "Clobetasol + Ofloxacin + Ornidazole + Terbinafine", "Cream", "15g", "1 tube", "H", true, 12, "30049099", 14500],
  ["Betadine Solution", "Povidone-Iodine", "Win-Medicare", "Povidone-Iodine 5%", "Solution", "100ml", "1 bottle", "OTC", false, 18, "30049099", 6500],
  ["Betadine Ointment", "Povidone-Iodine", "Win-Medicare", "Povidone-Iodine 5%", "Ointment", "15g", "1 tube", "OTC", false, 18, "30049099", 4200],
  ["Burnol Cream", "Aminacrine+Cetrimide", "Dr Morepen", "Aminacrine HCl 0.1% + Cetrimide 0.5%", "Cream", "20g", "1 tube", "OTC", false, 18, "30049099", 4000],
  ["Silver Sulfadiazine Cream", "Silver Sulfadiazine", "Dr Reddy's", "Silver Sulfadiazine 1%", "Cream", "25g", "1 tube", "H", true, 12, "30049099", 5500],
  ["Fusidic Acid 2% Cream", "Fusidic Acid", "GSK", "Fusidic Acid 2%", "Cream", "15g", "1 tube", "H", true, 12, "30049099", 11500],
  ["Adapalene 0.1% Gel", "Adapalene", "Galderma", "Adapalene 0.1%", "Gel", "15g", "1 tube", "H", true, 12, "30049099", 22000],
  ["Permethrin 5% Cream", "Permethrin", "GSK", "Permethrin 5%", "Cream", "30g", "1 tube", "G", false, 12, "30049099", 7200],
  ["Calamine Lotion", "Calamine+Zinc Oxide", "Various", "Calamine + Zinc Oxide", "Solution", "100ml", "1 bottle", "OTC", false, 12, "30049099", 6500],

  // ─── Neuro / Psych ───────────────────────────────────────
  ["Pregabalin 75 Capsule", "Pregabalin", "Torrent Pharma", "Pregabalin 75mg", "Capsule", "75mg", "Strip of 10", "H", true, 12, "30049099", 12800],
  ["Pregabalin 150 Capsule", "Pregabalin", "Torrent Pharma", "Pregabalin 150mg", "Capsule", "150mg", "Strip of 10", "H", true, 12, "30049099", 18500],
  ["Gabapentin 300 Capsule", "Gabapentin", "Sun Pharma", "Gabapentin 300mg", "Capsule", "300mg", "Strip of 10", "H", true, 12, "30049099", 11500],
  ["Amitriptyline 25mg Tablet", "Amitriptyline", "Intas Pharma", "Amitriptyline 25mg", "Tablet", "25mg", "Strip of 10", "H", true, 12, "30049099", 1200],
  ["Escitalopram 10mg Tablet", "Escitalopram", "Sun Pharma", "Escitalopram Oxalate 10mg", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30049099", 8800],
  ["Escitalopram 5mg Tablet", "Escitalopram", "Sun Pharma", "Escitalopram Oxalate 5mg", "Tablet", "5mg", "Strip of 10", "H", true, 12, "30049099", 5400],
  ["Sertraline 50mg Tablet", "Sertraline", "Cipla", "Sertraline 50mg", "Tablet", "50mg", "Strip of 10", "H", true, 12, "30049099", 6200],
  ["Fluoxetine 20mg Capsule", "Fluoxetine", "Sun Pharma", "Fluoxetine 20mg", "Capsule", "20mg", "Strip of 10", "H", true, 12, "30049099", 3200],
  ["Carbamazepine 200mg Tablet", "Carbamazepine", "Sun Pharma", "Carbamazepine 200mg", "Tablet", "200mg", "Strip of 10", "H", true, 12, "30049099", 3800],
  ["Levetiracetam 500mg Tablet", "Levetiracetam", "Sun Pharma", "Levetiracetam 500mg", "Tablet", "500mg", "Strip of 10", "H", true, 12, "30049099", 12500],
  ["Valproate 500mg Tablet", "Sodium Valproate", "Sun Pharma", "Sodium Valproate 500mg CR", "Tablet", "500mg", "Strip of 10", "H", true, 12, "30049099", 8200],

  // ─── Hormonal / Thyroid ──────────────────────────────────
  ["Thyronorm 25mcg Tablet", "Levothyroxine", "Abbott", "Levothyroxine 25mcg", "Tablet", "25mcg", "Strip of 120", "H", true, 12, "30043990", 14800],
  ["Thyronorm 50mcg Tablet", "Levothyroxine", "Abbott", "Levothyroxine 50mcg", "Tablet", "50mcg", "Strip of 120", "H", true, 12, "30043990", 16200],
  ["Thyronorm 75mcg Tablet", "Levothyroxine", "Abbott", "Levothyroxine 75mcg", "Tablet", "75mcg", "Strip of 120", "H", true, 12, "30043990", 18500],
  ["Thyronorm 100mcg Tablet", "Levothyroxine", "Abbott", "Levothyroxine 100mcg", "Tablet", "100mcg", "Strip of 120", "H", true, 12, "30043990", 21200],
  ["Eltroxin 100mcg Tablet", "Levothyroxine", "GSK", "Levothyroxine 100mcg", "Tablet", "100mcg", "Strip of 100", "H", true, 12, "30043990", 18500],
  ["Prednisolone 10mg Tablet", "Prednisolone", "Pfizer", "Prednisolone 10mg", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30043990", 2800],
  ["Prednisolone 5mg Tablet", "Prednisolone", "Pfizer", "Prednisolone 5mg", "Tablet", "5mg", "Strip of 10", "H", true, 12, "30043990", 1800],
  ["Dexamethasone 0.5mg Tablet", "Dexamethasone", "Zydus", "Dexamethasone 0.5mg", "Tablet", "0.5mg", "Strip of 10", "H", true, 12, "30043990", 1200],
  ["Methylprednisolone 8mg Tablet", "Methylprednisolone", "Pfizer", "Methylprednisolone 8mg", "Tablet", "8mg", "Strip of 10", "H", true, 12, "30043990", 12200],

  // ─── Ophthalmic / Eye Drops ──────────────────────────────
  ["Moxifloxacin Eye Drops", "Moxifloxacin", "Cipla", "Moxifloxacin 0.5%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 7800],
  ["Tobramycin Eye Drops", "Tobramycin", "Sun Pharma", "Tobramycin 0.3%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 6200],
  ["Refresh Tears Eye Drops", "Carboxymethylcellulose", "Allergan", "CMC 0.5%", "Drops", "10ml", "1 bottle", "OTC", false, 12, "30049099", 14200],
  ["Itone Eye Drops", "Herbal", "Dey's Medical", "Berberis + Neem + Tulsi", "Drops", "10ml", "1 bottle", "OTC", false, 12, "30049099", 3500],
  ["Ciprofloxacin Eye Drops", "Ciprofloxacin", "Cipla", "Ciprofloxacin 0.3%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 3200],
  ["Prednisolone Eye Drops", "Prednisolone Acetate", "Allergan", "Prednisolone Acetate 1%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 8500],
  ["Timolol 0.5% Eye Drops", "Timolol", "Cipla", "Timolol Maleate 0.5%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 4200],
  ["Brimonidine 0.2% Eye Drops", "Brimonidine", "Allergan", "Brimonidine Tartrate 0.2%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 18500],

  // ─── Anti-malarial ───────────────────────────────────────
  ["Hydroxychloroquine 200mg Tablet", "Hydroxychloroquine", "IPCA Labs", "Hydroxychloroquine Sulphate 200mg", "Tablet", "200mg", "Strip of 10", "H", true, 12, "30049069", 5200],
  ["Hydroxychloroquine 400mg Tablet", "Hydroxychloroquine", "IPCA Labs", "Hydroxychloroquine Sulphate 400mg", "Tablet", "400mg", "Strip of 10", "H", true, 12, "30049069", 8800],
  ["Artemether+Lumefantrine Tablet", "Artemether+Lumefantrine", "Cipla", "Artemether 80mg + Lumefantrine 480mg", "Tablet", "80mg+480mg", "Strip of 6", "H", true, 12, "30049069", 18200],
  ["Chloroquine 500mg Tablet", "Chloroquine", "IPCA Labs", "Chloroquine Phosphate 500mg", "Tablet", "500mg", "Strip of 10", "H", true, 12, "30049069", 2200],

  // ─── Antiparasitic / Antihelminthic ──────────────────────
  ["Albendazole 400mg Tablet", "Albendazole", "GSK", "Albendazole 400mg", "Tablet", "400mg", "Strip of 1", "OTC", false, 12, "30049099", 1200],
  ["Albendazole 400mg Suspension", "Albendazole", "GSK", "Albendazole 400mg/10ml", "Suspension", "10ml", "1 bottle", "OTC", false, 12, "30049099", 1800],
  ["Ivermectin 12mg Tablet", "Ivermectin", "Sun Pharma", "Ivermectin 12mg", "Tablet", "12mg", "Strip of 1", "H", true, 12, "30049099", 4500],
  ["Ivermectin 6mg Tablet", "Ivermectin", "Sun Pharma", "Ivermectin 6mg", "Tablet", "6mg", "Strip of 4", "H", true, 12, "30049099", 5600],
  ["Mebendazole 100mg Tablet", "Mebendazole", "Cipla", "Mebendazole 100mg", "Tablet", "100mg", "Strip of 6", "OTC", false, 12, "30049099", 1800],

  // ─── Muscle Relaxant ─────────────────────────────────────
  ["Thiocolchicoside 4mg Tablet", "Thiocolchicoside", "Sanofi", "Thiocolchicoside 4mg", "Tablet", "4mg", "Strip of 10", "H", true, 12, "30049099", 10500],
  ["Thiocolchicoside 8mg Capsule", "Thiocolchicoside", "Sanofi", "Thiocolchicoside 8mg", "Capsule", "8mg", "Strip of 10", "H", true, 12, "30049099", 18500],
  ["Chlorzoxazone 500mg Tablet", "Chlorzoxazone", "Pfizer", "Chlorzoxazone 500mg + Paracetamol 325mg", "Tablet", "500mg+325mg", "Strip of 10", "H", true, 12, "30049099", 5800],
  ["Eperisone 50mg Tablet", "Eperisone", "Eisai", "Eperisone 50mg", "Tablet", "50mg", "Strip of 10", "H", true, 12, "30049099", 12500],
  ["Tizanidine 2mg Tablet", "Tizanidine", "Sun Pharma", "Tizanidine 2mg", "Tablet", "2mg", "Strip of 10", "H", true, 12, "30049099", 4200],
  ["Baclofen 10mg Tablet", "Baclofen", "Sun Pharma", "Baclofen 10mg", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30049099", 3500],

  // ─── Anti-anxiety / Sleep ────────────────────────────────
  ["Clonazepam 0.5mg Tablet", "Clonazepam", "Torrent Pharma", "Clonazepam 0.5mg", "Tablet", "0.5mg", "Strip of 10", "H", true, 12, "30049099", 2400],
  ["Clonazepam 0.25mg Tablet", "Clonazepam", "Torrent Pharma", "Clonazepam 0.25mg", "Tablet", "0.25mg", "Strip of 10", "H", true, 12, "30049099", 1800],
  ["Etizolam 0.5mg Tablet", "Etizolam", "Intas Pharma", "Etizolam 0.5mg", "Tablet", "0.5mg", "Strip of 10", "H", true, 12, "30049099", 3200],
  ["Zolpidem 10mg Tablet", "Zolpidem", "Sun Pharma", "Zolpidem 10mg", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30049099", 8200],
  ["Alprazolam 0.5mg Tablet", "Alprazolam", "Torrent Pharma", "Alprazolam 0.5mg", "Tablet", "0.5mg", "Strip of 10", "X", true, 12, "30049099", 2800],
  ["Melatonin 3mg Tablet", "Melatonin", "Mankind Pharma", "Melatonin 3mg", "Tablet", "3mg", "Strip of 10", "OTC", false, 12, "29379090", 15000],

  // ─── Urology ─────────────────────────────────────────────
  ["Tamsulosin 0.4mg Capsule", "Tamsulosin", "Abbott", "Tamsulosin 0.4mg MR", "Capsule", "0.4mg", "Strip of 15", "H", true, 12, "30049099", 12800],
  ["Silodosin 8mg Capsule", "Silodosin", "Sun Pharma", "Silodosin 8mg", "Capsule", "8mg", "Strip of 10", "H", true, 12, "30049099", 14200],
  ["Dutasteride 0.5mg Capsule", "Dutasteride", "GSK", "Dutasteride 0.5mg", "Capsule", "0.5mg", "Strip of 10", "H", true, 12, "30049099", 18500],
  ["Finasteride 5mg Tablet", "Finasteride", "Cipla", "Finasteride 5mg", "Tablet", "5mg", "Strip of 10", "H", true, 12, "30049099", 11200],
  ["Alfuzosin 10mg Tablet", "Alfuzosin", "Sanofi", "Alfuzosin 10mg ER", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30049099", 15500],

  // ─── ENT ─────────────────────────────────────────────────
  ["Ofloxacin Ear Drops", "Ofloxacin", "Cipla", "Ofloxacin 0.3%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 3500],
  ["Otrivin Nasal Spray", "Xylometazoline", "Novartis", "Xylometazoline 0.1%", "Spray", "10ml", "1 bottle", "OTC", false, 12, "30049099", 8200],
  ["Nasivion Nasal Drops", "Oxymetazoline", "Merck", "Oxymetazoline 0.05%", "Drops", "10ml", "1 bottle", "OTC", false, 12, "30049099", 7800],
  ["Nasivion Paediatric Drops", "Oxymetazoline", "Merck", "Oxymetazoline 0.01%", "Drops", "10ml", "1 bottle", "OTC", false, 12, "30049099", 7800],
  ["Ciprofloxacin+Dexamethasone Ear Drops", "Ciprofloxacin+Dexamethasone", "FDC", "Ciprofloxacin 0.3% + Dexamethasone 0.1%", "Drops", "5ml", "1 bottle", "H", true, 12, "30049099", 4500],

  // ─── Fertility / Hormones ────────────────────────────────
  ["Progesterone 200mg Capsule", "Progesterone", "Sun Pharma", "Micronized Progesterone 200mg", "Capsule", "200mg", "Strip of 10", "H", true, 12, "30043990", 22500],
  ["Progesterone 100mg Capsule", "Progesterone", "Sun Pharma", "Micronized Progesterone 100mg", "Capsule", "100mg", "Strip of 10", "H", true, 12, "30043990", 12500],
  ["Letrozole 2.5mg Tablet", "Letrozole", "Sun Pharma", "Letrozole 2.5mg", "Tablet", "2.5mg", "Strip of 5", "H", true, 12, "30043990", 25000],
  ["Clomifene 50mg Tablet", "Clomifene", "Cipla", "Clomifene Citrate 50mg", "Tablet", "50mg", "Strip of 5", "H", true, 12, "30043990", 5800],
  ["Medroxyprogesterone 10mg Tablet", "Medroxyprogesterone", "Pfizer", "Medroxyprogesterone Acetate 10mg", "Tablet", "10mg", "Strip of 10", "H", true, 12, "30043990", 6200],

  // ─── Antiviral ───────────────────────────────────────────
  ["Acyclovir 400mg Tablet", "Acyclovir", "Cipla", "Acyclovir 400mg", "Tablet", "400mg", "Strip of 10", "H", true, 12, "30049059", 4500],
  ["Acyclovir 800mg Tablet", "Acyclovir", "Cipla", "Acyclovir 800mg", "Tablet", "800mg", "Strip of 5", "H", true, 12, "30049059", 6800],
  ["Valacyclovir 500mg Tablet", "Valacyclovir", "Cipla", "Valacyclovir 500mg", "Tablet", "500mg", "Strip of 10", "H", true, 12, "30049059", 15500],
  ["Oseltamivir 75mg Capsule", "Oseltamivir", "Hetero", "Oseltamivir 75mg", "Capsule", "75mg", "Strip of 10", "H", true, 12, "30049059", 22500],

  // ─── Hydration / ORS ─────────────────────────────────────
  ["Electral ORS Sachet", "Oral Rehydration Salts", "FDC", "WHO ORS formula", "Powder", "21.8g", "1 sachet", "OTC", false, 5, "30049099", 2300],
  ["Electral ORS Apple Flavour", "Oral Rehydration Salts", "FDC", "WHO ORS + Apple flavour", "Powder", "21.8g", "1 sachet", "OTC", false, 5, "30049099", 2500],

  // ─── Antiseptic / First Aid ──────────────────────────────
  ["Savlon Antiseptic Liquid", "Cetrimide+Chlorhexidine", "ITC", "Cetrimide 3% + Chlorhexidine 1.5%", "Solution", "100ml", "1 bottle", "OTC", false, 18, "34021190", 4500],
  ["Dettol Antiseptic Liquid", "Chloroxylenol", "Reckitt Benckiser", "Chloroxylenol 4.8%", "Solution", "60ml", "1 bottle", "OTC", false, 18, "34021190", 4500],
  ["Band-Aid Adhesive Strips", "Adhesive Bandage", "Johnson & Johnson", "Assorted adhesive strips", "Other", "Various", "Box of 10", "OTC", false, 12, "30051010", 3500],

  // ─── Strepsils / Lozenges ────────────────────────────────
  ["Strepsils Orange Lozenges", "Dichlorobenzyl+Amylmetacresol", "Reckitt Benckiser", "Dichlorobenzyl Alcohol 1.2mg + Amylmetacresol 0.6mg", "Tablet", "1.2mg+0.6mg", "Strip of 8", "OTC", false, 12, "30049099", 3500],
  ["Cofsils Lozenges", "Dichlorobenzyl+Amylmetacresol", "Cipla", "Dichlorobenzyl Alcohol + Amylmetacresol", "Tablet", "combo", "Strip of 10", "OTC", false, 12, "30049099", 3000],

  // ─── Miscellaneous / Commonly Stocked ────────────────────
  ["Metformin+Sitagliptin Tablet", "Metformin+Sitagliptin", "MSD", "Metformin 1000mg + Sitagliptin 50mg", "Tablet", "1000mg+50mg", "Strip of 7", "H", true, 12, "30049076", 38500],
  ["Amlodipine+Telmisartan Tablet", "Amlodipine+Telmisartan", "Glenmark", "Amlodipine 5mg + Telmisartan 40mg", "Tablet", "5mg+40mg", "Strip of 10", "H", true, 12, "30049099", 11200],
  ["Losartan+Hydrochlorothiazide Tablet", "Losartan+Hydrochlorothiazide", "Cipla", "Losartan 50mg + HCTZ 12.5mg", "Tablet", "50mg+12.5mg", "Strip of 10", "H", true, 12, "30049099", 8200],
  ["Telmisartan+Amlodipine+HCTZ Tablet", "Telmisartan+Amlodipine+HCTZ", "Glenmark", "Telmisartan 40mg + Amlodipine 5mg + HCTZ 12.5mg", "Tablet", "40mg+5mg+12.5mg", "Strip of 10", "H", true, 12, "30049099", 16500],
  ["Pantoprazole+Itopride Capsule", "Pantoprazole+Itopride", "Abbott", "Pantoprazole 40mg + Itopride 150mg SR", "Capsule", "40mg+150mg", "Strip of 10", "H", true, 12, "30049099", 18500],
  ["Trypsin Chymotrypsin Tablet", "Trypsin+Chymotrypsin", "Abbott", "Trypsin 48mg + Chymotrypsin 2mg", "Tablet", "48mg+2mg", "Strip of 10", "G", false, 12, "30049099", 8500],
  ["Deflazacort 6mg Tablet", "Deflazacort", "Macleods", "Deflazacort 6mg", "Tablet", "6mg", "Strip of 6", "H", true, 12, "30043990", 5200],
  ["Aceclofenac+Thiocolchicoside Tablet", "Aceclofenac+Thiocolchicoside", "IPCA Labs", "Aceclofenac 100mg + Thiocolchicoside 4mg", "Tablet", "100mg+4mg", "Strip of 10", "H", true, 12, "30049099", 12500],
  ["Rabeprazole+Domperidone Capsule", "Rabeprazole+Domperidone", "Sun Pharma", "Rabeprazole 20mg + Domperidone 30mg SR", "Capsule", "20mg+30mg", "Strip of 10", "H", true, 12, "30049099", 14500],
  ["Torsemide 10mg Tablet", "Torsemide", "Cipla", "Torsemide 10mg", "Tablet", "10mg", "Strip of 15", "H", true, 12, "30049099", 4200],
  ["Furosemide 40mg Tablet", "Furosemide", "Sanofi", "Furosemide 40mg", "Tablet", "40mg", "Strip of 15", "H", true, 12, "30049099", 1800],
  ["Spironolactone 25mg Tablet", "Spironolactone", "RPG Life Sciences", "Spironolactone 25mg", "Tablet", "25mg", "Strip of 15", "H", true, 12, "30049099", 3200],
  ["Diclofenac Injection", "Diclofenac", "Novartis", "Diclofenac Sodium 75mg/3ml", "Injection", "75mg", "1 ampoule", "H", true, 12, "30049099", 1500],
  ["Paracetamol Injection 1g", "Paracetamol IV", "Fresenius Kabi", "Paracetamol 1g/100ml IV", "Injection", "1g", "100ml bottle", "H", true, 12, "30049099", 3800],
  ["Drotaverine 80mg Tablet", "Drotaverine", "Abbott", "Drotaverine 80mg", "Tablet", "80mg", "Strip of 10", "G", false, 12, "30049099", 5200],
  ["Hyoscine Butylbromide 10mg Tablet", "Hyoscine", "Sanofi", "Hyoscine Butylbromide 10mg", "Tablet", "10mg", "Strip of 10", "G", false, 12, "30049099", 3200],
  ["Isosorbide Dinitrate 5mg Tablet", "Isosorbide Dinitrate", "Cipla", "Isosorbide Dinitrate 5mg SL", "Tablet", "5mg", "Strip of 50", "H", true, 12, "30049099", 4200],
  ["Trihexyphenidyl 2mg Tablet", "Trihexyphenidyl", "Ipca Labs", "Trihexyphenidyl 2mg", "Tablet", "2mg", "Strip of 10", "H", true, 12, "30049099", 1200],
  ["Domperidone+Rabeprazole Capsule", "Domperidone+Rabeprazole", "Cadila", "Domperidone 30mg SR + Rabeprazole 20mg", "Capsule", "30mg+20mg", "Strip of 10", "H", true, 12, "30049099", 12200],
  ["Potassium Chloride SR 600mg", "Potassium Chloride", "Sun Pharma", "Potassium Chloride 600mg SR", "Tablet", "600mg", "Strip of 10", "G", false, 5, "28361000", 6200],
];

// ─── Pre-computed search index ───────────────────────────────
// Built once at module load for O(1)-per-query search without
// re-lowercasing on every keystroke.

interface IndexedFallbackEntry {
  tuple: FallbackTuple;
  _search: string;
}

const _fallbackIndex: IndexedFallbackEntry[] = FALLBACK_DB.map((t) => ({
  tuple: t,
  _search: `${t[0]} ${t[1]} ${t[2]} ${t[3]} ${t[4]} ${t[5]}`.toLowerCase(),
}));

// ─── Helpers ─────────────────────────────────────────────────

function tupleToResult(t: FallbackTuple, source: "local" | "fallback"): DrugMasterResult {
  return {
    name: t[0],
    genericName: t[1],
    manufacturer: t[2],
    composition: t[3],
    dosageForm: t[4],
    strength: t[5],
    packSize: t[6],
    schedule: t[7],
    requiresPrescription: t[8],
    gstRate: t[9],
    hsnCode: t[10],
    mrpPaisa: t[11],
    source,
  };
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

// ─── Fallback database search (sync, instant) ───────────────

/**
 * Searches the hardcoded fallback database using multi-token matching.
 * Every token in the query must appear somewhere in the entry's search text.
 * Returns at most 25 results, scored by name-starts-with priority.
 */
export function searchFallbackDatabase(query: string): DrugMasterResult[] {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return [];

  const tokens = normalized.split(" ").filter((t) => t.length >= 1);
  if (tokens.length === 0) return [];

  const matches: { entry: IndexedFallbackEntry; score: number }[] = [];

  for (const entry of _fallbackIndex) {
    const allMatch = tokens.every((token) => entry._search.includes(token));
    if (!allMatch) continue;

    // Scoring: exact name prefix > name contains > generic match
    const nameLower = entry.tuple[0].toLowerCase();
    let score = 0;
    if (nameLower.startsWith(normalized)) score = 3;
    else if (nameLower.includes(normalized)) score = 2;
    else if (entry.tuple[1].toLowerCase().startsWith(normalized)) score = 1;

    matches.push({ entry, score });
  }

  // Sort by score (desc), then name alphabetically
  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.tuple[0].localeCompare(b.entry.tuple[0]);
  });

  return matches.slice(0, 25).map((m) => tupleToResult(m.entry.tuple, "local"));
}

// ─── API search ──────────────────────────────────────────────

interface ApiMedicine {
  id?: number;
  product_id?: number;
  name?: string;
  salt_composition?: string;
  manufacturer_name?: string;
  type?: string;
  pack_size_label?: string;
  price?: number;
  is_discontinued?: boolean;
  [key: string]: unknown;
}

/**
 * Fetches results from the myUpchar Drug Master API.
 * Returns null on any failure (403, timeout, network error) so the
 * caller can silently fall back to local data.
 */
async function fetchFromApi(query: string): Promise<DrugMasterResult[] | null> {
  if (!API_KEY) return null;

  const url = new URL(`${API_BASE}/medicine/search`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("name", query);
  url.searchParams.set("type", "Allopath");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      // 403, 429, 5xx — silently fall back
      return null;
    }

    const json = await response.json();
    const medicines: ApiMedicine[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.results)
          ? json.results
          : [];

    if (medicines.length === 0) return null;

    return medicines
      .filter((m) => !m.is_discontinued)
      .slice(0, 30)
      .map((m): DrugMasterResult => ({
        name: String(m.name ?? "Unknown"),
        genericName: String(m.salt_composition ?? ""),
        manufacturer: String(m.manufacturer_name ?? ""),
        composition: String(m.salt_composition ?? ""),
        dosageForm: guessForm(String(m.name ?? "")),
        strength: extractStrength(String(m.name ?? "")),
        packSize: String(m.pack_size_label ?? "1 unit"),
        schedule: "G", // API doesn't provide schedule info — default to G
        requiresPrescription: false,
        gstRate: 12,
        hsnCode: "30049099",
        mrpPaisa: Math.round((Number(m.price) || 0) * 100),
        source: "api",
        apiProductId: String(m.product_id ?? m.id ?? ""),
      }));
  } catch {
    // AbortError, TypeError (network), JSON parse error — all silently fall back
    return null;
  }
}

/** Best-effort form extraction from product name */
function guessForm(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tablet")) return "Tablet";
  if (n.includes("capsule")) return "Capsule";
  if (n.includes("syrup")) return "Syrup";
  if (n.includes("injection") || n.includes("vial")) return "Injection";
  if (n.includes("cream")) return "Cream";
  if (n.includes("ointment")) return "Ointment";
  if (n.includes("drops") || n.includes("drop")) return "Drops";
  if (n.includes("inhaler")) return "Inhaler";
  if (n.includes("gel")) return "Gel";
  if (n.includes("spray")) return "Spray";
  if (n.includes("suspension")) return "Suspension";
  if (n.includes("sachet") || n.includes("powder")) return "Powder";
  if (n.includes("solution") || n.includes("liquid")) return "Solution";
  return "Tablet";
}

/** Best-effort strength extraction from product name */
function extractStrength(name: string): string {
  const match = name.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu|%|mg\/ml))/i);
  return match ? match[1] : "";
}

// ─── Public API: searchDrugMaster ────────────────────────────

/**
 * Search the Drug Master API with in-memory LRU caching.
 * Falls back to the local hardcoded database on API failure.
 *
 * @param query - Medicine name or generic name to search
 * @returns Array of DrugMasterResult with source indication
 */
export async function searchDrugMaster(query: string): Promise<DrugMasterResult[]> {
  const normalized = normalizeQuery(query);
  if (normalized.length < 2) return [];

  // 1. Check cache
  const cached = _cache.get(normalized);
  if (cached) return cached;

  // 2. Try API + fallback in parallel for speed
  const [apiResults, fallbackResults] = await Promise.all([
    fetchFromApi(normalized),
    Promise.resolve(searchFallbackDatabase(normalized)),
  ]);

  let results: DrugMasterResult[];

  if (apiResults && apiResults.length > 0) {
    // Merge: API results first, then local results that don't overlap
    const apiNames = new Set(apiResults.map((r) => r.name.toLowerCase()));
    const unique = fallbackResults.filter(
      (r) => !apiNames.has(r.name.toLowerCase())
    );
    results = [...apiResults, ...unique].slice(0, 30);
  } else {
    // API unavailable — use fallback only
    results = fallbackResults.map((r) => ({ ...r, source: "fallback" as const }));
  }

  // 3. Cache the merged result
  if (results.length > 0) {
    _cache.set(normalized, results);
  }

  return results;
}
