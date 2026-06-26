"use client";
import { Pencil, Plus, Minus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./batch-select.module.css";
import { useEffect, useState } from "react";
import AddBatchModal from "./add-batch";
import ModifyStockModal from "./modifyStock";
import StockAdjustmentModal from "./modifyStock";
import { deleteBatch } from "@/api/batch-api";
import { toast } from "react-toastify";

export default function BatchSelectOptions({
  batchId,
  handleOverlayClick,
  setSuccessToast,
}: {
  batchId: string;
  handleOverlayClick: () => void;

  setSuccessToast: (success: boolean) => void;
}) {
  const t = useTranslations("batchOptions");

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  const [isUpdate, setIsUpdate] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [openModifyStockModal, setOpenModifyStockModal] = useState(false);
  const [modifyStockType, setModifyStockType] = useState<"add" | "remove">(
    "add",
  );
  async function removeBatch() {
    if (!window.confirm(t("confirmDelete"))) {
      return;
    }
    const res = await deleteBatch(Number(batchId));
    if (res.status === 1) {
      setSuccessToast(true);
      handleOverlayClick();
    } else {
      alert(res.error);
    }
  }
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <button className={styles.closeBtn} onClick={handleOverlayClick}>
          ✕
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h2 className={styles.title}>{t("title")}</h2>
        </div>

        <div className={styles.cards}>
          {/* Edit Informations */}
          <div
            className={styles.card}
            onClick={() => {
              setIsUpdate(true);
              setOpenUpdateModal(true);
            }}
          >
            <div className={styles.cardIcon}>
              <Pencil size={20} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>{t("edit.title")}</div>
              <div className={styles.cardDesc}>{t("edit.desc")}</div>
            </div>
            <div className={styles.cardArrow}>→</div>
          </div>

          {/* Add to Stock */}
          <div
            className={`${styles.card} ${styles.cardAccent}`}
            onClick={() => {
              setModifyStockType("add");
              setOpenModifyStockModal(true);
            }}
          >
            <div className={styles.cardIcon}>
              <Plus size={20} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>{t("add.title")}</div>
              <div className={styles.cardDesc}>{t("add.desc")}</div>
            </div>
            <div className={styles.cardArrow}>→</div>
          </div>

          {/* Remove from Stock */}
          <div
            className={`${styles.card} ${styles.cardAccentYell}`}
            onClick={() => {
              setModifyStockType("remove");
              setOpenModifyStockModal(true);
            }}
          >
            <div className={styles.cardIcon}>
              <Minus size={20} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>{t("remove.title")}</div>
              <div className={styles.cardDesc}>{t("remove.desc")}</div>
            </div>
            <div className={styles.cardArrow}>→</div>
          </div>

          {/* Delete Batch */}
          <div
            className={`${styles.card} ${styles.cardAccentRed}`}
            onClick={removeBatch}
          >
            <div className={styles.cardIcon}>
              <Trash2 size={20} />
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>{t("delete.title")}</div>
              <div className={styles.cardDesc}>{t("delete.desc")}</div>
            </div>
            <div className={styles.cardArrow}>→</div>
          </div>
        </div>
      </div>
      {openUpdateModal && (
        <AddBatchModal
          isUpdate={isUpdate}
          batchId={Number(batchId)}
          setSuccessToast={setSuccessToast}
          setModalOpen={setOpenUpdateModal}
        />
      )}
      {openModifyStockModal && (
        <StockAdjustmentModal
          setModalOpen={setOpenModifyStockModal}
          type={modifyStockType}
          id={Number(batchId)}
          onSuccess={setSuccessToast}
        />
      )}
    </div>
  );
}
