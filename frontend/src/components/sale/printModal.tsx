"use client";
import { useTranslations } from "next-intl";
import styles from "./printModal.module.css";
export default function PrintModal({
  setOpenPrintModal,
  setPaperType,
  paperType,
}: {
  setOpenPrintModal: (value: boolean) => void;
  setPaperType: (value: "A4" | "Ticket" | null) => void;
  paperType: "A4" | "Ticket" | null;
}) {
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setOpenPrintModal(false);
  }
  const t = useTranslations("printModal");
  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.container}>
        <div className={styles.title}>{t("type")}</div>
        <div className={styles.choices}>
          <div className={styles.choice}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={paperType === "A4"}
              onChange={() => setPaperType(paperType === "A4" ? null : "A4")}
            />
            A4
          </div>
          <div className={styles.choice}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={paperType === "Ticket"}
              onChange={() =>
                setPaperType(paperType === "Ticket" ? null : "Ticket")
              }
            />
            Ticket
          </div>
        </div>
      </div>
    </div>
  );
}
