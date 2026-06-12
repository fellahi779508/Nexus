"use client";
import { getProduct } from "@/api/products-api";
import Breadcrumb from "@/components/products/breadcrumb";
import { DetailedProduct, Product, Variant } from "@/utils/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import styles from "./product-details.module.css";
import {
  Tag,
  Layers,
  Calendar,
  PackageSearch,
  Ruler,
  Weight,
  Palette,
  FlaskConical,
  ArrowUpRight,
  Search,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getProductvariantsById } from "@/api/variant-api";
import Link from "next/link";
import ProductModal from "@/components/products/add-product";
import VariantSelectOptions from "@/components/variants/variant-select-options";

export default function ProductDetails() {
  const param = useParams();
  const router = useRouter();
  const t = useTranslations();
  const [product, setProduct] = useState<Product>();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [openSelectOptions, setOpenSelectoptions] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [meta, setMeta] = useState<{
    total: number;
    page: number;
    limit: number;
    pages: number;
  }>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  const fetchVariants = useCallback(async () => {
    const response = await getProductvariantsById(
      parseInt(param.product_id?.toString() || ""),
      page,
      search,
    );
    if (response.status === 1) {
      console.log(response.response.data);
      setSuccessToast(false);
      setProduct({
        ...response.response.product,
      });
      setVariants(response.response.data || []);
      setMeta(response.response.meta);
    } else {
      console.log(response.response);
      toast.error(response.response ?? t("productDetails.fetchError"));
    }
  }, [page, debouncedSearch]);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    fetchVariants();
  }, [page, debouncedSearch, successToast]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const [openModal, setOpenModal] = useState(false);
  const [selectedvariant, setSelectedvariant] = useState(0);

  return (
    <div className={styles.page}>
      <title>Nexus | Variants</title>
      <Breadcrumb
        items={[
          { label: t("productDetails.breadcrumb.products"), link: "/products" },
          { label: product?.name ?? t("productDetails.breadcrumb.product") },
        ]}
      />

      {!product ? (
        <div className={styles.skeleton}>
          <div className={styles.skeletonTitle} />
          <div className={styles.skeletonMeta} />
          <div className={styles.skeletonGrid} />
        </div>
      ) : (
        <div className={styles.content}>
          {/* ── Header ───────────────────────────────────────────── */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <p className={styles.eyebrow}>{t("productDetails.eyebrow")}</p>
              <h1 className={styles.productName}>{product.name}</h1>
              <div className={styles.metaRow}>
                <span className={styles.badge}>
                  <Tag size={12} strokeWidth={2} />
                  {product.category?.name || t("products.noCategory")}
                </span>
                <span className={styles.metaDivider} />
                <span className={styles.metaItem}>
                  <Calendar size={12} strokeWidth={2} />
                  {t("productDetails.created")} {formatDate(product.createdAt)}
                </span>
                <span className={styles.metaItem}>
                  <Calendar size={12} strokeWidth={2} />
                  {t("productDetails.updated")} {formatDate(product.updatedAt)}
                </span>
              </div>
            </div>
            <div className={styles.idBadge}>#{product.id}</div>
          </div>
          <div className={styles.searchRow}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder={t("productDetails.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className={styles.clearBtn}
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
              <div
                className={styles.refreshBtn}
                onClick={() => {
                  setSearch("");
                  fetchVariants();
                }}
              >
                <span>{t("productDetails.refresh")}</span>
                <RefreshCcw size={16} />
              </div>
            </div>
            <button
              className={styles.addButton}
              onClick={() => {
                setIsUpdate(false);
                setOpenModal(true);
              }}
            >
              {t("productDetails.addButton")}
            </button>
          </div>
          {/* ── Variants ─────────────────────────────────────────── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Layers size={15} strokeWidth={2} />
              <h2 className={styles.sectionTitle}>
                {t("productDetails.variants.title")}
              </h2>
              <span className={styles.countBadge}>{variants.length}</span>
            </div>

            {variants.length === 0 ? (
              <div className={styles.empty}>
                <PackageSearch size={32} strokeWidth={1.5} />
                <p>{t("productDetails.variants.empty")}</p>
              </div>
            ) : (
              <div className={styles.variantGrid}>
                {variants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    productId={product.id}
                    t={t}
                    setOpenModal={setOpenSelectoptions}
                    setSelectedVariant={setSelectedvariant}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
                (p) => p === 1 || p === meta.pages || Math.abs(p - page) <= 1,
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
      {openSelectOptions && (
        <VariantSelectOptions
          productId={product?.id || 0}
          setUpdateVariant={setIsUpdate}
          variantId={selectedvariant}
          setVariantSelectOptionsOpen={setOpenSelectoptions}
          setSuccessToast={setSuccessToast}
          setOpenModal={setOpenModal}
        />
      )}
      {openModal && (
        <ProductModal
          step={2}
          isUpdate={isUpdate}
          product_id={product?.id}
          setSuccessToast={setSuccessToast}
          setModalOpen={setOpenModal}
          variant_id={selectedvariant}
        />
      )}
    </div>
  );
}

/* ─── Variant Card ──────────────────────────────────────────────────────── */

function VariantCard({
  variant,
  productId,
  setOpenModal,
  setSelectedVariant,

  t,
}: {
  variant: Variant;
  productId: number;
  setOpenModal: (open: boolean) => void;
  setSelectedVariant: (variantId: number) => void;

  t: (key: string) => string;
}) {
  const attrs = [
    variant.size && {
      icon: <Ruler size={12} strokeWidth={2} />,
      label: t("productDetails.variants.size"),
      value: variant.size,
    },
    variant.color && {
      icon: <Palette size={12} strokeWidth={2} />,
      label: t("productDetails.variants.color"),
      value: variant.color,
    },
    variant.flavor && {
      icon: <FlaskConical size={12} strokeWidth={2} />,
      label: t("productDetails.variants.flavor"),
      value: variant.flavor,
    },
    variant.weight && {
      icon: <Weight size={12} strokeWidth={2} />,
      label: t("productDetails.variants.weight"),
      value: `${variant.weight}g`,
    },
    variant.height && {
      icon: <Ruler size={12} strokeWidth={2} />,
      label: t("productDetails.variants.height"),
      value: `${variant.height}cm`,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    label: string;
    value: string;
  }[];

  return (
    <Link
      href={`/products/${productId}/${variant.id}`}
      className={styles.variantCard}
      onClick={(e) => {
        e.preventDefault();
        setSelectedVariant(variant.id);
        setOpenModal(true);
      }}
    >
      <div className={styles.variantTop}>
        <div className={styles.variantInfo}>
          <span className={styles.variantName}>{variant.name}</span>
          <span className={styles.variantBarcode}>{variant.barcode}</span>
        </div>
        <ArrowUpRight size={15} className={styles.variantArrow} />
      </div>

      {attrs.length > 0 && (
        <div className={styles.variantAttrs}>
          {attrs.map((attr, i) => (
            <span key={i} className={styles.variantAttr}>
              {attr.icon}
              {attr.value}
            </span>
          ))}
        </div>
      )}

      <div className={styles.variantFooter}>
        <span className={styles.variantId}>
          {t("productDetails.variants.batches")}: {variant.batches.length}
        </span>
      </div>
    </Link>
  );
}
