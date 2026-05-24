"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { FileImage, Upload, Search, Calendar, Eye, Trash2, Loader2, X, AlertTriangle, CheckCircle, Link2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type PrescriptionRecord = {
  id: string;
  imageUrl: string;
  doctorName: string | null;
  patientName: string | null;
  notes: string | null;
  uploadedAt: string;
  sale?: { id: string; invoiceNo: string; doctorName: string | null; customerName: string | null } | null;
};

export function PrescriptionArchiveClient() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [notes, setNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch prescriptions
  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function fetchPrescriptions() {
    try {
      const res = await fetch("/api/prescriptions");
      const json = await res.json();
      setPrescriptions(json.data ?? []);
    } catch {
      toast.error("Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (JPG, PNG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowUploadForm(true);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (doctorName) formData.append("doctorName", doctorName);
      if (patientName) formData.append("patientName", patientName);
      if (notes) formData.append("notes", notes);

      const res = await fetch("/api/upload/prescription", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Upload failed");
        return;
      }

      toast.success("Prescription uploaded successfully!");
      resetUploadForm();
      fetchPrescriptions();
    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  function resetUploadForm() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setDoctorName("");
    setPatientName("");
    setNotes("");
    setShowUploadForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const filtered = prescriptions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const doc = p.doctorName || p.sale?.doctorName || "";
    const pat = p.patientName || p.sale?.customerName || "";
    const note = p.notes || "";
    const inv = p.sale?.invoiceNo || "";
    return (
      doc.toLowerCase().includes(q) ||
      pat.toLowerCase().includes(q) ||
      note.toLowerCase().includes(q) ||
      inv.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by doctor, patient, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-med-green focus:ring-2 focus:ring-med-green/20 focus:shadow-[0_0_0_3px_rgba(0,168,120,0.1)] transition-all"
          />
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-med-green px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-med-greenDark active:scale-[0.97] transition-all"
          >
            <Upload className="h-4 w-4" />
            Upload Prescription
          </button>
        </div>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => resetUploadForm()}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 animate-scale-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-display text-lg font-bold text-med-navy flex items-center gap-2">
                <FileImage className="h-5 w-5 text-med-green" />
                Upload Prescription
              </h3>
              <button onClick={resetUploadForm} className="rounded-lg p-1.5 hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Image Preview */}
              {previewUrl && (
                <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-med-green/30 bg-med-greenSoft/30">
                  <img src={previewUrl} alt="Prescription preview" className="w-full max-h-48 object-contain" />
                </div>
              )}

              {/* Form Fields */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Doctor Name</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Dr. Sharma"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm focus:border-med-green focus:ring-1 focus:ring-med-green/20 focus:shadow-[0_0_0_3px_rgba(0,168,120,0.1)] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Patient's name"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm focus:border-med-green focus:ring-1 focus:ring-med-green/20 focus:shadow-[0_0_0_3px_rgba(0,168,120,0.1)] outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Notes (Optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm resize-none focus:border-med-green focus:ring-1 focus:ring-med-green/20 focus:shadow-[0_0_0_3px_rgba(0,168,120,0.1)] outline-none transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={resetUploadForm}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.97] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-med-green px-5 py-2 text-sm font-bold text-white hover:bg-med-greenDark disabled:opacity-50 active:scale-[0.97] transition-all"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Save Prescription
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 z-10 rounded-full bg-white p-2 shadow-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5 text-slate-700" />
            </button>
            <img src={previewImage} alt="Prescription" className="w-full rounded-2xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Prescriptions Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-slate-100 bg-white p-4 space-y-3 animate-pulse">
              <div className="h-32 rounded-xl bg-slate-100" />
              <div className="h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <FileImage className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 font-display text-lg font-bold text-med-navy">
            {searchQuery ? "No matching prescriptions" : "No prescriptions yet"}
          </h3>
          <p className="mt-1.5 text-sm text-slate-500">
            {searchQuery
              ? "Try a different search term"
              : "Upload doctor prescriptions for H1 category medicines to keep a legal record."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-med-green px-5 py-2.5 text-sm font-bold text-white hover:bg-med-greenDark active:scale-[0.97] transition-all"
            >
              <Upload className="h-4 w-4" />
              Upload First Prescription
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group rounded-2xl border-2 border-slate-200/80 bg-white shadow-sm hover:shadow-md hover:border-med-green/30 transition-all overflow-hidden"
            >
              {/* Image Thumbnail */}
              <div
                className="relative h-40 bg-slate-50 cursor-pointer overflow-hidden"
                onClick={() => setPreviewImage(p.imageUrl)}
              >
                <img
                  src={p.imageUrl}
                  alt={`Prescription ${p.doctorName || ""}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="rounded-full bg-white/90 p-2 shadow-lg">
                    <Eye className="h-5 w-5 text-med-navy" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {(p.doctorName || p.sale?.doctorName) && (
                      <p className="text-sm font-bold text-med-navy truncate">Dr. {p.doctorName || p.sale?.doctorName}</p>
                    )}
                    {(p.patientName || p.sale?.customerName) && (
                      <p className="text-xs text-slate-500 truncate">Patient: {p.patientName || p.sale?.customerName}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(p.uploadedAt)}</p>
                    <p className="text-[10px] text-slate-400">{formatTime(p.uploadedAt)}</p>
                  </div>
                </div>

                {p.notes && (
                  <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
                    {p.notes}
                  </p>
                )}

                {p.sale && (
                  <Link
                    href={`/shop/billing/${p.sale.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Link2 className="h-3 w-3" />
                    Invoice: {p.sale.invoiceNo}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
