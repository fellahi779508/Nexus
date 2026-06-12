"use client";
import Link from "next/link";
import styles from "./client-select-options.module.css";
import { X, LayoutGrid, Pencil, ArrowRight, Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteClientById } from "@/api/clients-api";

export default function ClientSelectOptions({
  setUpdateClient,
  clientId,
  setClientSelectOptionsOpen,
  setSuccessToast,
}: {
  setUpdateClient: (value: boolean) => void;
  clientId: number;
  setClientSelectOptionsOpen: (value: boolean) => void;
  setSuccessToast: (value: boolean) => void;
}) {
  const t = useTranslations();

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setClientSelectOptionsOpen(false);
  }

  async function HandleDeleteClient() {
    if (!window.confirm(t("categoryOptions.confirmDelete"))) {
      return;
    }
    const res = await deleteClientById(clientId);
    if (res.status === 1) {
      setSuccessToast(true);
      setClientSelectOptionsOpen(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.container}>
        <button
          className={styles.closeBtn}
          onClick={() => setClientSelectOptionsOpen(false)}
          aria-label={t("clientOptions.close")}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>{t("clientOptions.eyebrow")}</p>
          <h2 className={styles.title}>{t("clientOptions.title")}</h2>
        </div>

        <div className={styles.cards}>
          {/* View Products */}
          <Link href={`/clients/${clientId}`} className={styles.card}>
            <div className={styles.cardIcon}>
              <LayoutGrid size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("clientOptions.viewDetails.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("clientOptions.viewDetails.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </Link>

          {/* Update Category */}
          <button
            className={`${styles.card} ${styles.cardAccent}`}
            onClick={() => {
              setUpdateClient(true);
              setClientSelectOptionsOpen(false);
            }}
          >
            <div className={styles.cardIcon}>
              <Pencil size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("clientOptions.updateClient.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("clientOptions.updateClient.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </button>
          {/**delete client */}
          <button
            className={`${styles.card} ${styles.cardAccentRed}`}
            onClick={() => {
              HandleDeleteClient();
            }}
          >
            <div className={styles.cardIcon}>
              <Delete size={20} strokeWidth={1.8} />
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardTitle}>
                {t("clientOptions.deleteClient.title")}
              </span>
              <span className={styles.cardDesc}>
                {t("clientOptions.deleteCLient.desc")}
              </span>
            </div>
            <ArrowRight size={16} className={styles.cardArrow} />
          </button>
        </div>
      </div>
    </div>
  );
}
