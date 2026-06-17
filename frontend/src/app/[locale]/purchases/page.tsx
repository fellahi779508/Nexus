"use client";
import { Meta, Purchase } from "@/utils/types";
import { useCallback, useEffect, useState } from "react";
import styles from "./purchases.module.css";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Receipt,
  TrendingUp,
  Users,
  AlertCircle,
  LayoutDashboard,
  Package,
  ShoppingCart,
  DeleteIcon,
  Coins,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAllPurchases, getAllPurchases } from "@/api/purchase-api";
import PasswordGate from "@/components/owner/passwordGate";

export default function Purchases() {
  const t = useTranslations("purchasesPage");
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getAllPurchases(page, 10, debouncedSearch);
    if (res.status === 1) {
      setPurchases(res.response.data);
      setMeta(res.response.meta);
      setTotalPurchases(res.response.totalAmount);
    } else {
      setError(res.error.message);
    }
    setLoading(false);
  }, [page, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchPurchases();
  }, [page, debouncedSearch]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("fr-DZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getPaymentBadgeClass = (method: string) => {
    switch (method?.toLowerCase()) {
      case "cash":
      case "espèces":
        return styles.badgeSuccess;
      case "card":
      case "carte":
        return styles.badgeInfo;
      case "cheque":
      case "chèque":
        return styles.badgeWarning;
      default:
        return styles.badgeDefault;
    }
  };

  const totalRevenue = purchases.reduce((sum, s) => sum + s.total, 0);
  const totalPaid = purchases.reduce((sum, s) => sum + s.paid, 0);
  const uniqueClients = new Set(
    purchases.filter((s) => s.supplier).map((s) => s.supplier!.id),
  ).size;

  const pageNumbers = Array.from({ length: meta.pages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === meta.pages || Math.abs(p - page) <= 1)
    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
      acc.push(p);
      return acc;
    }, []);
  async function removeAllPurchases() {
    if (!window.confirm(t("confirmPurchaseDelete"))) {
      return;
    }
    const res = await clearAllPurchases();
    if (res.status === 1) {
      alert(t("succsessDeleteAllPurchases"));
      fetchPurchases();
    } else {
      alert(t("errorDeleteAllPurchases"));
    }
  }
  const [locked, setLocked] = useState(false);
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
        <PasswordGate ns="settings" onSuccess={() => setLocked(true)} />
      </div>
    );
  return (
    <div className={styles.container}>
      <title>Nexus | Purchases</title>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.headerIconWrap}>
            <LayoutDashboard className={styles.headerIcon} />
          </div>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>{t("title")}</h1>
            <span className={styles.titleSub}>
              {" "}
              {t("subtitle", { total: meta.total })}
            </span>
          </div>
        </div>

        <div className={styles.quickActions}>
          <Link
            href="/purchase"
            className={`${styles.actionButton} ${styles.actionSale}`}
          >
            <ShoppingCart size={15} className={styles.btnIcon} />
            {t("actions.purchase")}
          </Link>
          <button
            className={`${styles.actionButton} ${styles.actionDelete}`}
            onClick={removeAllPurchases}
          >
            <DeleteIcon size={15} className={styles.btnIcon} />
            {t("actions.deleteAll")}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} data-type="accent">
            <Receipt size={16} />
          </div>
          <div>
            <p className={styles.statLabel}>{t("stats.totalPurchases")}</p>
            <p className={styles.statValue}>{meta.total}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} data-type="info">
            <Coins size={16} />
          </div>
          <div>
            <p className={styles.statLabel}>{t("stats.total")}</p>
            <p className={styles.statValue}>{totalPurchases}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} data-type="success">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className={styles.statLabel}>{t("stats.totalRevenue")}</p>
            <p className={styles.statValue}>{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} data-type="warning">
            <TrendingUp size={16} />
          </div>
          <div>
            <p className={styles.statLabel}>{t("stats.totalPaid")}</p>
            <p className={styles.statValue}>{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loadingState}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeleton} style={{ width: "5%" }} />
                <div className={styles.skeleton} style={{ width: "12%" }} />
                <div className={styles.skeleton} style={{ width: "18%" }} />
                <div className={styles.skeleton} style={{ width: "12%" }} />
                <div className={styles.skeleton} style={{ width: "12%" }} />
                <div className={styles.skeleton} style={{ width: "10%" }} />
                <div className={styles.skeleton} style={{ width: "13%" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <AlertCircle size={32} className={styles.errorIcon} />
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryBtn} onClick={fetchPurchases}>
              {t("retry")}
            </button>
          </div>
        ) : purchases.length === 0 ? (
          <div className={styles.emptyState}>
            <Receipt size={40} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>{t("empty.title")}</p>
            <p className={styles.emptyDesc}>{t("empty.desc")}</p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>{t("table.id")}</th>
                <th className={styles.th}>{t("table.date")}</th>
                <th className={styles.th}>{t("table.supplier")}</th>
                <th className={styles.th}>{t("table.items")}</th>
                <th className={styles.th}>{t("table.total")}</th>
                <th className={styles.th}>{t("table.paid")}</th>
                <th className={styles.th}>{t("table.payment")}</th>
                <th className={styles.th}>{t("table.balance")}</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((sale) => {
                const balance = sale.total - sale.paid;
                return (
                  <tr
                    key={sale.id}
                    className={styles.tr}
                    onClick={() => router.push(`/purchases/${sale.id}`)}
                  >
                    <td className={styles.td}>
                      <span className={styles.idBadge}>#{sale.id}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.dateText}>
                        {formatDate(sale.date)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {sale.supplier ? (
                        <div className={styles.clientCell}>
                          <div className={styles.clientAvatar}>
                            {sale.supplier.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={styles.clientName}>
                              {sale.supplier.name}
                            </p>
                            {sale.supplier.phone && (
                              <p className={styles.clientPhone}>
                                {sale.supplier.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className={styles.noClient}>
                          {t("table.walkIn")}
                        </span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.itemCount}>
                        {sale.purchasedItems.length} {t("table.itemsUnit")}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.amountText}>
                        {formatCurrency(sale.total)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.paidText}>
                        {formatCurrency(sale.paid)}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span
                        className={`${styles.badge} ${getPaymentBadgeClass(sale.payment_method)}`}
                      >
                        {sale.payment_method || t("table.unknown")}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {balance <= 0 ? (
                        <span
                          className={`${styles.badge} ${styles.badgeSuccess}`}
                        >
                          {t("table.settled")}
                        </span>
                      ) : (
                        <span
                          className={`${styles.badge} ${styles.badgeDanger}`}
                        >
                          {formatCurrency(balance)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>

          <div className={styles.pageNumbers}>
            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`${styles.pageNumber} ${page === p ? styles.pageActive : ""}`}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              ),
            )}
          </div>

          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
          >
            <ChevronRight size={16} />
          </button>

          <span className={styles.pageInfo}>
            {t("pageInfo", { page, pages: meta.pages })}
          </span>
        </div>
      )}
    </div>
  );
}
