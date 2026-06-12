"use client";
import styles from "./clients.module.css";
import { Category, Client, Meta } from "@/utils/types";
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Plus,
  ArrowRight,
  List,
  RefreshCcw,
  PersonStanding,
  Phone,
} from "lucide-react";
import { fetchCategories } from "@/api/categories-api";
import AddCategoryModal from "@/components/category/add-category";
import CategorySelectOptions from "@/components/category/category-select-options";
import { getAllClients } from "@/api/clients-api";
import AddClientModal from "@/components/clients/add-client";
import ClientSelectOptions from "@/components/clients/client-select-options";

export default function Clients() {
  const t = useTranslations("Clients");

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [updateClient, setUpdateCLient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(0);
  const [clientSelectOptionsOpen, setClientSelectOptionsOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllClients(page, 12, debouncedSearch);
      const mapped = response.response.data.map((p: Category) => ({
        ...p,
      }));
      setClients(mapped);
      setSuccessToast(false);
      setMeta(response.response.meta);
    } catch (err: unknown) {
      setError(t("errorLoad"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, t]);

  useEffect(() => {
    loadClients();
  }, [page, successToast, search]);

  return (
    <div className={styles.page}>
      <title>Nexus | Clients</title>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{t("title")}</h1>
          <span className={styles.totalBadge}>
            {t("total", { count: meta.total })}
          </span>
        </div>
        <button className={styles.addBtn} onClick={() => setModalOpen(true)}>
          <Plus size={16} strokeWidth={2.5} />
          <span>{t("addClient")}</span>
        </button>
      </div>

      {/* ── Search ── */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.clearBtn} onClick={() => setSearch("")}>
              ×
            </button>
          )}
          <div
            className={styles.refreshBtn}
            onClick={() => {
              setSearch("");
              loadClients();
            }}
          >
            <span>{t("refresh")}</span>
            <RefreshCcw size={16} />
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorState}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className={styles.loadingState}>
          <Loader2 size={22} className={styles.spinner} />
          <span>{t("loading")}</span>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && clients.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Package size={32} strokeWidth={1.2} />
          </div>
          <p className={styles.emptyTitle}>{t("emptyTitle")}</p>
          <p className={styles.emptySubtitle}>
            {debouncedSearch
              ? t("emptySearchSubtitle", { query: debouncedSearch })
              : t("emptySubtitle")}
          </p>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && !error && clients.length > 0 && (
        <>
          <div className={styles.grid}>
            {clients.map((client, i) => (
              <div
                key={client.id}
                className={styles.card}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => {
                  setSelectedClient(client.id);
                  setClientSelectOptionsOpen(true);
                }}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardIcon}>
                    <List size={20} strokeWidth={1.5} />
                  </div>
                  <ArrowRight size={15} className={styles.cardArrow} />
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.badge}>
                    <PersonStanding />
                    <h3 className={styles.cardName}>{client.name}</h3>
                  </div>
                  <div className={styles.badge}>
                    <Phone />
                    <h3 className={styles.cardName}>
                      {client.phone ? client.phone : "-"}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Pagination ── */}
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
                    (p) =>
                      p === 1 || p === meta.pages || Math.abs(p - page) <= 1,
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
        </>
      )}
      {modalOpen && (
        <AddClientModal
          isUpdate={false}
          setModalOpen={setModalOpen}
          setSuccessToast={setSuccessToast}
        />
      )}
      {updateClient && (
        <AddClientModal
          isUpdate={true}
          setModalOpen={setUpdateCLient}
          clientId={selectedClient}
          setSuccessToast={setSuccessToast}
        />
      )}
      {clientSelectOptionsOpen && (
        <ClientSelectOptions
          clientId={selectedClient}
          setClientSelectOptionsOpen={setClientSelectOptionsOpen}
          setUpdateClient={setUpdateCLient}
          setSuccessToast={setSuccessToast}
        />
      )}
    </div>
  );
}
