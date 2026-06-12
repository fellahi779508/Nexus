"use client";

import { Category, Meta, Product, Supplier } from "@/utils/types";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  Tag,
  AlertCircle,
  Loader2,
  Plus,
  ArrowRight,
  RefreshCcw,
} from "lucide-react";
import styles from "./suppliers.module.css";
import ProductModal from "@/components/products/add-product";
import { getAllProducts } from "@/api/products-api";
import ProductSelectOptions from "@/components/products/product-select-options";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/products/breadcrumb";
import { getAllSuppliers } from "@/api/supplier-api";
import AddSupllierModal from "@/components/suppliers/add-supplier";
import { toast, ToastContainer } from "react-toastify";
import SupplierSelectOptions from "@/components/suppliers/suppliers-select-options";

export default function Suppliers() {
  const t = useTranslations("suppliers");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 12,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierSelectOptions, setProductSelectOptionsOpen] = useState(false);
  const [selcetdedSupllier, setSelcetdedSupllier] = useState<number | null>(
    null,
  );
  const [isUpdate, setIsUpdate] = useState(false);
  const [updateSupplier, setUpdateSupllier] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await getAllSuppliers(page, 10, debouncedSearch);
    if (response.status === 1) {
      console.log(response.response);

      const mappd = response.response.data.map((supplier: Supplier) => ({
        ...supplier,
      }));
      setSuppliers(mappd);
      setMeta(response.response.meta);
      setLoading(false);
      setSuccessToast(false);
    } else {
      console.log(response.response);

      setError(response.response.message || t("errorLoad"));
    }
  }, [page, debouncedSearch, t]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchSuppliers();
  }, [successToast, page, search]);

  return (
    <div className={styles.page}>
      <title>Nexus | Suppliers</title>
      {/* ── Header ── */}

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t("title")}</h1>
          <span className={styles.totalBadge}>
            {t("total", { count: meta.total })}
          </span>
        </div>
        <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
          <Plus size={16} strokeWidth={2.5} />
          <span>{t("addSupplier")}</span>
        </button>
      </div>

      {/* ── Search ── */}

      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t("searchPlaceholder")}
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
              fetchSuppliers();
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
      {!loading && !error && suppliers.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Package size={32} strokeWidth={1.2} />
          </div>
          <p className={styles.emptyTitle}>{t("emptyTitle")}</p>
          <p className={styles.emptySubtitle}>
            {debouncedSearch
              ? t("emptySearchSubtitle", { query: debouncedSearch })
              : t("emptySubtitle")}
          </p>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && !error && suppliers.length > 0 && (
        <>
          <div className={styles.grid}>
            {suppliers.map((supplier, i) => (
              <div
                key={supplier.id}
                className={styles.card}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => {
                  setSelcetdedSupllier(supplier.id);
                  setProductSelectOptionsOpen(true);
                }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardIcon}>
                    <Package size={20} strokeWidth={1.5} />
                  </div>
                  <ArrowRight size={15} className={styles.cardArrow} />
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.cardName}>{supplier.name}</h3>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.cardId}>
                    {t("supplierId", { id: supplier.id })}
                  </span>
                </div>
              </div>
            ))}
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
      {modalOpen && (
        <>
          {console.log(suppliers)}
          <AddSupllierModal
            isUpdate={false}
            setModalOpen={setModalOpen}
            setSuccessToast={setSuccessToast}
          />
        </>
      )}
      {supplierSelectOptions && selcetdedSupllier && (
        <SupplierSelectOptions
          setSuccessToast={setSuccessToast}
          setUpdateSupplier={setUpdateSupllier}
          SupplierID={selcetdedSupllier}
          setSupplierSelectOptionsOpen={setProductSelectOptionsOpen}
        />
      )}
      {updateSupplier && (
        <AddSupllierModal
          isUpdate={true}
          supplierId={selcetdedSupllier!}
          setModalOpen={setUpdateSupllier}
          setSuccessToast={setSuccessToast}
        />
      )}
      <ToastContainer />
    </div>
  );
}
