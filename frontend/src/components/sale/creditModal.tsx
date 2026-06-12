"use client";
import { Plus, Trash, X } from "lucide-react";
import styles from "./creditModal.module.css";
import { useCallback, useEffect, useState } from "react";
import { Client, PostCategory } from "@/utils/types";
import { toast, ToastContainer } from "react-toastify";
import { useTranslations } from "next-intl";
import Select from "react-select";
import { selectStyles } from "../products/selectStyles";
import { getAllClients } from "@/api/clients-api";
import AddClientModal from "../clients/add-client";

export default function CreditModal({
  setOpenCreditModal,
  setClientId,
  setPaidAmount,
  paidAmount,
  isCreditActivated,
  setIsCreditActivated,
  clientId,
  isPurchase,
}: {
  setOpenCreditModal: (value: boolean) => void;
  setClientId: (value: number | null) => void;
  setPaidAmount: (value: number) => void;
  paidAmount: number;
  isCreditActivated: boolean;
  setIsCreditActivated: (value: boolean) => void;
  clientId: number | null;
  isPurchase: boolean;
}) {
  const t = useTranslations("creditModal");
  const [search, setSearch] = useState("");
  const [clientOptions, setClientOptions] = useState<
    { value: number; label: string }[]
  >([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | null>(
    clientId ?? null,
  );
  const [successToast, setSuccessToast] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const fetchClients = useCallback(async () => {
    const response = await getAllClients(1, 0, search);
    setClients(response.response.data);
    setClientOptions(
      response.response.data.map((client: Client) => ({
        value: client.id,
        label: client.name,
      })),
    );
    setSuccessToast(false);
  }, []);
  useEffect(() => {
    fetchClients();
  }, [search, successToast]);

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <span
          className={styles.closeBtn}
          onClick={() => setOpenCreditModal(false)}
        >
          <X />
        </span>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("title")}</h2>
        </div>
        <div className={styles.form}>
          <div className={styles.sectionLabel}>
            <label className={styles.label}>{t("sectionLabel")}</label>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t("activateLabel")}</label>
            <input
              type="checkbox"
              checked={isCreditActivated}
              onChange={(e) => setIsCreditActivated(e.target.checked)}
            />
          </div>
          {isCreditActivated && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>{t("paidLabel")}</label>
                <input
                  type="number"
                  min={0}
                  className={styles.input}
                  placeholder={t("paidPlaceholder")}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                />
              </div>
              {!isPurchase && (
                <div className={styles.field}>
                  <label className={styles.label}>{t("clientLabel")}</label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <Select
                      styles={selectStyles}
                      onInputChange={(val) => setSearch(val)}
                      options={clientOptions}
                      onChange={(opt) => (
                        setClientId(opt?.value ?? null),
                        setSelectedClient(opt?.value ?? null)
                      )}
                      value={
                        clients.find((c) => c.id === selectedClient)
                          ? {
                              value: selectedClient,
                              label: clients.find(
                                (c) => c.id === selectedClient,
                              )?.name,
                            }
                          : null
                      }
                      placeholder={t("clientListPlaceholder")}
                    />
                    <Plus onClick={() => setOpenModal(true)} />
                    <Trash
                      onClick={() => (
                        setClientId(null),
                        setSelectedClient(null)
                      )}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ToastContainer />
      {openModal && (
        <AddClientModal
          setModalOpen={setOpenModal}
          isUpdate={false}
          setSuccessToast={setSuccessToast}
        />
      )}
    </div>
  );
}
