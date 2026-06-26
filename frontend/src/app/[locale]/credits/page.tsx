"use client";

import { Meta } from "@/utils/types";
import styles from "./credits.module.css";
import { useCallback, useEffect, useState } from "react";
import { getAllCredits } from "@/api/owner-api";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useRouter } from "next/navigation";
import PasswordGate from "@/components/owner/passwordGate";

// Update internal entity shape to match the direct client/supplier record format
interface CreditEntity {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  creditTTC: number;
  createdAt: string;
  updatedAt: string;
}

export default function CreditsPage() {
  const t = useTranslations("creditsPage");

  // State management
  const [entities, setEntities] = useState<CreditEntity[]>([]);
  const [totalCredit, setTotalCredit] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"client" | "supplier">("client");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Debounce search mechanism
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch data function mapping matching backend fields directly
  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    const res = await getAllCredits(page, 10, debouncedSearch, activeTab, date);

    if (res.status === 1 && res.response) {
      setEntities(res.response.data || []);
      setMeta(res.response.meta);
      setTotalCredit(res.response.totalCredit || 0);
    } else {
      setEntities([]);
      setTotalCredit(0);
    }
    setIsLoading(false);
  }, [page, debouncedSearch, activeTab, date]);

  // Trigger fetch whenever dependencies update
  useEffect(() => {
    fetchCredits();
  }, [page, debouncedSearch, activeTab, date]);
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  if (!locked)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100%",
        }}
      >
        <PasswordGate ns="settings" onSuccess={() => setLocked(true)} />;
      </div>
    );
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>

        {/* KPI Card showing the global outstanding balance sum */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.summaryContent}>
            <span>
              {activeTab === "client"
                ? t("totalClientCredit")
                : t("totalSupplierCredit")}
            </span>
            <h2>{totalCredit.toFixed(2)} DZD</h2>
          </div>
        </div>
      </header>

      {/* Tabs Layout */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tab} ${activeTab === "client" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("client");
            setPage(1);
          }}
        >
          {t("clients")}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "supplier" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("supplier");
            setPage(1);
          }}
        >
          {t("suppliers")}
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <input
            type="text"
            placeholder={
              activeTab === "client"
                ? t("searchClientPlaceholder")
                : t("searchSupplierPlaceholder")
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.input}
          />
        </div>
      </div>

      {/* Main Responsive Table View */}
      <div className={styles.tableResponsive}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("id")}</th>
              <th>
                {activeTab === "client" ? t("clientName") : t("supplierName")}
              </th>
              <th>{t("phone")}</th>
              <th>{t("address")}</th>

              <th>{t("outstandingCredit")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className={styles.centerText}>
                  <div className={styles.spinner}></div>
                </td>
              </tr>
            ) : entities.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.centerText}>
                  {t("noCreditsFound")}
                </td>
              </tr>
            ) : (
              entities.map((entity) => (
                <tr
                  key={entity.id}
                  onClick={() =>
                    router.push(
                      `${activeTab === "client" ? "/clients/" : "/suppliers/"}${entity.id}`,
                    )
                  }
                  className={styles.tr}
                >
                  <td>#{entity.id}</td>
                  <td className={styles.boldText}>
                    <div>{entity.name}</div>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        fontWeight: "normal",
                      }}
                    >
                      {entity.email}
                    </span>
                  </td>
                  <td>
                    {entity.phone ? (
                      <span className={styles.tableFlexCell}>
                        <Phone
                          size={14}
                          style={{
                            marginRight: "4px",
                            verticalAlign: "middle",
                          }}
                        />
                        {entity.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {entity.address ? (
                      <span className={styles.tableFlexCell}>
                        <MapPin
                          size={14}
                          style={{
                            marginRight: "4px",
                            verticalAlign: "middle",
                          }}
                        />
                        {entity.address}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={styles.dangerText}
                    style={{ fontWeight: "600" }}
                  >
                    {entity.creditTTC.toFixed(2)} DZD
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {meta.pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </button>

          <div className={styles.pageNumbers}>
            {Array.from({ length: meta.pages }, (_, i) => i + 1)
              .filter(
                (p) => p === 1 || p === meta.pages || Math.abs(p - page) <= 1,
              )
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                  acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`${styles.pageNumber} ${page === p ? styles.pageActive : ""}`}
                    onClick={() => setPage(p as number)}
                  >
                    {p}
                  </button>
                ),
              )}
          </div>

          <button
            className={styles.pageBtn}
            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
            disabled={page === meta.pages}
          >
            <ChevronRight size={16} />
          </button>

          <span className={styles.pageInfo}>
            {t("pageInfo", { page, pages: meta.pages })}
          </span>
        </div>
      )}
    </div>
  );
}
