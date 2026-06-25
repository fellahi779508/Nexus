"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import styles from "./settings.module.css";
import {
  Globe,
  Sun,
  Moon,
  Sunset,
  Download,
  Upload,
  CheckCircle2,
  ChevronRight,
  Loader2,
  UserCog,
  Lock,
  Trash2,
  Database,
} from "lucide-react";
import OwnerProfile from "@/components/owner/ownerProfile";
import PasswordGate from "@/components/owner/passwordGate";
import { deleteDataBase } from "@/api/owner-api";
import { Metadata } from "next";
import axios from "axios";
// adjust to your path

/* ── Types ──────────────────────────────────────────────────────────────── */

type Theme = "light" | "dim" | "dark";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "fr", label: "French", native: "Français" },
  { code: "ar", label: "Arabic", native: "العربية" },
] as const;

const THEMES: { value: Theme; icon: React.ReactNode }[] = [
  { value: "light", icon: <Sun size={15} strokeWidth={2} /> },
  { value: "dim", icon: <Sunset size={15} strokeWidth={2} /> },
  { value: "dark", icon: <Moon size={15} strokeWidth={2} /> },
];

const API = "http://localhost:3001";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function getSavedTheme(): Theme {
  try {
    return (localStorage.getItem("theme") as Theme) ?? "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {}
}

function saveLang(code: string) {
  try {
    localStorage.setItem("lang", code);
  } catch {}
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [theme, setTheme] = useState<Theme>("light");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dataUnlocked, setDataUnlocked] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getSavedTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);

  /* ── Language ── */
  function handleLangChange(code: string) {
    saveLang(code);
    const segments = pathname.split("/");
    segments[1] = code;
    router.push(segments.join("/"));
    toast.success(t("toast.langChanged"));
  }

  /* ── Theme ── */
  function handleThemeChange(value: Theme) {
    setTheme(value);
    applyTheme(value);
    toast.success(t("toast.themeChanged"));
  }

  /* ── Export ── */
  // Inside your Frontend Component / Service
  async function handleExport() {
    // 1. Tell backend to create the temporary file copy
    const response = await axios.get("http://localhost:3001/backup/export");
    const { backupFilePath } = response.data;

    // 2. Pass the path to Electron Main Process via your IPC bridge
    // (Assuming you have a 'save-database-file' listener in main.js)
    (window as any).electronAPI.saveDatabaseFile(backupFilePath);
  }

  /* ── Import ── */
  async function handleImportClick() {
    if ("showOpenFilePicker" in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: "SQLite Database",
              accept: { "application/octet-stream": [".sqlite"] },
            },
          ],
          multiple: false,
        });
        const file: File = await handle.getFile();
        await uploadFile(file);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        toast.error(t("toast.importError"));
      }
    } else {
      fileInputRef.current?.click();
    }
  }

  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await uploadFile(file);
  }

  async function uploadFile(file: File) {
    if (!file.name.endsWith(".sqlite")) {
      toast.error(t("toast.importInvalidFile"));
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API}/backup/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.status === 1) {
        toast.success(t("toast.importSuccess"));
      } else {
        toast.error(data.message ?? t("toast.importError"));
      }
    } catch {
      toast.error(t("toast.importError"));
    } finally {
      setImporting(false);
    }
  }

  async function handleDeleteClick() {
    if (!window.confirm(t("deletionConfirmation"))) {
      return;
    }
    const res = await deleteDataBase();
    if (res.status === 1) {
      alert(t("toast.deleteSuccess"));
      alert(t("toast.deleteSuccess2"));
    } else {
      toast.error(res.error ?? t("toast.deleteError"));
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <>
      <title>Nexus | Settings</title>
      <div className={styles.page}>
        <div className={styles.content}>
          {/* ── Page header ────────────────────────────────────── */}
          <div className={styles.pageHeader}>
            <p className={styles.eyebrow}>{t("eyebrow")}</p>
            <h1 className={styles.pageTitle}>{t("title")}</h1>
            <p className={styles.pageDesc}>{t("desc")}</p>
          </div>

          {/* ── Owner Profile ──────────────────────────────────── */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <UserCog size={15} strokeWidth={2} />
              <h2 className={styles.sectionTitle}>{t("owner.sectionTitle")}</h2>
            </div>
            <p className={styles.sectionDesc}>{t("owner.sectionDesc")}</p>
            <OwnerProfile />
          </section>

          <div className={styles.divider} />

          {/* ── Language ───────────────────────────────────────── */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Globe size={15} strokeWidth={2} />
              <h2 className={styles.sectionTitle}>{t("language.title")}</h2>
            </div>
            <p className={styles.sectionDesc}>{t("language.desc")}</p>

            <div className={styles.langGrid}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`${styles.langCard} ${locale === l.code ? styles.langCardActive : ""}`}
                  onClick={() => handleLangChange(l.code)}
                >
                  {locale === l.code && (
                    <CheckCircle2
                      size={13}
                      className={styles.checkIcon}
                      strokeWidth={2.5}
                    />
                  )}
                  <span className={styles.langNative}>{l.native}</span>
                  <span className={styles.langLabel}>{l.label}</span>
                </button>
              ))}
            </div>
          </section>

          <div className={styles.divider} />

          {/* ── Theme ──────────────────────────────────────────── */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Sun size={15} strokeWidth={2} />
              <h2 className={styles.sectionTitle}>{t("theme.title")}</h2>
            </div>
            <p className={styles.sectionDesc}>{t("theme.desc")}</p>

            <div className={styles.themeGrid}>
              {THEMES.map(({ value, icon }) => (
                <button
                  key={value}
                  className={`${styles.themeCard} ${theme === value ? styles.themeCardActive : ""}`}
                  onClick={() => handleThemeChange(value)}
                >
                  <div
                    className={`${styles.preview} ${styles[`preview_${value}`]}`}
                  >
                    <div className={styles.previewBar} />
                    <div className={styles.previewBody}>
                      <div
                        className={styles.previewLine}
                        style={{ width: "55%" }}
                      />
                      <div
                        className={styles.previewLine}
                        style={{ width: "38%" }}
                      />
                      <div className={styles.previewBlock} />
                    </div>
                  </div>
                  <div className={styles.themeLabel}>
                    {icon}
                    <span>{t(`theme.${value}`)}</span>
                    {theme === value && (
                      <CheckCircle2
                        size={13}
                        className={styles.checkIcon}
                        strokeWidth={2.5}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <div className={styles.divider} />

          {/* ── Data & Backup ──────────────────────────────────── */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Download size={15} strokeWidth={2} />
              <h2 className={styles.sectionTitle}>{t("data.title")}</h2>
            </div>
            <p className={styles.sectionDesc}>{t("data.desc")}</p>

            {/* Password gate — shown until unlocked */}
            {!dataUnlocked ? (
              <PasswordGate
                ns="settings"
                onSuccess={() => setDataUnlocked(true)}
              />
            ) : (
              <div className={styles.dataActions}>
                {/* Unlocked indicator */}
                <div className={styles.dataUnlockedBanner}>
                  <CheckCircle2 size={14} />
                  {t("data.unlocked")}
                </div>

                <button
                  className={styles.dataCard}
                  onClick={handleExport}
                  disabled={exporting || importing}
                >
                  <div className={styles.dataIcon}>
                    {exporting ? (
                      <Loader2
                        size={19}
                        strokeWidth={1.8}
                        className={styles.spinner}
                      />
                    ) : (
                      <Download size={19} strokeWidth={1.8} />
                    )}
                  </div>
                  <div className={styles.dataBody}>
                    <span className={styles.dataTitle}>
                      {t("data.export.title")}
                    </span>
                    <span className={styles.dataDesc}>
                      {t("data.export.desc")}
                    </span>
                  </div>
                  <ChevronRight size={15} className={styles.dataArrow} />
                </button>

                <button
                  className={styles.dataCard}
                  onClick={handleImportClick}
                  disabled={exporting || importing}
                >
                  <div className={styles.dataIcon}>
                    {importing ? (
                      <Loader2
                        size={19}
                        strokeWidth={1.8}
                        className={styles.spinner}
                      />
                    ) : (
                      <Upload size={19} strokeWidth={1.8} />
                    )}
                  </div>
                  <div className={styles.dataBody}>
                    <span className={styles.dataTitle}>
                      {t("data.import.title")}
                    </span>
                    <span className={styles.dataDesc}>
                      {t("data.import.desc")}
                    </span>
                  </div>
                  <ChevronRight size={15} className={styles.dataArrow} />
                </button>
                <button
                  className={styles.dataCard}
                  onClick={handleDeleteClick}
                  disabled={exporting || importing}
                >
                  <div className={styles.dataIcon}>
                    {importing ? (
                      <Trash2
                        size={19}
                        strokeWidth={1.8}
                        className={styles.spinner}
                      />
                    ) : (
                      <Database size={19} strokeWidth={1.8} />
                    )}
                  </div>
                  <div className={styles.dataBody}>
                    <span className={styles.dataTitle}>
                      {t("data.delete.title")}
                    </span>
                    <span className={styles.dataDesc}>
                      {t("data.delete.desc")}
                    </span>
                  </div>
                  <ChevronRight size={15} className={styles.dataArrow} />
                </button>

                {/* Re-lock button */}
                <button
                  className={styles.relockBtn}
                  onClick={() => setDataUnlocked(false)}
                >
                  <Lock size={13} />
                  {t("data.lock")}
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".sqlite"
              className={styles.hiddenInput}
              onChange={handleFileInputChange}
            />
          </section>
        </div>
        <ToastContainer />
      </div>
    </>
  );
}
