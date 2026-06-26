"use client";
import { X, LayoutGrid, ArrowRight, Pencil, Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast, ToastContainer } from "react-toastify";
import styles from "./variant-select-options.module.css";
import Link from "next/link";
import { deleteVariantById } from "@/api/variant-api";

export default function VariantSelectOptions({
  setUpdateVariant,
  variantId,
  setVariantSelectOptionsOpen,
  setSuccessToast,
  productId,
  setOpenModal,
}: {
  setUpdateVariant: (value: boolean) => void;
  variantId: number;
  setVariantSelectOptionsOpen: (value: boolean) => void;
  setSuccessToast: (successToast: boolean) => void;
  productId: number;
  setOpenModal: (value: boolean) => void;
}) {
  const t = useTranslations();

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setVariantSelectOptionsOpen(false);
  }
  async function deleteVriant() {
    if (!window.confirm(t("variantOptions.confirmDelete"))) {
      return;
    }
    const res = await deleteVariantById(variantId);
    if (res.status === 1) {
      setSuccessToast(true);
      setVariantSelectOptionsOpen(false);
    } else {
      alert(t("variantOptions.deleteVariant.error"));
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.container}>
        <button
          className={styles.closeBtn}
          onClick={() => setVariantSelectOptionsOpen(false)}
          aria-label={t("categoryOptions.close")}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>{t("variantOptions.eyebrow")}</p>
          <h2 className={styles.title}>{t("variantOptions.title")}</h2>
        </div>

        <div className={styles.cards}>
          {/* View Details */}
          <Link
            href={`/products/${productId}/${variantId}`}
            className={styles.card}
          >
            <div className={styles.cardIcon}>
              <LayoutGrid size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("variantOptions.viewDetails.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("variantOptions.viewDetails.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </Link>

          {/* Update Product */}
          <button
            className={`${styles.card} ${styles.cardAccent}`}
            onClick={() => {
              setUpdateVariant(true);
              setVariantSelectOptionsOpen(false);
              setOpenModal(true);
            }}
          >
            <div className={styles.cardIcon}>
              <Pencil size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("variantOptions.updateVariant.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("variantOptions.updateVariant.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </button>
          <button
            className={`${styles.card} ${styles.cardAccentRed}`}
            onClick={() => {
              deleteVriant();
            }}
          >
            <div className={styles.cardIcon}>
              <Delete size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("variantOptions.deleteVariant.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("variantOptions.deleteVariant.desc")}
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
