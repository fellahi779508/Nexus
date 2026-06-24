"use client";

import api from "@/utils/api";
import { Category, Meta, Product } from "@/utils/types";
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
import Link from "next/link";
import styles from "./products.module.css";
import ProductModal from "@/components/products/add-product";
import { getAllProducts } from "@/api/products-api";
import ProductSelectOptions from "@/components/products/product-select-options";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/components/products/breadcrumb";

export default function Products() {
  const t = useTranslations("products");

  const [products, setProducts] = useState<Product[]>([]);
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
  const [productSelectOptionsOpen, setProductSelectOptionsOpen] =
    useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [updateProduct, setUpdateProduct] = useState(false);
  const [successToast, setSuccessToast] = useState(true);

  const params = new URLSearchParams(window.location.search);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setSearch(params?.get("search") || "");
  }, [params.get("search")]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessToast(false);
    try {
      const response = await getAllProducts(page, debouncedSearch);
      const mapped = response.response.data.map(
        (p: Product & { category: Category }) => ({
          ...p,
          category: p.category,
        }),
      );

      setProducts(mapped);
      setMeta(response.response.meta);
    } catch (err: unknown) {
      setError(t("errorLoad"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, t]);

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, successToast, page]);

  return (
    <div className={styles.page}>
      <title>Nexus | Products</title>
      {/* ── Header ── */}
      {params.get("search") && (
        <Breadcrumb
          items={[
            { label: "products", link: "/products" },
            { label: "categories", link: "/categories" },
            { label: params.get("search") || "" },
          ]}
        />
      )}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t("title")}</h1>
          <span className={styles.totalBadge}>
            {t("total", { count: meta.total })}
          </span>
        </div>
        <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
          <Plus size={16} strokeWidth={2.5} />
          <span>{t("addProduct")}</span>
        </button>
      </div>

      {/* ── Search ── */}
      {params.get("search") == null && (
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
                fetchProducts();
              }}
            >
              <span>{t("refresh")}</span>
              <RefreshCcw size={16} />
            </div>
          </div>
        </div>
      )}

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
      {!loading && !error && products.length === 0 && (
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
      {!loading && !error && products.length > 0 && (
        <>
          <div className={styles.grid}>
            {products.map((product, i) => (
              <div
                key={product.id}
                className={styles.card}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => {
                  setSelectedProductId(product.id);
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
                  <h3 className={styles.cardName}>{product.name}</h3>
                  <div className={styles.cardCategory}>
                    <Tag size={11} strokeWidth={2} />
                    <span>{product.category?.name || t("noCategory")}</span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.cardId}>
                    {t("productId", { id: product.id })}
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
                onClick={() => {
                  setPage((p) => Math.max(1, p - 1));
                  setSuccessToast(true);
                }}
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
        <ProductModal
          isUpdate={false}
          setModalOpen={setModalOpen}
          setSuccessToast={setSuccessToast}
        />
      )}
      {productSelectOptionsOpen && selectedProductId && (
        <ProductSelectOptions
          setUpdateProduct={setUpdateProduct}
          productId={selectedProductId}
          setProductSelectOptionsOpen={setProductSelectOptionsOpen}
          setSuccessToast={setSuccessToast}
        />
      )}
      {updateProduct && (
        <ProductModal
          isUpdate={updateProduct}
          product_id={selectedProductId!}
          setModalOpen={setUpdateProduct}
          setSuccessToast={setSuccessToast}
        />
      )}
    </div>
  );
}
