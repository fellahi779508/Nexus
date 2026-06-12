"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Star,
  RefreshCw,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Info,
  Settings2,
  Trash2,
  ChevronDown,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import styles from "./zakat.module.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZakatSummary {
  id: number;
  label: string | null;
  inventoryValue: number;
  nisab: number;
  rate: number;
  reachedNisab: boolean;
  oneYearPassed: boolean;
  zakatDue: boolean;
  zakatAmount: number;
  startDate: string;
  dueDate: string | null;
  daysElapsed: number;
  daysRemaining: number;
  progressPercent: number;
  config: {
    id: number;
    nisab: number;
    rate: number;
    startDate: string;
    dueDate: string | null;
    inventoryValue: number;
    isSatisfied: boolean;
    zakatAmount: number;
    label: string | null;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = "http://localhost:3001/zakat";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-DZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateInput(iso: string) {
  // Returns YYYY-MM-DD for <input type="date">
  return new Date(iso).toISOString().slice(0, 10);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ZakatPage() {
  const [summary, setSummary] = useState<ZakatSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Setup form state (when no config exists)
  const [setup, setSetup] = useState({
    nisab: "",
    startDate: "",
    label: "",
    rate: "2.5",
  });
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Edit form state
  const [edit, setEdit] = useState({
    nisab: "",
    startDate: "",
    label: "",
    rate: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ─── Fetch summary ──────────────────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<ZakatSummary>(`${API}/summary`);
      setSummary(data);
      setEdit({
        nisab: String(data.config.nisab),
        startDate: fmtDateInput(data.config.startDate),
        label: data.config.label ?? "",
        rate: String(data.config.rate),
      });
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e?.response?.status === 404) {
        // No config — show setup form
        setSummary(null);
      } else {
        setError("Failed to load Zakat data. Make sure the server is running.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // ─── Verify ─────────────────────────────────────────────────────────────────

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      await axios.get(`${API}/verify`);
      await fetchSummary();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // ─── Setup ──────────────────────────────────────────────────────────────────

  const handleSetup = async () => {
    setSetupLoading(true);
    setSetupError(null);
    try {
      if (!setup.nisab || Number(setup.nisab) <= 0)
        throw new Error("Please enter a valid Nisab amount.");
      if (!setup.startDate) throw new Error("Please select a start date.");

      await axios.post(API, {
        nisab: Number(setup.nisab),
        startDate: new Date(setup.startDate).toISOString(),
        label: setup.label || undefined,
        rate: Number(setup.rate) || 2.5,
      });
      await fetchSummary();
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setSetupError(
        e?.response?.data?.message ?? e?.message ?? "Setup failed.",
      );
    } finally {
      setSetupLoading(false);
    }
  };

  // ─── Update ─────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!summary) return;
    setEditLoading(true);
    setEditError(null);
    try {
      if (!edit.nisab || Number(edit.nisab) <= 0)
        throw new Error("Nisab must be a positive number.");

      await axios.patch(`${API}/${summary.config.id}`, {
        nisab: Number(edit.nisab),
        startDate: new Date(edit.startDate).toISOString(),
        label: edit.label || undefined,
        rate: Number(edit.rate) || 2.5,
      });
      await fetchSummary();
      setSettingsOpen(false);
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setEditError(
        e?.response?.data?.message ?? e?.message ?? "Update failed.",
      );
    } finally {
      setEditLoading(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!summary) return;
    if (
      !window.confirm("Delete this Zakat configuration? This cannot be undone.")
    )
      return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/${summary.config.id}`);
      setSummary(null);
      setSettingsOpen(false);
    } catch {
      setError("Failed to delete configuration.");
    } finally {
      setDeleting(false);
    }
  };

  // ─── Derived state ───────────────────────────────────────────────────────────

  const statusKind = !summary
    ? null
    : summary.zakatDue
      ? "satisfied"
      : summary.oneYearPassed && !summary.reachedNisab
        ? "notReached"
        : "pending";

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      <div className={styles.page}>
        {/* ─── Header ───────────────────────────────────────────────────────── */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            <div className={styles.pageIcon}>
              <Star size={24} />
            </div>
            <div>
              <h1 className={styles.pageTitle}>Zakat</h1>
              <p className={styles.pageSubtitle}>
                Track your inventory Nisab and annual Zakat obligation
              </p>
            </div>
          </div>

          {summary && (
            <button
              className={styles.verifyBtn}
              onClick={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <span className={styles.spin}>
                  <Loader2 size={16} />
                </span>
              ) : (
                <RefreshCw size={16} />
              )}
              {verifying ? "Verifying…" : "Re-verify now"}
            </button>
          )}
        </div>

        {/* ─── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className={styles.errorBanner}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* ─── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <>
            <div className={`${styles.skeleton} ${styles.skeletonBanner}`} />
            <div className={styles.skeletonStats}>
              <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
              <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
              <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
            </div>
            <div className={`${styles.skeleton} ${styles.skeletonProgress}`} />
          </>
        )}

        {/* ─── No config — setup form ───────────────────────────────────────── */}
        {!loading && !summary && (
          <div className={styles.panel}>
            <div className={styles.setupCta}>
              <div className={styles.setupCtaIcon}>
                <Info size={28} />
              </div>
              <h2 className={styles.setupCtaTitle}>Configure your Zakat</h2>
              <p className={styles.setupCtaDesc}>
                Set your Nisab threshold and the date you started tracking this
                cycle. The system will automatically verify your stock value
                after one Hijri year.
              </p>
            </div>

            {setupError && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={16} />
                {setupError}
              </div>
            )}

            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>
                  Nisab (DZD){" "}
                  <span className={styles.labelHint}>
                    — minimum threshold this year
                  </span>
                </label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  placeholder="e.g. 850000"
                  value={setup.nisab}
                  onChange={(e) =>
                    setSetup((s) => ({ ...s, nisab: e.target.value }))
                  }
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  Start date{" "}
                  <span className={styles.labelHint}>
                    — Hijri year begins here
                  </span>
                </label>
                <input
                  className={styles.input}
                  type="date"
                  value={setup.startDate}
                  onChange={(e) =>
                    setSetup((s) => ({ ...s, startDate: e.target.value }))
                  }
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  Label{" "}
                  <span className={styles.labelHint}>
                    — optional, e.g. "1446 AH"
                  </span>
                </label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. 1446 AH"
                  value={setup.label}
                  onChange={(e) =>
                    setSetup((s) => ({ ...s, label: e.target.value }))
                  }
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label}>
                  Rate (%){" "}
                  <span className={styles.labelHint}>
                    — fixed 2.5% in Islamic law
                  </span>
                </label>
                <input
                  className={styles.input}
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={setup.rate}
                  onChange={(e) =>
                    setSetup((s) => ({ ...s, rate: e.target.value }))
                  }
                />
              </div>

              <div
                className={`${styles.formField} ${styles.fullWidth} ${styles.formActions}`}
              >
                <button
                  className={styles.btnPrimary}
                  onClick={handleSetup}
                  disabled={setupLoading}
                >
                  {setupLoading ? (
                    <span className={styles.spin}>
                      <Loader2 size={16} />
                    </span>
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {setupLoading ? "Saving…" : "Save configuration"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Dashboard (config exists) ────────────────────────────────────── */}
        {!loading && summary && (
          <>
            {/* Status banner */}
            <div
              className={`${styles.statusBanner} ${
                statusKind === "satisfied"
                  ? styles.satisfied
                  : statusKind === "notReached"
                    ? styles.notReached
                    : styles.pending
              }`}
            >
              <div className={styles.statusIcon}>
                {statusKind === "satisfied" ? (
                  <ShieldCheck size={22} />
                ) : statusKind === "notReached" ? (
                  <Info size={22} />
                ) : (
                  <Clock size={22} />
                )}
              </div>
              <div className={styles.statusText}>
                <h3>
                  {statusKind === "satisfied"
                    ? "Zakat is due"
                    : statusKind === "notReached"
                      ? "Nisab not reached"
                      : "Tracking in progress"}
                </h3>
                <p>
                  {statusKind === "satisfied"
                    ? `Your inventory has exceeded the Nisab for a full Hijri year. Zakat of ${fmt(
                        summary.zakatAmount,
                      )} DZD is payable.`
                    : statusKind === "notReached"
                      ? `One year has passed, but your inventory (${fmt(
                          summary.inventoryValue,
                        )} DZD) is below the Nisab (${fmt(summary.nisab)} DZD). No Zakat is due.`
                      : `${summary.daysRemaining} day${
                          summary.daysRemaining !== 1 ? "s" : ""
                        } remaining until the one-year mark. Current inventory: ${fmt(
                          summary.inventoryValue,
                        )} DZD.`}
                </p>
              </div>
            </div>

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Inventory value</div>
                <div
                  className={`${styles.statValue} ${
                    summary.reachedNisab ? styles.success : styles.warning
                  }`}
                >
                  {fmt(summary.inventoryValue)}
                </div>
                <div className={styles.statSub}>DZD (stock × sell price)</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>Nisab threshold</div>
                <div className={styles.statValue}>{fmt(summary.nisab)}</div>
                <div className={styles.statSub}>DZD · rate {summary.rate}%</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statLabel}>Zakat amount</div>
                <div
                  className={`${styles.statValue} ${
                    summary.zakatDue ? styles.accent : ""
                  }`}
                >
                  {summary.zakatDue ? fmt(summary.zakatAmount) : "—"}
                </div>
                <div className={styles.statSub}>
                  {summary.zakatDue ? "DZD payable" : "Not yet due"}
                </div>
              </div>
            </div>

            {/* Zakat amount highlight — only when due */}
            {summary.zakatDue && (
              <div className={styles.zakatAmountCard}>
                <div className={styles.zakatAmountLabel}>Zakat payable</div>
                <div className={styles.zakatAmountValue}>
                  {fmt(summary.zakatAmount)} DZD
                </div>
                <div className={styles.zakatAmountSub}>
                  {summary.rate}% of {fmt(summary.inventoryValue)} DZD inventory
                  · Due since {fmtDate(summary.dueDate)}
                </div>
              </div>
            )}

            {/* Time progress */}
            <div className={styles.progressCard}>
              <div className={styles.progressHeader}>
                <p className={styles.progressTitle}>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <CalendarDays
                      size={16}
                      style={{ color: "var(--accent)" }}
                    />
                    Hijri year progress
                  </span>
                </p>
                <span className={styles.progressPercent}>
                  {summary.progressPercent}%
                </span>
              </div>

              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${
                    summary.oneYearPassed ? styles.complete : ""
                  }`}
                  style={{ width: `${summary.progressPercent}%` }}
                />
              </div>

              <div className={styles.progressMeta}>
                <span>Started {fmtDate(summary.startDate)}</span>
                <span>
                  {summary.oneYearPassed
                    ? "One Hijri year completed"
                    : `${summary.daysElapsed} / 354 days elapsed · ${summary.daysRemaining} days left`}
                </span>
              </div>
            </div>

            {/* Nisab status row */}
            <div className={styles.panel} style={{ marginBottom: 28 }}>
              <div className={styles.configRow}>
                <span className={styles.configKey}>Nisab met</span>
                <span
                  className={`${styles.badge} ${
                    summary.reachedNisab ? styles.success : styles.warning
                  }`}
                >
                  {summary.reachedNisab ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <AlertTriangle size={12} />
                  )}
                  {summary.reachedNisab
                    ? `Yes — ${fmt(summary.inventoryValue - summary.nisab)} DZD above threshold`
                    : `No — ${fmt(summary.nisab - summary.inventoryValue)} DZD short`}
                </span>
              </div>
              <div className={styles.configRow}>
                <span className={styles.configKey}>One year elapsed</span>
                <span
                  className={`${styles.badge} ${
                    summary.oneYearPassed ? styles.success : styles.info
                  }`}
                >
                  {summary.oneYearPassed ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Clock size={12} />
                  )}
                  {summary.oneYearPassed
                    ? "Yes"
                    : `In ${summary.daysRemaining} days`}
                </span>
              </div>
              <div className={styles.configRow}>
                <span className={styles.configKey}>Zakat due</span>
                <span
                  className={`${styles.badge} ${
                    summary.zakatDue ? styles.success : styles.info
                  }`}
                >
                  {summary.zakatDue ? (
                    <ShieldCheck size={12} />
                  ) : (
                    <Clock size={12} />
                  )}
                  {summary.zakatDue ? "Yes — payable now" : "Not yet"}
                </span>
              </div>
              {summary.label && (
                <div className={styles.configRow}>
                  <span className={styles.configKey}>Cycle label</span>
                  <span className={styles.configVal}>{summary.label}</span>
                </div>
              )}
            </div>

            {/* ─── Settings accordion ─────────────────────────────────────── */}
            <div className={styles.panel}>
              <button
                className={`${styles.accordionBtn} ${settingsOpen ? styles.open : ""}`}
                onClick={() => setSettingsOpen((o) => !o)}
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <Settings2 size={16} style={{ color: "var(--accent)" }} />
                  Configuration
                </span>
                <ChevronDown size={18} />
              </button>

              {settingsOpen && (
                <div className={styles.accordionBody}>
                  {editError && (
                    <div
                      className={styles.errorBanner}
                      style={{ marginBottom: 16 }}
                    >
                      <AlertTriangle size={16} />
                      {editError}
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--foreground-muted)",
                      margin: "0 0 18px",
                      lineHeight: 1.6,
                    }}
                  >
                    Updating the Nisab or start date will reset the satisfaction
                    state so the new cycle is evaluated from scratch.
                  </p>

                  <div className={styles.formGrid}>
                    <div className={styles.formField}>
                      <label className={styles.label}>Nisab (DZD)</label>
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        value={edit.nisab}
                        onChange={(e) =>
                          setEdit((s) => ({ ...s, nisab: e.target.value }))
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Start date</label>
                      <input
                        className={styles.input}
                        type="date"
                        value={edit.startDate}
                        onChange={(e) =>
                          setEdit((s) => ({ ...s, startDate: e.target.value }))
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Label</label>
                      <input
                        className={styles.input}
                        type="text"
                        placeholder="e.g. 1446 AH"
                        value={edit.label}
                        onChange={(e) =>
                          setEdit((s) => ({ ...s, label: e.target.value }))
                        }
                      />
                    </div>

                    <div className={styles.formField}>
                      <label className={styles.label}>Rate (%)</label>
                      <input
                        className={styles.input}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={edit.rate}
                        onChange={(e) =>
                          setEdit((s) => ({ ...s, rate: e.target.value }))
                        }
                      />
                    </div>

                    <div
                      className={`${styles.formField} ${styles.fullWidth} ${styles.formActions}`}
                    >
                      <button
                        className={styles.btnDanger}
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <span className={styles.spin}>
                            <Loader2 size={16} />
                          </span>
                        ) : (
                          <Trash2 size={16} />
                        )}
                        {deleting ? "Deleting…" : "Delete config"}
                      </button>

                      <button
                        className={styles.btnSecondary}
                        onClick={() => setSettingsOpen(false)}
                      >
                        Cancel
                      </button>

                      <button
                        className={styles.btnPrimary}
                        onClick={handleUpdate}
                        disabled={editLoading}
                      >
                        {editLoading ? (
                          <span className={styles.spin}>
                            <Loader2 size={16} />
                          </span>
                        ) : (
                          <TrendingUp size={16} />
                        )}
                        {editLoading ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
