"use client";
import { X } from "lucide-react";
import styles from "./add-supplier.module.css";
import { useCallback, useEffect, useState } from "react";
import { PostSupplier } from "@/utils/types";
import { toast, ToastContainer } from "react-toastify";
import { useTranslations } from "next-intl";
import {
	createSupplier,
	GetSupplierById,
	updateSupplier,
} from "@/api/supplier-api";

export default function AddSupllierModal({
	isUpdate,
	setModalOpen,
	supplierId,
	setSuccessToast,
}: {
	isUpdate: boolean;
	setModalOpen: (open: boolean) => void;
	supplierId?: number;
	setSuccessToast: (successToast: boolean) => void;
}) {
	const t = useTranslations("addSupplier");
	const [supplier, setSupplier] = useState<PostSupplier>({
		name: "",
		address: null,
		phone: null,
		email: null,
	});

	async function handleSubmit() {
		if (!fieldsVerifier()) return;
		if (isUpdate) {
			const result = await updateSupplier(supplierId!, supplier!);
			if (result.status === 1) {
				setSuccessToast(true);
				setModalOpen(false);
			} else {
				toast.error(result.response || t("errorUpdate"));
			}
		} else {
			const result = await createSupplier(supplier!);
			if (result.status === 1) {
				setSuccessToast(true);
				setModalOpen(false);
			} else {
				toast.error(result.response || t("errorCreate"));
			}
		}
	}

	function fieldsVerifier() {
		if (!supplier?.name) {
			toast.error(t("errorNameRequired"));
			return false;
		}
		return true;
	}
	const getSupplier = useCallback(async () => {
		if (!supplierId) return;
		const result = await GetSupplierById(supplierId);
		if (result.status === 1) {
			setSupplier({
				name: result.response.name,
				address: result.response.address,
				email: result.response.email,
				phone: result.response.phone,
			});
		}
	}, [supplierId]);
	useEffect(() => {
		if (isUpdate) {
			getSupplier();
		}
	}, [isUpdate, getSupplier]);

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
					{Object.entries(supplier).map(([key, value]) =>
						key === "id" ||
						key === "createdAt" ||
						key === "updatedAt" ? null : (
							<div key={key} className={styles.field}>
								<label className={styles.label}>{t(`${key}Label`)}</label>
								<input
									type="text"
									className={styles.input}
									placeholder={t(`${key}Placeholder`)}
									value={value ?? ""}
									onChange={(e) =>
										setSupplier({
											...supplier,
											[key]: e.target.value == "" ? null : e.target.value,
										})
									}
								/>
							</div>
						),
					)}
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
