import { useState } from "react";
import {
  Outlet,
  NavLink,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  LayoutDashboard,
  ShoppingBag,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Search,
  CalendarDays,
  ClipboardList,
  MessageCircle,
} from "lucide-react";
import { stopDeviceNotifications } from "../lib/portal";
import { supabase } from "../lib/supabase";
import { usePortalAuth } from "../auth/PortalAuth";
const navigation = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Orders", to: "/admin/orders", icon: ShoppingBag },
  { label: "Production", to: "/admin/production", icon: ClipboardList },
  { label: "Collections", to: "/admin/calendar", icon: CalendarDays },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Messages", to: "/admin/messages", icon: MessageCircle },
  { label: "Activity", to: "/admin/activity", icon: Bell },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];
export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const { user, role } = usePortalAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  async function logout() {
    await stopDeviceNotifications();
    const { error } = await supabase.auth.signOut();
    if (error) setLogoutError("Could not sign out. Please try again.");
    else navigate("/admin/login");
  }
  return (
    <div className="studio">
      {open && (
        <button
          aria-label="Close navigation"
          className="studio-overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`studio-sidebar ${open ? "is-open" : ""}`}>
        <Link to="/admin" className="studio-wordmark">
          Sugar Mama<span>THE WORKSPACE</span>
        </Link>
        <button
          className="mobile-close"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <p className="sidebar-caption">A GOOD DAY STARTS HERE</p>
        <nav>
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/" className="shop-link">
            Visit the shop
            <ArrowUpRight size={16} />
          </Link>
          <div className="team-identity">
            <span className="initial">
              {user?.email?.[0]?.toUpperCase() || "S"}
            </span>
            <div>
              <strong>{role === "owner" ? "Owner" : "Team member"}</strong>
              <span title={user?.email}>{user?.email}</span>
            </div>
          </div>
          <button onClick={logout}>
            <LogOut size={16} /> Sign out
          </button>
          {logoutError && <p role="alert">{logoutError}</p>}
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
          <span className="breadcrumb">
            Workspace <span>/</span>{" "}
            {navigation.find(
              (n) => n.to !== "/admin" && pathname.startsWith(n.to),
            )?.label || "Overview"}
          </span>
          <form
            className="studio-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/admin/orders?q=${encodeURIComponent(search.trim())}`);
            }}
          >
            <Search size={16} />
            <input
              aria-label="Search orders"
              placeholder="Find an order or customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <Link
            to="/admin/activity"
            aria-label="View notifications"
            className="topbar-bell"
          >
            <Bell size={20} />
          </Link>
        </header>
        <main className="studio-content">
          <Outlet />
        </main>
        <footer className="studio-footer">
          SUGAR MAMA COOKIE CO.<span>Good things, made with care.</span>
        </footer>
      </div>
    </div>
  );
}
