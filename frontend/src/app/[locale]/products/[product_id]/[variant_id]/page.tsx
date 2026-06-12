"use client";
import Breadcrumb from "@/components/products/breadcrumb";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { getAllBatchesOfVariant } from "@/api/variant-api";
import { useCallback, useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import styles from "./variant-details.module.css";
import {
  Search,
  RefreshCcw,
  Plus,
  Loader2,
  AlertCircle,
  Layers,
  Tag,
  Package,
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AddBatchModal from "@/components/batches/add-batch";
import { Meta, Supplier } from "@/utils/types";
import BatchSelectOptions from "@/components/batches/batch-select-options";

/* ── types ───────────────────────────────────────────────────────────────── */

type Stock = {
  id: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

type Batch = {
  id: number;
  nLot: string;
  status: "ok" | "expiring" | "expired";
  stockQTYStatus: "ok" | "low" | "empty";
  fabricationDate: string;
  expirationDate: string;
  alertPeriodPerDay: number;
  alertPeriodPerStock: number;
  stock: Stock;
  createdAt: string;
  updatedAt: string;
  supplier: Supplier;
};

type Variant = {
  id: number;
  name: string;
  barcode: string;
  purchasePrice: number;
  sellingPriceHT: number;
  sellingPriceTTC: number;
  vatRate: number;
  profit: number;
  profitRate: number;
  promotionPrice: number;
  promotionRate: number;
  PPA: string;
  size: string | null;
  color: string | null;
  weight: number | null;
  height: number | null;
  flavor: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ── helpers ─────────────────────────────────────────────────────────────── */

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(n?: number) {
  if (n == null) return "—";
  return n.toFixed(2);
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function VariantDetails() {
  const param = useParams();
  const t = useTranslations("variantDetails");
  const g = useTranslations();

  const [variant, setVariant] = useState<Variant | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(0);
  const [openOptions, setOpenOptions] = useState(false);

  /* ── debounce search — same as categories ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── fetch — deps match categories pattern ── */
  const getBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await getAllBatchesOfVariant(
      Number(param?.variant_id) || 0,
      page,
      10,
      debouncedSearch,
    );
    if (response.status === 1) {
      setVariant(response.response.variant);
      setBatches(response.response.data);
      setMeta(response.response.meta);
      setSuccessToast(false);
    } else {
      setError(response.response ?? t("errorLoad"));
      toast.error(response.response ?? t("errorLoad"));
    }
    setLoading(false);
  }, [page, debouncedSearch, t]);

  /* ── trigger — same as categories ── */
  useEffect(() => {
    loadCategories();
  }, [page, successToast, debouncedSearch]);

  /* alias so the pattern reads identically to categories */
  function loadCategories() {
    getBatches();
  }
  const [fromStock, setFromStock] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFromStock(params.get("fromStock") === "true");
    setSearch(params.get("lot") || "");
  }, []);
  /* ── status helpers ── */
  function statusIcon(status: Batch["status"]) {
    if (status === "expired") return <XCircle size={13} strokeWidth={2.5} />;
    if (status === "expiring")
      return <AlertTriangle size={13} strokeWidth={2.5} />;
    return <CheckCircle2 size={13} strokeWidth={2.5} />;
  }

  function qtyIcon(s: Batch["stockQTYStatus"]) {
    if (s === "empty") return <XCircle size={13} strokeWidth={2.5} />;
    if (s === "low") return <AlertTriangle size={13} strokeWidth={2.5} />;
    return <CheckCircle2 size={13} strokeWidth={2.5} />;
  }

  return (
    <div className={styles.page}>
      <title>Nexus | Batches</title>
      {fromStock ? (
        <Breadcrumb
          items={[
            { label: t("breadcrumb.stock"), link: "/stock" },
            { label: t("breadcrumb.stock") },
          ]}
        />
      ) : (
        <Breadcrumb
          items={[
            { label: t("breadcrumb.products"), link: "/products" },
            {
              label: t("breadcrumb.product"),
              link: `/products/${param.product_id?.toString()}`,
            },
            { label: variant?.name ?? param.variant_id?.toString() ?? "" },
          ]}
        />
      )}

      {/* ══ Hero ══════════════════════════════════════════════════════ */}
      {variant && (
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.heroIcon}>
              <Layers size={22} strokeWidth={1.5} />
            </div>
            <div className={styles.heroMeta}>
              <p className={styles.eyebrow}>{t("hero.eyebrow")}</p>
              <h1 className={styles.heroName}>{variant.name}</h1>
              <div className={styles.heroBadges}>
                <span className={styles.badge}>
                  <Tag size={11} strokeWidth={2} />
                  {variant.barcode}
                </span>
                {variant.size && (
                  <span className={styles.badge}>
                    {t("hero.size")} {variant.size}
                  </span>
                )}
                {variant.color && (
                  <span className={styles.badge}>
                    {t("hero.color")} {variant.color}
                  </span>
                )}
                {variant.flavor && (
                  <span className={styles.badge}>
                    {t("hero.flavor")} {variant.flavor}
                  </span>
                )}
                {variant.weight && (
                  <span className={styles.badge}>{variant.weight}g</span>
                )}
                {variant.height && (
                  <span className={styles.badge}>{variant.height}cm</span>
                )}
              </div>
            </div>
            <div className={styles.heroId}>#{variant.id}</div>
          </div>

          <div className={styles.pricingGrid}>
            {[
              {
                label: t("hero.purchasePrice"),
                value: formatPrice(variant.purchasePrice) + " " + g("currency"),
                cls: "",
              },
              {
                label: t("hero.sellingHT"),
                value:
                  formatPrice(variant.sellingPriceHT) + " " + g("currency"),
                cls: "",
              },
              {
                label: t("hero.sellingTTC"),
                value:
                  formatPrice(variant.sellingPriceTTC) + " " + g("currency"),
                cls: "priceAccent",
              },
              {
                label: t("hero.PPA"),
                value:
                  formatPrice(variant.PPA ? Number(variant.PPA) : 0) +
                  " " +
                  g("currency"),
                cls: "priceAccent",
              },
              { label: t("hero.vat"), value: `${variant.vatRate}%`, cls: "" },
              {
                label: t("hero.profit"),
                value: formatPrice(variant.profit) + " " + g("currency"),
                cls: "priceGreen",
              },
              {
                label: t("hero.profitRate"),
                value: `${variant.profitRate ? variant.profitRate : 0}%`,
                cls: "priceGreen",
              },
              {
                label: t("hero.promotion"),
                value:
                  formatPrice(
                    variant.promotionPrice ? variant.promotionPrice : 0,
                  ) +
                  " " +
                  g("currency"),
                cls: "",
              },
              {
                label: t("hero.promotionRate"),
                value: `${variant.promotionRate ? variant.promotionRate : 0}%`,
                cls: "",
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className={styles.priceCard}>
                <span className={styles.priceLabel}>{label}</span>
                <span
                  className={`${styles.priceValue} ${cls ? styles[cls as keyof typeof styles] : ""}`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ Batches ═══════════════════════════════════════════════════ */}
      <div className={styles.section}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Package size={15} strokeWidth={2} />
            <h2 className={styles.title}>{t("batches.title")}</h2>
            <span className={styles.totalBadge}>{meta.total}</span>
          </div>
          <button className={styles.addBtn} onClick={() => setOpenModal(true)}>
            <Plus size={16} strokeWidth={2.5} />
            <span>{t("batches.add")}</span>
          </button>
        </div>

        {/* ── Search ── */}
        <div className={styles.searchRow}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={t("batches.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearBtn} onClick={() => setSearch("")}>
                ×
              </button>
            )}
            <div
              className={styles.refreshBtn}
              onClick={() => {
                setSearch("");
                loadCategories();
              }}
            >
              <span>{t("refresh")}</span>
              <RefreshCcw size={16} />
            </div>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className={styles.errorState}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div className={styles.loadingState}>
            <Loader2 size={22} className={styles.spinner} />
            <span>{t("loading")}</span>
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !error && batches.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Package size={32} strokeWidth={1.2} />
            </div>
            <p className={styles.emptyTitle}>
              {debouncedSearch ? t("batches.emptySearch") : t("batches.empty")}
            </p>
          </div>
        )}

        {/* ── Table ── */}
        {!loading && !error && batches.length > 0 && (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>{t("col.nLot")}</th>
                    <th className={styles.th}>{t("col.status")}</th>
                    <th className={styles.th}>{t("col.quantity")}</th>
                    <th className={styles.th}>{t("col.qtyStatus")}</th>
                    <th className={styles.th}>{t("col.fabricationDate")}</th>
                    <th className={styles.th}>{t("col.expirationDate")}</th>
                    <th className={styles.th}>{t("col.supplier")}</th>
                    <th className={styles.th}>{t("col.alertDay")}</th>
                    <th className={styles.th}>{t("col.alertStock")}</th>
                    <th className={styles.th}>{t("col.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr
                      key={batch.id}
                      className={`${styles.row} ${batch.status === "expired" ? styles.rowExpired : ""} ${batch.status === "expiring" ? styles.rowExpiring : ""}`}
                    >
                      <td className={styles.td}>
                        <span className={styles.nLot}>
                          {batch.nLot ? batch.nLot : "—"}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.statusBadge} ${styles[`status_${batch.status}`]}`}
                        >
                          {statusIcon(batch.status)}
                          {t(`status.${batch.status}`)}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.qty}>
                          {batch.stock?.quantity ?? "—"}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.qtyBadge} ${styles[`qty_${batch.stockQTYStatus}`]}`}
                        >
                          {qtyIcon(batch.stockQTYStatus)}
                          {t(`qtyStatus.${batch.stockQTYStatus}`)}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.date}>
                          {formatDate(batch.fabricationDate)}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.date} ${batch.status === "expired" ? styles.dateExpired : ""} ${batch.status === "expiring" ? styles.dateExpiring : ""}`}
                        >
                          {formatDate(batch.expirationDate)}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.supplier}>
                          {batch.supplier?.name || "—"}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.alertBadge}>
                          <Bell size={11} strokeWidth={2} />
                          {batch.alertPeriodPerDay}d
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.alertBadge}>
                          <Package size={11} strokeWidth={2} />
                          {batch.alertPeriodPerStock}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <span className={styles.actions}>
                          <button
                            className={styles.editBtn}
                            onClick={() => {
                              setSelectedBatch(batch.id);
                              setOpenOptions(true);
                            }}
                          >
                            {t("batches.actions.edit")}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
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
                  {Array.from({ length: meta.pages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 || p === meta.pages || Math.abs(p - page) <= 1,
                    )
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                        acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
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
          </>
        )}
      </div>

      {openModal && (
        <AddBatchModal
          isUpdate={false}
          setModalOpen={setOpenModal}
          variantId={Number(param?.variant_id)}
          setSuccessToast={setSuccessToast}
        />
      )}
      {openOptions && (
        <BatchSelectOptions
          batchId={selectedBatch.toString()}
          handleOverlayClick={() => setOpenOptions(false)}
          setSuccessToast={setSuccessToast}
        />
      )}
      <ToastContainer />
    </div>
  );
}
