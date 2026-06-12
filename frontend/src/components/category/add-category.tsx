"use client";
import { X } from "lucide-react";
import styles from "./add-category.module.css";
import { useCallback, useEffect, useState } from "react";
import { PostCategory } from "@/utils/types";
import {
	createCategory,
	getCategoryById,
	updateCategory,
} from "@/api/categories-api";
import { toast, ToastContainer } from "react-toastify";
import { useTranslations } from "next-intl";

export default function AddCategoryModal({
	isUpdate,
	setModalOpen,
	categoryId,
	setSuccessToast,
}: {
	isUpdate: boolean;
	setModalOpen: (open: boolean) => void;
	categoryId?: number;
	setSuccessToast: (successToast: boolean) => void;
}) {
	const t = useTranslations("addCategory");
	const [category, setCategory] = useState<PostCategory>();

	async function handleSubmit() {
		if (!fieldsVerifier()) return;
		if (isUpdate) {
			const result = await updateCategory(categoryId!, category!);
			if (result.status === 1) {
				toast.success(t("successUpdate"));
				setSuccessToast(true);
				setModalOpen(false);
			} else {
				toast.error(t("errorUpdate"));
			}
		} else {
			const result = await createCategory(category!);
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
		if (!category?.name) {
			toast.error(t("errorNameRequired"));
			return false;
		}
		return true;
	}
	const getCategory = useCallback(async () => {
		if (!categoryId) return;
		const result = await getCategoryById(categoryId);
		if (result.status === 1) {
			setCategory({ name: result.response.name });
		}
	}, [categoryId]);
	useEffect(() => {
		if (isUpdate) {
			getCategory();
		}
	}, [isUpdate, getCategory]);

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
							value={category?.name || ""}
							onChange={(e) => setCategory({ name: e.target.value })}
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
