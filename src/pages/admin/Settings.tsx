import { useSearchParams } from "react-router-dom";
import PricingSettingsPanel from "../../components/PricingSettingsPanel";
import EmailTemplateEditor from "../../components/EmailTemplateEditor";
import NotificationSettings from "../../components/admin/NotificationSettings";
import Users from "../Users";
import { usePortalAuth } from "../../auth/PortalAuth";
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const { role } = usePortalAuth();
  const tabs = [
    { key: "pricing", label: "Pricing" },
    { key: "emails", label: "Email templates" },
    { key: "notifications", label: "Notifications" },
    ...(role === "owner" ? [{ key: "users", label: "Users" }] : []),
    { key: "store", label: "Store information" },
  ];
  const active = tabs.some((t) => t.key === params.get("tab"))
    ? params.get("tab")
    : "pricing";
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>Settings</h1>
          <p className="muted">The details that keep your business running.</p>
        </div>
      </div>
      <nav className="settings-tabs" aria-label="Settings sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            aria-current={active === t.key ? "page" : undefined}
            className={active === t.key ? "active" : ""}
            onClick={() => setParams({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {active === "pricing" && (
        <div className="studio-panel p-6">
          <PricingSettingsPanel />
        </div>
      )}
      {active === "emails" && (
        <div className="studio-panel p-6">
          <EmailTemplateEditor />
        </div>
      )}
      {active === "notifications" && <NotificationSettings />}
      {active === "users" && <Users />}
      {active === "store" && (
        <section className="settings-section">
          <h2>Made in Albury–Wodonga.</h2>
          <p className="muted">Your store’s contact details.</p>
          {[
            ["Business", "Sugar Mama Cookie Co."],
            ["Email", "hello@sugarmamacookieco.com.au"],
            ["Phone", "+61 412 480 274"],
            ["Location", "Albury–Wodonga, Australia"],
          ].map(([label, value]) => (
            <div className="settings-row" key={label}>
              <p>{label}</p>
              <span>{value}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
