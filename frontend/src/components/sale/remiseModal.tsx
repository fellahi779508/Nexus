"use client";
import styles from "./remiseModal.module.css";
import { ToastContainer } from "react-toastify";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";

export default function RemisetModal({
	setOpenRemiseModal,
	remise,
	remiseAmount,
	setRemise,
	setRemiseAmount,
	isRemiseActivated,
	setIsRemiseActivated,
}: {
	setOpenRemiseModal: (value: boolean) => void;
	setRemise: (value: number) => void;
	remise: number;
	remiseAmount: number;
	setRemiseAmount: (value: number) => void;
	isRemiseActivated: boolean;
	setIsRemiseActivated: (value: boolean) => void;
}) {
	const t = useTranslations("remiseModal");

	return (
		<div className={styles.overlay}>
			<div className={styles.container}>
				<span
					className={styles.closeBtn}
					onClick={() => setOpenRemiseModal(false)}
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
							checked={isRemiseActivated}
							onChange={(e) => setIsRemiseActivated(e.target.checked)}
						/>
					</div>
					{isRemiseActivated && (
						<>
							<div className={styles.field}>
								<label className={styles.label}>{t("remiseLabel")}</label>
								<input
									type="number"
									min={0}
									className={styles.input}
									placeholder={t("remisePlaceholder")}
									value={remise}
									onChange={(e) => (
										setRemise(Number(e.target.value)),
										setRemiseAmount(remiseAmount - Number(e.target.value))
									)}
								/>
							</div>
						</>
					)}
				</div>
			</div>
			<ToastContainer />
		</div>
	);
}
