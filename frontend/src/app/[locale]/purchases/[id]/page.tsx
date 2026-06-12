"use client";

import { Purchase } from "@/utils/types";
import styles from "./detailedPurchase.module.css";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deletePurchaseById,
  getPurchaseById,
  printPurchase,
} from "@/api/purchase-api";
import { useTranslations } from "next-intl";

export default function DetailedPurchase() {
  const t = useTranslations("DetailedPurchase"); // separate namespace
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [purchase, setPurchase] = useState<Purchase>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [printFormat, setPrintFormat] = useState<"A4" | "ticket">("A4");

  const fetchPurchase = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await getPurchaseById(id);
      if (res.status === 1) {
        setPurchase(res.response);
      } else {
        setError(res.error || t("errorFetch"));
      }
    } catch (err) {
      setError(t("errorFetch"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchPurchase();
  }, [fetchPurchase]);

  // Empty handlers
  const handleDelete = async () => {
    // TODO: implement deletion
    if (!window.confirm(t("confirmDelete"))) {
      return;
    }
    const res = await deletePurchaseById(id);
    if (res.status === 1) {
      router.push("/purchases");
    } else {
      window.confirm("ERROR");
      router.push("/purchases");
    }
    // TODO: implement deletion
  };

  const handlePrint = async () => {
    // TODO: implement print functionality using printFormat
    await printPurchase(purchase?.id!, printFormat);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t("loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>{t("notFound")}</div>
      </div>
    );
  }

  const remaining = purchase.total - purchase.paid;
  const paymentStatus =
    remaining <= 0
      ? "paid"
      : remaining > 0 && purchase.paid > 0
        ? "partial"
        : "unpaid";

  return (
    <div className={styles.container}>
      <title>Nexus | Purchase Details</title>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("title", { id: purchase.id })}</h1>
          <span className={styles.dateBadge}>
            {new Date(purchase.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className={styles.actions}>
          {/* Back button */}
          <button
            className={styles.backButton}
            onClick={() => router.push("/purchases")}
            aria-label={t("back")}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5"></path>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>{t("back")}</span>
          </button>

          {/* Print format toggle */}
          <div
            className={styles.printToggle}
            role="group"
            aria-label={t("printFormat")}
          >
            <button
              className={`${styles.toggleButton} ${
                printFormat === "A4" ? styles.toggleActive : ""
              }`}
              onClick={() => setPrintFormat("A4")}
            >
              {t("a4")}
            </button>
            <button
              className={`${styles.toggleButton} ${
                printFormat === "ticket" ? styles.toggleActive : ""
              }`}
              onClick={() => setPrintFormat("ticket")}
            >
              {t("ticket")}
            </button>
          </div>

          <button className={styles.printButton} onClick={handlePrint}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 12H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            {t("print")}
          </button>

          <button
            className={styles.deleteButton}
            onClick={handleDelete}
            aria-label={t("delete")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
            {t("delete")}
          </button>
        </div>
      </div>

      {/* Payment Status Overview */}
      <div className={styles.statusBar}>
        <div className={`${styles.statusPill} ${styles[paymentStatus]}`}>
          {paymentStatus === "paid" && t("fullyPaid")}
          {paymentStatus === "partial" && t("partiallyPaid")}
          {paymentStatus === "unpaid" && t("unpaid")}
        </div>
        <div className={styles.progressBackground}>
          <div
            className={styles.progressFill}
            style={{
              width: `${Math.min((purchase.paid / purchase.total) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      <div className={styles.grid}>
        {/* Purchase Summary */}
        <section className={styles.card}>
          <div className={styles.cardAccent} />
          <h2 className={styles.sectionTitle}>{t("purchaseSummary")}</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("total")}</span>
              <span className={styles.valueHighlight}>
                {purchase.total.toFixed(2)} {t("currency")}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("paid")}</span>
              <span
                className={`${styles.value} ${paymentStatus === "paid" ? styles.textSuccess : ""}`}
              >
                {purchase.paid.toFixed(2)} {t("currency")}
              </span>
            </div>
            {remaining > 0 && (
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("remaining")}</span>
                <span className={`${styles.value} ${styles.textDanger}`}>
                  {remaining.toFixed(2)} {t("currency")}
                </span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("paymentMethod")}</span>
              <span className={styles.value}>{purchase.payment_method}</span>
            </div>
            {purchase.remise && (
              <>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("remise")}</span>
                  <span className={`${styles.value} ${styles.badgeInfo}`}>
                    {t("yes")}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>{t("remiseAmount")}</span>
                  <span className={styles.value}>
                    {purchase.remiseAmount.toFixed(2)} {t("currency")}
                  </span>
                </div>
              </>
            )}
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("timbre")}</span>
              <span className={styles.value}>
                {purchase.timbre.toFixed(2)} {t("currency")}
              </span>
            </div>
          </div>
        </section>

        {/* Supplier Information – always shown */}
        <section
          className={styles.cardClient}
          onClick={() => router.push(`/suppliers/${purchase.supplier?.id}`)}
        >
          <div className={styles.cardAccent} />
          <h2 className={styles.sectionTitle}>{t("supplier")}</h2>
          {purchase.supplier ? (
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("supplierName")}</span>
                <span className={styles.value}>{purchase.supplier.name}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("supplierAddress")}</span>
                <span className={styles.value}>
                  {purchase.supplier.address}
                </span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("supplierPhone")}</span>
                <span className={styles.value}>{purchase.supplier.phone}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("supplierEmail")}</span>
                <span className={styles.value}>{purchase.supplier.email}</span>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.5, marginBottom: "0.5rem" }}
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <p>{t("noSupplier")}</p>
            </div>
          )}
        </section>
      </div>

      {/* Purchased Items */}
      <section className={styles.card}>
        <div className={styles.cardAccent} />
        <h2 className={styles.sectionTitle}>{t("purchasedItems")}</h2>
        {purchase.purchasedItems.length === 0 ? (
          <p className={styles.empty}>{t("noItems")}</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("item")}</th>
                  <th>{t("lot")}</th>
                  <th>{t("quantity")}</th>
                  <th>{t("unitPrice")}</th>
                  <th>{t("totalPrice")}</th>
                </tr>
              </thead>
              <tbody>
                {purchase.purchasedItems.map((item, index) => (
                  <tr key={item.id ?? index} className={styles.tableRow}>
                    <td>
                      {item.batch?.variant
                        ? `${item.batch.variant.name ?? `#${item.batch.variant.id}`}`
                        : t("unknownItem")}
                    </td>
                    <td>{item.batch?.nLot || "—"}</td>
                    <td>
                      {item.quantity} × {item.qtePerUnit ?? 1}{" "}
                      {item.unit ? `(${item.unit})` : ""}
                    </td>
                    <td>
                      {item.sellingPrice.toFixed(2)} {t("currency")}
                    </td>
                    <td className={styles.lineTotal}>
                      {(item.quantity * item.sellingPrice).toFixed(2)}{" "}
                      {t("currency")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
