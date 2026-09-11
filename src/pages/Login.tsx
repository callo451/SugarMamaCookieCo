import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { usePortalAuth } from "../auth/PortalAuth";
export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, refresh } = usePortalAuth();
  const settingPassword = location.pathname.endsWith("/set-password");
  const [reset, setReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [validLink, setValidLink] = useState(false);
  const [checkingLink, setCheckingLink] = useState(settingPassword);
  useEffect(() => {
    if (!settingPassword) return;
    let alive = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    if (params.has("error")) {
      setError(
        "This link has expired or has already been used. Request a new password reset.",
      );
      setCheckingLink(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (alive) {
        setValidLink(!!data.session);
        setCheckingLink(false);
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) {
        setValidLink(!!session);
        setCheckingLink(false);
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [settingPassword]);
  useEffect(() => {
    if (role && !settingPassword && !reset)
      navigate("/admin", { replace: true });
  }, [role, settingPassword, reset, navigate]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (settingPassword) {
        if (!validLink)
          throw new Error(
            "This link is no longer valid. Request a new password reset.",
          );
        if (password !== confirmation)
          throw new Error("The passwords do not match.");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        navigate("/admin/login", { replace: true });
        setPassword("");
        setMessage("Password saved. Sign in with your new password.");
      } else if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/admin/set-password` },
        );
        if (error) throw error;
        setMessage(
          "If this email has an account, a password reset link is on its way. Check your inbox and junk folder.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error)
          throw new Error(
            error.message.includes("Invalid login")
              ? "The email or password is incorrect."
              : error.message,
          );
        refresh();
        navigate("/admin", { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const title = settingPassword
    ? "Make it your own."
    : reset
      ? "A fresh start."
      : "Welcome back.";
  return (
    <div className="studio-auth">
      <aside className="auth-story">
        <Link to="/" className="studio-wordmark">
          Sugar Mama<span>COOKIE CO.</span>
        </Link>
        <div>
          <p className="eyebrow">THE WORK BEHIND THE SWEETNESS</p>
          <h1>
            A little order.
            <br />A lot of care.
          </h1>
          <p>Your orders, your people, your next beautiful batch.</p>
        </div>
        <small>ALBURY–WODONGA · MADE WITH CARE</small>
      </aside>
      <main className="auth-form-wrap">
        <Link className="auth-back" to="/">
          <ArrowLeft size={16} /> Back to the shop
        </Link>
        <div className="auth-form">
          <p className="eyebrow">PRIVATE WORKSPACE</p>
          <h2>{title}</h2>
          <p className="muted">
            {settingPassword
              ? "Choose a password with at least 12 characters."
              : reset
                ? "We’ll email you a link to reset your password."
                : "Sign in to take care of the day’s orders."}
          </p>
          {checkingLink ? (
            <p role="status">Checking your link…</p>
          ) : settingPassword && !validLink ? (
            <div>
              <p role="alert" className="studio-error">
                {error ||
                  "This link has expired or is missing. Request a new reset link to continue."}
              </p>
              <Link
                className="studio-button"
                to="/admin/login"
                onClick={() => {
                  setReset(true);
                  setError("");
                }}
              >
                Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              {!settingPassword && (
                <label>
                  Email address
                  <input
                    autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {!reset && (
                <label>
                  Password
                  <div className="password-field">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete={
                        settingPassword ? "new-password" : "current-password"
                      }
                      required
                      minLength={settingPassword ? 12 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={show ? "Hide password" : "Show password"}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}
              {settingPassword && (
                <label>
                  Confirm password
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </label>
              )}
              {error && (
                <p role="alert" className="studio-error">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="studio-notice">
                  {message}
                </p>
              )}
              <button className="studio-button" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : settingPassword
                    ? "Save password"
                    : reset
                      ? "Send reset link"
                      : "Sign in"}
                <ArrowRight size={16} />
              </button>
              {!settingPassword && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    setReset(!reset);
                    setError("");
                    setMessage("");
                  }}
                >
                  {reset ? "Back to sign in" : "Forgot your password?"}
                </button>
              )}
            </form>
          )}
          <p className="auth-footnote">
            Access is by invitation from the owner.
          </p>
        </div>
        <small className="muted">Sugar Mama Cookie Co. · Staff access</small>
      </main>
    </div>
  );
}
