import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import { supabase } from "../lib/supabase";
import { money, statusLabel } from "../lib/portal";
interface Order {
  id: string;
  display_order_id?: string;
  customer_name: string;
  status: string;
  total_amount: number;
  quantity: number;
  collection_date?: string;
  created_at: string;
}
export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,display_order_id,customer_name,status,total_amount,quantity,collection_date,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) setError("We couldn’t load the orders. Please try again.");
    else setOrders(data || []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);
  const active = orders.filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  );
  const pending = active.filter((o) => o.status === "pending");
  const production = active.filter((o) => o.status === "in_progress");
  const scheduled = active
    .filter((o) => o.collection_date)
    .sort((a, b) =>
      (a.collection_date || "").localeCompare(b.collection_date || ""),
    );
  const today = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return (
    <div className="overview">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>
            A little order
            <br className="desktop-break" /> for your day.
          </h1>
          <p className="muted">
            Keep the next batch moving, from first enquiry to final box.
          </p>
        </div>
        <Link className="studio-button" to="/admin/orders?new=1">
          <Plus size={17} /> Create order
        </Link>
      </div>
      {error ? (
        <div role="alert" className="studio-error">
          {error} <button onClick={load}>Retry</button>
        </div>
      ) : loading ? (
        <p role="status">Loading your workspace…</p>
      ) : (
        <>
          <div className="work-summary">
            <Link to="/admin/orders?status=pending">
              <span>Awaiting confirmation</span>
              <strong>{pending.length.toString().padStart(2, "0")}</strong>
              <small>
                Quotes to follow up <ArrowRight size={14} />
              </small>
            </Link>
            <Link to="/admin/orders?status=in_progress">
              <span>In the making</span>
              <strong>{production.length.toString().padStart(2, "0")}</strong>
              <small>
                {production.reduce((n, o) => n + (o.quantity || 0), 0)} cookies
                in progress <ArrowRight size={14} />
              </small>
            </Link>
            <Link to="/admin/orders?status=confirmed">
              <span>Confirmed orders</span>
              <strong>
                {active
                  .filter((o) => o.status === "confirmed")
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
              <small>
                Ready to plan <ArrowRight size={14} />
              </small>
            </Link>
          </div>
          <div className="overview-columns">
            <section className="studio-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">FIRST THINGS FIRST</p>
                  <h2>Needs your attention</h2>
                </div>
                <Link to="/admin/orders?status=pending">
                  View all <ArrowRight size={14} />
                </Link>
              </div>
              {pending.length ? (
                <div className="order-ledger">
                  {pending.slice(0, 6).map((o) => (
                    <Link key={o.id} to={`/admin/orders/${o.id}`}>
                      <span className="ledger-id">
                        {o.display_order_id || o.id.slice(0, 8)}
                      </span>
                      <span>
                        <strong>{o.customer_name}</strong>
                        <small>
                          {o.quantity || 0} cookies · Awaiting confirmation
                        </small>
                      </span>
                      <b>{money(o.total_amount)}</b>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="studio-empty">
                  <span className="empty-mark">✓</span>
                  <h3>You’re all caught up.</h3>
                  <p>
                    New enquiries will appear here, ready for your attention.
                  </p>
                  <Link to="/admin/orders">
                    Browse orders <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </section>
            <section className="schedule-panel">
              <p className="eyebrow">ON THE HORIZON</p>
              <h2>Upcoming collections</h2>
              {scheduled.length ? (
                scheduled.slice(0, 5).map((o) => (
                  <Link
                    className="collection-row"
                    key={o.id}
                    to={`/admin/orders/${o.id}`}
                  >
                    <span>
                      {new Date(
                        o.collection_date + "T12:00:00",
                      ).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <strong>
                      {o.customer_name}
                      <small>{o.quantity} cookies</small>
                    </strong>
                    <ArrowRight size={15} />
                  </Link>
                ))
              ) : (
                <div className="schedule-empty">
                  <p>No collections scheduled.</p>
                  <small>
                    Add a collection date to an order to bring it into your
                    schedule.
                  </small>
                </div>
              )}
              <div className="schedule-note">
                A clear bench.
                <br />A well-planned week.
              </div>
            </section>
          </div>
          <section className="studio-panel recent-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE ORDER BOOK</p>
                <h2>Latest orders</h2>
              </div>
              <Link to="/admin/orders">
                Open order book <ArrowRight size={14} />
              </Link>
            </div>
            {orders.length ? (
              <div className="table-scroll">
                <table className="studio-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Collection</th>
                      <th className="numeric">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/admin/orders/${o.id}`}>
                            {o.display_order_id || o.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td>{o.customer_name}</td>
                        <td>
                          <span className={`status-tag ${o.status}`}>
                            {statusLabel(o.status)}
                          </span>
                        </td>
                        <td>
                          {o.collection_date
                            ? new Date(
                                o.collection_date + "T12:00:00",
                              ).toLocaleDateString("en-AU")
                            : "Not scheduled"}
                        </td>
                        <td className="numeric">{money(o.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="compact-empty">
                Your order book is ready. Create an order or wait for a customer
                enquiry.
              </div>
            )}
          </section>
          {orders.length === 1000 && (
            <p className="muted">Overview shows the latest 1,000 orders.</p>
          )}
        </>
      )}
    </div>
  );
}
