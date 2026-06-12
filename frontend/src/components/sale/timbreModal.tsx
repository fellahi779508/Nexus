"use client";
import { X } from "lucide-react";
import styles from "./tumbreModal.module.css";
import { useTranslations } from "next-intl";
export default function TimbreModal({
  setOpenTimbreModal,
  setTimbreAmount,
  timbreAmount,
}: {
  setOpenTimbreModal: (value: boolean) => void;
  setTimbreAmount: (value: number) => void;
  timbreAmount: number;
}) {
  const t = useTranslations("TimbreModal");

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <span
          className={styles.closeBtn}
          onClick={() => setOpenTimbreModal(false)}
        >
          <X />
        </span>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("title")}</h2>
        </div>
        <div className={styles.form}>
          <div className={styles.sectionLabel}>
            <label className={styles.label}>{t("sectionLabel")}</label>
          </div>

          <>
            <div className={styles.field}>
              <label className={styles.label}>{t("paidLabel")}</label>
              <input
                type="number"
                min={0}
                className={styles.input}
                placeholder={t("paidPlaceholder")}
                value={timbreAmount}
                onChange={(e) => setTimbreAmount(Number(e.target.value))}
              />
            </div>
          </>
        </div>
      </div>
    </div>
  );
}
