"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useTranslations } from "next-intl";
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  X,
  Check,
  AlertTriangle,
  Package,
  ShoppingCart,
  Users,
  Truck,
  CreditCard,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Hash,
  Calendar,
  BarChart2,
  FileText,
} from "lucide-react";
import PasswordGate from "@/components/owner/passwordGate";
import styles from "./history.module.css"; // CSS module
import React from "react";

// ---------- Types (unchanged) ----------
type Client = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
};
type Supplier = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};
type Stock = {
  id: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};
type Batch = {
  id: number;
  nLot?: string;
  fabricationDate?: string;
  expirationDate?: string;
  supplier: Supplier | null;
  stockQTYStatus: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};
type Sale = {
  id: number;
  total: number;
  paid: number;
  remise: boolean;
  timbre: number;
  remiseAmount: number;
  payment_methode: string;
  date: string;
  client: Client | null;
};
type Credit = { id: number; amount: number; date: string };
type Log = {
  id: number;
  timestamp: string;
  entityType: string;
  action: string;
  reason: string;
  quantity: number;
  sale: Sale | null;
  client: Client | null;
  supplier: Supplier | null;
  batch: Batch | null;
  stock: Stock | null;
  credit: Credit | null;
};
type ApiResponse = {
  data: Log[];
  meta: { total: number; page: number; limit: number; pages: number };
};

const ENTITY_TYPES = [
  "sale",
  "stockPayment",
  "stock",
  "batch",
  "credit",
  "supplier",
  "client",
  "product",
];
const ACTION_TYPES = [
  "create",
  "update",
  "delete",
  "payment",
  "adjustment",
  "add",
  "remove",
  "new sale",
  "new credit",
  "remove credit",
  "new purchase",
];

// Helper: get color class for action badge (CSS module classes)
function getActionBadgeClass(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("creat") || a.includes("add")) return styles.badgeCreate;
  if (a.includes("updat") || a.includes("edit")) return styles.badgeUpdate;
  if (a.includes("delet") || a.includes("remov")) return styles.badgeDelete;
  if (a.includes("pay") || a.includes("credit")) return styles.badgeWarning;
  return styles.badgeDefault;
}

function getEntityIcon(type: string) {
  switch (type.toLowerCase()) {
    case "sale":
      return <ShoppingCart size={14} />;
    case "stock":
      return <Package size={14} />;
    case "batch":
      return <Layers size={14} />;
    case "credit":
      return <CreditCard size={14} />;
    case "supplier":
      return <Truck size={14} />;
    case "client":
      return <Users size={14} />;
    default:
      return <FileText size={14} />;
  }
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleString();
}

export default function LogsPage() {
  const t = useTranslations("logs");
  const [locked, setLocked] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [limit, setLimit] = useState(20);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch logs (identical logic to original)
  const fetchLogs = useCallback(
    async (page: number, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = { page, limit };
        if (debouncedSearch) params.search = debouncedSearch;
        const { data } = await axios.get<ApiResponse>(
          "http://localhost:3001/logs",
          { params },
        );
        let filtered = data.data;
        if (selectedEntities.length)
          filtered = filtered.filter((l) =>
            selectedEntities.includes(l.entityType.toLowerCase()),
          );
        if (selectedActions.length)
          filtered = filtered.filter((l) =>
            selectedActions.some((a) => l.action.toLowerCase().includes(a)),
          );
        if (dateFrom)
          filtered = filtered.filter(
            (l) => new Date(l.timestamp) >= new Date(dateFrom),
          );
        if (dateTo)
          filtered = filtered.filter(
            (l) => new Date(l.timestamp) <= new Date(dateTo + "T23:59:59"),
          );
        filtered.sort((a, b) =>
          sortOrder === "asc"
            ? new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
        setLogs(filtered);
        setMeta(data.meta);
      } catch (err) {
        setError(t("errors.fetchFailed"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      debouncedSearch,
      selectedEntities,
      selectedActions,
      dateFrom,
      dateTo,
      sortOrder,
      limit,
      t,
    ],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const toggleEntity = (val: string) =>
    setSelectedEntities((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  const toggleAction = (val: string) =>
    setSelectedActions((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  const clearFilters = () => {
    setSearch("");
    setSelectedEntities([]);
    setSelectedActions([]);
    setDateFrom("");
    setDateTo("");
  };
  const activeFilterCount =
    selectedEntities.length +
    selectedActions.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  async function clearHistory() {
    if (!window.confirm(t("clearHistoryConfirm"))) return;
    try {
      await axios.delete("http://localhost:3001/logs/clear");
      alert(t("clearHistorySuccess"));
      fetchLogs(1);
    } catch {
      alert(t("clearHistoryError"));
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  if (!locked)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100%",
        }}
      >
        <PasswordGate ns="settings" onSuccess={() => setLocked(true)} />;
      </div>
    );

  return (
    <>
      <title>Nexus | History</title>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              <Activity size={24} className={styles.titleIcon} />
              {t("title")}
            </h1>
            <p className={styles.subtitle}>{t("subtitle")}</p>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={() => fetchLogs(meta.page, true)}
              className={styles.btnSecondary}
            >
              <RefreshCw size={14} className={refreshing ? styles.spin : ""} />
              {refreshing ? t("refreshing") : t("refreshTooltip")}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={styles.btnSecondary}
            >
              <Filter size={14} /> {t("filters.title")}
            </button>
            <button onClick={clearHistory} className={styles.btnDanger}>
              <Trash2 size={14} /> {t("clearHistoryBtn")}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t("stats.totalLogs")}</div>
            <div className={styles.statValue}>{meta.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t("stats.today")}</div>
            <div className={styles.statValue}>
              {
                logs.filter(
                  (l) =>
                    new Date(l.timestamp).toDateString() ===
                    new Date().toDateString(),
                ).length
              }
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t("stats.creates")}</div>
            <div className={`${styles.statValue} ${styles.statSuccess}`}>
              {
                logs.filter((l) => l.action.toLowerCase().includes("creat"))
                  .length
              }
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t("stats.deletes")}</div>
            <div className={`${styles.statValue} ${styles.statDanger}`}>
              {
                logs.filter((l) => l.action.toLowerCase().includes("delet"))
                  .length
              }
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t("stats.entities")}</div>
            <div className={styles.statValue}>
              {new Set(logs.map((l) => l.entityType)).size}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>{t("stats.page")}</div>
            <div className={styles.statValue}>
              {meta.page} / {meta.pages}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className={styles.searchInput}
            />
          </div>

          {showFilters && (
            <div className={styles.filtersPanel}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  {t("filters.entity")}
                </label>
                <div className={styles.filterOptions}>
                  {ENTITY_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleEntity(type)}
                      className={`${styles.filterChip} ${selectedEntities.includes(type) ? styles.filterChipActive : ""}`}
                    >
                      {getEntityIcon(type)} {t(`entities.${type}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  {t("filters.action")}
                </label>
                <div className={styles.filterOptions}>
                  {ACTION_TYPES.map((act) => (
                    <button
                      key={act}
                      onClick={() => toggleAction(act)}
                      className={`${styles.filterChip} ${selectedActions.includes(act) ? styles.filterChipActive : ""}`}
                    >
                      {t(`actions.${act}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>
                  {t("filters.dateRange")}
                </label>
                <div className={styles.dateRange}>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={styles.dateInput}
                  />
                  <span>→</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={styles.dateInput}
                  />
                </div>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>{t("sort.label")}</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className={styles.select}
                >
                  <option value="desc">{t("sort.newestFirst")}</option>
                  <option value="asc">{t("sort.oldestFirst")}</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>{t("rowsPerPage")}</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className={styles.select}
                >
                  <option>10</option>
                  <option>20</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className={styles.clearFiltersBtn}
                >
                  {t("filters.clearAll")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Logs Table */}
        <div className={styles.tableContainer}>
          {loading ? (
            <div className={styles.loadingState}>
              <Activity size={32} className={styles.spinner} />
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <AlertTriangle size={24} />
              <p>{error}</p>
              <button
                onClick={() => fetchLogs(meta.page)}
                className={styles.btnSecondary}
              >
                {t("retry")}
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className={styles.emptyState}>
              <Activity size={32} />
              <p>{t("empty.title")}</p>
              <p className={styles.emptyDesc}>{t("empty.description")}</p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th>ID</th>
                  <th>Entity</th>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Timestamp</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={styles.tableRow}
                      onClick={() => toggleExpand(log.id)}
                    >
                      <td className={styles.idCell}>#{log.id}</td>
                      <td>
                        <span
                          className={`${styles.entityBadge} ${styles.badgeDefault}`}
                        >
                          {getEntityIcon(log.entityType)}{" "}
                          {t(`entities.${log.entityType}`)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.actionBadge} ${getActionBadgeClass(log.action)}`}
                        >
                          {t(`actions.${log.action}`)}
                        </span>
                      </td>
                      <td className={styles.descCell}>
                        {log.reason
                          ? t(`reasons.${log.reason}`)
                          : `${t(`entities.${log.entityType}`)} — ${t(`actions.${log.action}`)}`}
                      </td>
                      <td>{formatDate(log.timestamp)}</td>
                      <td>
                        <ChevronDown
                          size={16}
                          className={
                            expandedRowId === log.id ? styles.chevronOpen : ""
                          }
                        />
                      </td>
                    </tr>
                    {expandedRowId === log.id && (
                      <tr className={styles.expandedRow}>
                        <td colSpan={6}>
                          <div className={styles.expandedContent}>
                            <pre>{JSON.stringify(log, null, 2)}</pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && meta.pages > 1 && (
          <div className={styles.pagination}>
            <div className={styles.paginationInfo}>
              {t("pagination.info", {
                page: meta.page,
                pages: meta.pages,
                total: meta.total,
              })}
            </div>
            <div className={styles.paginationButtons}>
              <button
                onClick={() => fetchLogs(meta.page - 1)}
                disabled={meta.page === 1}
                className={styles.pageBtn}
              >
                Previous
              </button>
              {Array.from(
                { length: Math.min(5, meta.pages) },
                (_, i) => i + Math.max(1, meta.page - 2),
              ).map(
                (p) =>
                  p <= meta.pages && (
                    <button
                      key={p}
                      onClick={() => fetchLogs(p)}
                      className={`${styles.pageBtn} ${p === meta.page ? styles.pageBtnActive : ""}`}
                    >
                      {p}
                    </button>
                  ),
              )}
              <button
                onClick={() => fetchLogs(meta.page + 1)}
                disabled={meta.page === meta.pages}
                className={styles.pageBtn}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
