"use client";
import { X } from "lucide-react";
import styles from "./add-client.module.css";
import { useCallback, useEffect, useState } from "react";
import { PostCategory, PostClient } from "@/utils/types";

import { toast, ToastContainer } from "react-toastify";
import { useTranslations } from "next-intl";
import { getClientById, postClient, updateClient } from "@/api/clients-api";

export default function AddClientModal({
	isUpdate,
	setModalOpen,
	clientId,
	setSuccessToast,
}: {
	isUpdate: boolean;
	setModalOpen: (open: boolean) => void;
	clientId?: number;
	setSuccessToast: (successToast: boolean) => void;
}) {
	const t = useTranslations("addClient");
	const [client, setClient] = useState<PostClient>();

	async function handleSubmit() {
		if (!fieldsVerifier()) return;
		if (isUpdate) {
			const result = await updateClient(clientId!, client!);
			if (result.status === 1) {
				toast.success(t("successUpdate"));
				setSuccessToast(true);
				setModalOpen(false);
			} else {
				toast.error(t("errorUpdate"));
			}
		} else {
			const result = await postClient(client!);
			if (result.status === 1) {
				toast.success(t("successCreate"));
				setSuccessToast(true);
				setModalOpen(false);
			} else {
				toast.error(t("errorCreate"));
			}
		}
	}

	function fieldsVerifier() {
		if (!client?.name) {
			toast.error(t("errorNameRequired"));
			return false;
		}
		return true;
	}
	const getClient = useCallback(async () => {
		if (!clientId) return;
		const result = await getClientById(clientId);
		if (result.status === 1) {
			setClient({
				name: result.response.name,
				email: result.response.email,
				phone: result.response.phone,
				address: result.response.address,
			});
		}
	}, [clientId]);
	useEffect(() => {
		if (isUpdate) {
			getClient();
		}
	}, [isUpdate, getClient]);

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
					<div className={styles.sectionLabel}>
						<label className={styles.label}>{t("sectionLabel")}</label>
					</div>
					<div className={styles.field}>
						<label className={styles.label}>{t("nameLabel")}</label>
						<input
							type="text"
							className={styles.input}
							placeholder={t("namePlaceholder")}
							value={client?.name || ""}
							onChange={(e) => setClient({ ...client, name: e.target.value })}
							required
						/>
					</div>
					<div className={styles.field}>
						<label className={styles.label}>{t("emailLabel")}</label>
						<input
							type="text"
							className={styles.input}
							placeholder={t("emailPlaceholder")}
							value={client?.email || ""}
							onChange={(e) =>
								setClient((prev) => ({ ...prev, email: e.target.value }))
							}
						/>
					</div>
					<div className={styles.field}>
						<label className={styles.label}>{t("phoneLabel")}</label>
						<input
							type="text"
							className={styles.input}
							placeholder={t("phonePlaceholder")}
							value={client?.phone || ""}
							onChange={(e) =>
								setClient((prev) => ({ ...prev, phone: e.target.value }))
							}
						/>
					</div>
					<div className={styles.field}>
						<label className={styles.label}>{t("addressLabel")}</label>
						<input
							type="text"
							className={styles.input}
							placeholder={t("addressPlaceholder")}
							value={client?.address || ""}
							onChange={(e) =>
								setClient((prev) => ({ ...prev, address: e.target.value }))
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
		</div>
	);
}
