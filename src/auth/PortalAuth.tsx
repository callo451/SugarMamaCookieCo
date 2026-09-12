import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
type Role = "owner" | "staff";
type Access = {
  user: User | null;
  role: Role | null;
  loading: boolean;
  mfaVerified: boolean;
  error: string | null;
  refresh: () => void;
};
const Context = createContext<Access | null>(null);
export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<Access, "refresh">>({
    user: null,
    role: null,
    loading: true,
    mfaVerified: false,
    error: null,
  });
  useEffect(() => {
    let alive = true;
    let generation = 0;
    async function check() {
      const current = ++generation;
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!alive || current !== generation) return;
        if (!user || error) {
          setState({ user: null, role: null, loading: false, mfaVerified: false, error: null });
          return;
        }
        const result = await supabase
          .from("portal_members")
          .select("role, active")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!alive || current !== generation) return;
        const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (!alive || current !== generation) return;
        setState({
          mfaVerified: !assurance.error && assurance.data.currentLevel === 'aal2',
          user,
          loading: false,
          role: !result.error && result.data?.active ? result.data.role : null,
          error: result.error
            ? "Portal access could not be verified. Please try again. The Supabase access setup must be completed before using the upgraded portal."
            : null,
        });
      } catch {
        if (alive && current === generation)
          setState({
            user: null,
            role: null,
            loading: false,
            mfaVerified: false,
            error: "Connection unavailable.",
          });
      }
    }
    const run = () => {
      void check();
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        generation++;
        setState({ user: null, role: null, loading: false, mfaVerified: false, error: null });
      } else setTimeout(run, 0);
    });
    run();
    const timer = window.setInterval(run, 60000);
    window.addEventListener("focus", run);
    window.addEventListener("portal-access-refresh", run);
    return () => {
      alive = false;
      subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", run);
      window.removeEventListener("portal-access-refresh", run);
    };
  }, []);
  return (
    <Context.Provider
      value={{
        ...state,
        refresh: () => window.dispatchEvent(new Event("portal-access-refresh")),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePortalAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("PortalAuthProvider is missing");
  return value;
}
