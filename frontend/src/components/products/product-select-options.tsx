"use client";
import Link from "next/link";
import styles from "./product-select-options.module.css";
import { X, LayoutGrid, Pencil, ArrowRight, Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteProductById } from "@/api/products-api";
import { toast, ToastContainer } from "react-toastify";

export default function ProductSelectOptions({
  setUpdateProduct,
  productId,
  setProductSelectOptionsOpen,
  setSuccessToast,
}: {
  setUpdateProduct: (value: boolean) => void;
  productId: number;
  setProductSelectOptionsOpen: (value: boolean) => void;
  setSuccessToast: (successToast: boolean) => void;
}) {
  const t = useTranslations();

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setProductSelectOptionsOpen(false);
  }
  async function deleteProduct() {
    if (!window.confirm(t("productOptions.confirmDelete"))) {
      return;
    }
    const res = await deleteProductById(productId);
    if (res.status === 1) {
      setSuccessToast(true);
      setProductSelectOptionsOpen(false);
    } else {
      alert(t("productOptions.deleteProduct.error"));
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.container}>
        <button
          className={styles.closeBtn}
          onClick={() => setProductSelectOptionsOpen(false)}
          aria-label={t("categoryOptions.close")}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>{t("productOptions.eyebrow")}</p>
          <h2 className={styles.title}>{t("productOptions.title")}</h2>
        </div>

        <div className={styles.cards}>
          {/* View Details */}
          <Link href={`/products/${productId}`} className={styles.card}>
            <div className={styles.cardIcon}>
              <LayoutGrid size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("productOptions.viewDetails.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("productOptions.viewDetails.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </Link>

          {/* Update Product */}
          <button
            className={`${styles.card} ${styles.cardAccent}`}
            onClick={() => {
              setUpdateProduct(true);
              setProductSelectOptionsOpen(false);
            }}
          >
            <div className={styles.cardIcon}>
              <Pencil size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("productOptions.updateProduct.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("productOptions.updateProduct.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </button>
          <button
            className={`${styles.card} ${styles.cardAccentRed}`}
            onClick={() => {
              deleteProduct();
            }}
          >
            <div className={styles.cardIcon}>
              <Delete
                size={20}
                strokeWidth={1.8}
                className={styles.cardIconRed}
              />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("productOptions.deleteProduct.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("productOptions.deleteProduct.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
