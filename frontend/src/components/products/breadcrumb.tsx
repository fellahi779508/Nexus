"use client";

import { ChevronRight, ArrowLeft } from "lucide-react";
import styles from "./breadcrumb.module.css";
import Link from "next/link";

export type BreadcrumbItem = {
	label: string;
	link?: string;
};

type BreadcrumbProps = {
	items: BreadcrumbItem[];
};

export default function Breadcrumb({ items }: BreadcrumbProps) {
	if (!items.length) return null;

	const canGoBack = items.length > 1;
	const previous = items[items.length - 2];

	return (
		<div className={styles.wrapper}>
			{/* Back button — always explicit for Electron */}
			{canGoBack && (
				<Link
					href={previous.link || "/"}
					className={styles.backBtn}
					aria-label="Go back"
				>
					<ArrowLeft size={15} strokeWidth={2} />
					<span>{previous.label}</span>
				</Link>
			)}

			{/* Crumb trail */}
			<nav className={styles.trail} aria-label="Breadcrumb">
				{items.map((item, i) => {
					const isLast = i === items.length - 1;
					return (
						<span key={i} className={styles.crumbGroup}>
							{i > 0 && (
								<ChevronRight
									size={13}
									strokeWidth={2}
									className={styles.separator}
								/>
							)}
							{isLast ? (
								<span className={styles.crumbActive}>{item.label}</span>
							) : (
								<Link href={item.link || "/"} className={styles.crumbLink}>
									{item.label}
								</Link>
							)}
						</span>
					);
				})}
			</nav>
		</div>
	);
}
