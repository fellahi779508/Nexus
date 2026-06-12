// app/dashboard/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  getTodaysCosts,
  getTodaysLosses,
  getTodaysProfits,
  getTodaysPurchases,
  getTodaysSales,
} from "@/api/owner-api";
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  TrendingDown,
  ShoppingCart,
  Package,
  AlertTriangle,
} from "lucide-react";
import styles from "./dashboard.module.css";
import Link from "next/link";

/* ── Type definitions matching your backend responses ── */
interface Variant {
  id: number;
  name: string;
  purchasePrice: number;
  sellingPriceHT: number;
  vatRate: number;
  sellingPriceTTC: number;
  profit: number;
  profitRate: number;
  profitTTC: number;
  promotionPrice: number | null;
  promotionRate: number | null;
  barcode: string;
  size: string | null;
  color: string | null;
  weight: string | null;
  height: string | null;
  flavor: string | null;
  PPA: string;
  createdAt: string;
  updatedAt: string;
}

interface Batch {
  id: number;
  variant: Variant;
  nLot: string;
  status: string;
  stockQTYStatus: string;
  fabricationDate: string | null;
  expirationDate: string | null;
  alertPeriodPerDay: number | null;
  alertPeriodPerStock: number | null;
  createdAt: string;
  updatedAt: string;
}

interface SoldItem {
  id: number;
  unit: number;
  qtePerUnit: number;
  quantity: number;
  total: number;
  batch: Batch;
}

interface Sale {
  id: number;
  total: number;
  paid: number;
  date: string;
  soldItems: SoldItem[];
}

interface ProfitResponse {
  total: number;
  data: Sale[];
}

interface PurchasedItem {
  id: number;
  quantity: number;
  unit: string;
  qtePerUnit: number;
  total: number;
  batch: {
    id: number;
    variant: {
      id: number;
      name: string;
      purchasePrice: number;
    };
  };
}

interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

interface Purchase {
  id: number;
  total: number;
  supplierId?: number;
  paid: number;
  remise: boolean;
  isDetailed: boolean;
  remiseAmount: number;
  date: string;
  supplier?: Supplier;
  purchasedItems: PurchasedItem[];
}

interface CostResponse {
  totalCost: number;
  totalCredit: number;
  data: Purchase[];
}

interface LossLog {
  id: number;
  timestamp: string;
  entityType: string;
  action: string;
  reason: string;
  quantity: number;
  stock: {
    id: number;
    quantity: number;
    batch: {
      id: number;
      variant: {
        purchasePrice: number;
      };
    };
  };
}

interface LossResponse {
  totalLoss: number;
  data: LossLog[];
}

/* ── Metric Card ── */
function MetricCard({
  icon,
  label,
  value,
  accent,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: "success" | "info" | "danger" | "warning";
  subtitle?: string;
}) {
  return (
    <div className={`${styles.card} ${styles[`card--${accent}`]}`}>
      <div className={styles.cardTop}>
        <span className={styles.cardLabel}>{label}</span>
        <div className={styles.cardBadge}>{icon}</div>
      </div>
      <div className={styles.cardBottom}>
        <span className={styles.cardValue}>{value}</span>
        {subtitle && <span className={styles.cardSubtitle}>{subtitle}</span>}
      </div>
    </div>
  );
}

/* ── Today's date label ── */
function TodayLabel({ liveText }: { liveText: string }) {
  const locale = useLocale();
  const now = new Date();

  const localeMap: Record<string, string> = {
    ar: "ar-DZ",
    fr: "fr-FR",
    en: "en-GB",
  };

  const label = now.toLocaleDateString(localeMap[locale] ?? "en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.dateBanner}>
      <span className={styles.dateDot} />
      {liveText} · {label.toUpperCase()}
    </div>
  );
}

export default function Dashboard() {
  const t = useTranslations("dashboard");
  const g = useTranslations();
  const locale = useLocale();

  const localeMap: Record<string, string> = {
    ar: "ar-DZ",
    fr: "fr-FR",
    en: "en-GB",
  };
  const displayLocale = localeMap[locale] ?? "en-GB";

  const [profits, setProfits] = useState<ProfitResponse | null>(null);
  const [costs, setCosts] = useState<CostResponse | null>(null);
  const [losses, setLosses] = useState<LossResponse | null>(null);
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profitsRes, costsRes, lossesRes, salesRes, purchasesRes] =
        await Promise.all([
          getTodaysProfits(),
          getTodaysCosts(),
          getTodaysLosses(),
          getTodaysSales(),
          getTodaysPurchases(),
        ]);

      setProfits(profitsRes.response);
      setCosts(costsRes.response);
      setLosses(lossesRes.response);
      setSales(salesRes.response);
      setPurchases(purchasesRes.response);
    } catch (err: any) {
      setError(err?.message ?? t("error.default"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    getData();
  }, [getData]);

  /* ── Derived numbers ── */
  const totalProfit = profits?.total ?? 0;
  const totalCost = costs?.totalCost ?? 0;
  const totalCredit = costs?.totalCredit ?? 0;
  const totalLoss = losses?.totalLoss ?? 0;

  const salesList = sales ?? [];
  const purchasesList = purchases ?? [];
  const lossesList = losses?.data ?? [];

  return (
    <>
      <title>Nexus | Dashboard</title>
      <div className={styles.dashboard}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.headerIconWrap}>
              <LayoutDashboard className={styles.headerIcon} />
            </div>
            <div className={styles.titleGroup}>
              <h1 className={styles.title}>{t("title")}</h1>
              <span className={styles.titleSub}>{t("subtitle")}</span>
            </div>
          </div>

          <div className={styles.quickActions}>
            <Link
              href="/sale"
              className={`${styles.actionButton} ${styles.actionSale}`}
            >
              <ShoppingCart size={15} className={styles.btnIcon} />
              {t("actions.quickSale")}
            </Link>
            <Link
              href={"/purchase"}
              className={`${styles.actionButton} ${styles.actionPurchase}`}
            >
              <Package size={15} className={styles.btnIcon} />
              {t("actions.quickPurchase")}
            </Link>
          </div>
        </header>

        {/* ── Loading ── */}
        {loading && (
          <div className={styles.loadingWrapper}>
            <div className={styles.spinnerRing} />
            <span className={styles.loadingText}>{t("loading")}</span>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className={styles.errorCard}>
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={() => getData()} className={styles.retryBtn}>
              {t("error.retry")}
            </button>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && (
          <>
            {/* Date banner */}
            <TodayLabel liveText={t("dateBanner.live")} />

            {/* ── Key Metrics Grid ── */}
            <div className={styles.metricsGrid}>
              <MetricCard
                icon={<TrendingUp size={15} />}
                label={t("metrics.profit")}
                value={`${totalProfit.toLocaleString(displayLocale)} ${g("currency")}`}
                accent="success"
              />
              <MetricCard
                icon={<DollarSign size={15} />}
                label={t("metrics.costs")}
                value={`${totalCost.toLocaleString(displayLocale)} ${g("currency")}`}
                accent="info"
                subtitle={`${t("metrics.credit")} · ${totalCredit.toLocaleString(displayLocale)} ${g("currency")}`}
              />
              <MetricCard
                icon={<TrendingDown size={15} />}
                label={t("metrics.losses")}
                value={`${totalLoss.toLocaleString(displayLocale)} ${g("currency")}`}
                accent="danger"
              />
              <MetricCard
                icon={<ShoppingCart size={15} />}
                label={t("metrics.salesVolume")}
                value={salesList.length}
                accent="success"
                subtitle={`${salesList
                  .reduce((s, x) => s + (x.total ?? 0), 0)
                  .toLocaleString(displayLocale)} ${g("currency")}`}
              />
              <MetricCard
                icon={<Package size={15} />}
                label={t("metrics.purchases")}
                value={purchasesList.length}
                accent="info"
                subtitle={`${purchasesList
                  .reduce((s, x) => s + (x.total ?? 0), 0)
                  .toLocaleString(displayLocale)} ${g("currency")}`}
              />
            </div>

            {/* ── Sales & Purchases in 2-col layout ── */}
            <div className={styles.sectionsGrid}>
              {/* Sales */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <ShoppingCart size={14} />
                    {t("sections.latestSales")}
                  </h2>
                  <span className={styles.sectionCount}>
                    {salesList.length}
                  </span>
                </div>

                {salesList.length === 0 ? (
                  <p className={styles.empty}>{t("empty.noSales")}</p>
                ) : (
                  <ul className={styles.list}>
                    {salesList.map((sale) => (
                      <Link
                        href={`/sales/${sale.id}`}
                        key={sale.id}
                        className={styles.listItem}
                      >
                        <div className={styles.listItemHeader}>
                          <span className={styles.listItemId}>
                            {t("labels.sale")} #{sale.id}
                          </span>
                          <span className={styles.listItemDate}>
                            {sale.date}
                          </span>
                        </div>
                        <div className={styles.listItemAmounts}>
                          {t("labels.total")}{" "}
                          <strong>
                            {sale.total.toLocaleString(displayLocale)}{" "}
                            {g("currency")}
                          </strong>
                          {" · "}
                          {t("labels.paid")}{" "}
                          <strong>
                            {sale.paid.toLocaleString(displayLocale)}{" "}
                            {g("currency")}
                          </strong>
                        </div>
                        <div className={styles.listItemItems}>
                          {sale.soldItems.map((item) => (
                            <span key={item.id} className={styles.itemChip}>
                              {item.quantity}×{" "}
                              {item.qtePerUnit ? item.qtePerUnit : ""}x{" "}
                              {item.batch.variant.name}
                            </span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </ul>
                )}
              </section>

              {/* Purchases */}
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <Package size={14} />
                    {t("sections.latestPurchases")}
                  </h2>
                  <span className={styles.sectionCount}>
                    {purchasesList.length}
                  </span>
                </div>

                {purchasesList.length === 0 ? (
                  <p className={styles.empty}>{t("empty.noPurchases")}</p>
                ) : (
                  <ul className={styles.list}>
                    {purchasesList.map((p) => (
                      <Link
                        key={p.id}
                        href={`/purchases/${p.id}`}
                        className={styles.listItem}
                      >
                        <div className={styles.listItemHeader}>
                          <span className={styles.listItemId}>
                            {t("labels.purchaseOrder")} #{p.id}
                          </span>
                          <span className={styles.listItemDate}>{p.date}</span>
                        </div>
                        <div className={styles.listItemAmounts}>
                          {t("labels.amount")}{" "}
                          <strong>
                            {p.total.toLocaleString(displayLocale)}{" "}
                            {g("currency")}
                          </strong>
                          {" · "}
                          {t("labels.remaining")}{" "}
                          <strong>
                            {(p.total - p.paid).toLocaleString(displayLocale)}{" "}
                            {g("currency")}
                          </strong>
                        </div>
                        <div className={styles.listItemSupplier}>
                          {p.supplier ? p.supplier.name : "-"}
                        </div>
                        <div className={styles.listItemItems}>
                          {p.purchasedItems?.map((item) => (
                            <span key={item.id} className={styles.itemChip}>
                              {item.quantity}× {item.batch.variant.name}
                            </span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </ul>
                )}
              </section>

              {/* Losses — full width */}
              <section className={`${styles.section} ${styles.sectionFull}`}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <AlertTriangle size={14} />
                    {t("sections.damagedExpired")}
                  </h2>
                  <span className={styles.sectionCount}>
                    {lossesList.length}
                  </span>
                </div>

                {lossesList.length === 0 ? (
                  <p className={styles.empty}>{t("empty.noLosses")}</p>
                ) : (
                  <ul className={styles.list}>
                    {lossesList.map((log) => (
                      <li
                        key={log.id}
                        className={`${styles.listItem} ${styles.lossItem}`}
                      >
                        <div className={styles.listItemHeader}>
                          <span
                            className={`${styles.badge} ${
                              log.reason === "damaged"
                                ? styles.badgeDanger
                                : styles.badgeWarning
                            }`}
                          >
                            {t(`labels.lossReason.${log.reason}`)}
                          </span>
                          <span className={styles.listItemTime}>
                            {new Date(log.timestamp).toLocaleTimeString(
                              displayLocale,
                            )}
                          </span>
                        </div>
                        <div className={styles.listItemAmounts}>
                          {t("labels.qty")} <strong>{log.quantity}</strong>
                          {" · "}
                          {t("labels.lost")}{" "}
                          <strong>
                            {(
                              log.quantity *
                              log.stock.batch.variant.purchasePrice
                            ).toLocaleString(displayLocale)}{" "}
                            {g("currency")}
                          </strong>
                        </div>
                        <div className={styles.listItemSupplier}>
                          {t("labels.batch")} #{log.stock.batch.id} ·{" "}
                          {t("labels.stock")} #{log.stock.id}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
