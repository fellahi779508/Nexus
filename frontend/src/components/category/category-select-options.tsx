"use client";
import Link from "next/link";
import styles from "./category-select-options.module.css";
import {
	X,
	LayoutGrid,
	Pencil,
	ArrowRight,
	Delete,
	AwardIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteCategoryById } from "@/api/categories-api";

export default function CategorySelectOptions({
	setUpdateCategory,
	categoryId,
	categoryName,
	setCategorySelectOptionsOpen,
	setSuccessToast,
}: {
	setUpdateCategory: (value: boolean) => void;
	categoryId: number;
	categoryName: string;
	setCategorySelectOptionsOpen: (value: boolean) => void;
	setSuccessToast: (value: boolean) => void;
}) {
	const t = useTranslations();

	function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
		if (e.target === e.currentTarget) setCategorySelectOptionsOpen(false);
	}

	async function HandleDeleteCategory() {
		if (!window.confirm(t("categoryOptions.confirmDelete"))) {
			return;
		}
		const res = await deleteCategoryById(categoryId);
		if (res.status === 1) {
			setSuccessToast(true);
			setCategorySelectOptionsOpen(false);
		}
	}

	return (
		<div className={styles.overlay} onClick={handleOverlayClick}>
			<div className={styles.container}>
				<button
					className={styles.closeBtn}
					onClick={() => setCategorySelectOptionsOpen(false)}
					aria-label={t("categoryOptions.close")}
				>
					<X size={14} strokeWidth={2.5} />
				</button>

				<div className={styles.header}>
					<p className={styles.eyebrow}>{t("categoryOptions.eyebrow")}</p>
					<h2 className={styles.title}>{t("categoryOptions.title")}</h2>
				</div>

				<div className={styles.cards}>
					{/* View Products */}
					<Link
						href={`/products?search=${categoryName}`}
						className={styles.card}
					>
						<div className={styles.cardIcon}>
							<LayoutGrid size={20} strokeWidth={1.8} />
						</div>
						<div className={styles.cardBody}>
							<span className={styles.cardTitle}>
								{t("categoryOptions.viewProducts.title")}
							</span>
							<span className={styles.cardDesc}>
								{t("categoryOptions.viewProducts.desc")}
							</span>
						</div>
						<ArrowRight size={16} className={styles.cardArrow} />
					</Link>

					{/* Update Category */}
					<button
						className={`${styles.card} ${styles.cardAccent}`}
						onClick={() => {
							setUpdateCategory(true);
							setCategorySelectOptionsOpen(false);
						}}
					>
						<div className={styles.cardIcon}>
							<Pencil size={20} strokeWidth={1.8} />
						</div>
						<div className={styles.cardBody}>
							<span className={styles.cardTitle}>
								{t("categoryOptions.updateCategory.title")}
							</span>
							<span className={styles.cardDesc}>
								{t("categoryOptions.updateCategory.desc")}
							</span>
						</div>
						<ArrowRight size={16} className={styles.cardArrow} />
					</button>
					{/**delete category */}
					<button
						className={`${styles.card} ${styles.cardAccentRed}`}
						onClick={() => {
							HandleDeleteCategory();
						}}
					>
						<div className={styles.cardIcon}>
							<Delete size={20} strokeWidth={1.8} />
						</div>
						<div className={styles.cardBody}>
							<span className={styles.cardTitle}>
								{t("categoryOptions.deleteCategory.title")}
							</span>
							<span className={styles.cardDesc}>
								{t("categoryOptions.deleteCategory.desc")}
							</span>
						</div>
						<ArrowRight size={16} className={styles.cardArrow} />
					</button>
				</div>
			</div>
		</div>
	);
}
