"use client";
import { Cart, Purchase, PurchaseCart, Sale } from "@/utils/types";
import styles from "./historyModal.module.css";
import { useCallback, useEffect, useState } from "react";
import { getTodaysDetailedSales, getTodaysSales } from "@/api/sale-api";
import { useTranslations } from "next-intl";
import {
  X,
  ReceiptText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  Tag,
} from "lucide-react";
import { getTodaysPurchases } from "@/api/purchase-api";

/* ── helpers ─────────────────────────────────────────────────────────────── */

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function HistoryModal({
  setOpenHistoryModal,
  setIsSaleLoaded,
  setIsCreditActivated,
  setIsRemiseActivated,
  setRemise,
  setClientId,
  setPaidAmount,
  setSaleId,
  setCart,
  isDetailed,
  type,
  setPaymentMethod,
  setTimbre,
}: {
  setOpenHistoryModal: (value: boolean) => void;
  setIsSaleLoaded: (value: boolean) => void;
  setIsCreditActivated: (value: boolean) => void;
  setIsRemiseActivated: (value: boolean) => void;
  setRemiseAmount: (value: number) => void;
  setRemise: (value: number) => void;
  setClientId: (value: number) => void;
  setPaidAmount: (value: number) => void;
  setSaleId: (value: number) => void;
  setCart: (value: Cart | PurchaseCart) => void;
  setPaymentMethod: (value: string) => void;
  setTimbre: (value: number) => void;
  isDetailed: boolean;
  type: "sale" | "purchase";
}) {
  const t = useTranslations("historyModal");

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getTodaysSales();
    if (res.status === 1) {
      setSales(res.response);
    } else {
      setError(t("errorLoad"));
    }
    setLoading(false);
  }, []);
  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getTodaysPurchases();
    if (res.status === 1) {
      setPurchases(res.response);
    } else {
      setError(t("errorLoad"));
    }
    setLoading(false);
  }, []);
  const fetchDetailedSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getTodaysDetailedSales();
    if (res.status === 1) {
      setSales(res.response);
    } else {
      setError(t("errorLoad"));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (type === "purchase") {
      fetchPurchases();
      return;
    } else {
      if (isDetailed) {
        fetchDetailedSales();
      } else {
        fetchSales();
      }
    }
  }, [isDetailed, type]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setOpenHistoryModal(false);
  }

  function handleLoad() {
    if (selected == null) return;

    setIsSaleLoaded(true);
    if (type === "sale") {
      const selectedSoldItems =
        selectedSale?.soldItems.map((item) => ({
          id: item.id,
          batchId: item.batch.id,
          quantity: item.quantity,
          unit: item.unit,
          qtePerUnit: item.qtePerUnit || 1,
          name: item.batch?.variant?.name || "",
          total: item.quantity * item.sellingPrice,
          barcode: item.batch?.variant?.barcode || "",
          sellingPriceTTC: item.sellingPrice,
        })) || [];
      if (selectedSale?.remise === true) {
        setIsRemiseActivated(true);
        setRemise(selectedSale?.remiseAmount || 0);
      } else {
        setIsRemiseActivated(false);
        setRemise(0);
      }
      if (
        (selectedSale?.paid &&
          selectedSale?.total &&
          selectedSale?.paid < selectedSale?.total) ||
        selectedSale?.client?.id
      ) {
        setPaidAmount(selectedSale?.paid || 0);
        setIsCreditActivated(true);
        setClientId(selectedSale.client?.id || 0);
      } else {
        setIsCreditActivated(false);
        setClientId(0);
        setPaidAmount(0);
      }
      setPaymentMethod(selectedSale?.payment_methode!);
      setTimbre(selectedSale?.timbre || 0);
      setCart({
        soldItems: selectedSoldItems as any,
        total: selectedSale?.remise
          ? selectedSale?.total + selectedSale?.remiseAmount
          : selectedSale?.total || 0,
      });
      setSaleId(selected);
      setOpenHistoryModal(false);
      setIsSaleLoaded(true);
    } else {
      setClientId(selectedPurchase!.supplier?.id || 0);
      const selectedPurchasedItems =
        selectedPurchase?.purchasedItems.map((item) => ({
          id: item.id,
          batchId: item.batch.id,
          quantity: item.quantity,
          unit: item.unit,
          qtePerUnit: item.qtePerUnit || 1,
          name: item.batch?.variant?.name || "",
          total: item.quantity * item.sellingPrice,
          barcode: item.batch?.variant?.barcode || "",
          sellingPriceTTC: item.sellingPrice,
        })) || [];
      if (selectedPurchase?.remise === true) {
        setIsRemiseActivated(true);
        setRemise(selectedPurchase?.remiseAmount || 0);
      } else {
        setIsRemiseActivated(false);
        setRemise(0);
      }
      if (
        (selectedPurchase?.paid &&
          selectedPurchase?.total &&
          selectedPurchase?.paid < selectedPurchase?.total) ||
        selectedPurchase?.supplier?.id
      ) {
        setPaidAmount(selectedPurchase?.paid || 0);
        setIsCreditActivated(true);
      } else {
        setIsCreditActivated(false);
        setPaidAmount(0);
      }
      setPaymentMethod(selectedPurchase?.payment_method!);
      setTimbre(selectedPurchase?.timbre || 0);

      setCart({
        purchasedItems: selectedPurchasedItems as any,
        total: selectedPurchase?.remise
          ? selectedPurchase?.total + selectedPurchase?.remiseAmount
          : selectedPurchase?.total || 0,
      });
      setSaleId(selected);
      setOpenHistoryModal(false);
      setIsSaleLoaded(true);
    }
  }

  const selectedSale = sales.find((s) => s.id === selected);
  const selectedPurchase = purchases.find((p) => p.id === selected);

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.container}>
        {/* ── Close ── */}
        <button
          className={styles.closeBtn}
          onClick={() => setOpenHistoryModal(false)}
          aria-label={t("close")}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        {/* ── Header ── */}
        <div className={styles.header}>
          <h2 className={styles.title}>{t(`title.${type}`)}</h2>
          <p className={styles.subtitle}>{t(`subtitle.${type}`)}</p>
        </div>

        {/* ── Body ── */}
        <div className={styles.formBody}>
          {/* Loading */}
          {loading && (
            <div className={styles.loadingState}>
              <Loader2 size={20} className={styles.spinner} />
              <span>{t("loading")}</span>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className={styles.errorState}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Empty */}
          {!loading &&
            !error &&
            sales.length === 0 &&
            purchases.length === 0 && (
              <div className={styles.emptyState}>
                <ReceiptText size={28} strokeWidth={1.2} />
                <p>{t(`empty.${type}`)}</p>
              </div>
            )}

          {/* Sales list */}
          {!loading && !error && type === "sale" && (
            <div className={styles.salesList}>
              {sales.map((sale) => {
                const isSelected = selected === sale.id;
                return (
                  <button
                    key={sale.id}
                    className={`${styles.saleCard} ${isSelected ? styles.saleCardActive : ""}`}
                    onClick={() => setSelected(isSelected ? null : sale.id)}
                  >
                    {/* Left — receipt icon + id */}
                    <div className={styles.saleIcon}>
                      <ReceiptText size={16} strokeWidth={1.8} />
                    </div>

                    {/* Middle — items summary */}
                    <div className={styles.saleBody}>
                      <div className={styles.saleTopRow}>
                        <span className={styles.saleId}>#{sale.id}</span>
                        <div className={styles.saleItems}>
                          {sale.soldItems.map((si) => (
                            <span key={si.id} className={styles.itemChip}>
                              <Tag size={9} strokeWidth={2} />
                              {si.batch?.variant?.name}
                              <span className={styles.itemQty}>
                                ×{si.quantity}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.saleMeta}>
                        <span className={styles.metaItem}>
                          <Package size={10} strokeWidth={2} />
                          {sale.soldItems.length} {t("items")}
                        </span>
                        {sale.remise && (
                          <span className={styles.remiseBadge}>
                            {t("remise")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right — amounts + check */}
                    <div className={styles.saleRight}>
                      <span className={styles.totalAmount}>
                        {fmt(sale.total)}
                      </span>
                      <span
                        className={`${styles.paidAmount} ${sale.paid < sale.total ? styles.paidPartial : ""}`}
                      >
                        {t("paid")}: {fmt(sale.paid)}
                      </span>
                      {isSelected && (
                        <CheckCircle2
                          size={14}
                          className={styles.checkIcon}
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {!loading && !error && type === "purchase" && (
            <div className={styles.salesList}>
              {purchases.map((purchase) => {
                const isSelected = selected === purchase.id;
                return (
                  <button
                    key={purchase.id}
                    className={`${styles.saleCard} ${isSelected ? styles.saleCardActive : ""}`}
                    onClick={() => setSelected(isSelected ? null : purchase.id)}
                  >
                    {/* Left — receipt icon + id */}
                    <div className={styles.saleIcon}>
                      <ReceiptText size={16} strokeWidth={1.8} />
                    </div>

                    {/* Middle — items summary */}
                    <div className={styles.saleBody}>
                      <div className={styles.saleTopRow}>
                        <span className={styles.saleId}>#{purchase.id}</span>
                        <div className={styles.saleItems}>
                          {purchase.purchasedItems.map((si) => (
                            <span key={si.id} className={styles.itemChip}>
                              <Tag size={9} strokeWidth={2} />
                              {si.batch?.variant?.name}
                              <span className={styles.itemQty}>
                                ×{si.quantity}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.saleMeta}>
                        <span className={styles.metaItem}>
                          <Package size={10} strokeWidth={2} />
                          {purchase.purchasedItems.length} {t("items")}
                        </span>
                        {purchase.remise && (
                          <span className={styles.remiseBadge}>
                            {t("remise")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right — amounts + check */}
                    <div className={styles.saleRight}>
                      <span className={styles.totalAmount}>
                        {fmt(purchase.total)}
                      </span>
                      <span
                        className={`${styles.paidAmount} ${purchase.paid < purchase.total ? styles.paidPartial : ""}`}
                      >
                        {t("paid")}: {fmt(purchase.paid)}
                      </span>
                      {isSelected && (
                        <CheckCircle2
                          size={14}
                          className={styles.checkIcon}
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className={styles.footer}>
          <button
            className={styles.btnSecondary}
            onClick={() => setOpenHistoryModal(false)}
          >
            {t("cancel")}
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleLoad}
            disabled={selected == null}
          >
            {t("load")}
          </button>
        </div>
      </div>
    </div>
  );
}
