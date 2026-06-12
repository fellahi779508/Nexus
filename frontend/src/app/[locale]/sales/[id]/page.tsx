"use client";

import { Sale } from "@/utils/types";
import styles from "./detailedSale.module.css";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { deleteSaleById, getSaleById, printSale } from "@/api/sale-api";
import { useTranslations } from "next-intl";

export default function DetailedSale() {
  const t = useTranslations("DetailedSale");
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [sale, setSale] = useState<Sale>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Print format toggle state: "A4" or "ticket"
  const [printFormat, setPrintFormat] = useState<"A4" | "ticket">("A4");

  const fetchSale = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await getSaleById(id);
      if (res.status === 1) {
        setSale(res.response);
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
    fetchSale();
  }, [fetchSale]);

  // Empty handlers (to be implemented)
  const handleDelete = async () => {
    if (!window.confirm(t("confirmDelete"))) {
      return;
    }
    const res = await deleteSaleById(id);
    if (res.status === 1) {
      router.push("/sales");
    } else {
      window.confirm("ERROR");
      router.push("/sales");
    }
  };

  const handlePrint = async () => {
    // TODO: implement print functionality using printFormat
    await printSale(sale?.id!, printFormat);
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

  if (!sale) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>{t("notFound")}</div>
      </div>
    );
  }

  const remaining = sale.total - sale.paid;
  const paymentStatus =
    remaining <= 0
      ? "paid"
      : remaining > 0 && sale.paid > 0
        ? "partial"
        : "unpaid";

  return (
    <div className={styles.container}>
      <title>Nexus | Sale Details</title>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("title", { id: sale.id })}</h1>
          <span className={styles.dateBadge}>
            {new Date(sale.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        {/* Back button */}
        <button
          className={styles.backButton}
          onClick={() => router.push("/sales")}
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

        <div className={styles.actions}>
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
              width: `${Math.min((sale.paid / sale.total) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      <div className={styles.grid}>
        {/* Sale Summary */}
        <section className={styles.card}>
          <div className={styles.cardAccent} />
          <h2 className={styles.sectionTitle}>{t("saleSummary")}</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("total")}</span>
              <span className={styles.valueHighlight}>
                {sale.total.toFixed(2)} {t("currency")}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("paid")}</span>
              <span
                className={`${styles.value} ${paymentStatus === "paid" ? styles.textSuccess : ""}`}
              >
                {sale.paid.toFixed(2)} {t("currency")}
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
              <span className={styles.value}>{sale.payment_methode}</span>
            </div>
            {sale.remise && (
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
                    {sale.remiseAmount.toFixed(2)} {t("currency")}
                  </span>
                </div>
              </>
            )}
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("timbre")}</span>
              <span className={styles.value}>
                {sale.timbre.toFixed(2)} {t("currency")}
              </span>
            </div>
          </div>
        </section>

        {/* Client Information – always shown */}
        <section
          className={styles.cardClient}
          onClick={() => router.push(`/clients/${sale.client?.id}`)}
        >
          <div className={styles.cardAccent} />
          <h2 className={styles.sectionTitle}>{t("client")}</h2>
          {sale.client ? (
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("clientName")}</span>
                <span className={styles.value}>{sale.client.name}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("clientAddress")}</span>
                <span className={styles.value}>{sale.client.address}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("clientPhone")}</span>
                <span className={styles.value}>{sale.client.phone}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>{t("clientEmail")}</span>
                <span className={styles.value}>{sale.client.email}</span>
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
              <p>{t("noClient")}</p>
            </div>
          )}
        </section>
      </div>

      {/* Sold Items */}
      <section className={styles.card}>
        <div className={styles.cardAccent} />
        <h2 className={styles.sectionTitle}>{t("soldItems")}</h2>
        {sale.soldItems.length === 0 ? (
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
                {sale.soldItems.map((item, index) => (
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
