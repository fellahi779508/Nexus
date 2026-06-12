"use client";
import Link from "next/link";
import styles from "./supplier-select-options.module.css";
import { X, LayoutGrid, Pencil, ArrowRight, Delete } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteSupplier } from "@/api/supplier-api";

export default function SupplierSelectOptions({
	setUpdateSupplier,
	SupplierID,
	setSupplierSelectOptionsOpen,
	setSuccessToast,
}: {
	setUpdateSupplier: (value: boolean) => void;
	SupplierID: number;
	setSupplierSelectOptionsOpen: (value: boolean) => void;
	setSuccessToast: (successToast: boolean) => void;
}) {
	const t = useTranslations();

	function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
		if (e.target === e.currentTarget) setSupplierSelectOptionsOpen(false);
	}
	async function HandleDeleteSuppleir() {
		if (!window.confirm(t("supplierOptions.confirmDelete"))) {
			return;
		}
		const result = await deleteSupplier(SupplierID);
		if (result.status === 1) {
			setSuccessToast(true);
			setSupplierSelectOptionsOpen(false);
		} else {
			console.log(result.response);
		}
	}

	return (
		<div className={styles.overlay} onClick={handleOverlayClick}>
			<div className={styles.container}>
				<button
					className={styles.closeBtn}
					onClick={() => setSupplierSelectOptionsOpen(false)}
					aria-label={t("categoryOptions.close")}
				>
					<X size={14} strokeWidth={2.5} />
				</button>

				<div className={styles.header}>
					<p className={styles.eyebrow}>{t("supplierOptions.eyebrow")}</p>
					<h2 className={styles.title}>{t("supplierOptions.title")}</h2>
				</div>

				<div className={styles.cards}>
					{/* View suppliers */}
					<Link href={`/suppliers/${SupplierID}`} className={styles.card}>
						<div className={styles.cardIcon}>
							<LayoutGrid size={20} strokeWidth={1.8} />
						</div>
						<div className={styles.cardBody}>
							<span className={styles.cardTitle}>
								{t("supplierOptions.viewDetails.title")}
							</span>
							<span className={styles.cardDesc}>
								{t("supplierOptions.viewDetails.desc")}
							</span>
						</div>
						<ArrowRight size={16} className={styles.cardArrow} />
					</Link>

					{/* Update supplier */}
					<button
						className={`${styles.card} ${styles.cardAccent}`}
						onClick={() => {
							setUpdateSupplier(true);
							setSupplierSelectOptionsOpen(false);
						}}
					>
						<div className={styles.cardIcon}>
							<Pencil size={20} strokeWidth={1.8} />
						</div>
						<div className={styles.cardBody}>
							<span className={styles.cardTitle}>
								{t("supplierOptions.updateSupplier.title")}
							</span>
							<span className={styles.cardDesc}>
								{t("supplierOptions.updateSupplier.desc")}
							</span>
						</div>
						<ArrowRight size={16} className={styles.cardArrow} />
					</button>
					{/** Delete supplier */}
					<button
						className={`${styles.card} ${styles.cardAccentRed}`}
						onClick={() => {
							HandleDeleteSuppleir();
						}}
					>
						<div className={styles.cardIcon}>
							<Delete size={20} strokeWidth={1.8} />
						</div>
						<div className={styles.cardBody}>
							<span className={styles.cardTitle}>
								{t("supplierOptions.deleteSupplier.title")}
							</span>
							<span className={styles.cardDesc}>
								{t("supplierOptions.deleteSupplier.desc")}
							</span>
						</div>
						<ArrowRight size={16} className={styles.cardArrow} />
					</button>
				</div>
			</div>
		</div>
	);
}
