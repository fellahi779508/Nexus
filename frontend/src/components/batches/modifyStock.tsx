"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import Select from "react-select";
import { X } from "lucide-react";
import { selectStyles } from "@/components/products/selectStyles";
import styles from "./modifyStock.module.css";
import { addToStock, removeFromStock } from "@/api/stock-api";

/* ── types ───────────────────────────────────────────────────────────────── */

type Reason =
  | "refilled"
  | "returned"
  | "damaged"
  | "loss"
  | "expired"
  | "correction"
  | "transfer";

type Option = { value: Reason; label: string };

/* ── component ───────────────────────────────────────────────────────────── */

export default function StockAdjustmentModal({
  setModalOpen,
  type,
  id,
  onSuccess,
}: {
  setModalOpen: (open: boolean) => void;
  type: string;
  id: number;
  onSuccess: (val: boolean) => void;
}) {
  const t = useTranslations("stockAdjustment");

  const [quantity, setQuantity] = useState<string>("");
  const [reason, setReason] = useState<Option | null>(null);
  const [loading, setLoading] = useState(false);

  const reasonOptions: Option[] = [
    { value: "refilled", label: t("reasons.refill") },
    { value: "returned", label: t("reasons.return") },
    { value: "damaged", label: t("reasons.damage") },
    { value: "loss", label: t("reasons.loss") },
    { value: "expired", label: t("reasons.expired") },
    { value: "correction", label: t("reasons.correction") },
    { value: "transfer", label: t("reasons.transfer") },
  ];

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setModalOpen(false);
  }

  async function handleConfirm() {
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty === 0) {
      toast.error(t("validation.quantity"));
      return;
    }
    if (!reason) {
      toast.error(t("validation.reason"));
      return;
    }

    setLoading(true);
    try {
      if (type === "add") {
        const res = await addToStock(id, qty, reason.value);
        if (res.status === 1) {
          toast.success(t("toast.success"));
          onSuccess(true);
          setModalOpen(false);
        } else {
          toast.error(res.error);
        }
      } else {
        const res = await removeFromStock(id, qty, reason.value);
        if (res.status === 1) {
          toast.success(t("toast.success"));
          onSuccess(true);
          setModalOpen(false);
        } else {
          toast.error(t("toast.error"));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const isValid =
    quantity !== "" &&
    !isNaN(parseFloat(quantity)) &&
    parseFloat(quantity) !== 0 &&
    reason !== null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.container}>
        {/* ── Close ── */}
        <button
          className={styles.closeBtn}
          onClick={() => setModalOpen(false)}
          aria-label={t("close")}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        {/* ── Header ── */}
        <div className={styles.header}>
          <h2 className={styles.title}>{t("title")}</h2>
          <p className={styles.subtitle}>{t("subtitle")}</p>
        </div>

        {/* ── Fields ── */}
        <div className={styles.formBody}>
          <div className={styles.field}>
            <label className={styles.label}>{t("fields.quantity")}</label>
            <input
              type="number"
              className={styles.input}
              placeholder={t("fields.quantityPlaceholder")}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className={styles.field} style={{ marginTop: 14 }}>
            <label className={styles.label}>{t("fields.reason")}</label>
            <Select
              options={reasonOptions}
              value={reason}
              onChange={(opt) => setReason(opt)}
              placeholder={t("fields.reasonPlaceholder")}
              styles={selectStyles}
              isSearchable={false}
            />
            -
          </div>
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            className={styles.btnSecondary}
            onClick={() => setModalOpen(false)}
          >
            {t("cancel")}
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleConfirm}
            disabled={!isValid || loading}
          >
            {loading ? t("confirming") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
