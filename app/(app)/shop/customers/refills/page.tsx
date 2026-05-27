"use client";

import { useEffect, useState } from "react";
import {
  Bell, CheckCircle, Clock, Calendar, MessageSquare,
  Search, RefreshCw, Loader2, Send, CheckCircle2, UserCheck
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

type RefillReminder = {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  medicineName: string;
  lastPurchasedDate: string | Date;
  quantity: number;
  exhaustionDate: string | Date;
  daysRemaining: number;
  urgency: "due_soon" | "overdue" | "safe";
};

export default function RefillRemindersPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reminders, setReminders] = useState<RefillReminder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [alertedIds, setAlertedIds] = useState<Set<string>>(new Set());

  const fetchReminders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/refill-reminders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load data");
      setReminders(data.data ?? []);
    } catch (error) {
      toast.error("Failed to fetch refill schedules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleSendWhatsApp = (item: RefillReminder) => {
    if (!item.customerPhone) {
      toast.error("No phone number found for this customer");
      return;
    }

    const cleanPhone = item.customerPhone.replace(/[^0-9]/g, "");
    // Ensure country code
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const message = `Hi ${item.customerName}, this is Medicare Pharmacy. Your prescription for ${item.medicineName} is due for a refill in ${item.daysRemaining > 0 ? `${item.daysRemaining} days` : "a few days"} (${formatDate(item.exhaustionDate)}). Would you like us to prepare your order for home delivery? Reply YES to confirm!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(message)}`;
    
    // Open in new window
    window.open(waUrl, "_blank");
    
    // Mark as alerted
    const key = `${item.customerId}_${item.medicineName}`;
    const next = new Set(alertedIds);
    next.add(key);
    setAlertedIds(next);

    toast.success(`WhatsApp reminder generated for ${item.customerName}!`);
  };

  const handleMarkAlerted = (item: RefillReminder) => {
    const key = `${item.customerId}_${item.medicineName}`;
    const next = new Set(alertedIds);
    next.add(key);
    setAlertedIds(next);
    toast.success(`Refill marked as contacted`);
  };

  const filteredReminders = reminders.filter((item) => {
    const matchesSearch =
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.customerPhone || "").includes(searchQuery);
    return matchesSearch;
  });

  const dueSoonCount = reminders.filter((r) => r.urgency === "due_soon").length;
  const overdueCount = reminders.filter((r) => r.urgency === "overdue").length;

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Patient Refill Reminders"
        description="eVitalRx-style chronic maintenance drug forecasting & WhatsApp reminders"
        action={
          <button
            onClick={() => fetchReminders(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        }
      />

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex items-center gap-4 bg-red-50/10">
          <div className="h-10 w-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <Clock className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Overdue Refills</h3>
            <p className="text-2xl font-extrabold text-slate-800">{overdueCount}</p>
            <p className="text-[10px] text-red-600 font-semibold mt-0.5">Exhausted chronic therapy</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-amber-50/10">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Bell className="h-5 w-5 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Due This Week</h3>
            <p className="text-2xl font-extrabold text-slate-800">{dueSoonCount}</p>
            <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Due in 7 days or less</p>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-4 bg-emerald-50/10">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Alerted Today</h3>
            <p className="text-2xl font-extrabold text-slate-800">{alertedIds.size}</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active patients contacted</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by patient name, phone number, or chronic medicine formulation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700"
          />
        </div>
      </div>

      {/* Reminders List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm font-semibold">Analyzing drug schedules and chronic purchase behaviors...</p>
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="font-display text-lg font-bold text-slate-800">All Chronic Refills Scheduled</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            There are no patients due for maintenance refills in the next 7 days. Excellent clinic management!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReminders.map((item) => {
            const key = `${item.customerId}_${item.medicineName}`;
            const isAlerted = alertedIds.has(key);

            return (
              <div
                key={key}
                className={`glass-card p-5 border hover:shadow-md transition-all duration-200 relative ${
                  isAlerted
                    ? "bg-slate-50/50 border-slate-200 opacity-75"
                    : item.urgency === "overdue"
                    ? "border-red-100 bg-red-50/5 shadow-sm"
                    : "border-slate-100 shadow-sm"
                }`}
              >
                {/* Urgency Badge */}
                <span
                  className={`absolute top-4 right-4 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                    isAlerted
                      ? "bg-slate-100 text-slate-500 border-slate-200"
                      : item.urgency === "overdue"
                      ? "bg-red-100 text-red-700 border-red-200 animate-pulse"
                      : "bg-amber-100 text-amber-700 border-amber-200"
                  }`}
                >
                  {isAlerted ? "Contacted" : item.urgency}
                </span>

                <div className="space-y-3">
                  {/* Customer details */}
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{item.customerName}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      📞 {item.customerPhone || "No Phone Number"}
                    </p>
                  </div>

                  {/* Medicine and dates */}
                  <div className="rounded-xl bg-slate-50 border border-slate-150 p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Medicine:</span>
                      <span className="font-extrabold text-slate-800">{item.medicineName}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Exhaustion Date:</span>
                      <span className="font-bold text-slate-700">{formatDate(item.exhaustionDate)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Last Purchase:</span>
                      <span className="font-semibold text-slate-500">
                        {formatDate(item.lastPurchasedDate)} ({item.quantity} units)
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs font-semibold text-slate-400">
                      {isAlerted ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          ✓ Reminder Sent
                        </span>
                      ) : item.daysRemaining < 0 ? (
                        <span className="text-red-600 font-extrabold">
                          Overdue by {Math.abs(item.daysRemaining)} days!
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold">
                          Exhausting in {item.daysRemaining} days
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!isAlerted && (
                        <button
                          onClick={() => handleMarkAlerted(item)}
                          className="rounded-lg border border-slate-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors"
                        >
                          Mark Contacted
                        </button>
                      )}
                      <button
                        onClick={() => handleSendWhatsApp(item)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all shadow-xs active:scale-95 duration-100 ${
                          isAlerted
                            ? "bg-slate-700 hover:bg-slate-800"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {isAlerted ? "Resend Alert" : "WhatsApp"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
