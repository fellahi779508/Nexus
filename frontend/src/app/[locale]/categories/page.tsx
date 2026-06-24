"use client";
import styles from "./categories.module.css";
import { Category, Meta } from "@/utils/types";
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
  List,
  RefreshCcw,
} from "lucide-react";
import { fetchCategories } from "@/api/categories-api";
import AddCategoryModal from "@/components/category/add-category";
import CategorySelectOptions from "@/components/category/category-select-options";

export default function Categories() {
  const t = useTranslations("categories");

  const [categories, setCategories] = useState<Category[]>([]);
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
  const [modalOpen, setModalOpen] = useState(false);
  const [updateCategory, setUpdateCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [categorySelectOptionsOpen, setCategorySelectOptionsOpen] =
    useState(false);
  const [successToast, setSuccessToast] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCategories(page, 12, debouncedSearch);
      const mapped = response.response.data.map((p: Category) => ({
        ...p,
      }));
      setCategories(mapped);
      setSuccessToast(false);
      setMeta(response.response.meta);
    } catch (err: unknown) {
      setError(t("errorLoad"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, t]);

  useEffect(() => {
    loadCategories();
  }, [page, successToast, debouncedSearch]);

  return (
    <>
      <title>Nexus | Categories</title>
      <div className={styles.page}>
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
            <span>{t("addCategory")}</span> {/* ✅ Fixed: was "addProduct" */}
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
        {!loading && !error && categories.length === 0 && (
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
        {!loading && !error && categories.length > 0 && (
          <>
            <div className={styles.grid}>
              {categories.map((category, i) => (
                <div
                  key={category.id}
                  className={styles.card}
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setCategorySelectOptionsOpen(true);
                  }}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardIcon}>
                      <List size={20} strokeWidth={1.5} />
                    </div>
                    <ArrowRight size={15} className={styles.cardArrow} />
                  </div>

                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>{category.name}</h3>
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
          <AddCategoryModal
            setModalOpen={setModalOpen}
            isUpdate={false}
            setSuccessToast={setSuccessToast}
          />
        )}
        {updateCategory && (
          <AddCategoryModal
            setModalOpen={setUpdateCategory}
            isUpdate={true}
            categoryId={selectedCategory}
            setSuccessToast={setSuccessToast}
          />
        )}
        {categorySelectOptionsOpen && (
          <CategorySelectOptions
            setUpdateCategory={setUpdateCategory}
            categoryId={selectedCategory}
            setCategorySelectOptionsOpen={setCategorySelectOptionsOpen}
            categoryName={
              categories.find((c) => c.id === selectedCategory)?.name || ""
            }
            setSuccessToast={setSuccessToast}
          />
        )}
      </div>
    </>
  );
}
