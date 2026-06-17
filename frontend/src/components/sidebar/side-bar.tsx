"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Package,
  Warehouse,
  Users,
  Truck,
  CircleDollarSign,
  Clock,
  ScrollText,
  Activity,
  Menu,
  X,
  List,
  Settings,
  AlertCircle,
  HandHeartIcon,
  Coins,
} from "lucide-react";
import styles from "./side-bar.module.css";
import {
  getAlert,
  getExpiredBatches,
  getExpiringBatches,
  getLowStockBatches,
} from "@/api/batch-api";

const NAV_ITEMS = [
  { key: "dashboard", href: "/", icon: Activity },
  { key: "categories", href: "/categories", icon: List },
  { key: "products", href: "/products", icon: Package },
  { key: "stock", href: "/stock", icon: Warehouse },
  { key: "clients", href: "/clients", icon: Users },
  { key: "suppliers", href: "/suppliers", icon: Truck },
  { key: "sales", href: "/sales", icon: CircleDollarSign },
  { key: "purchases", href: "/purchases", icon: CircleDollarSign },
  { key: "credits", href: "/credits", icon: Coins },
];

const LOG_ITEMS = [
  { key: "zakat", href: "/zakat", icon: HandHeartIcon },
  { key: "history", href: "/history", icon: Clock },
];

export default function SideBar() {
  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) setMobileOpen(false);
  }
  const [loadedAlert, setLoadedAlert] = useState(false);
  useEffect(() => {
    verifyAlert().then(() => setLoadedAlert(true));
  }, []);
  const verifyAlert = useCallback(async () => {
    const res = await getAlert();
    if (res.response.length > 0) {
      setAlert(true);
    } else {
      setAlert(false);
    }
  }, []);
  useEffect(() => {
    if (loadedAlert) {
      const interval = setInterval(verifyAlert, 60000);
      return () => clearInterval(interval);
    }
  }, [loadedAlert, verifyAlert]);
  const t = useTranslations("sidebar");
  const [alert, setAlert] = useState(false);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Strip locale prefix: /en/products → /products
  const cleanPath = "/" + pathname.split("/").slice(2).join("/") || "/";

  const isActive = (href: string) =>
    cleanPath === href || cleanPath.startsWith(href + "/");

  const handleNavClick = () => setMobileOpen(false);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <Activity size={16} color="var(--accent-foreground)" />
          </div>
          <div>
            <div className={styles.logoText}>{t("appName")}</div>
            <div className={styles.logoSub}>{t("appTagline")}</div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className={styles.sectionLabel}>{t("sectionMain")}</div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ key, href, icon: NavIcon }) => (
          <Link
            key={key}
            href={href}
            className={`${styles.navItem} ${isActive(href) ? styles.active : ""}`}
          >
            <NavIcon className={styles.navIcon} size={18} />
            <span className={styles.navLabel}>{t(key)}</span>
          </Link>
        ))}

        <div className={styles.divider} />

        <div className={styles.sectionLabel} style={{ padding: "4px 0 8px" }}>
          {t("sectionLogs")}
        </div>

        {LOG_ITEMS.map(({ key, href, icon: NavIcon }) => (
          <Link
            key={key}
            href={href}
            className={`${styles.navItem} ${isActive(href) ? styles.active : ""}`}
          >
            <NavIcon className={styles.navIcon} size={18} />
            <span className={styles.navLabel}>{t(key)}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      {alert && (
        <div className={styles.alert}>
          <div className={styles.alertIcon}>
            <AlertCircle size={20} />
          </div>
          <div className={styles.alertContent}>
            <div className={styles.alertTitle}>{t("alert.title")}</div>
            <div className={styles.alertMessage}>{t("alert.message")}</div>
          </div>
          <div className={styles.alertClose} onClick={() => setAlert(false)}>
            <X size={14} />
          </div>
        </div>
      )}
      <Link href="/settings" className={styles.footer}>
        <div className={styles.footerUser}>
          <div className={styles.avatar}>
            <Settings size={20} />
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{t("settings")}</div>
            <div className={styles.userRole}>{t("settingsDescription")}</div>
          </div>
        </div>
      </Link>
    </>
  );

  return (
    <div className={styles.main}>
      {/* Mobile toggle button */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className={styles.overlay} onClick={handleOverlayClick} />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.container} ${mobileOpen ? styles.mobileOpen : ""}`}
      >
        {sidebarContent}
      </aside>
    </div>
  );
}
