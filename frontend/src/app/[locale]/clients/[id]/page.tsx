"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./detailedClient.module.css";
import {
  deleteCreditsofClient,
  getClientById,
  updateClient,
} from "@/api/clients-api";

type ClientDetails = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: string;
  creditTTC: number;
  updatedAt: string;
  sales?: {
    id: number;
    total: number;
    paid: number;
    remise: boolean;
    remiseAmount: number;
    payment_methode: string;
    date: string;
    timbre: number;
    credit?: {
      id: number;
      amount: number;
      date: string;
    };
  }[];
};

export default function DetailedClient() {
  const t = useTranslations("DetailedClient");
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [client, setClient] = useState<ClientDetails>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Global payment input
  const [globalPayment, setGlobalPayment] = useState<number>(0);

  const fetchClient = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await getClientById(id);
      if (res.status === 1) {
        setClient(res.response);
      } else {
        setError(res.error?.toString() || t("errorFetch"));
      }
    } catch (err) {
      setError(t("errorFetch"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  // Global credit actions (empty for now)
  const handleRecordPayment = async () => {
    let newTTC = client?.creditTTC! - globalPayment;
    if (newTTC < 0) {
      newTTC = 0;
    }
    const res = await updateClient(id, { creditTTC: newTTC });
    if (res.status === 1) {
      setGlobalPayment(0);
      fetchClient();
      alert(t("recordPaymentSuccess"));
    } else {
      alert(t("recordPaymentError"));
    }
  };

  const handleMarkAllAsPaid = async () => {
    const res = await deleteCreditsofClient(id);
    if (res.status === 1) {
      fetchClient();
      alert(t("markAllAsPaidSuccess"));
    } else {
      alert(t("markAllAsPaidError"));
    }
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

  if (!client) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>{t("notFound")}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <title>Nexus | Client Details</title>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("title", { id: client.id })}</h1>
          <span className={styles.dateBadge}>
            {t("clientSince", {
              date: new Date(client.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </span>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.backButton}
            onClick={() => router.push("/clients")}
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
        </div>
      </div>

      {/* Client Info Card */}
      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardAccent} />
          <h2 className={styles.sectionTitle}>{t("clientInfo")}</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("name")}</span>
              <span className={styles.value}>{client.name}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("address")}</span>
              <span className={styles.value}>{client.address}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("phone")}</span>
              <span className={styles.value}>{client.phone}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>{t("email")}</span>
              <span className={styles.value}>{client.email}</span>
            </div>
          </div>
        </section>

        {/* Global Credit Management Card */}
        <section className={styles.card}>
          <div className={styles.cardAccent} />
          <h2 className={styles.sectionTitle}>{t("creditManagement")}</h2>
          <div className={styles.creditValue}>
            <span className={styles.creditLabel}>{t("totalOutstanding")}</span>
            <span
              className={`${styles.valueHighlight} ${client.creditTTC > 0 ? styles.textDanger : styles.textSuccess}`}
            >
              {client.creditTTC.toFixed(2)} {t("currency")}
            </span>
          </div>

          {client.creditTTC > 0 && (
            <>
              <div className={styles.globalPaymentRow}>
                <div className={styles.paymentInputGroup}>
                  <label className={styles.inputLabel}>{t("amount")}</label>
                  <input
                    type="number"
                    value={globalPayment}
                    onChange={(e) => setGlobalPayment(Number(e.target.value))}
                    className={styles.globalPaymentInput}
                    min={0}
                    max={client.creditTTC}
                    step="0.01"
                  />
                </div>
                <button
                  className={styles.recordPaymentButton}
                  onClick={handleRecordPayment}
                >
                  {t("recordPayment")}
                </button>
              </div>
              <div className={styles.divider} />
              <button
                className={styles.markAllButton}
                onClick={handleMarkAllAsPaid}
              >
                {t("markAllAsPaid")}
              </button>
            </>
          )}
        </section>
      </div>

      {/* Sales List */}
      <section className={styles.card}>
        <div className={styles.cardAccent} />
        <h2 className={styles.sectionTitle}>{t("sales")}</h2>
        {!client.sales || client.sales.length === 0 ? (
          <p className={styles.empty}>{t("noSales")}</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("saleId")}</th>
                  <th>{t("date")}</th>
                  <th>{t("total")}</th>
                  <th>{t("paid")}</th>
                  <th>{t("remaining")}</th>
                  <th>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {client.sales.map((sale) => {
                  const remaining = sale.credit
                    ? sale.credit.amount
                    : sale.total - sale.paid;
                  const isFullyPaid = remaining <= 0;
                  return (
                    <tr
                      key={sale.id}
                      className={styles.tableRow}
                      onClick={() => router.push(`/sales/${sale.id}`)}
                    >
                      <td>#{sale.id}</td>
                      <td>
                        {new Date(sale.date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td>
                        {sale.total.toFixed(2)} {t("currency")}
                      </td>
                      <td
                        className={`${isFullyPaid ? styles.textSuccess : ""}`}
                      >
                        {sale.paid.toFixed(2)} {t("currency")}
                      </td>
                      <td
                        className={
                          isFullyPaid ? styles.textSuccess : styles.textDanger
                        }
                      >
                        {isFullyPaid ? "0.00" : remaining.toFixed(2)}{" "}
                        {t("currency")}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${
                            isFullyPaid ? styles.paid : styles.unpaid
                          }`}
                        >
                          {isFullyPaid ? t("fullyPaid") : t("unpaid")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
