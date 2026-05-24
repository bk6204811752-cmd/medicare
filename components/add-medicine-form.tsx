"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Database, Loader2, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { DrugMasterSuggestion } from "@/components/drug-master-confirm-modal";

type AddMedicineFormProps = {
  onSuccess?: (result: { medicine: any; inventory: any }) => void;
  onCancel?: () => void;
  prefillBarcode?: string;
  prefillName?: string;
  mode?: "standalone" | "inline";
  showInventoryFields?: boolean;
};

const GST_OPTIONS = [0, 5, 12, 18] as const;
const SCHEDULE_OPTIONS = ["OTC", "G", "H", "H1", "X"] as const;
const DOSAGE_FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Ointment", "Drops", "Powder", "Inhaler", "Gel", "Spray", "Suspension", "Solution", "Sachet", "Other"];
const CATEGORIES = ["Pain relief", "Antibiotic", "Antifungal", "Antiviral", "Diabetes", "Cardiac", "Vitamin", "Hydration", "Respiratory", "Dermatology", "Gastro", "Neuro", "Ophthalmic", "Hormonal", "Other"];

// Common medicines for quick suggestions when the user starts typing
// 100+ popular Indian pharmacy medicines across all categories
const COMMON_MEDICINES: { name: string; generic: string; strength: string; form: string; category: string }[] = [
  // ─── Pain Relief / Analgesics / NSAIDs ───
  { name: "Dolo 650 Tablet", generic: "Paracetamol", strength: "650mg", form: "Tablet", category: "Pain relief" },
  { name: "Crocin Advance Tablet", generic: "Paracetamol", strength: "500mg", form: "Tablet", category: "Pain relief" },
  { name: "Combiflam Tablet", generic: "Ibuprofen+Paracetamol", strength: "400mg+325mg", form: "Tablet", category: "Pain relief" },
  { name: "Sumo Tablet", generic: "Nimesulide+Paracetamol", strength: "100mg+325mg", form: "Tablet", category: "Pain relief" },
  { name: "Flexon Tablet", generic: "Ibuprofen+Paracetamol", strength: "400mg+325mg", form: "Tablet", category: "Pain relief" },
  { name: "Zerodol SP Tablet", generic: "Aceclofenac+Paracetamol+Serratiopeptidase", strength: "100mg+325mg+15mg", form: "Tablet", category: "Pain relief" },
  { name: "Zerodol P Tablet", generic: "Aceclofenac+Paracetamol", strength: "100mg+325mg", form: "Tablet", category: "Pain relief" },
  { name: "Voveran 50 Tablet", generic: "Diclofenac", strength: "50mg", form: "Tablet", category: "Pain relief" },
  { name: "Volini Gel", generic: "Diclofenac Diethylamine", strength: "1%", form: "Gel", category: "Pain relief" },
  { name: "Brufen 400 Tablet", generic: "Ibuprofen", strength: "400mg", form: "Tablet", category: "Pain relief" },
  { name: "Ultracet Tablet", generic: "Tramadol+Paracetamol", strength: "37.5mg+325mg", form: "Tablet", category: "Pain relief" },
  { name: "Meftal Spas Tablet", generic: "Mefenamic Acid+Dicyclomine", strength: "250mg+10mg", form: "Tablet", category: "Pain relief" },
  { name: "Saridon Tablet", generic: "Propiphenazone+Paracetamol+Caffeine", strength: "150mg+250mg+50mg", form: "Tablet", category: "Pain relief" },
  { name: "Disprin Tablet", generic: "Aspirin", strength: "350mg", form: "Tablet", category: "Pain relief" },

  // ─── Antibiotics ───
  { name: "Azithromycin 500 Tablet", generic: "Azithromycin", strength: "500mg", form: "Tablet", category: "Antibiotic" },
  { name: "Azithral 500 Tablet", generic: "Azithromycin", strength: "500mg", form: "Tablet", category: "Antibiotic" },
  { name: "Amoxyclav 625 Tablet", generic: "Amoxicillin+Clavulanate", strength: "625mg", form: "Tablet", category: "Antibiotic" },
  { name: "Augmentin 625 Duo Tablet", generic: "Amoxicillin+Clavulanate", strength: "625mg", form: "Tablet", category: "Antibiotic" },
  { name: "Amoxicillin 500 Capsule", generic: "Amoxicillin", strength: "500mg", form: "Capsule", category: "Antibiotic" },
  { name: "Ciprofloxacin 500 Tablet", generic: "Ciprofloxacin", strength: "500mg", form: "Tablet", category: "Antibiotic" },
  { name: "Ciplox 500 Tablet", generic: "Ciprofloxacin", strength: "500mg", form: "Tablet", category: "Antibiotic" },
  { name: "Ofloxacin 200 Tablet", generic: "Ofloxacin", strength: "200mg", form: "Tablet", category: "Antibiotic" },
  { name: "Levofloxacin 500 Tablet", generic: "Levofloxacin", strength: "500mg", form: "Tablet", category: "Antibiotic" },
  { name: "Cefixime 200 Tablet", generic: "Cefixime", strength: "200mg", form: "Tablet", category: "Antibiotic" },
  { name: "Zifi 200 Tablet", generic: "Cefixime", strength: "200mg", form: "Tablet", category: "Antibiotic" },
  { name: "Cefpodoxime 200 Tablet", generic: "Cefpodoxime", strength: "200mg", form: "Tablet", category: "Antibiotic" },
  { name: "Doxycycline 100 Capsule", generic: "Doxycycline", strength: "100mg", form: "Capsule", category: "Antibiotic" },
  { name: "Metronidazole 400 Tablet", generic: "Metronidazole", strength: "400mg", form: "Tablet", category: "Antibiotic" },
  { name: "Norfloxacin 400 Tablet", generic: "Norfloxacin", strength: "400mg", form: "Tablet", category: "Antibiotic" },
  { name: "Clindamycin 300 Capsule", generic: "Clindamycin", strength: "300mg", form: "Capsule", category: "Antibiotic" },
  { name: "Fluconazole 150 Tablet", generic: "Fluconazole", strength: "150mg", form: "Tablet", category: "Antifungal" },
  { name: "Itraconazole 100 Capsule", generic: "Itraconazole", strength: "100mg", form: "Capsule", category: "Antifungal" },

  // ─── Gastro / Acidity / Digestive ───
  { name: "Pan 40 Tablet", generic: "Pantoprazole", strength: "40mg", form: "Tablet", category: "Gastro" },
  { name: "Pan D Capsule", generic: "Pantoprazole+Domperidone", strength: "40mg+30mg", form: "Capsule", category: "Gastro" },
  { name: "Omeprazole 20 Capsule", generic: "Omeprazole", strength: "20mg", form: "Capsule", category: "Gastro" },
  { name: "Rabeprazole 20 Tablet", generic: "Rabeprazole", strength: "20mg", form: "Tablet", category: "Gastro" },
  { name: "Ranitidine 150 Tablet", generic: "Ranitidine", strength: "150mg", form: "Tablet", category: "Gastro" },
  { name: "Domperidone 10 Tablet", generic: "Domperidone", strength: "10mg", form: "Tablet", category: "Gastro" },
  { name: "Ondansetron 4 Tablet", generic: "Ondansetron", strength: "4mg", form: "Tablet", category: "Gastro" },
  { name: "Emeset 4 Tablet", generic: "Ondansetron", strength: "4mg", form: "Tablet", category: "Gastro" },
  { name: "Gelusil MPS Syrup", generic: "Aluminium+Magnesium+Simethicone", strength: "5ml", form: "Syrup", category: "Gastro" },
  { name: "Digene Tablet", generic: "Aluminium+Magnesium", strength: "400mg", form: "Tablet", category: "Gastro" },
  { name: "Mucaine Gel", generic: "Aluminium+Magnesium+Oxetacaine", strength: "10ml", form: "Gel", category: "Gastro" },
  { name: "Racecadotril 100 Capsule", generic: "Racecadotril", strength: "100mg", form: "Capsule", category: "Gastro" },
  { name: "ORS Sachet", generic: "Oral Rehydration Salt", strength: "21.8g", form: "Sachet", category: "Hydration" },
  { name: "Econorm 250 Capsule", generic: "Saccharomyces Boulardii", strength: "250mg", form: "Capsule", category: "Gastro" },

  // ─── Diabetes ───
  { name: "Metformin 500 Tablet", generic: "Metformin", strength: "500mg", form: "Tablet", category: "Diabetes" },
  { name: "Metformin 1000 Tablet", generic: "Metformin", strength: "1000mg", form: "Tablet", category: "Diabetes" },
  { name: "Glimepiride 1mg Tablet", generic: "Glimepiride", strength: "1mg", form: "Tablet", category: "Diabetes" },
  { name: "Glimepiride 2mg Tablet", generic: "Glimepiride", strength: "2mg", form: "Tablet", category: "Diabetes" },
  { name: "Gliclazide 80 Tablet", generic: "Gliclazide", strength: "80mg", form: "Tablet", category: "Diabetes" },
  { name: "Voglibose 0.3mg Tablet", generic: "Voglibose", strength: "0.3mg", form: "Tablet", category: "Diabetes" },
  { name: "Sitagliptin 100 Tablet", generic: "Sitagliptin", strength: "100mg", form: "Tablet", category: "Diabetes" },
  { name: "Teneligliptin 20 Tablet", generic: "Teneligliptin", strength: "20mg", form: "Tablet", category: "Diabetes" },
  { name: "Empagliflozin 25 Tablet", generic: "Empagliflozin", strength: "25mg", form: "Tablet", category: "Diabetes" },
  { name: "Human Mixtard 30/70 Injection", generic: "Insulin Human", strength: "100IU/ml", form: "Injection", category: "Diabetes" },

  // ─── Cardiac / BP / Cholesterol ───
  { name: "Amlodipine 5mg Tablet", generic: "Amlodipine", strength: "5mg", form: "Tablet", category: "Cardiac" },
  { name: "Amlodipine 10mg Tablet", generic: "Amlodipine", strength: "10mg", form: "Tablet", category: "Cardiac" },
  { name: "Telmisartan 40mg Tablet", generic: "Telmisartan", strength: "40mg", form: "Tablet", category: "Cardiac" },
  { name: "Telmisartan 80mg Tablet", generic: "Telmisartan", strength: "80mg", form: "Tablet", category: "Cardiac" },
  { name: "Losartan 50mg Tablet", generic: "Losartan", strength: "50mg", form: "Tablet", category: "Cardiac" },
  { name: "Atenolol 50mg Tablet", generic: "Atenolol", strength: "50mg", form: "Tablet", category: "Cardiac" },
  { name: "Metoprolol 50mg Tablet", generic: "Metoprolol", strength: "50mg", form: "Tablet", category: "Cardiac" },
  { name: "Atorvastatin 10mg Tablet", generic: "Atorvastatin", strength: "10mg", form: "Tablet", category: "Cardiac" },
  { name: "Atorvastatin 20mg Tablet", generic: "Atorvastatin", strength: "20mg", form: "Tablet", category: "Cardiac" },
  { name: "Rosuvastatin 10mg Tablet", generic: "Rosuvastatin", strength: "10mg", form: "Tablet", category: "Cardiac" },
  { name: "Ecosprin 75 Tablet", generic: "Aspirin", strength: "75mg", form: "Tablet", category: "Cardiac" },
  { name: "Clopidogrel 75mg Tablet", generic: "Clopidogrel", strength: "75mg", form: "Tablet", category: "Cardiac" },
  { name: "Enoxaparin 40mg Injection", generic: "Enoxaparin", strength: "40mg", form: "Injection", category: "Cardiac" },

  // ─── Vitamins / Supplements ───
  { name: "Shelcal 500 Tablet", generic: "Calcium+Vitamin D3", strength: "500mg+250IU", form: "Tablet", category: "Vitamin" },
  { name: "Supradyn Tablet", generic: "Multivitamin+Multimineral", strength: "combo", form: "Tablet", category: "Vitamin" },
  { name: "Becosules Capsule", generic: "B-Complex+Vitamin C", strength: "combo", form: "Capsule", category: "Vitamin" },
  { name: "Zincovit Tablet", generic: "Multivitamin+Zinc", strength: "combo", form: "Tablet", category: "Vitamin" },
  { name: "Revital H Capsule", generic: "Multivitamin+Ginseng", strength: "combo", form: "Capsule", category: "Vitamin" },
  { name: "Folvite 5mg Tablet", generic: "Folic Acid", strength: "5mg", form: "Tablet", category: "Vitamin" },
  { name: "Ferrous Fumarate 300mg Tablet", generic: "Iron", strength: "300mg", form: "Tablet", category: "Vitamin" },
  { name: "Calcirol 60000IU Capsule", generic: "Cholecalciferol (Vit D3)", strength: "60000IU", form: "Capsule", category: "Vitamin" },
  { name: "Neurobion Forte Tablet", generic: "Vitamin B1+B6+B12", strength: "combo", form: "Tablet", category: "Vitamin" },
  { name: "Limcee 500 Tablet", generic: "Vitamin C", strength: "500mg", form: "Tablet", category: "Vitamin" },

  // ─── Respiratory / Cough / Cold / Allergy ───
  { name: "Cetirizine 10mg Tablet", generic: "Cetirizine", strength: "10mg", form: "Tablet", category: "Respiratory" },
  { name: "Levocetirizine 5mg Tablet", generic: "Levocetirizine", strength: "5mg", form: "Tablet", category: "Respiratory" },
  { name: "Fexofenadine 120mg Tablet", generic: "Fexofenadine", strength: "120mg", form: "Tablet", category: "Respiratory" },
  { name: "Montelukast 10mg Tablet", generic: "Montelukast", strength: "10mg", form: "Tablet", category: "Respiratory" },
  { name: "Sinarest Tablet", generic: "Paracetamol+Phenylephrine+Chlorpheniramine", strength: "500mg+10mg+2mg", form: "Tablet", category: "Respiratory" },
  { name: "Benadryl Cough Syrup", generic: "Diphenhydramine+Ammonium Chloride", strength: "100ml", form: "Syrup", category: "Respiratory" },
  { name: "Alex Syrup", generic: "Phenylephrine+Chlorpheniramine+Dextromethorphan", strength: "100ml", form: "Syrup", category: "Respiratory" },
  { name: "Ascoril LS Syrup", generic: "Ambroxol+Levosalbutamol+Guaifenesin", strength: "100ml", form: "Syrup", category: "Respiratory" },
  { name: "Asthalin Inhaler", generic: "Salbutamol", strength: "100mcg", form: "Inhaler", category: "Respiratory" },
  { name: "Budecort 200 Inhaler", generic: "Budesonide", strength: "200mcg", form: "Inhaler", category: "Respiratory" },
  { name: "Foracort 200 Inhaler", generic: "Budesonide+Formoterol", strength: "200mcg+6mcg", form: "Inhaler", category: "Respiratory" },

  // ─── Dermatology / Skin ───
  { name: "Betnovate C Cream", generic: "Betamethasone+Clioquinol", strength: "20g", form: "Cream", category: "Dermatology" },
  { name: "Betnovate N Cream", generic: "Betamethasone+Neomycin", strength: "20g", form: "Cream", category: "Dermatology" },
  { name: "Candid Cream", generic: "Clotrimazole", strength: "1%", form: "Cream", category: "Dermatology" },
  { name: "Candid B Cream", generic: "Clotrimazole+Beclometasone", strength: "15g", form: "Cream", category: "Dermatology" },
  { name: "Soframycin Cream", generic: "Framycetin", strength: "1%", form: "Cream", category: "Dermatology" },
  { name: "T-Bact Ointment", generic: "Mupirocin", strength: "2%", form: "Ointment", category: "Dermatology" },
  { name: "Clobetasol Cream", generic: "Clobetasol", strength: "0.05%", form: "Cream", category: "Dermatology" },
  { name: "Panderm Plus Cream", generic: "Clobetasol+Ofloxacin+Ornidazole+Terbinafine", strength: "15g", form: "Cream", category: "Dermatology" },

  // ─── Neuro / Psych ───
  { name: "Pregabalin 75 Capsule", generic: "Pregabalin", strength: "75mg", form: "Capsule", category: "Neuro" },
  { name: "Gabapentin 300 Capsule", generic: "Gabapentin", strength: "300mg", form: "Capsule", category: "Neuro" },
  { name: "Amitriptyline 25mg Tablet", generic: "Amitriptyline", strength: "25mg", form: "Tablet", category: "Neuro" },
  { name: "Escitalopram 10mg Tablet", generic: "Escitalopram", strength: "10mg", form: "Tablet", category: "Neuro" },
  { name: "Alprazolam 0.5mg Tablet", generic: "Alprazolam", strength: "0.5mg", form: "Tablet", category: "Neuro" },

  // ─── Hormonal / Thyroid ───
  { name: "Thyronorm 25mcg Tablet", generic: "Levothyroxine", strength: "25mcg", form: "Tablet", category: "Hormonal" },
  { name: "Thyronorm 50mcg Tablet", generic: "Levothyroxine", strength: "50mcg", form: "Tablet", category: "Hormonal" },
  { name: "Eltroxin 100mcg Tablet", generic: "Levothyroxine", strength: "100mcg", form: "Tablet", category: "Hormonal" },
  { name: "Prednisolone 10mg Tablet", generic: "Prednisolone", strength: "10mg", form: "Tablet", category: "Hormonal" },
  { name: "Dexamethasone 0.5mg Tablet", generic: "Dexamethasone", strength: "0.5mg", form: "Tablet", category: "Hormonal" },

  // ─── Ophthalmic / Eye Drops ───
  { name: "Moxifloxacin Eye Drops", generic: "Moxifloxacin", strength: "0.5%", form: "Drops", category: "Ophthalmic" },
  { name: "Tobramycin Eye Drops", generic: "Tobramycin", strength: "0.3%", form: "Drops", category: "Ophthalmic" },
  { name: "Refresh Tears Eye Drops", generic: "Carboxymethylcellulose", strength: "0.5%", form: "Drops", category: "Ophthalmic" },
  { name: "Itone Eye Drops", generic: "Herbal", strength: "10ml", form: "Drops", category: "Ophthalmic" },

  // ─── General OTC / Miscellaneous ───
  { name: "Electral Powder Sachet", generic: "ORS + Electrolytes", strength: "21.8g", form: "Sachet", category: "Hydration" },
  { name: "Betadine Solution", generic: "Povidone-Iodine", strength: "5%", form: "Solution", category: "Dermatology" },
  { name: "Burnol Cream", generic: "Aminacrine+Cetrimide", strength: "20g", form: "Cream", category: "Dermatology" },
  { name: "Strepsils Lozenges", generic: "Dichlorobenzyl+Amylmetacresol", strength: "1.2mg+0.6mg", form: "Tablet", category: "Respiratory" },
  { name: "Dulcolax 5mg Tablet", generic: "Bisacodyl", strength: "5mg", form: "Tablet", category: "Gastro" },
  { name: "Cremaffin Syrup", generic: "Liquid Paraffin+Milk of Magnesia", strength: "225ml", form: "Syrup", category: "Gastro" },
];

// Pre-built lowercase index for O(1) search instead of rebuilding on every keystroke
const _searchIndex = COMMON_MEDICINES.map(m => ({
  ...m,
  _search: `${m.name} ${m.generic} ${m.category} ${m.form}`.toLowerCase(),
}));

// ─── Drug Master API suggestion type ─────────────────────────
type DrugMasterHit = DrugMasterSuggestion;

export function AddMedicineForm({ onSuccess, onCancel, prefillBarcode = "", prefillName = "", mode = "standalone", showInventoryFields = true }: AddMedicineFormProps) {
  const [saving, setSaving] = useState(false);
  const [showInventory, setShowInventory] = useState(mode === "inline" && showInventoryFields);
  const [nameValue, setNameValue] = useState(prefillName);
  const [nameSuggestions, setNameSuggestions] = useState<typeof COMMON_MEDICINES>([]);
  const [drugMasterResults, setDrugMasterResults] = useState<DrugMasterHit[]>([]);
  const [drugMasterLoading, setDrugMasterLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  // Debounced Drug Master API search
  useEffect(() => {
    if (nameValue.length < 2) {
      setDrugMasterResults([]);
      setDrugMasterLoading(false);
      return;
    }
    setDrugMasterLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/drug-master/search?q=${encodeURIComponent(nameValue)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(result => {
          setDrugMasterResults(result.data ?? []);
          setDrugMasterLoading(false);
        })
        .catch(() => setDrugMasterLoading(false));
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [nameValue]);

  // Ultra-fast auto-suggest using pre-built lowercase index
  function handleNameChange(value: string) {
    setNameValue(value);
    setSubmitStatus("idle");
    if (value.length >= 2) {
      const lower = value.toLowerCase();
      const tokens = lower.split(/\s+/).filter(t => t.length >= 2);
      const matched = _searchIndex.filter(m =>
        tokens.every(token => m._search.includes(token))
      ).slice(0, 5);
      setNameSuggestions(matched);
    } else {
      setNameSuggestions([]);
    }
  }

  // Fill from local hardcoded suggestion
  function fillFromSuggestion(med: typeof COMMON_MEDICINES[0]) {
    setNameValue(med.name);
    setNameSuggestions([]);
    setDrugMasterResults([]);
    if (!formRef.current) return;
    const form = formRef.current;
    const setValue = (name: string, val: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = val;
    };
    setValue("genericName", med.generic);
    setValue("strength", med.strength);
    setValue("dosageForm", med.form);
    setValue("category", med.category);
  }

  // Fill from Drug Master API suggestion — auto-fills ALL fields
  function fillFromDrugMaster(hit: DrugMasterHit) {
    setNameValue(hit.name);
    setNameSuggestions([]);
    setDrugMasterResults([]);
    if (!formRef.current) return;
    const form = formRef.current;
    const setValue = (name: string, val: string) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (el) el.value = val;
    };
    setValue("genericName", hit.genericName || "");
    setValue("manufacturer", hit.manufacturer || "");
    setValue("composition", hit.composition || "");
    setValue("strength", hit.strength || "");
    setValue("packSize", hit.packSize || "");
    setValue("dosageForm", hit.dosageForm || "");
    setValue("category", ""); // category may not map directly
    setValue("hsnCode", hit.hsnCode || "");
    setValue("schedule", hit.schedule || "OTC");
    setValue("gstRate", String(hit.gstRate ?? 12));
    if (hit.mrpPaisa > 0) setValue("mrp", String(hit.mrpPaisa / 100));
    toast.success(`✅ Auto-filled from Drug Master: ${hit.name}`, { duration: 2500 });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    try {
      const mrp = Math.round(Number(fd.get("mrp") || 0) * 100);
      if (mrp <= 0) {
        toast.error("MRP must be greater than 0");
        setSaving(false);
        return;
      }

      // If inventory fields are filled, use quick-add endpoint
      const batchNo = String(fd.get("batchNo") || "").trim();
      const expiryDate = String(fd.get("expiryDate") || "").trim();
      const quantity = Number(fd.get("quantity") || 0);

      const useQuickAdd = batchNo && expiryDate && quantity > 0;
      const endpoint = useQuickAdd ? "/api/medicines/quick-add" : "/api/medicines/create";

      const payload: Record<string, unknown> = {
        name: String(fd.get("name") || "").trim(),
        genericName: String(fd.get("genericName") || "").trim(),
        manufacturer: String(fd.get("manufacturer") || "").trim(),
        category: String(fd.get("category") || "").trim(),
        composition: String(fd.get("composition") || "").trim(),
        dosageForm: String(fd.get("dosageForm") || "").trim(),
        strength: String(fd.get("strength") || "").trim(),
        packSize: String(fd.get("packSize") || "").trim(),
        hsnCode: String(fd.get("hsnCode") || "").trim(),
        gstRate: Number(fd.get("gstRate") || 12),
        mrpPaisa: mrp,
        schedule: String(fd.get("schedule") || "OTC"),
        barcode: String(fd.get("barcode") || "").trim(),
        requiresPrescription: fd.get("schedule") === "H" || fd.get("schedule") === "H1" || fd.get("schedule") === "X",
      };

      if (useQuickAdd) {
        payload.batchNo = batchNo;
        payload.expiryDate = expiryDate;
        payload.mfgDate = String(fd.get("mfgDate") || "").trim() || undefined;
        payload.purchaseRatePaisa = Math.round(Number(fd.get("purchaseRate") || 0) * 100);
        payload.saleRatePaisa = Math.round(Number(fd.get("saleRate") || mrp / 100) * 100);
        payload.quantity = quantity;
        payload.reorderLevel = Number(fd.get("reorderLevel") || 10);
        payload.rackLocation = String(fd.get("rackLocation") || "").trim();
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error ?? "Failed to add medicine");
        return;
      }

      toast.success(`Medicine "${payload.name}" added successfully!`);
      setSubmitStatus("success");
      if (onSuccess) {
        onSuccess(useQuickAdd ? result.data : { medicine: result.data, inventory: null });
      }
      // Reset form for next entry (standalone mode)
      if (mode === "standalone" && formRef.current) {
        formRef.current.reset();
        setNameValue("");
        setTimeout(() => setSubmitStatus("idle"), 3000);
      }
    } catch {
      toast.error("Network error — please check your connection.");
      setSubmitStatus("error");
    } finally {
      setSaving(false);
    }
  }

  const isInline = mode === "inline";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`rounded-lg border bg-white shadow-sm ${
      isInline ? "border-blue-200 bg-blue-50/30 p-4" : "border-slate-200 p-5"
    }`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`font-display font-semibold ${
          isInline ? "text-base text-blue-900" : "text-lg text-med-navy"
        }`}>
          <Plus className="mr-2 inline-block h-4 w-4" />
          {isInline ? "Quick Add New Medicine + Stock" : "Add New Medicine"}
        </h3>
        <div className="flex items-center gap-2">
          {submitStatus === "success" && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Added!
            </span>
          )}
          {submitStatus === "error" && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
              <AlertCircle className="h-3.5 w-3.5" /> Failed
            </span>
          )}
          {onCancel && (
            <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Essential Fields */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative space-y-1">
          <span className="text-xs font-medium text-slate-600">Medicine Name *</span>
          <input
            name="name"
            required
            value={nameValue}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Dolo 650 Tablet"
            className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20"
            autoComplete="off"
          />
          {(nameSuggestions.length > 0 || drugMasterResults.length > 0 || drugMasterLoading) && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
              {/* Drug Master API Results */}
              {(drugMasterResults.length > 0 || drugMasterLoading) && (
                <div>
                  <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50 px-3 py-1.5">
                    {drugMasterLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
                    ) : (
                      <Database className="h-3 w-3 text-purple-500" />
                    )}
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                      Drug Master Database {drugMasterLoading ? "— Searching..." : `— ${drugMasterResults.length} found`}
                    </span>
                    <Sparkles className="h-3 w-3 text-purple-400 ml-auto" />
                  </div>
                  {drugMasterResults.slice(0, 8).map((hit, i) => (
                    <button
                      key={`dm-${hit.name}-${i}`}
                      type="button"
                      onClick={() => fillFromDrugMaster(hit)}
                      className="block w-full border-b border-slate-50 px-3 py-2 text-left hover:bg-purple-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="block text-sm font-semibold text-slate-800">{hit.name}</span>
                        <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">Drug Master ⚡</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {hit.genericName}{hit.strength ? ` • ${hit.strength}` : ""}{hit.manufacturer ? ` • ${hit.manufacturer}` : ""}
                      </span>
                      {hit.mrpPaisa > 0 && (
                        <span className="ml-1 text-xs font-medium text-emerald-600">₹{(hit.mrpPaisa / 100).toFixed(2)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {/* Local Hardcoded Suggestions */}
              {nameSuggestions.length > 0 && (
                <div>
                  {drugMasterResults.length > 0 && (
                    <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Quick Suggestions</span>
                    </div>
                  )}
                  {nameSuggestions.map((med) => (
                    <button
                      key={med.name}
                      type="button"
                      onClick={() => fillFromSuggestion(med)}
                      className="block w-full border-b border-slate-50 px-3 py-2 text-left hover:bg-med-greenSoft transition-colors"
                    >
                      <span className="block text-sm font-medium text-med-navy">{med.name}</span>
                      <span className="text-xs text-slate-500">{med.generic} • {med.strength} • {med.form}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <FormField name="genericName" label="Generic / Salt Name" placeholder="e.g. Paracetamol" />
        <FormField name="manufacturer" label="Manufacturer" placeholder="e.g. Micro Labs" />
        <FormField name="composition" label="Composition" placeholder="e.g. Paracetamol 650mg" />
        <FormField name="strength" label="Strength" placeholder="e.g. 650mg" />
        <FormField name="packSize" label="Pack Size" placeholder="e.g. Strip of 15" />
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Dosage Form</span>
          <select name="dosageForm" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            <option value="">Select</option>
            {DOSAGE_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Category</span>
          <select name="category" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            <option value="">Select</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <FormField name="mrp" label="MRP (₹) *" type="number" step="0.01" required placeholder="e.g. 33.50" />
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">GST Rate</span>
          <select name="gstRate" defaultValue="12" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-slate-600">Schedule</span>
          <select name="schedule" defaultValue="OTC" className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm">
            {SCHEDULE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <FormField name="hsnCode" label="HSN Code" placeholder="e.g. 30049099" />
        <FormField name="barcode" label="Barcode" defaultValue={prefillBarcode} placeholder="e.g. 8901234500028" />
      </div>

      {/* Inventory Section (toggle for standalone, always show for inline) */}
      {showInventoryFields && !isInline && (
        <button
          type="button"
          onClick={() => setShowInventory(!showInventory)}
          className="mt-4 text-sm font-medium text-med-green hover:text-med-greenDark"
        >
          {showInventory ? "▾ Hide stock details" : "▸ Also add stock entry (optional)"}
        </button>
      )}

      {showInventory && showInventoryFields && (
        <div className={`mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 ${isInline ? "border-blue-100" : ""}`}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stock / Inventory Details {isInline ? "(Required)" : "(Optional)"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField name="batchNo" label={`Batch No ${isInline ? "*" : ""}`} required={isInline} placeholder="e.g. DL650A" />
            <FormField name="expiryDate" label={`Expiry Date ${isInline ? "*" : ""}`} type="date" required={isInline} />
            <FormField name="mfgDate" label="MFG Date" type="date" />
            <FormField name="quantity" label={`Quantity ${isInline ? "*" : ""}`} type="number" required={isInline} placeholder="e.g. 100" />
            <FormField name="purchaseRate" label="Purchase Rate (₹)" type="number" step="0.01" placeholder="e.g. 21.00" />
            <FormField name="saleRate" label="Sale Rate (₹)" type="number" step="0.01" placeholder="e.g. 32.00" />
            <FormField name="reorderLevel" label="Reorder Level" type="number" defaultValue="10" />
            <FormField name="rackLocation" label="Rack Location" placeholder="e.g. B2" />
          </div>
        </div>
      )}

      <div className={`mt-4 flex gap-2 ${isInline ? "" : "justify-end"}`}>
        {onCancel && (
          <button type="button" onClick={onCancel} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
        )}
        {!isInline && (
          <button
            type="button"
            onClick={() => { formRef.current?.reset(); setNameValue(""); setSubmitStatus("idle"); toast.info("Form cleared."); }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold text-white disabled:opacity-60 ${
            isInline ? "bg-blue-600 hover:bg-blue-700" : "bg-med-green hover:bg-med-greenDark"
          } ${isInline ? "flex-1" : ""}`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {saving ? "Adding..." : isInline ? "Add Medicine & Stock" : showInventory ? "Add Medicine & Stock" : "Add Medicine"}
        </button>
      </div>
    </form>
  );
}

function FormField({
  name, label, type = "text", defaultValue, step, required, placeholder,
}: {
  name: string; label: string; type?: string; defaultValue?: string;
  step?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-med-green focus:ring-1 focus:ring-med-green/20"
      />
    </label>
  );
}
