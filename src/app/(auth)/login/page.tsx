"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Syringe, Eye, EyeOff, Loader2, ShieldAlert,
  AlertTriangle, CheckCircle2, Lock,
} from "lucide-react";

/* --- Constants -- */
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/* --- Shake keyframes variant -- */
const shakeVariant = {
  idle:  { x: 0 },
  shake: {
    x: [0, -10, 10, -10, 10, -6, 6, -3, 3, 0],
    transition: { duration: 0.55, ease: "easeInOut" },
  },
};

/* --- Parse error codes from NextAuth -- */
function parseError(raw: string): { type: "locked"; minutes: number } | { type: "invalid"; attemptsLeft: number } | { type: "generic" } {
  if (raw.startsWith("LOCKED:")) {
    return { type: "locked", minutes: parseInt(raw.split(":")[1] ?? "15") };
  }
  if (raw.startsWith("INVALID:")) {
    return { type: "invalid", attemptsLeft: parseInt(raw.split(":")[1] ?? "0") };
  }
  return { type: "generic" };
}

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [shakeState,  setShakeState]  = useState<"idle" | "shake">("idle");
  const [success,     setSuccess]     = useState(false);

  /* Error state */
  const [errorType,     setErrorType]     = useState<"locked" | "invalid" | "generic" | null>(null);
  const [attemptsLeft,  setAttemptsLeft]  = useState(MAX_ATTEMPTS);
  const [lockMinutes,   setLockMinutes]   = useState(LOCKOUT_MINUTES);

  /* Restore remembered email */
  useEffect(() => {
    const saved = localStorage.getItem("vaxadmin-email");
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  function triggerShake() {
    setShakeState("shake");
    setTimeout(() => setShakeState("idle"), 600);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setErrorType(null);

    const res = await signIn("credentials", {
      email:    email.trim(),
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.ok && !res.error) {
      setSuccess(true);
      if (rememberMe) localStorage.setItem("vaxadmin-email", email.trim());
      else            localStorage.removeItem("vaxadmin-email");
      setTimeout(() => router.push(callbackUrl), 600);
      return;
    }

    /* Parse structured error from NextAuth */
    const raw = res?.error ?? "generic";
    const parsed = parseError(raw);

    triggerShake();

    if (parsed.type === "locked") {
      setErrorType("locked");
      setLockMinutes(parsed.minutes);
    } else if (parsed.type === "invalid") {
      setErrorType("invalid");
      setAttemptsLeft(parsed.attemptsLeft);
    } else {
      setErrorType("generic");
    }
  }

  const isLocked = errorType === "locked";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-4"
      style={{ background: "var(--navy-950)" }}
    >
      {/* -- Background grid pattern -- */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--navy-400) 1px, transparent 1px),
                            linear-gradient(90deg, var(--navy-400) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* -- Ambient glow blobs -- */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
        style={{ background: "var(--health-green-500)" }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full opacity-8 blur-3xl"
        style={{ background: "var(--blue-500)" }}
      />

      {/* -- Card -- */}
      <motion.div
        variants={shakeVariant}
        animate={shakeState}
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Card surface */}
        <div
          className="overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            background:   "var(--navy-900)",
            borderColor:  "rgba(255,255,255,0.08)",
            boxShadow:    "0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* -- Top accent bar -- */}
          <div
            className="h-1 w-full"
            style={{ background: "linear-gradient(90deg, var(--health-green-600), var(--health-green-400), var(--blue-500))" }}
          />

          <div className="px-8 pb-8 pt-7">
            {/* -- Branding -- */}
            <div className="mb-7 flex flex-col items-center gap-3 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
                style={{
                  background:  "linear-gradient(135deg, var(--health-green-700), var(--health-green-500))",
                  boxShadow:   "0 0 24px rgba(16,185,129,0.35)",
                }}
              >
                <Syringe className="h-8 w-8 text-white" />
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  VaxAdmin Portal
                </h1>
                <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--health-green-400)" }}>
                  Government of Bangladesh - Health Ministry
                </p>
              </div>

              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{
                  background:  "rgba(16,185,129,0.08)",
                  border:      "1px solid rgba(16,185,129,0.2)",
                  color:       "var(--health-green-400)",
                }}
              >
                <ShieldAlert className="h-3 w-3" />
                Authorized Personnel Only
              </div>
            </div>

            {/* -- Error / lockout banners -- */}
            <AnimatePresence mode="wait">
              {errorType === "locked" && (
                <motion.div
                  key="locked"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div
                    className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
                  >
                    <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Account Temporarily Locked</p>
                      <p className="mt-0.5 text-xs text-red-300/80">
                        Too many failed attempts. Try again in{" "}
                        <span className="font-bold">{lockMinutes} minutes</span>.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {errorType === "invalid" && (
                <motion.div
                  key="invalid"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div
                    className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-amber-400">Invalid Credentials</p>
                      <p className="mt-0.5 text-xs text-amber-300/80">
                        {attemptsLeft > 0
                          ? <>
                              <span className="font-bold">{attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""}</span>
                              {" "}remaining before {LOCKOUT_MINUTES}-minute lockout.
                            </>
                          : "Account will be locked on next failed attempt."
                        }
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {errorType === "generic" && (
                <motion.div
                  key="generic"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
                    <p className="text-sm text-red-400">Authentication failed. Please try again.</p>
                  </div>
                </motion.div>
              )}

              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-5 overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 rounded-xl p-4"
                    style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <p className="text-sm font-medium text-emerald-400">Authenticated. Redirecting-</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* -- Form -- */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--navy-400)" }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isLocked || loading || success}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mohfw.gov.bd"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--navy-600)] transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background:   "rgba(255,255,255,0.04)",
                    border:       "1px solid rgba(255,255,255,0.1)",
                    caretColor:   "var(--health-green-400)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--navy-400)" }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={isLocked || loading || success}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="------------"
                    className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-[var(--navy-600)] transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background:  "rgba(255,255,255,0.04)",
                      border:      "1px solid rgba(255,255,255,0.1)",
                      caretColor:  "var(--health-green-400)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    style={{ color: "var(--navy-500)" }}
                    tabIndex={-1}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye    className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe((r) => !r)}
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition-all"
                  style={{
                    background:  rememberMe ? "var(--health-green-500)" : "rgba(255,255,255,0.06)",
                    border:      rememberMe ? "1px solid var(--health-green-500)" : "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {rememberMe && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className="text-xs" style={{ color: "var(--navy-400)" }}>
                  Remember my email
                </span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLocked || loading || success || !email || !password}
                className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: isLocked
                    ? "rgba(239,68,68,0.3)"
                    : "linear-gradient(135deg, var(--health-green-600), var(--health-green-500))",
                  boxShadow: (!isLocked && !loading && !success)
                    ? "0 0 20px rgba(16,185,129,0.3)"
                    : "none",
                }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {success  && <CheckCircle2 className="h-4 w-4" />}
                {isLocked && <Lock className="h-4 w-4" />}
                {loading  ? "Authenticating-"
                  : success ? "Redirecting-"
                  : isLocked ? "Account Locked"
                  : "Sign In to Portal"
                }
              </button>
            </form>

            {/* -- Attempt indicator dots -- */}
            {errorType === "invalid" && (
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full transition-all"
                    style={{
                      background: i < (MAX_ATTEMPTS - attemptsLeft)
                        ? "var(--red-500)"
                        : "rgba(255,255,255,0.15)",
                    }}
                  />
                ))}
                <span className="ml-1 text-[10px]" style={{ color: "var(--navy-500)" }}>
                  {MAX_ATTEMPTS - attemptsLeft}/{MAX_ATTEMPTS} attempts
                </span>
              </div>
            )}
          </div>

          {/* -- Footer -- */}
          <div
            className="flex items-center justify-between px-8 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)" }}
          >
            <span className="text-[10px]" style={{ color: "var(--navy-600)" }}>
              - 2025 Ministry of Health & Family Welfare
            </span>
            <span
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--navy-600)" }}
            >
              <ShieldAlert className="h-3 w-3" />
              Secure - Encrypted
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
