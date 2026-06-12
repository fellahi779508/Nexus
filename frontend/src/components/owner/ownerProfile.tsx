"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import {
  Eye,
  EyeOff,
  Loader2,
  User,
  Camera,
  Trash2,
  Save,
  Plus,
  Pencil,
  Info,
} from "lucide-react";
import styles from "./owner.component.module.css";
import PasswordGate from "./passwordGate";

/* ── Types ──────────────────────────────────────────────────────────────── */

type OwnerForm = {
  name: string;
  password: string;
  description: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  capital: string;
  RC: string;
  NIS: string;
  NIF: string;
  IF: string;
  NA: string;
  /** base64 data-url string or null — sent as-is in JSON body */
  image: string | null;
};

type OwnerErrors = Partial<Record<keyof OwnerForm, string>>;

const EMPTY: OwnerForm = {
  name: "",
  password: "",
  description: "",
  address: "",
  phone: "",
  fax: "",
  email: "",
  website: "",
  capital: "",
  RC: "",
  NIS: "",
  NIF: "",
  IF: "",
  NA: "",
  image: null,
};

const API = "http://localhost:3001";

/* ── Buffer → base64 data-url ────────────────────────────────────────────── */

function bufferToDataUrl(
  raw: { type: "Buffer"; data: number[] } | number[] | null | undefined,
): string | null {
  if (!raw) return null;
  try {
    const arr: number[] = Array.isArray(raw) ? raw : ((raw as any).data ?? []);
    const bytes = new Uint8Array(arr);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return `data:image/png;base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function OwnerProfile() {
  const t = useTranslations("owner");

  type Stage = "checking" | "gate" | "form";
  const [stage, setStage] = useState<Stage>("checking");
  const [mode, setMode] = useState<"create" | "edit">("create");

  /* ── Form state ─────────────────────────────────────────────────────── */
  const [form, setForm] = useState<OwnerForm>(EMPTY);
  const [errors, setErrors] = useState<OwnerErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Boot ───────────────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/owner`);
        const exists =
          data &&
          (Array.isArray(data)
            ? data.length > 0
            : Object.keys(data).length > 0);

        if (exists) {
          setMode("edit");
          setStage("gate");
        } else {
          setMode("create");
          setStage("form");
        }
      } catch {
        setMode("create");
        setStage("form");
      }
    })();
  }, []);

  /* ── After gate unlocks ─────────────────────────────────────────────── */
  async function handleGateSuccess() {
    try {
      const { data } = await axios.get(`${API}/owner`);
      const owner = Array.isArray(data) ? data[0] : data;

      setForm({
        name: owner.name ?? "",
        password: "", // never pre-fill password
        description: owner.description ?? "",
        address: owner.address ?? "",
        phone: owner.phone ?? "",
        fax: owner.fax ?? "",
        email: owner.email ?? "",
        website: owner.website ?? "",
        capital: owner.capital ?? "",
        RC: owner.RC ?? "",
        NIS: owner.NIS ?? "",
        NIF: owner.NIF ?? "",
        IF: owner.IF ?? "",
        NA: owner.NA ?? "",
        image: bufferToDataUrl(owner.image), // decode buffer → data-url → state
      });

      setStage("form");
    } catch {
      toast.error(t("toast.loadError"));
    }
  }

  /* ── Field setter ───────────────────────────────────────────────────── */
  function field(key: keyof OwnerForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((er) => ({ ...er, [key]: undefined }));
    };
  }

  /* ── Avatar handling ────────────────────────────────────────────────── */
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("toast.invalidImage"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm((f) => ({ ...f, image: dataUrl }));
    };
    reader.readAsDataURL(file);
    // reset input so the same file can be re-selected
    e.target.value = "";
  }

  function removeAvatar() {
    setForm((f) => ({ ...f, image: null }));
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ── Validation ─────────────────────────────────────────────────────── */
  function validate(): boolean {
    const errs: OwnerErrors = {};

    if (!form.name.trim()) errs.name = t("validation.required");
    if (!form.address.trim()) errs.address = t("validation.required");
    if (mode === "create" && !form.password.trim())
      errs.password = t("validation.required");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = t("validation.invalidEmail");

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ── Submit ─────────────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    // Build a plain object — no FormData
    const body: Record<string, string | null> = {
      name: form.name,
      description: form.description,
      address: form.address,
      phone: form.phone,
      fax: form.fax,
      email: form.email,
      website: form.website,
      capital: form.capital,
      RC: form.RC,
      NIS: form.NIS,
      NIF: form.NIF,
      IF: form.IF,
      NA: form.NA,
      image: form.image, // base64 data-url or null
    };

    // Only include password if the user actually typed one
    if (form.password.trim()) {
      body.password = form.password;
    }

    try {
      if (mode === "create") {
        await axios.post(`${API}/owner`, body);
        toast.success(t("toast.created"));
        setMode("edit");
      } else {
        await axios.put(`${API}/owner`, body);
        toast.success(t("toast.updated"));
      }

      // Clear the password field after a successful save
      setForm((f) => ({ ...f, password: "" }));
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      toast.error(typeof raw === "string" ? raw : t("toast.saveError"));
    } finally {
      setSaving(false);
    }
  }

  /* ── Render: checking ───────────────────────────────────────────────── */
  if (stage === "checking") {
    return (
      <div className={styles.loadingWrap}>
        {[72, 48, 88, 56, 40].map((w, i) => (
          <div
            key={i}
            className={styles.skeletonLine}
            style={{ height: 14, width: `${w}%` }}
          />
        ))}
      </div>
    );
  }

  /* ── Render: gate ───────────────────────────────────────────────────── */
  if (stage === "gate") {
    return <PasswordGate ns="owner" onSuccess={handleGateSuccess} />;
  }

  /* ── Render: form ───────────────────────────────────────────────────── */
  return (
    <>
      <title>Nexus | Lock</title>
      <form onSubmit={handleSubmit} noValidate>
        {/* ── Avatar ──────────────────────────────────────────────────── */}
        {/* <div className={styles.avatarSection}>
      <div
        className={styles.avatarWrap}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
      >
        <div className={styles.avatarRing}>
          {form.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.image}
              alt="Owner logo"
              className={styles.avatarImg}
            />
          ) : (
            <span className={styles.avatarPlaceholder}>
              <User size={28} strokeWidth={1.5} />
            </span>
          )}
        </div>
        <div className={styles.avatarOverlay}>
          <Camera size={18} />
        </div>
      </div>

      <div className={styles.avatarMeta}>
        <span className={styles.avatarTitle}>{t("avatar.title")}</span>
        <span className={styles.avatarHint}>{t("avatar.hint")}</span>
        <div className={styles.avatarBtns}>
          <button
            type="button"
            className={styles.avatarUploadBtn}
            onClick={() => fileRef.current?.click()}
          >
            <Camera size={12} />
            {t("avatar.upload")}
          </button>
          {form.image && (
            <button
              type="button"
              className={styles.avatarRemoveBtn}
              onClick={removeAvatar}
            >
              <Trash2 size={12} />
              {t("avatar.remove")}
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={handleAvatarChange}
      />
    </div> */}

        {/* ── Identity ────────────────────────────────────────────────── */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldRow}>
            {/* Name */}
            <div className={styles.field}>
              <label
                className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}
              >
                {t("fields.name")}
              </label>
              <input
                className={`${styles.fieldInput} ${errors.name ? styles.fieldError : ""}`}
                value={form.name}
                onChange={field("name")}
                placeholder={t("placeholders.name")}
              />
              {errors.name && (
                <span className={styles.fieldErrorMsg}>{errors.name}</span>
              )}
            </div>

            {/* Password */}
            <div className={styles.field}>
              <label
                className={`${styles.fieldLabel} ${mode === "create" ? styles.fieldLabelRequired : ""}`}
              >
                {t("fields.password")}
              </label>
              <div className={styles.passwordGroup}>
                <input
                  className={`${styles.fieldInput} ${errors.password ? styles.fieldError : ""}`}
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={field("password")}
                  placeholder={
                    mode === "edit"
                      ? t("placeholders.passwordEdit")
                      : t("placeholders.password")
                  }
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.inlineEye}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <span className={styles.fieldErrorMsg}>{errors.password}</span>
              )}
            </div>
          </div>

          {mode === "edit" && (
            <div className={styles.passwordNote}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              {t("fields.passwordEditNote")}
            </div>
          )}

          {/* Description */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              {t("fields.description")}
            </label>
            <textarea
              className={styles.fieldTextarea}
              value={form.description}
              onChange={field("description")}
              placeholder={t("placeholders.description")}
            />
          </div>

          {/* Address */}
          <div className={styles.field}>
            <label
              className={`${styles.fieldLabel} ${styles.fieldLabelRequired}`}
            >
              {t("fields.address")}
            </label>
            <input
              className={`${styles.fieldInput} ${errors.address ? styles.fieldError : ""}`}
              value={form.address}
              onChange={field("address")}
              placeholder={t("placeholders.address")}
            />
            {errors.address && (
              <span className={styles.fieldErrorMsg}>{errors.address}</span>
            )}
          </div>
        </div>

        {/* ── Contact ─────────────────────────────────────────────────── */}
        <div className={styles.fieldGroup}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("fields.phone")}</label>
              <input
                className={styles.fieldInput}
                value={form.phone}
                onChange={field("phone")}
                placeholder={t("placeholders.phone")}
                type="tel"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("fields.fax")}</label>
              <input
                className={styles.fieldInput}
                value={form.fax}
                onChange={field("fax")}
                placeholder={t("placeholders.fax")}
                type="tel"
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("fields.email")}</label>
              <input
                className={`${styles.fieldInput} ${errors.email ? styles.fieldError : ""}`}
                value={form.email}
                onChange={field("email")}
                placeholder={t("placeholders.email")}
                type="email"
              />
              {errors.email && (
                <span className={styles.fieldErrorMsg}>{errors.email}</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("fields.website")}</label>
              <input
                className={styles.fieldInput}
                value={form.website}
                onChange={field("website")}
                placeholder={t("placeholders.website")}
                type="url"
              />
            </div>
          </div>
        </div>

        {/* ── Legal / Financial IDs ────────────────────────────────────── */}
        <div className={styles.fieldGroup}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t("fields.capital")}</label>
            <input
              className={styles.fieldInput}
              value={form.capital}
              onChange={field("capital")}
              placeholder={t("placeholders.capital")}
            />
          </div>

          <div className={styles.legalGrid}>
            {(["RC", "NIS", "NIF", "IF", "NA"] as const).map((key) => (
              <div key={key} className={styles.field}>
                <label className={styles.fieldLabel}>
                  {t(`fields.${key}`)}
                </label>
                <input
                  className={styles.fieldInput}
                  value={form[key]}
                  onChange={field(key)}
                  placeholder={t(`placeholders.${key}`)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className={styles.formFooter}>
          <span className={`${styles.modeBadge} ${styles[mode]}`}>
            {mode === "create" ? (
              <>
                <Plus size={11} />
                {t("mode.create")}
              </>
            ) : (
              <>
                <Pencil size={11} />
                {t("mode.edit")}
              </>
            )}
          </span>

          <button className={styles.submitBtn} type="submit" disabled={saving}>
            {saving ? (
              <Loader2 size={15} className={styles.spinner} />
            ) : (
              <Save size={15} />
            )}
            {mode === "create" ? t("actions.create") : t("actions.save")}
          </button>
        </div>
      </form>
    </>
  );
}
