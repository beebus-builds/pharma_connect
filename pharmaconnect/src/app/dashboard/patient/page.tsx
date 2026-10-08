"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Clock,
  Search,
  Inbox,
  Filter,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Bell,
  Plus,
  Trash2,
  Pause,
  Play,
  Pill,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Feedback";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Table, TableBody, TableHeader, TableHeadCell, TableRow, TableCell } from "@/components/ui/Table";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Dialog } from "@/components/ui/Dialog";
import { useLocale } from "@/components/LocaleProvider";
import { appToast as toast } from "@/components/Providers";
import type { MedicineDTO, RequestDTO } from "@/types";

const PAGE_SIZE = 8;

type Reminder = {
  id: string;
  medicineId: string;
  daysSupply: number;
  leadDays: number;
  active: boolean;
  nextDue: string;
  medicine: { genericName: string; brandName: string; strength: string };
};

const STATUSES = ["ALL", "PENDING", "AVAILABLE", "UNAVAILABLE"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABEL: Record<StatusFilter, string> = {
  ALL: "patient.filterAll",
  PENDING: "badge.lowStock",
  AVAILABLE: "badge.inStock",
  UNAVAILABLE: "badge.outOfStock",
};

export default function PatientDashboard() {
  const { t, locale } = useLocale();
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [remindersFailed, setRemindersFailed] = useState(false);
  const [reminderQuery, setReminderQuery] = useState("");
  const [reminderResults, setReminderResults] = useState<MedicineDTO[]>([]);
  const [reminderMedicine, setReminderMedicine] = useState<MedicineDTO | null>(null);
  const [daysSupply, setDaysSupply] = useState(30);
  const [leadDays, setLeadDays] = useState(3);
  const [savingReminder, setSavingReminder] = useState(false);
  const [pendingReminderId, setPendingReminderId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Reminder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const localeTag = locale === "ne" ? "ne-NP" : "en-US";
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(localeTag, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(localeTag, { month: "short", day: "numeric" });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/requests", { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("patient.requestsFailed"));
        if (active) setRequests(data.requests ?? []);
      } catch (e: unknown) {
        if (!active || (e instanceof Error && e.name === "AbortError")) return;
        // Surfaced: a silent failure here is indistinguishable from "no requests".
        if (active) setLoadError(e instanceof Error ? e.message : t("patient.requestsFailed"));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function loadReminders() {
      try {
        const res = await fetch("/api/reminders", { signal: controller.signal });
        const data = await res.json();
        if (!active) return;
        if (res.ok) setReminders(data.reminders ?? []);
        else setRemindersFailed(true);
      } catch (e: unknown) {
        if (!active || (e instanceof Error && e.name === "AbortError")) return;
        setRemindersFailed(true);
      } finally {
        if (active) setRemindersLoading(false);
      }
    }
    void loadReminders();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!reminderQuery.trim() || reminderMedicine) {
      setReminderResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/medicines/search?q=${encodeURIComponent(reminderQuery)}&limit=5`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setReminderResults(res.ok ? data.medicines ?? [] : []);
      } catch {
        setReminderResults([]);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [reminderQuery, reminderMedicine]);

  // Close the suggestion list on outside click.
  useEffect(() => {
    if (reminderResults.length === 0) return;
    function onPointerDown(e: PointerEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) setReminderResults([]);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [reminderResults.length]);

  async function addReminder() {
    if (!reminderMedicine) {
      toast.error(t("patient.pickMedicineFirst"));
      return;
    }
    setSavingReminder(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId: reminderMedicine.id, daysSupply, leadDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      setReminders((prev) => {
        const rest = prev.filter(
          (r) => r.id !== data.reminder.id && r.medicineId !== data.reminder.medicineId
        );
        return [...rest, data.reminder].sort(
          (a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime()
        );
      });
      setReminderMedicine(null);
      setReminderQuery("");
      setDaysSupply(30);
      setLeadDays(3);
      toast.success(t("patient.reminderSaved"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSavingReminder(false);
    }
  }

  async function toggleReminder(reminder: Reminder) {
    setPendingReminderId(reminder.id);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !reminder.active }),
      });
      if (!res.ok) throw new Error(t("common.error"));
      const data = await res.json();
      setReminders((prev) => prev.map((x) => (x.id === reminder.id ? data.reminder : x)));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setPendingReminderId(null);
    }
  }

  async function deleteReminder() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reminders/${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("common.error"));
      setReminders((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      toast.success(t("patient.reminderDeleted"));
      setConfirmDelete(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDeleting(false);
    }
  }

  const filtered = useMemo(
    () => (statusFilter === "ALL" ? requests : requests.filter((r) => r.status === statusFilter)),
    [requests, statusFilter]
  );

  const counts = useMemo(
    () => ({
      ALL: requests.length,
      PENDING: requests.filter((r) => r.status === "PENDING").length,
      AVAILABLE: requests.filter((r) => r.status === "AVAILABLE").length,
      UNAVAILABLE: requests.filter((r) => r.status === "UNAVAILABLE").length,
    }),
    [requests]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // A filter change can leave the viewer on a page that no longer exists.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const activeReminders = reminders.filter((r) => r.active).length;

  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow={t("patient.eyebrow")}
          title={t("patient.title")}
          description={t("patient.subtitle")}
        />
        <div className="flex shrink-0 gap-2">
          <Link href="/chat" className={buttonClasses({ variant: "secondary" })}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t("nav.messages")}
          </Link>
          <Link href="/" className={buttonClasses({ variant: "outline" })}>
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("patient.newSearch")}
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------ Refill reminders */}
      <Card className="mb-7 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="font-display text-base font-semibold text-fg">
            {t("patient.remindersTitle")}
          </h2>
          {!remindersLoading && (
            <span className="text-xs text-fg-muted">
              {t("patient.activeCourses", { count: activeReminders })}
            </span>
          )}
        </div>

        <div className="p-5">
          {remindersFailed && (
            <Alert tone="error" className="mb-4" live="off">
              {t("patient.remindersFailed")}
            </Alert>
          )}

          {!remindersLoading && reminders.length > 0 && (
            <ul className="mb-5 divide-y divide-line">
              {reminders.map((reminder) => (
                <li key={reminder.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-semibold text-fg ${
                        !reminder.active ? "text-fg-subtle line-through" : ""
                      }`}
                    >
                      {reminder.medicine.genericName}
                      <span className="ml-1.5 text-xs font-normal text-fg-muted">
                        {reminder.medicine.brandName} {reminder.medicine.strength}
                      </span>
                    </p>
                    <p className="tabular text-xs text-fg-muted">
                      {t("patient.courseSummary", {
                        supply: reminder.daysSupply,
                        due: formatDate(reminder.nextDue),
                        lead: reminder.leadDays,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    loading={pendingReminderId === reminder.id}
                    onClick={() => void toggleReminder(reminder)}
                    aria-label={
                      reminder.active
                        ? t("patient.pauseAria", { name: reminder.medicine.genericName })
                        : t("patient.resumeAria", { name: reminder.medicine.genericName })
                    }
                  >
                    {reminder.active ? (
                      <>
                        <Pause className="h-3 w-3" aria-hidden="true" />
                        {t("patient.pause")}
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" aria-hidden="true" />
                        {t("patient.resume")}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmDelete(reminder)}
                    aria-label={t("patient.deleteAria", { name: reminder.medicine.genericName })}
                    className="text-fg-subtle hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-start">
            <div className="relative" ref={comboRef}>
              <Input
                label={t("patient.reminderMedicineLabel")}
                hideLabel
                value={
                  reminderMedicine
                    ? `${reminderMedicine.genericName} (${reminderMedicine.brandName})`
                    : reminderQuery
                }
                onChange={(e) => {
                  setReminderMedicine(null);
                  setReminderQuery(e.target.value);
                }}
                placeholder={t("patient.reminderMedicinePlaceholder")}
                leading={<Pill />}
                role="combobox"
                aria-expanded={reminderResults.length > 0}
                aria-autocomplete="list"
                autoComplete="off"
              />
              {reminderResults.length > 0 && (
                <ul
                  role="listbox"
                  aria-label={t("patient.reminderSuggestions")}
                  className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-overlay animate-scaleIn motion-reduce:animate-none"
                >
                  {reminderResults.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => {
                          setReminderMedicine(m);
                          setReminderResults([]);
                          setReminderQuery("");
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-sunken"
                      >
                        <span className="font-medium text-fg">{m.genericName}</span>
                        <span className="truncate text-xs text-fg-muted">
                          {m.brandName} · {m.strength}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Input
              label={t("patient.courseLength")}
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={daysSupply}
              onChange={(e) => setDaysSupply(Number(e.target.value))}
              className="w-full sm:w-28"
            />
            <Input
              label={t("patient.warnDays")}
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              value={leadDays}
              onChange={(e) => setLeadDays(Number(e.target.value))}
              className="w-full sm:w-28"
            />
            <Button
              onClick={() => void addReminder()}
              loading={savingReminder}
              className="h-10 sm:self-end"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("patient.add")}
            </Button>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-fg-subtle">
            {t("patient.reminderHint")}
          </p>
        </div>
      </Card>

      {/* ------------------------------------------------------------- Requests */}
      <SectionHeading
        eyebrow={t("patient.requestsEyebrow")}
        title={t("patient.requestsTitle")}
        className="mb-4"
      />

      {!loading && requests.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            {t("home.filter")}
          </span>
          {STATUSES.map((status) => (
            <Chip
              key={status}
              size="sm"
              selected={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {t(STATUS_LABEL[status] as "badge.inStock")}
              {counts[status] > 0 && (
                <span className="tabular opacity-70">({counts[status]})</span>
              )}
            </Chip>
          ))}
          <span className="tabular ml-auto text-xs text-fg-subtle">
            {t("patient.pageOf", { page, total: totalPages })}
          </span>
        </div>
      )}

      {loading && <TableSkeleton rows={5} />}

      {!loading && loadError && (
        <EmptyState
          tone="error"
          icon={Inbox}
          title={t("patient.requestsFailed")}
          body={loadError}
          action={<Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>}
        />
      )}

      {!loading && !loadError && requests.length === 0 && (
        <EmptyState
          icon={Inbox}
          title={t("patient.emptyTitle")}
          body={t("patient.emptyBody")}
          action={
            <Link href="/" className={buttonClasses({ size: "lg" })}>
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("patient.findMedicines")}
            </Link>
          }
        />
      )}

      {!loading && !loadError && requests.length > 0 && filtered.length === 0 && (
        <EmptyState
          icon={Filter}
          title={t("patient.noMatchTitle")}
          body={t("patient.noMatchBody", { status: t(STATUS_LABEL[statusFilter] as "badge.inStock") })}
          action={
            <Button variant="secondary" onClick={() => setStatusFilter("ALL")}>
              {t("common.clearFilters")}
            </Button>
          }
        />
      )}

      {!loading && paged.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeadCell>{t("patient.colMedicine")}</TableHeadCell>
                <TableHeadCell>{t("patient.colPharmacy")}</TableHeadCell>
                <TableHeadCell>{t("patient.colRequested")}</TableHeadCell>
                <TableHeadCell className="text-right">{t("patient.colStatus")}</TableHeadCell>
                <TableHeadCell className="text-right">
                  <span className="sr-only">{t("patient.colChat")}</span>
                </TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r, i) => (
                <TableRow
                  key={r.id}
                  className="animate-rise motion-reduce:animate-none"
                  style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                >
                  <TableCell>
                    <span className="block font-semibold text-fg">{r.medicine.genericName}</span>
                    <span className="block text-xs text-fg-muted">
                      {r.medicine.brandName} {r.medicine.strength}
                    </span>
                  </TableCell>
                  <TableCell label={t("patient.colPharmacy")}>{r.pharmacy.name}</TableCell>
                  <TableCell label={t("patient.colRequested")}>
                    <span className="tabular inline-flex items-center gap-1.5 text-xs">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatDateTime(r.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell label={t("patient.colStatus")} className="text-right">
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/chat/${r.id}`}
                      className={buttonClasses({ size: "xs", variant: "secondary" })}
                      aria-label={t("patient.chatWith", { name: r.pharmacy.name })}
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("patient.chat")}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <nav
              aria-label={t("patient.pagination")}
              className="mt-4 flex items-center justify-between gap-3"
            >
              <p className="tabular text-xs text-fg-muted">
                {t("patient.showingRange", {
                  from: (page - 1) * PAGE_SIZE + 1,
                  to: Math.min(page * PAGE_SIZE, filtered.length),
                  total: filtered.length,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("patient.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t("patient.next")}
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title={t("patient.deleteTitle")}
        description={t("patient.deleteBody", {
          name: confirmDelete?.medicine.genericName ?? "",
        })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void deleteReminder()}>
              {t("patient.delete")}
            </Button>
          </>
        }
      />
    </Container>
  );
}
