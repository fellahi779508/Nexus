// components/PasswordGate.tsx
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { ShieldCheck, Eye, EyeOff, Lock, Loader2 } from "lucide-react";
import styles from "./passwordGata.module.css";

const API = "http://localhost:3001";

type Props = {
  ns?: string; // translation namespace prefix
  onSuccess: () => void;
};

export default function PasswordGate({ ns = "owner", onSuccess }: Props) {
  const t = useTranslations(ns);

  const [exists, setExists] = useState<boolean | null>(null); // null = loading
  const [pwd, setPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Check if owner already exists ──────────────────────
  useEffect(() => {
    axios
      .get(`${API}/owner`)
      .then((res) => {
        setExists(!!(res.data && res.data.id));
      })
      .catch(() => setExists(false));
  }, []);

  // ── While checking: show nothing (or a tiny spinner) ───
  if (exists === null) {
    return null;
  }
  // ── No owner → nothing to lock ────────────────────────
  if (!exists) {
    onSuccess();
    return null;
  }

  // ── Password verification ──────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pwd.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const { data } = await axios.post<boolean>(`${API}/owner/verify`, {
        password: pwd,
      });

      if (data === true) {
        onSuccess();
      } else {
        triggerShake(t("gate.wrongPassword"));
      }
    } catch {
      triggerShake(t("gate.verifyError"));
    } finally {
      setLoading(false);
    }
  }

  function triggerShake(msg: string) {
    setErrorMsg(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    toast.error(msg);
  }

  return (
    <div className={styles.gate}>
      <div className={styles.gateIcon}>
        <ShieldCheck size={22} strokeWidth={1.8} />
      </div>

      <div className={styles.gateText}>
        <p className={styles.gateTitle}>{t("gate.title")}</p>
        <p className={styles.gateDesc}>{t("gate.desc")}</p>
      </div>

      <form className={styles.gateForm} onSubmit={handleSubmit}>
        <div className={styles.pwdWrap}>
          <input
            className={`${styles.pwdInput} ${shaking ? styles.shake : ""} ${
              errorMsg ? styles.hasError : ""
            }`}
            type={showPwd ? "text" : "password"}
            placeholder={t("gate.placeholder")}
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value);
              setErrorMsg(null);
            }}
            autoFocus
            autoComplete="current-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPwd((v) => !v)}
            tabIndex={-1}
            aria-label={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        {errorMsg && <span className={styles.errorMsg}>{errorMsg}</span>}

        <button
          className={styles.submitBtn}
          type="submit"
          disabled={loading || !pwd.trim()}
        >
          {loading ? (
            <Loader2 size={15} className={styles.spinner} />
          ) : (
            <Lock size={14} />
          )}
          {t("gate.submit")}
        </button>
      </form>
    </div>
  );
}
