#!/usr/bin/env node
/**
 * build-medicine-index.js
 *
 * Pre-processes the 246K CSV into small, optimized, prefix-based JSON files.
 * This runs at build time — NOT at runtime. It eliminates cold start delays
 * and guarantees 100% search quality without scanning limits.
 *
 * Output directory: data/medicine-index/
 * Filename format: [prefix].json (e.g. data/medicine-index/do.json)
 * Tuple format: [name, mrpPaisa, manufacturer, packSize, composition, gstRate]
 */

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "..", "Indian_Medicine_Database_246k.csv");
const INDEX_DIR = path.join(__dirname, "..", "data", "medicine-index");
const OLD_INDEX_PATH = path.join(__dirname, "..", "data", "medicine-index.json");

// ─── Stop words for indexing ────────────────────────────────
const INDEX_STOP_WORDS = new Set([
  "tablet", "tablets", "capsule", "capsules", "syrup", "syrups", "injection",
  "injections", "infusion", "cream", "ointment", "drops", "inhaler", "gel",
  "spray", "suspension", "powder", "solution", "liquid", "lotion", "respules",
  "emulsion", "lozenges", "lozenge", "balm", "mg", "ml", "gm", "mcg", "forte",
  "duo", "daily", "plus", "extra", "ultra", "soft", "gelatin", "oral", "dry",
  "acid", "for", "with", "and", "of", "in"
]);

// ─── CSV line parser (handles quoted fields) ─────────────────
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(current.trim()); current = ""; }
      else current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── GST parser ──────────────────────────────────────────────
function parseGst(raw) {
  const n = parseInt((raw || "").replace(/[^0-9]/g, ""), 10);
  return [0, 5, 12, 18, 28].includes(n) ? n : 5;
}

// ─── Common Indian medicines NOT in the CSV ──────────────────
const EXTRA_MEDICINES = [
  // Pain Relief
  ["Dolo 650 Tablet", 3427, "Micro Labs Ltd", "strip of 15 tablets", "Paracetamol (650mg)", 5],
  ["Dolo 500 Tablet", 2700, "Micro Labs Ltd", "strip of 15 tablets", "Paracetamol (500mg)", 5],
  ["Saridon Tablet", 2685, "Bayer Zydus Pharma", "strip of 10 tablets", "Propiphenazone (150mg), Paracetamol (250mg), Caffeine (50mg)", 5],
  ["Disprin Tablet", 945, "Reckitt Benckiser", "strip of 10 tablets", "Aspirin (350mg)", 5],
  ["Flexon Tablet", 4752, "Aristo Pharmaceuticals Pvt Ltd", "strip of 15 tablets", "Ibuprofen (400mg), Paracetamol (325mg)", 5],
  ["Brufen 400 Tablet", 1485, "Abbott", "strip of 15 tablets", "Ibuprofen (400mg)", 5],
  ["Sumo Tablet", 6200, "Alkem Laboratories Ltd", "strip of 15 tablets", "Nimesulide (100mg), Paracetamol (325mg)", 5],
  ["Ultracet Tablet", 13000, "Johnson & Johnson", "strip of 15 tablets", "Tramadol (37.5mg), Paracetamol (325mg)", 5],

  // Vitamins / Supplements
  ["Shelcal 500 Tablet", 14200, "Torrent Pharmaceuticals Ltd", "strip of 15 tablets", "Calcium Carbonate (1250mg), Vitamin D3 (250IU)", 5],
  ["Shelcal HD Tablet", 21500, "Torrent Pharmaceuticals Ltd", "strip of 15 tablets", "Calcium Carbonate (1250mg), Vitamin D3 (1000IU)", 5],
  ["Supradyn Tablet", 3715, "Abbott", "strip of 15 tablets", "Multivitamin, Multimineral", 5],
  ["Becosules Capsule", 3245, "Pfizer Ltd", "strip of 20 capsules", "Vitamin B-Complex, Vitamin C", 5],
  ["Becosules Z Capsule", 6900, "Pfizer Ltd", "strip of 20 capsules", "Vitamin B-Complex, Vitamin C, Zinc", 5],
  ["Zincovit Tablet", 10905, "Apex Laboratories Pvt Ltd", "strip of 15 tablets", "Multivitamin, Zinc, Grape Seed Extract", 5],
  ["Revital H Capsule", 18700, "Sun Pharmaceutical Industries Ltd", "strip of 10 capsules", "Multivitamin, Ginseng", 5],
  ["Folvite 5mg Tablet", 2065, "Pfizer Ltd", "strip of 45 tablets", "Folic Acid (5mg)", 5],
  ["Calcirol 60000IU Capsule", 3800, "Cadila Healthcare", "strip of 4 capsules", "Cholecalciferol (60000IU)", 5],
  ["Neurobion Forte Tablet", 3200, "P&G Health", "strip of 30 tablets", "Vitamin B1 (10mg), Vitamin B6 (3mg), Vitamin B12 (15mcg)", 5],
  ["Limcee 500mg Tablet", 1960, "Abbott", "strip of 15 tablets", "Ascorbic Acid (500mg)", 5],
  ["Evion 400mg Capsule", 2870, "P&G Health", "strip of 10 capsules", "Tocopheryl Acetate (400mg)", 5],
  ["Ferrous Fumarate 300mg Tablet", 1500, "Generic", "strip of 10 tablets", "Ferrous Fumarate (300mg)", 5],

  // Cardiac / BP
  ["Ecosprin 75 Tablet", 815, "USV Pvt Ltd", "strip of 14 tablets", "Aspirin (75mg)", 5],
  ["Ecosprin AV 75/10 Capsule", 6530, "USV Pvt Ltd", "strip of 15 capsules", "Aspirin (75mg), Atorvastatin (10mg)", 5],
  ["Ecosprin Gold 20 Capsule", 14400, "USV Pvt Ltd", "strip of 15 capsules", "Aspirin (75mg), Atorvastatin (20mg), Clopidogrel (75mg)", 5],
  ["Amlodipine 5mg Tablet", 2700, "Cipla Ltd", "strip of 15 tablets", "Amlodipine (5mg)", 5],
  ["Amlodipine 10mg Tablet", 3500, "Cipla Ltd", "strip of 15 tablets", "Amlodipine (10mg)", 5],
  ["Telmisartan 40mg Tablet", 7200, "Glenmark Pharmaceuticals Ltd", "strip of 15 tablets", "Telmisartan (40mg)", 5],
  ["Telmisartan 80mg Tablet", 10000, "Glenmark Pharmaceuticals Ltd", "strip of 15 tablets", "Telmisartan (80mg)", 5],
  ["Losartan 50mg Tablet", 5900, "Cipla Ltd", "strip of 15 tablets", "Losartan (50mg)", 5],
  ["Atenolol 50mg Tablet", 1235, "Cipla Ltd", "strip of 14 tablets", "Atenolol (50mg)", 5],
  ["Metoprolol 50mg Tablet", 3300, "Cipla Ltd", "strip of 15 tablets", "Metoprolol Succinate (50mg)", 5],
  ["Atorvastatin 10mg Tablet", 6200, "Cipla Ltd", "strip of 15 tablets", "Atorvastatin (10mg)", 5],
  ["Atorvastatin 20mg Tablet", 9200, "Cipla Ltd", "strip of 15 tablets", "Atorvastatin (20mg)", 5],
  ["Rosuvastatin 10mg Tablet", 6400, "Sun Pharmaceutical Industries Ltd", "strip of 15 tablets", "Rosuvastatin (10mg)", 5],
  ["Clopidogrel 75mg Tablet", 6800, "Sun Pharmaceutical Industries Ltd", "strip of 15 tablets", "Clopidogrel (75mg)", 5],
  ["Enoxaparin 40mg Injection", 34200, "Sanofi India Ltd", "box of 1 injection", "Enoxaparin (40mg)", 5],

  // Diabetes
  ["Metformin 500mg Tablet", 1200, "USV Pvt Ltd", "strip of 20 tablets", "Metformin (500mg)", 5],
  ["Metformin 1000mg Tablet", 2400, "USV Pvt Ltd", "strip of 15 tablets", "Metformin (1000mg)", 5],
  ["Glimepiride 1mg Tablet", 5300, "Sanofi India Ltd", "strip of 15 tablets", "Glimepiride (1mg)", 5],
  ["Glimepiride 2mg Tablet", 9800, "Sanofi India Ltd", "strip of 15 tablets", "Glimepiride (2mg)", 5],
  ["Gliclazide 80 Tablet", 7000, "Sun Pharmaceutical Industries Ltd", "strip of 10 tablets", "Gliclazide (80mg)", 5],
  ["Voglibose 0.3mg Tablet", 10800, "Micro Labs Ltd", "strip of 10 tablets", "Voglibose (0.3mg)", 5],
  ["Teneligliptin 20mg Tablet", 10500, "Glenmark Pharmaceuticals Ltd", "strip of 15 tablets", "Teneligliptin (20mg)", 5],

  // Thyroid
  ["Thyronorm 25mcg Tablet", 11200, "Abbott", "strip of 120 tablets", "Levothyroxine Sodium (25mcg)", 5],
  ["Thyronorm 50mcg Tablet", 14700, "Abbott", "strip of 120 tablets", "Levothyroxine Sodium (50mcg)", 5],
  ["Thyronorm 75mcg Tablet", 17100, "Abbott", "strip of 120 tablets", "Levothyroxine Sodium (75mcg)", 5],
  ["Thyronorm 100mcg Tablet", 19200, "Abbott", "strip of 120 tablets", "Levothyroxine Sodium (100mcg)", 5],
  ["Eltroxin 100mcg Tablet", 18700, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 100 tablets", "Levothyroxine Sodium (100mcg)", 5],

  // Respiratory / Allergy / Cold
  ["Cetirizine 10mg Tablet", 900, "Cipla Ltd", "strip of 10 tablets", "Cetirizine (10mg)", 5],
  ["Levocetirizine 5mg Tablet", 5700, "Cipla Ltd", "strip of 15 tablets", "Levocetirizine (5mg)", 5],
  ["Fexofenadine 120mg Tablet", 10800, "Sanofi India Ltd", "strip of 10 tablets", "Fexofenadine (120mg)", 5],
  ["Montelukast 10mg Tablet", 10500, "Sun Pharmaceutical Industries Ltd", "strip of 15 tablets", "Montelukast (10mg)", 5],
  ["Sinarest Tablet", 3200, "Centaur Pharmaceuticals", "strip of 10 tablets", "Paracetamol (500mg), Phenylephrine (10mg), Chlorpheniramine Maleate (2mg)", 5],
  ["Asthalin Inhaler", 14200, "Cipla Ltd", "box of 1 inhaler", "Salbutamol (100mcg/dose)", 5],
  ["Budecort 200 Inhaler", 19800, "Sun Pharmaceutical Industries Ltd", "box of 1 inhaler", "Budesonide (200mcg/dose)", 5],
  ["Foracort 200 Inhaler", 37300, "Cipla Ltd", "box of 1 inhaler", "Budesonide (200mcg), Formoterol (6mcg)", 5],
  ["Alex Syrup", 7800, "Glenmark Pharmaceuticals Ltd", "bottle of 100 ml", "Phenylephrine (5mg), Chlorpheniramine (2mg), Dextromethorphan (10mg)", 5],
  ["Benadryl Cough Syrup", 8500, "Johnson & Johnson", "bottle of 100 ml", "Diphenhydramine (14.08mg), Ammonium Chloride (138mg)", 5],
  ["Ascoril LS Syrup", 9500, "Glenmark Pharmaceuticals Ltd", "bottle of 100 ml", "Ambroxol (30mg), Levosalbutamol (1mg), Guaifenesin (50mg)", 5],

  // Gastro / Acidity
  ["Pan D Capsule", 10300, "Alkem Laboratories Ltd", "strip of 15 capsules", "Pantoprazole (40mg), Domperidone (30mg)", 5],
  ["Domperidone 10 Tablet", 3800, "Sun Pharmaceutical Industries Ltd", "strip of 10 tablets", "Domperidone (10mg)", 5],
  ["Ondansetron 4mg Tablet", 4500, "Sun Pharmaceutical Industries Ltd", "strip of 10 tablets", "Ondansetron (4mg)", 5],
  ["Emeset 4 Tablet", 7000, "Cipla Ltd", "strip of 10 tablets", "Ondansetron (4mg)", 5],
  ["Gelusil MPS Syrup", 9700, "Pfizer Ltd", "bottle of 170 ml", "Aluminium Hydroxide, Magnesium Hydroxide, Simethicone", 5],
  ["Digene Tablet", 3000, "Abbott", "strip of 15 tablets", "Aluminium Hydroxide, Magnesium Hydroxide", 5],
  ["Racecadotril 100mg Capsule", 9000, "Torrent Pharmaceuticals Ltd", "strip of 10 capsules", "Racecadotril (100mg)", 5],
  ["Econorm 250 Capsule", 15500, "Dr. Reddy's Laboratories Ltd", "strip of 10 capsules", "Saccharomyces Boulardii (250mg)", 5],
  ["Dulcolax 5mg Tablet", 2800, "Sanofi India Ltd", "strip of 10 tablets", "Bisacodyl (5mg)", 5],
  ["Cremaffin Syrup", 13200, "Abbott", "bottle of 225 ml", "Liquid Paraffin, Milk of Magnesia, Sodium Picosulfate", 5],
  ["Electral Powder", 1825, "FDC Ltd", "box of 30 sachets", "Oral Rehydration Salt (ORS)", 5],

  // Dermatology
  ["Betnovate C Cream", 6270, "GlaxoSmithKline Pharmaceuticals Ltd", "tube of 20 gm", "Betamethasone (0.1%), Clioquinol (3%)", 5],
  ["Betnovate N Cream", 6000, "GlaxoSmithKline Pharmaceuticals Ltd", "tube of 20 gm", "Betamethasone (0.1%), Neomycin (0.5%)", 5],
  ["Candid Cream", 7500, "Glenmark Pharmaceuticals Ltd", "tube of 15 gm", "Clotrimazole (1%)", 5],
  ["Candid B Cream", 9200, "Glenmark Pharmaceuticals Ltd", "tube of 15 gm", "Clotrimazole (1%), Beclometasone (0.025%)", 5],
  ["Soframycin Cream", 6500, "Sanofi India Ltd", "tube of 30 gm", "Framycetin (1%)", 5],
  ["T-Bact Ointment", 18900, "GlaxoSmithKline Pharmaceuticals Ltd", "tube of 5 gm", "Mupirocin (2%)", 5],
  ["Clobetasol Cream", 8000, "Glenmark Pharmaceuticals Ltd", "tube of 15 gm", "Clobetasol (0.05%)", 5],
  ["Betadine Solution", 9700, "Win Medicare Pvt Ltd", "bottle of 100 ml", "Povidone-Iodine (5%)", 5],
  ["Burnol Cream", 4500, "Dr. Morepen Ltd", "tube of 20 gm", "Aminacrine HCl (0.1%), Cetrimide (0.5%)", 5],

  // Neuro
  ["Pregabalin 75mg Capsule", 17200, "Torrent Pharmaceuticals Ltd", "strip of 14 capsules", "Pregabalin (75mg)", 5],
  ["Gabapentin 300mg Capsule", 9900, "Sun Pharmaceutical Industries Ltd", "strip of 10 capsules", "Gabapentin (300mg)", 5],
  ["Amitriptyline 25mg Tablet", 1100, "Intas Pharmaceuticals Ltd", "strip of 10 tablets", "Amitriptyline (25mg)", 5],
  ["Escitalopram 10mg Tablet", 7800, "Sun Pharmaceutical Industries Ltd", "strip of 10 tablets", "Escitalopram (10mg)", 5],

  // Antibiotics commonly searched by brand
  ["Augmentin 625 Duo Tablet", 22342, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 10 tablets", "Amoxycillin (500mg), Clavulanic Acid (125mg)", 5],
  ["Amoxicillin 500mg Capsule", 5200, "Cipla Ltd", "strip of 15 capsules", "Amoxicillin (500mg)", 5],
  ["Azithral 500 Tablet", 10429, "Alembic Pharmaceuticals Ltd", "strip of 5 tablets", "Azithromycin (500mg)", 5],
  ["Ciplox 500 Tablet", 7800, "Cipla Ltd", "strip of 10 tablets", "Ciprofloxacin (500mg)", 5],
  ["Norflox 400 Tablet", 3500, "Cipla Ltd", "strip of 10 tablets", "Norfloxacin (400mg)", 5],
  ["Zifi 200 Tablet", 14500, "FDC Ltd", "strip of 10 tablets", "Cefixime (200mg)", 5],
  ["Monocef 500 Injection", 4700, "Aristo Pharmaceuticals Pvt Ltd", "box of 1 vial", "Ceftriaxone (500mg)", 5],

  // Eye/Ear
  ["Moxifloxacin Eye Drops", 8600, "Cipla Ltd", "bottle of 5 ml", "Moxifloxacin (0.5%)", 5],
  ["Tobramycin Eye Drops", 6500, "Sun Pharmaceutical Industries Ltd", "bottle of 5 ml", "Tobramycin (0.3%)", 5],
  ["Refresh Tears Eye Drops", 12500, "Allergan India Pvt Ltd", "bottle of 10 ml", "Carboxymethylcellulose (0.5%)", 5],

  // OTC, Digestion & Antacid
  ["Strepsils Lozenges", 3200, "Reckitt Benckiser", "strip of 8 lozenges", "Amylmetacresol (0.6mg), Dichlorobenzyl Alcohol (1.2mg)", 5],
  ["Vicks VapoRub", 5900, "Procter & Gamble", "jar of 50 ml", "Menthol, Camphor, Eucalyptus Oil", 5],
  ["Volini Gel", 10500, "Sun Pharmaceutical Industries Ltd", "tube of 30 gm", "Diclofenac Diethylamine (1.16%)", 5],
  ["Iodex Pain Balm", 4500, "GlaxoSmithKline Consumer Healthcare", "tube of 40 gm", "Methyl Salicylate, Menthol", 5],
  ["Moov Spray", 15500, "Reckitt Benckiser", "bottle of 80 gm", "Diclofenac Diethylamine (1.16%)", 5],
  ["Unienzyme Tablet", 7500, "Unichem Laboratories Ltd", "strip of 15 tablets", "Fungal Diastase (100mg), Papain (60mg), Activated Charcoal (75mg)", 5],
  ["Eno Powder Regular", 1000, "GlaxoSmithKline Consumer Healthcare", "sachet of 5 gm", "Svarjiksara (2.91g), Nimbukamlam (2.09g)", 5],
  ["Eno Fruit Salt Orange Sachet", 1000, "GlaxoSmithKline Consumer Healthcare", "sachet of 5 gm", "Svarjiksara (2.91g), Nimbukamlam (2.09g)", 5],
  ["Eno Fruit Salt Lemon Sachet", 1000, "GlaxoSmithKline Consumer Healthcare", "sachet of 5 gm", "Svarjiksara (2.91g), Nimbukamlam (2.09g)", 5],
  ["Pudin Hara Pearls Capsule", 3000, "Dabur India Ltd", "strip of 10 capsules", "Pudina Satva (Mentha Piperita, 0.180ml)", 5],
  ["Pudin Hara Active Liquid", 4500, "Dabur India Ltd", "bottle of 30 ml", "Pudina Satva, Pudina Oil", 5],
  ["Gasex Tablet", 14500, "Himalaya Wellness Company", "bottle of 100 tablets", "Cowrie Bhasma (64mg), Shankha Bhasma (64mg), Vidanga (22mg)", 5],

  // Common Allergy & Anti-Cold
  ["Allegra 120mg Tablet", 21000, "Sanofi India Ltd", "strip of 10 tablets", "Fexofenadine Hydrochloride (120mg)", 5],
  ["Allegra 180mg Tablet", 29500, "Sanofi India Ltd", "strip of 10 tablets", "Fexofenadine Hydrochloride (180mg)", 5],
  ["Avil 25 Tablet", 1050, "Sanofi India Ltd", "strip of 15 tablets", "Pheniramine Maleate (25mg)", 5],
  ["Avil 50 Tablet", 1800, "Sanofi India Ltd", "strip of 15 tablets", "Pheniramine Maleate (50mg)", 5],
  ["Grilinctus Syrup", 13000, "Franco-Indian Pharmaceuticals Pvt Ltd", "bottle of 100 ml", "Dextromethorphan Hydrobromide (5mg), Ammonium Chloride (60mg), Chlorpheniramine Maleate (2.5mg)", 5],
  ["Dabur Honitus Syrup", 11500, "Dabur India Ltd", "bottle of 100 ml", "Tulasi (50mg), Mulethi (50mg), Banapsha (50mg), Kantkari (50mg), Honey (1.25g)", 5],

  // Common Pain & Muscle Relaxants
  ["Combiflam Tablet", 4350, "Sanofi India Ltd", "strip of 20 tablets", "Ibuprofen (400mg), Paracetamol (325mg)", 5],
  ["Zerodol SP Tablet", 11500, "Ipca Laboratories Ltd", "strip of 10 tablets", "Aceclofenac (100mg), Paracetamol (325mg), Serratiopeptidase (15mg)", 5],
  ["Zerodol P Tablet", 6200, "Ipca Laboratories Ltd", "strip of 10 tablets", "Aceclofenac (100mg), Paracetamol (325mg)", 5],
  ["Zandu Balm", 4500, "Emami Ltd", "jar of 25 ml", "Menthol, Gaultheria Oil, Cajuput Oil", 5],
  ["Amrutanjan Strong Pain Balm", 5500, "Amrutanjan Healthcare Ltd", "jar of 30 ml", "Karpoor Powder, Mint Pudina Flowers, Gandhapura Tel", 5],

  // Common Antibiotics & De-worming
  ["Clavam 625 Tablet", 22350, "Alkem Laboratories Ltd", "strip of 10 tablets", "Amoxicillin (500mg), Clavulanic Acid (125mg)", 5],
  ["Taxim-O 200 Tablet", 14500, "Alkem Laboratories Ltd", "strip of 10 tablets", "Cefixime (200mg)", 5],
  ["Gudsaf 200 Tablet", 17500, "Mankind Pharma Ltd", "strip of 10 tablets", "Cefpodoxime Proxetil (200mg)", 5],
  ["Bandy-Plus Tablet", 4500, "Mankind Pharma Ltd", "strip of 1 tablet", "Ivermectin (6mg), Albendazole (400mg)", 5],
  ["Zentel 400mg Tablet", 1000, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 1 tablet", "Albendazole (400mg)", 5],

  // Ayurvedic, Liver & Kidney Support (Highly demanded in India)
  ["Liv.52 DS Tablet", 17000, "Himalaya Wellness Company", "bottle of 60 tablets", "Himsra (130mg), Kasani (130mg), Mandur Bhasma (66mg), Kakamachi (64mg)", 5],
  ["Liv.52 Tablet", 14500, "Himalaya Wellness Company", "bottle of 100 tablets", "Himsra (65mg), Kasani (65mg), Mandur Bhasma (33mg), Kakamachi (32mg)", 5],
  ["Liv.52 Syrup", 15000, "Himalaya Wellness Company", "bottle of 200 ml", "Himsra (68mg), Kasani (68mg), Mandur Bhasma (33mg)", 5],
  ["Cystone Tablet", 17000, "Himalaya Wellness Company", "bottle of 60 tablets", "Shilapushpa (130mg), Pasanabheda (98mg), Apamarga (32mg)", 5],
  ["Septilin Tablet", 16500, "Himalaya Wellness Company", "bottle of 60 tablets", "Guggulu (324mg), Maharasnadi Quath (130mg), Manjishtha (64mg)", 5],
  ["Speman Tablet", 18000, "Himalaya Wellness Company", "bottle of 60 tablets", "Kokilaksha, Kapikachchhu, Suvarnavang", 5],
  ["Dabur Chyawanprash", 41000, "Dabur India Ltd", "jar of 1 kg", "Amla, Ashtavarga, Pippali, Kesar, Cardamom", 5],
  ["Safi Syrup", 22000, "Hamdard Laboratories", "bottle of 500 ml", "Sana, Sheesham, Sandal, Gilo, Neem", 5],
  ["Rooh Afza Syrup", 18000, "Hamdard Laboratories", "bottle of 750 ml", "Rose, Keora, Fruits, Herbs", 5],
  ["Patanjali Aloe Vera Gel", 10000, "Patanjali Ayurved Ltd", "tube of 150 ml", "Pure Aloe Vera, Vitamin E", 5],
  ["Patanjali Dant Kanti Toothpaste", 11000, "Patanjali Ayurved Ltd", "tube of 200 gm", "Babool, Neem, Pudina, Tomar", 5],

  // Other vital supplements & injectables
  ["Shelcal XT Tablet", 38000, "Torrent Pharmaceuticals Ltd", "strip of 15 tablets", "Calcium (500mg), Vitamin D3 (2000IU), Methylcobalamin (1500mcg), L-Methylfolate (1mg)", 5],
  ["Becadexamin Capsule", 4800, "GlaxoSmithKline Pharmaceuticals Ltd", "bottle of 30 capsules", "Multivitamins and Multiminerals", 5],
  ["Caldikind Plus Capsule", 14500, "Mankind Pharma Ltd", "strip of 10 capsules", "Calcitriol (0.25mcg), Calcium Carbonate (500mg), Methylcobalamin (1500mcg), Zinc (7.5mg)", 5],
  ["Clexane 40mg Injection", 62000, "Sanofi India Ltd", "box of 1 syringe", "Enoxaparin (40mg)", 5],
  ["Clexane 60mg Injection", 89000, "Sanofi India Ltd", "box of 1 syringe", "Enoxaparin (60mg)", 5],

  // Tata 1mg & Popular Indian Additions (Allopathic / Ayurvedic / OTC / Herbal)
  ["Calpol 650 Tablet", 3090, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 15 tablets", "Paracetamol (650mg)", 5],
  ["Calpol 500 Tablet", 2040, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 15 tablets", "Paracetamol (500mg)", 5],
  ["Crocin Advance 650mg Tablet", 3000, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 15 tablets", "Paracetamol (650mg)", 5],
  ["Meftal-Spas Tablet", 5000, "Blue Cross Laboratories Ltd", "strip of 10 tablets", "Mefenamic Acid (250mg), Dicyclomine Hydrochloride (10mg)", 12],
  ["Pan 40 Tablet", 15200, "Alkem Laboratories Ltd", "strip of 15 tablets", "Pantoprazole (40mg)", 12],
  ["Pantocid 40mg Tablet", 16000, "Sun Pharmaceutical Industries Ltd", "strip of 15 tablets", "Pantoprazole (40mg)", 12],
  ["Rantac 150mg Tablet", 4500, "J.B. Chemicals & Pharmaceuticals Ltd", "strip of 30 tablets", "Ranitidine (150mg)", 12],
  ["Aciloc 150mg Tablet", 4100, "Cadila Pharmaceuticals Ltd", "strip of 30 tablets", "Ranitidine (150mg)", 12],
  ["Omez 20mg Capsule", 6200, "Dr. Reddy's Laboratories Ltd", "strip of 20 capsules", "Omeprazole (20mg)", 12],
  ["Glycomet-GP 1 Tablet", 8500, "USV Pvt Ltd", "strip of 15 tablets", "Metformin (500mg), Glimepiride (1mg)", 12],
  ["Glycomet-GP 2 Tablet", 10500, "USV Pvt Ltd", "strip of 15 tablets", "Metformin (500mg), Glimepiride (2mg)", 12],
  ["Telma 40 Tablet", 10000, "Glenmark Pharmaceuticals Ltd", "strip of 15 tablets", "Telmisartan (40mg)", 12],
  ["Telma AM Tablet", 12000, "Glenmark Pharmaceuticals Ltd", "strip of 15 tablets", "Telmisartan (40mg), Amlodipine (5mg)", 12],
  ["Solvin Cold Tablet", 6000, "Ipca Laboratories Ltd", "strip of 10 tablets", "Paracetamol (500mg), Phenylephrine Hydrochloride (5mg), Chlorpheniramine Maleate (2mg)", 12],
  ["Wikoryl Tablet", 5500, "Alembic Pharmaceuticals Ltd", "strip of 10 tablets", "Paracetamol (500mg), Phenylephrine Hydrochloride (5mg), Chlorpheniramine Maleate (2mg)", 12],
  ["Candid Dusting Powder", 14500, "Glenmark Pharmaceuticals Ltd", "pack of 120 gm", "Clotrimazole (1% w/w)", 12],
  ["Evion LC Tablet", 7500, "P&G Health", "strip of 10 tablets", "Tocopheryl Acetate (Vitamin E) (400mg), Levocarnitine (150mg)", 18],
  ["Limcee Chewable Tablet Orange", 2500, "Abbott", "strip of 15 tablets", "Vitamin C (Ascorbic Acid 500mg)", 18],
  ["Volini Spray", 18000, "Sun Pharmaceutical Industries Ltd", "bottle of 55 gm", "Diclofenac (1.16%), Menthol, Methyl Salicylate", 12],
  ["Moov Pain Relief Ointment", 11000, "Reckitt Benckiser", "tube of 25 gm", "Wintergreen oil, Pudina ke phool, Nilgiri tel, Tarpin ka tel", 12],
  ["Itaspor 100 Capsule", 15000, "Intas Pharmaceuticals Ltd", "strip of 10 capsules", "Itraconazole (100mg)", 12],
  ["Itaspor 200 Capsule", 24000, "Intas Pharmaceuticals Ltd", "strip of 10 capsules", "Itraconazole (200mg)", 12],
  ["Flagyl 400 Tablet", 2200, "Abbott", "strip of 15 tablets", "Metronidazole (400mg)", 12],
  ["Oflox OZ Tablet", 15000, "Cipla Ltd", "strip of 10 tablets", "Ofloxacin (200mg), Ornidazole (500mg)", 12],
  ["Sporidex 500mg Capsule", 23000, "Sun Pharmaceutical Industries Ltd", "strip of 10 capsules", "Cephalexin (500mg)", 12],
  ["Zantac 150mg Tablet", 4500, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 30 tablets", "Ranitidine (150mg)", 12],
  ["Atarax 25mg Tablet", 8500, "Dr. Reddy's Laboratories Ltd", "strip of 15 tablets", "Hydroxyzine Hydrochloride (25mg)", 12],
  ["Chymoral Forte Tablet", 45000, "Torrent Pharmaceuticals Ltd", "strip of 20 tablets", "Trypsin-Chymotrypsin (100000 AU)", 12],
  ["Ketorol DT Tablet", 14000, "Dr. Reddy's Laboratories Ltd", "strip of 15 tablets", "Ketorolac Tromethamine (10mg)", 12],
  ["Himalaya Ashvagandha Tablet", 18000, "Himalaya Wellness Company", "bottle of 60 tablets", "Ashvagandha Extract (250mg)", 5],
  ["Himalaya Koflet Syrup", 11500, "Himalaya Wellness Company", "bottle of 100 ml", "Honey, Tulsi, Yashtimadhu", 5],
  ["Himalaya Tentex Royal Capsule", 22000, "Himalaya Wellness Company", "strip of 10 capsules", "Kokilaksha, Vathada, Sunishannaka", 5],
  ["Patanjali Giloy Ghanvati", 10000, "Patanjali Ayurved Ltd", "bottle of 60 tablets", "Giloy (Tinospora cordifolia) extract", 5],
  ["Patanjali Ashwagandha Capsule", 6000, "Patanjali Ayurved Ltd", "bottle of 20 capsules", "Ashwagandha (Withania somnifera)", 5],
  ["Dabur Shilajit Gold Capsule", 30000, "Dabur India Ltd", "strip of 10 capsules", "Shudh Shilajit, Swarna Bhasma, Kesar, Safed Musli", 5],
  ["Zandu Pancharishta", 16000, "Emami Ltd", "bottle of 450 ml", "Ayurvedic Digestive Tonic with 35 herbs", 5],
  ["Hamdard Cinkara Syrup", 14000, "Hamdard Laboratories", "bottle of 500 ml", "Multi-vitamin Herbal Tonic", 5],
  ["Vicco Vajradanti Paste", 19000, "Vicco Laboratories", "tube of 200 gm", "Ayurvedic herbal toothpaste", 12],
  ["Vicco Turmeric Skin Cream", 16000, "Vicco Laboratories", "tube of 50 gm", "Turmeric, Sandalwood oil", 12],
  ["Kayam Churna", 11000, "Sheth Brothers", "jar of 100 gm", "Senna leaves, Black salt, Haritaki", 5],
  ["Isabgol (Telephone Brand)", 15000, "Sidhpur Sat-Isabgol Factory", "pack of 100 gm", "Psyllium husk", 5],

  // Extra popular Allopathic, Ayurvedic & Pediatric formulations
  ["Enterogermina Oral Suspension", 6000, "Sanofi India Ltd", "bottle of 5 ml", "Bacillus clausii (2 Billion Spores)", 5],
  ["Sporlac DS Tablet", 5500, "Sanofi India Ltd", "strip of 10 tablets", "Lactic Acid Bacillus (120 Million Spores)", 5],
  ["Mucaine Gel Mint", 21000, "Pfizer Ltd", "bottle of 200 ml", "Oxetacaine (10mg), Aluminium Hydroxide (291mg), Magnesium Hydroxide (98mg)", 12],
  ["Cremaffin Plus Syrup", 26000, "Abbott", "bottle of 225 ml", "Sodium Picosulfate (3.33mg), Liquid Paraffin (1.25ml), Milk of Magnesia (3.75ml)", 12],
  ["Duphalac Oral Solution", 28000, "Abbott", "bottle of 150 ml", "Lactulose (10g/15ml)", 12],
  ["Cyclopam Tablet", 5600, "Indoco Remedies Ltd", "strip of 10 tablets", "Dicyclomine Hydrochloride (20mg), Paracetamol (500mg)", 12],
  ["Colimex Oral Drops", 6000, "Wallace Pharmaceuticals Pvt Ltd", "bottle of 10 ml", "Dicyclomine Hydrochloride (10mg), Simethicone (40mg)", 12],
  ["Zerodol-MR Tablet", 12000, "Ipca Laboratories Ltd", "strip of 10 tablets", "Aceclofenac (100mg), Tizanidine (2mg)", 12],
  ["Meftal Forte Tablet", 5500, "Blue Cross Laboratories Ltd", "strip of 10 tablets", "Mefenamic Acid (500mg), Paracetamol (325mg)", 12],
  ["Dolonex DT 20mg Tablet", 19000, "Pfizer Ltd", "strip of 15 tablets", "Piroxicam (20mg)", 12],
  ["Voveran SR 100 Tablet", 10000, "Novartis India Ltd", "strip of 10 tablets", "Diclofenac Sodium (100mg)", 12],
  ["Montair LC Tablet", 33000, "Cipla Ltd", "strip of 15 tablets", "Montelukast (10mg), Levocetirizine (5mg)", 12],
  ["Telekast L Tablet", 32000, "Lupin Ltd", "strip of 15 tablets", "Montelukast (10mg), Levocetirizine (5mg)", 12],
  ["Montek LC Tablet", 32500, "Sun Pharmaceutical Industries Ltd", "strip of 15 tablets", "Montelukast (10mg), Levocetirizine (5mg)", 12],
  ["Ascoril D Plus Syrup", 13000, "Glenmark Pharmaceuticals Ltd", "bottle of 100 ml", "Phenylephrine (5mg), Chlorpheniramine (2mg), Dextromethorphan (10mg)", 12],
  ["Duolin Inhaler", 36000, "Cipla Ltd", "box of 1 inhaler (200 doses)", "Levosalbutamol (50mcg), Ipratropium Bromide (20mcg)", 12],
  ["Duolin Respules", 7000, "Cipla Ltd", "pack of 5 respules x 2.5 ml", "Levosalbutamol (1.25mg), Ipratropium Bromide (500mcg)", 12],
  ["Glyciphage SR 500mg Tablet", 3000, "Franco-Indian Pharmaceuticals Pvt Ltd", "strip of 15 tablets", "Metformin (500mg)", 12],
  ["Galvus Met 50mg/500mg Tablet", 35000, "Novartis India Ltd", "strip of 15 tablets", "Vildagliptin (50mg), Metformin (500mg)", 12],
  ["Jalra-M 50mg/500mg Tablet", 34000, "USV Pvt Ltd", "strip of 15 tablets", "Vildagliptin (50mg), Metformin (500mg)", 12],
  ["Janumet 50mg/500mg Tablet", 39000, "MSD Pharmaceuticals Pvt Ltd", "strip of 15 tablets", "Sitagliptin (50mg), Metformin (500mg)", 12],
  ["Cardace 5mg Tablet", 14000, "Sanofi India Ltd", "strip of 15 tablets", "Ramipril (5mg)", 12],
  ["Revelol AM 25 Tablet", 16000, "Sun Pharmaceutical Industries Ltd", "strip of 15 tablets", "Metoprolol Succinate (25mg), Amlodipine (5mg)", 12],
  ["Rosuvas 10 Tablet", 21000, "Sun Pharmaceutical Industries Ltd", "strip of 15 tablets", "Rosuvastatin (10mg)", 12],
  ["Uprise-D3 60K Capsule", 13000, "Alkem Laboratories Ltd", "strip of 4 capsules", "Cholecalciferol (Vitamin D3) (60000IU)", 18],
  ["Gemcal Capsule", 33000, "Alkem Laboratories Ltd", "strip of 15 capsules", "Calcium Carbonate (500mg), Calcitriol (0.25mcg), Zinc (7.5mg)", 18],
  ["Orofer XT Tablet", 17000, "Emcure Pharmaceuticals Ltd", "strip of 10 tablets", "Ferrous Ascorbate (100mg), Folic Acid (1.5mg)", 18],
  ["Dexorange Syrup", 17000, "Franco-Indian Pharmaceuticals Pvt Ltd", "bottle of 200 ml", "Ferric Ammonium Citrate (160mg), Vitamin B12 (7.5mcg), Folic Acid (0.5mg)", 18],
  ["Ceftum 500mg Tablet", 39000, "GlaxoSmithKline Pharmaceuticals Ltd", "strip of 4 tablets", "Cefuroxime Axetil (500mg)", 12],
  ["Gudcef 200mg Tablet", 17500, "Mankind Pharma Ltd", "strip of 10 tablets", "Cefpodoxime Proxetil (200mg)", 12],
  ["Terbinaforce 250mg Tablet", 10000, "Mankind Pharma Ltd", "strip of 7 tablets", "Terbinafine (250mg)", 12],
  ["Aimil Neeri Syrup", 17000, "Aimil Pharmaceuticals", "bottle of 200 ml", "Urinary tract support herbal tonic", 5],
  ["Aimil BGR-34 Tablet", 60000, "Aimil Pharmaceuticals", "bottle of 100 tablets", "Blood Glucose Regulator herbal tablet", 5],
  ["Charak M2-Tone Syrup", 16000, "Charak Pharma Pvt Ltd", "bottle of 200 ml", "Female health herbal tonic", 5],
  ["Dabur Lal Tail", 22000, "Dabur India Ltd", "bottle of 200 ml", "Baby massage herbal oil", 5],

  // Additional highly demanded family health brand names
  ["Glycomet 500mg SR Tablet", 3000, "USV Pvt Ltd", "strip of 15 tablets", "Metformin (500mg)", 12],
  ["Glycomet 1g SR Tablet", 5500, "USV Pvt Ltd", "strip of 15 tablets", "Metformin (1000mg)", 12],
  ["Vildagliptin 50mg Tablet", 12000, "Cipla Ltd", "strip of 15 tablets", "Vildagliptin (50mg)", 12],
  ["Allegra M Tablet", 22000, "Sanofi India Ltd", "strip of 10 tablets", "Montelukast (10mg), Fexofenadine Hydrochloride (120mg)", 12],
  ["Candid Gold Cream", 9500, "Glenmark Pharmaceuticals Ltd", "tube of 15 gm", "Clotrimazole (1%), Beclometasone Dipropionate (0.025%)", 12],
  ["Betnovate Cream", 3500, "GlaxoSmithKline Pharmaceuticals Ltd", "tube of 20 gm", "Betamethasone Valerate (0.12%)", 12],
  ["Lulifin 1% Cream", 16000, "Lupin Ltd", "tube of 10 gm", "Luliconazole (1%)", 12],
  ["Quadriderm RF Cream", 9000, "Fulford India Ltd", "tube of 5 gm", "Beclometasone Dipropionate (0.025%), Neomycin (0.5%), Clotrimazole (1%)", 12],
  ["Combiflam Suspension", 4000, "Sanofi India Ltd", "bottle of 60 ml", "Ibuprofen (100mg), Paracetamol (162.5mg)", 12],
  ["Calpol Pead Syrup", 4000, "GlaxoSmithKline Pharmaceuticals Ltd", "bottle of 60 ml", "Paracetamol (120mg/5ml)", 5],
  ["Shelcal 250 Tablet", 9000, "Torrent Pharmaceuticals Ltd", "strip of 15 tablets", "Calcium Carbonate (625mg), Vitamin D3 (250IU)", 18],
  ["Ciplox Eye/Ear Drops", 2000, "Cipla Ltd", "bottle of 10 ml", "Ciprofloxacin (0.3%)", 5],
  ["Otorex Ear Drops", 7000, "Solvay Pharma", "bottle of 5 ml", "Benzocaine (2.7%), Chlorobutol (5%)", 5],
  ["Unienzyme Liquid", 14000, "Unichem Laboratories Ltd", "bottle of 200 ml", "Fungal Diastase (50mg), Papain (50mg)", 12],
  ["Digene Gel Orange", 15000, "Abbott", "bottle of 200 ml", "Aluminium Hydroxide, Magnesium Hydroxide, Simethicone Antacid Gel", 12],

  // Common Indian Pediatric, Cough & Gastric medicines
  ["Signoflam Tablet", 14000, "Lupin Ltd", "strip of 10 tablets", "Aceclofenac (100mg), Paracetamol (325mg), Serratiopeptidase (15mg)", 12],
  ["Hifenac-P Tablet", 9000, "Intas Pharmaceuticals Ltd", "strip of 10 tablets", "Aceclofenac (100mg), Paracetamol (325mg)", 12],
  ["Nexpro RD 40 Capsule", 16000, "Torrent Pharmaceuticals Ltd", "strip of 15 capsules", "Esomeprazole (40mg), Domperidone (30mg)", 12],
  ["Cyclopam Syrup", 9000, "Indoco Remedies Ltd", "bottle of 60 ml", "Dicyclomine Hydrochloride (10mg), Simethicone (40mg)", 12],
  ["Enterogermina Respules", 60000, "Sanofi India Ltd", "box of 10 respules x 5 ml", "Bacillus clausii (2 Billion Spores)", 5],
  ["Maxtra Syrup", 9500, "Zuventus Healthcare Ltd", "bottle of 60 ml", "Phenylephrine Hydrochloride (5mg), Chlorpheniramine Maleate (2mg)", 12],
  ["Cozy-L Syrup", 8500, "Sun Pharmaceutical Industries Ltd", "bottle of 60 ml", "Levocetirizine (2.5mg), Phenylephrine Hydrochloride (5mg)", 12],
  ["Sualin Cough Tablet", 3000, "Hamdard Laboratories", "strip of 10 tablets", "Herbal cough remedy", 5],
  ["Himalaya Herbolax Tablet", 16000, "Himalaya Wellness Company", "bottle of 100 tablets", "Natural laxative", 5],
  ["Baidyanath Shankhpushpi Syrup", 14000, "Baidyanath", "bottle of 200 ml", "Memory booster brain tonic", 5],
];

// ─── Extract search prefixes for a medicine ──────────────────
function extractPrefixes(name, composition) {
  const prefixes = new Set();

  // 1. Brand name prefixes (first 2 chars of all significant words in brand name)
  const nameClean = name.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  const nameWords = nameClean.split(" ");
  for (const word of nameWords) {
    if (word.length >= 2 && !INDEX_STOP_WORDS.has(word) && !/^\d/.test(word)) {
      prefixes.add(word.substring(0, 2));
    } else if (word.length === 1 && !INDEX_STOP_WORDS.has(word)) {
      prefixes.add(word + "_");
    }
  }

  // 2. Composition word prefixes (first 2 chars of each ingredient word)
  if (composition) {
    // Split composition by commas or pluses to separate different active ingredients
    const ingredients = composition.toLowerCase().split(/[,+]/);
    for (const ing of ingredients) {
      // Find the first alphabetical word of the ingredient
      const ingWords = ing.trim().split(/[^a-z0-9]+/);
      for (const word of ingWords) {
        if (word.length >= 2 && !INDEX_STOP_WORDS.has(word) && !/^\d/.test(word)) {
          prefixes.add(word.substring(0, 2));
          break; // Only index by the first word of each ingredient (e.g. "paracetamol" from "paracetamol (650mg)")
        }
      }
    }
  }

  return Array.from(prefixes);
}

// ─── Main ────────────────────────────────────────────────────
function main() {
  console.log("[build-medicine-index] Starting index partition...");

  // 1. Delete old single index file if exists
  if (fs.existsSync(OLD_INDEX_PATH)) {
    fs.unlinkSync(OLD_INDEX_PATH);
    console.log(`[build-medicine-index] Deleted legacy index at ${OLD_INDEX_PATH}`);
  }

  // 2. Re-create output folder
  if (fs.existsSync(INDEX_DIR)) {
    fs.rmSync(INDEX_DIR, { recursive: true, force: true });
    console.log(`[build-medicine-index] Cleared index directory at ${INDEX_DIR}`);
  }
  fs.mkdirSync(INDEX_DIR, { recursive: true });

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[build-medicine-index] CSV not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split(/\r?\n/);
  console.log(`[build-medicine-index] CSV has ${lines.length} lines`);

  // Deduplicate by name
  const seen = new Set();
  const rawEntries = [];

  // Process CSV lines
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCsvLine(line);
    if (fields.length < 7) continue;

    const name = (fields[1] || "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const mrp = parseFloat(fields[2] || "0");
    const mrpPaisa = isNaN(mrp) ? 0 : Math.round(mrp * 100);
    const manufacturer = (fields[3] || "").trim();
    const packSize = (fields[5] || "").trim();
    const composition = (fields[6] || "").trim();
    const gstRate = parseGst(fields[7]);

    rawEntries.push([name, mrpPaisa, manufacturer, packSize, composition, gstRate]);
  }

  console.log(`[build-medicine-index] CSV entries after deduplication: ${rawEntries.length}`);

  // Add extra common medicines (only if not already present)
  let extraAdded = 0;
  for (const extra of EXTRA_MEDICINES) {
    const key = extra[0].toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      rawEntries.push(extra);
      extraAdded++;
    }
  }
  console.log(`[build-medicine-index] Added ${extraAdded} missing common/regular medicines`);
  console.log(`[build-medicine-index] Total unified entries to partition: ${rawEntries.length}`);

  // 3. Partition by prefix
  const partitions = new Map();

  for (const entry of rawEntries) {
    const [name, , , , composition] = entry;
    const prefixes = extractPrefixes(name, composition);

    for (const prefix of prefixes) {
      if (!prefix) continue;
      let list = partitions.get(prefix);
      if (!list) {
        list = [];
        partitions.set(prefix, list);
      }
      list.push(entry);
    }
  }

  console.log(`[build-medicine-index] Partitioned into ${partitions.size} unique 2-character prefixes`);

  // 4. Write each partition to its own JSON file
  let totalFiles = 0;
  let totalBytes = 0;

  for (const [prefix, list] of partitions.entries()) {
    // Sort alphabetically by medicine name for predictability
    list.sort((a, b) => a[0].localeCompare(b[0]));

    const filePath = path.join(INDEX_DIR, `${prefix}.json`);
    const content = JSON.stringify(list);
    fs.writeFileSync(filePath, content);

    totalFiles++;
    totalBytes += content.length;
  }

  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  console.log(`[build-medicine-index] Successfully wrote ${totalFiles} prefix files (${totalMB} MB total uncompressed)`);
  console.log("[build-medicine-index] Done!");
}

main();
