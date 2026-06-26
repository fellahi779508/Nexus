"use client";
import { Plus, Trash2, X } from "lucide-react";
import styles from "./add-batch.module.css";
import { useCallback, useEffect, useState } from "react";
import { PostBatch, PostVarinat, Supplier } from "@/utils/types";
import { createBatch, getBatchById, updateBatchById } from "@/api/batch-api";
import { toast, ToastContainer } from "react-toastify";
import { useTranslations } from "next-intl";
import { selectStyles } from "../products/selectStyles";
import { getAllSuppliers } from "@/api/supplier-api";
import Select from "react-select";
import AddSupllierModal from "../suppliers/add-supplier";

export default function AddBatchModal({
  isUpdate,
  setModalOpen,
  batchId,
  setSuccessToast,
  variantId,
}: {
  isUpdate: boolean;
  setModalOpen: (open: boolean) => void;
  batchId?: number;
  variantId?: number;
  setSuccessToast: (successToast: boolean) => void;
}) {
  const t = useTranslations("addBatch");

  // Initialize batch state with default values (variantId from props)
  const [batch, setBatch] = useState<PostBatch>({
    nLot: "",
    fabricationDate: "",
    expirationDate: "",
    supplierId: undefined,
    quantity: 0,
    alertPeriodPerDay: undefined,
    alertPeriodPerStock: undefined,
    variantId: variantId || 0,
    primary: false,
  });

  // Validation function
  function fieldsVerifier(): boolean {
    // Required: quantity must be > 0
    if (!batch.quantity || batch.quantity <= 0) {
      alert(
        t("quantityRequired") ||
          "Quantity is required and must be greater than 0",
      );
      return false;
    }
    // Required: variantId must be valid (non-zero)
    if (!batch.variantId || batch.variantId <= 0) {
      alert(t("variantRequired") || "Invalid variant");
      return false;
    }
    // Optional: you can add more validations here (e.g., date order)
    if (
      batch.fabricationDate &&
      batch.expirationDate &&
      batch.fabricationDate > batch.expirationDate
    ) {
      alert(
        t("dateOrderError") ||
          "Fabrication date cannot be after expiration date",
      );
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (isUpdate) {
      const result = await updateBatchById(batchId!, batch!);
      if (result.status === 1) {
        alert(t("successUpdate"));
        setSuccessToast(true);
        setModalOpen(false);
      } else {
        alert(t("errorUpdate"));
      }
    } else {
      if (!fieldsVerifier()) return;
      const result = await createBatch(batch!);
      if (result.status === 1) {
        alert(t("successCreate"));
        setSuccessToast(true);
        setModalOpen(false);
      } else {
        alert(t("errorCreate"));
      }
    }
  }
  const [supplierSuccessToast, setSupplierSuccessToast] = useState(false);

  const getBatch = useCallback(async () => {
    if (!batchId) return;
    const result = await getBatchById(batchId);
    if (result.status === 1) {
      setBatch({
        nLot: result.response.nLot || "",
        fabricationDate: result.response.fabricationDate || "",
        expirationDate: result.response.expirationDate || "",
        supplierId: result.response.supplier?.id,
        quantity: result.response.quantity || 0,
        alertPeriodPerDay: result.response.alertPeriodPerDay || undefined,
        alertPeriodPerStock: result.response.alertPeriodPerStock || undefined,
        variantId: result.response.variantId || 0,
        primary: result.response.primary,
      });
      setSelectedSupplier(result.response.supplier?.id);
    }
  }, [batchId]);

  useEffect(() => {
    if (isUpdate) {
      getBatch();
    } else {
      // Reset to default with current variantId when creating new
      setBatch({
        nLot: "",
        fabricationDate: "",
        expirationDate: "",
        supplierId: undefined,
        quantity: 0,
        alertPeriodPerDay: undefined,
        alertPeriodPerStock: undefined,
        variantId: variantId || 0,
        primary: false,
      });
    }
  }, [isUpdate, getBatch, variantId]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const suppliersOption = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<number | undefined>(
    undefined,
  );
  const fetchSuppliers = useCallback(async () => {
    const res = await getAllSuppliers(1, 0, search);
    setSuppliers(res.response.data);
    setSupplierSuccessToast(false);
  }, [search]);

  useEffect(() => {
    fetchSuppliers();
  }, [search, supplierSuccessToast]);

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <span className={styles.closeBtn} onClick={() => setModalOpen(false)}>
          <X />
        </span>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isUpdate ? t("updateTitle") : t("title")}
          </h2>
          <p className={styles.subtitle}>
            {isUpdate ? t("updateSubtitle") : t("subtitle")}
          </p>
        </div>

        <div className={styles.form}>
          {/* Batch Information Section */}
          <div className={styles.sectionLabel}>
            <label className={styles.label}>
              {t("batchInfo") || "Batch Information"}
            </label>
          </div>

          <div className={styles.grid2}>
            <div
              className={styles.field}
              style={isUpdate ? { gridColumn: "1 / -1" } : {}}
            >
              <label className={styles.label}>
                {t("nLotLabel") || "Lot Number"}
              </label>
              <input
                type="text"
                className={styles.input}
                placeholder={t("nLotPlaceholder") || "e.g., BATCH-001"}
                value={batch.nLot || ""}
                onChange={(e) => setBatch({ ...batch, nLot: e.target.value })}
              />
            </div>

            {!isUpdate && (
              <div className={styles.field}>
                <label className={styles.label}>
                  {t("quantityLabel") || "Quantity *"}
                </label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="0"
                  min="1"
                  value={batch.quantity || ""}
                  onChange={(e) =>
                    setBatch({
                      ...batch,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}
          </div>

          <div className={styles.grid2}>
            <div className={styles.field}>
              <label className={styles.label}>
                {t("fabricationDateLabel") || "Fabrication Date"}
              </label>
              <input
                type="date"
                className={styles.input}
                value={batch.fabricationDate || ""}
                onChange={(e) =>
                  setBatch({ ...batch, fabricationDate: e.target.value })
                }
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                {t("expirationDateLabel") || "Expiration Date"}
              </label>
              <input
                type="date"
                className={styles.input}
                value={batch.expirationDate || ""}
                onChange={(e) =>
                  setBatch({ ...batch, expirationDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Supplier & Alerts Section */}
          <div className={styles.sectionLabel}>
            <label className={styles.label}>
              {t("supplierSection") || "Supplier & Alerts"}
            </label>
          </div>

          <div className={styles.sectionLabel}>
            {t("supplierIdLabel") || "Supplier"}
          </div>
          <div className={styles.suppliersSection}>
            <Select
              styles={selectStyles}
              onInputChange={(val: any) => setSearch(val)}
              options={suppliersOption}
              onChange={(opt: any) => (
                setSelectedSupplier(opt?.value ?? undefined),
                setBatch({ ...batch, supplierId: opt?.value || undefined })
              )}
              value={
                suppliers.find((s) => s.id === selectedSupplier)
                  ? {
                      value: selectedSupplier,
                      label: suppliers.find((s) => s.id === selectedSupplier)
                        ?.name,
                    }
                  : null
              }
            />
            <Plus
              className={styles.addSupplierButton}
              onClick={() => setShowAddSupplierModal(true)}
            />
            <Trash2
              className={styles.addSupplierButton}
              onClick={() => {
                setSelectedSupplier(undefined);
                setBatch({ ...batch, supplierId: undefined });
              }}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              {t("alertPeriodPerDayLabel") || "Alert (days)"}
            </label>
            <input
              type="number"
              className={styles.input}
              placeholder={
                t("alertPeriodPerDayPlaceholder") || "Days before expiry"
              }
              min="0"
              value={batch.alertPeriodPerDay || ""}
              onChange={(e) =>
                setBatch({
                  ...batch,
                  alertPeriodPerDay: parseInt(e.target.value) || undefined,
                })
              }
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              {t("alertPeriodPerStockLabel") || "Stock Alert Threshold"}
            </label>
            <input
              type="number"
              className={styles.input}
              placeholder={
                t("alertPeriodPerStockPlaceholder") ||
                "Minimum quantity before alert"
              }
              min="0"
              value={batch.alertPeriodPerStock || ""}
              onChange={(e) =>
                setBatch({
                  ...batch,
                  alertPeriodPerStock: parseInt(e.target.value) || undefined,
                })
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t("primary")}</label>
            <input
              type="checkbox"
              className={styles.input_checkbox}
              placeholder={t("primaryPlaceHolder")}
              checked={batch.primary}
              onChange={(e) =>
                setBatch({
                  ...batch,
                  primary: e.target.checked,
                })
              }
            />
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.btnSecondary}
            onClick={() => setModalOpen(false)}
          >
            {t("btnClose")}
          </button>
          <button className={styles.btnPrimary} onClick={handleSubmit}>
            {isUpdate ? t("updateBtn") : t("btnCreate")}
          </button>
        </div>
      </div>
      <ToastContainer />
      {showAddSupplierModal && (
        <AddSupllierModal
          isUpdate={false}
          setModalOpen={setShowAddSupplierModal}
          setSuccessToast={setSupplierSuccessToast}
        />
      )}
    </div>
  );
}
