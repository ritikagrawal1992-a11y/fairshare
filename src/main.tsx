import React, {
  useState,
  useEffect,
  type ReactNode,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type Task = { id: number; title: string; status: string; priority: string };
type Product = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  threshold: number;
  low_stock: number;
};
type Movement = { id: number; name: string; note: string; delta: number };
type BookingRecord = {
  id: number;
  resource: string;
  guest: string;
  starts_at: string;
  ends_at: string;
};
type Expense = {
  id: number;
  label: string;
  payer: string;
  cents: number;
  participants: string[];
};
type Balance = { person: string; cents: number };
type Settlement = { from: string; to: string; cents: number };
type Inbox = { id: string; name: string; secret: string };
type CapturedEvent = {
  id: number;
  event_key: string;
  body: string;
  received_at: string;
};
type DocumentRecord = { id: number; title: string; body: string };
async function api(path: string, method = "GET", body?: unknown) {
  const res = await fetch("/api" + path, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}
function useLoad<T>(path: string, revision: number) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch("/api" + path, { signal: controller.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [path, revision]);
  return { data, error };
}
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="notice" role="alert">
      {children}
    </p>
  );
}
function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = true,
  min,
  step,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
  children?: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children ? (
        <select aria-label={label} name={name} required={required}>
          {children}
        </select>
      ) : type === "textarea" ? (
        <textarea
          aria-label={label}
          name={name}
          placeholder={placeholder}
          required={required}
          rows={5}
        />
      ) : (
        <input
          aria-label={label}
          name={name}
          type={type}
          placeholder={placeholder}
          required={required}
          min={min}
          step={step}
        />
      )}
    </label>
  );
}
function Form({
  title,
  children,
  submit,
  onSubmit,
}: {
  title: string;
  children: ReactNode;
  submit: string;
  onSubmit: (f: FormData) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState("");
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await onSubmit(new FormData(form));
      form.reset();
      setSuccess("Saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>{title}</h2>
      <form onSubmit={send}>
        {children}
        {error && <Notice>{error}</Notice>}
        <div className="form-footer">
          <button disabled={busy}>{busy ? "Saving…" : submit}</button>
          {success && <span role="status">{success}</span>}
        </div>
      </form>
    </section>
  );
}
type Props = { revision: number; refresh: () => void };
function Expenses({ revision, refresh }: Props) {
  const expenses = useLoad<Expense[]>("/expenses", revision),
    totals = useLoad<{ balances: Balance[]; settlements: Settlement[] }>(
      "/balances",
      revision,
    );
  return (
    <>
      <div className="two">
        <Form
          title="Add a group expense"
          submit="Split expense"
          onSubmit={async (f) => {
            const amount = String(f.get("amount"));
            if (!/^\d+(\.\d{1,2})?$/.test(amount))
              throw new Error("Use an amount with at most two decimal places.");
            const [whole, fraction = ""] = amount.split(".");
            const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
            await api("/expenses", "POST", {
              label: f.get("label"),
              payer: f.get("payer"),
              cents,
              participants: String(f.get("participants"))
                .split(",")
                .map((p) => p.trim())
                .filter(Boolean),
            });
            refresh();
          }}
        >
          <Field
            label="What was paid for?"
            name="label"
            placeholder="Dinner, tickets, groceries…"
          />
          <div className="form-row">
            <Field label="Paid by" name="payer" placeholder="Alex" />
            <Field
              label="Amount (USD)"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
            />
          </div>
          <Field
            label="Participants (comma separated; include payer)"
            name="participants"
            placeholder="Alex, Sam, Jordan"
          />
          <p className="hint">
            Expenses are split equally. Remainder cents go in alphabetical
            order.
          </p>
        </Form>
        <section className="panel">
          <h2>Suggested settlements</h2>
          {totals.error && <Notice>{totals.error}</Notice>}
          {totals.data?.settlements.map((s, i) => (
            <div className="settlement" key={i}>
              <span>
                <strong>{s.from}</strong> pays <strong>{s.to}</strong>
              </span>
              <b>{money(s.cents)}</b>
            </div>
          ))}
          {totals.data && !totals.data.settlements.length && (
            <p className="hint">Everyone is settled.</p>
          )}
          <h3 className="subheading">Net balances</h3>
          {totals.data?.balances.map((b) => (
            <div className="row compact" key={b.person}>
              <span>{b.person}</span>
              <span className="mono">
                {b.cents >= 0 ? "+" : ""}
                {money(b.cents)}
              </span>
            </div>
          ))}
        </section>
      </div>
      <section className="panel">
        <h2>Expense ledger</h2>
        {expenses.error && <Notice>{expenses.error}</Notice>}
        {expenses.data?.map((e) => (
          <div className="row" key={e.id}>
            <div>
              <strong>{e.label}</strong>
              <p>
                {e.payer} paid · Split between {e.participants.join(", ")}
              </p>
            </div>
            <b>{money(e.cents)}</b>
          </div>
        ))}
      </section>
    </>
  );
}
function App(){
      const [revision,setRevision]=useState(0);
      return <div className="shell"><aside><a className="brand" href="#"><span className="brand-mark">F</span><span>Fairshare<small>OPEN SOURCE APPLICATION</small></span></a><p className="nav-label">FINANCE</p><div className="sidebar-note"><b>Built to explore.</b><p>React · TypeScript · Node.js<br/>SQLite · Playwright</p><span>v0.1 · Local demo</span></div></aside><main><div className="topline"><span>FAIRSHARE / FINANCE</span><span className="local-tag">LOCAL DEMO</span></div><header><p className="eyebrow">OPEN SOURCE / FINANCE</p><h1>Fairshare</h1><p className="lead">Group expense splitting with exact cents and settlement suggestions.</p></header><Expenses revision={revision} refresh={()=>setRevision(v=>v+1)}/><footer>Fairshare · MIT licensed source · AI-assisted local demo</footer></main></div>;
    }
    createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
    