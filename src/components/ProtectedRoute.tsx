import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "../auth/PortalAuth";
import { stopDeviceNotifications } from "../lib/portal";
import { supabase } from "../lib/supabase";
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, user, role, error, refresh } = usePortalAuth();
  const location = useLocation();
  if (loading)
    return (
      <div className="portal-auth-status" role="status">
        Checking your access…
      </div>
    );
  if (!user)
    return (
      <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
    );
  if (!role)
    return (
      <div className="portal-auth-status">
        <div>
          <p className="eyebrow">SUGAR MAMA / PRIVATE WORKSPACE</p>
          <h1>Access unavailable</h1>
          <p>
            {error ||
              "This account has not been invited, or its access has been removed. Contact the owner for access."}
          </p>
          <button className="studio-button" onClick={refresh}>
            Try again
          </button>{" "}
          <button
            className="studio-button secondary"
            onClick={async () => {
              await stopDeviceNotifications();
              await supabase.auth.signOut();
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  return <>{children}</>;
}
