import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Users,
  Home,
  CalendarDays,
  ClipboardCheck,
  Wrench,
  CreditCard,
  LifeBuoy,
  Shield,
  Activity,
  Settings,
  ScrollText,
  LayoutDashboard,
  Menu,
  X,
  Download,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { apiFetch, buildAuthHeaders } from "../lib/api";
import { neonSignOut, configureNeonAuthUrl } from "../lib/neonAuth";
import { Button, Card, Input, Select, TextArea } from "../components/ui";

const navigation = [
  {
    key: "overview",
    label: "Overview",
    permission: "overview.read",
    icon: LayoutDashboard,
  },
  {
    key: "organizations",
    label: "Organizations",
    permission: "organizations.read",
    icon: Building2,
  },
  {
    key: "users",
    label: "Customers & users",
    permission: "users.read",
    icon: Users,
  },
  {
    key: "properties",
    label: "Properties",
    permission: "properties.read",
    icon: Home,
  },
  {
    key: "reservations",
    label: "Reservations",
    permission: "operations.read",
    icon: CalendarDays,
  },
  {
    key: "turnovers",
    label: "Cleaning / turnovers",
    permission: "operations.read",
    icon: ClipboardCheck,
  },
  {
    key: "incidents",
    label: "Incidents",
    permission: "operations.read",
    icon: Wrench,
  },
  {
    key: "subscriptions",
    label: "Plans & entitlements",
    permission: "billing.read",
    icon: CreditCard,
  },
  {
    key: "revenue",
    label: "Revenue evidence",
    permission: "billing.read",
    icon: CreditCard,
  },
  {
    key: "analytics",
    label: "Product records",
    permission: "overview.read",
    icon: Activity,
  },
  {
    key: "communications",
    label: "Communications",
    permission: "communications.read",
    icon: LifeBuoy,
  },
  {
    key: "support",
    label: "Support center",
    permission: "support.read",
    icon: LifeBuoy,
  },
  {
    key: "security",
    label: "Security sessions",
    permission: "security.read",
    icon: Shield,
  },
  {
    key: "system",
    label: "System health",
    permission: "system.read",
    icon: Activity,
  },
  {
    key: "settings",
    label: "Administration",
    permission: "settings.read",
    icon: Settings,
  },
  {
    key: "audit",
    label: "Audit logs",
    permission: "audit.read",
    icon: ScrollText,
  },
];
const api = "/api/control-center";
const label = (value: string) => value.replaceAll("_", " ");
const cell = (value: unknown) =>
  value === null || value === undefined
    ? "Unavailable"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);
const transitions: Record<string, string[]> = {
  Open: ["In Progress", "Escalated", "Closed"],
  "In Progress": ["Waiting for Customer", "Escalated", "Resolved"],
  "Waiting for Customer": ["In Progress", "Escalated", "Resolved"],
  Escalated: ["In Progress", "Resolved"],
  Resolved: ["In Progress", "Closed"],
  Closed: ["Open"],
};

export function ControlCenterPage({
  onNavigate,
}: {
  onNavigate: (path: string) => void;
}) {
  const [session, setSession] = useState<any>(null),
    [section, setSection] = useState(""),
    [data, setData] = useState<any>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false);
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("desc"),
    [org, setOrg] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [days, setDays] = useState("30");
  const [detail, setDetail] = useState<any>(null),
    [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    organization_id: "",
    subject: "",
    category: "Technical Issue",
    priority: "Normal",
  });
  const [ticketKey, setTicketKey] = useState(() => crypto.randomUUID());
  const [note, setNote] = useState(""),
    [reason, setReason] = useState(""),
    [nextStatus, setNextStatus] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const [revokeUser, setRevokeUser] = useState("");
  const [announcement, setAnnouncement] = useState({
    organization_id: "",
    title: "",
    body: "",
  });
  const [flagScope, setFlagScope] = useState("global"),
    [flagEnabled, setFlagEnabled] = useState("false"),
    [flagVersion, setFlagVersion] = useState("0"),
    [plan, setPlan] = useState("Starter");
  const params = new URLSearchParams({
    q: search,
    page: String(page),
    limit: "25",
    sort,
    organization_id: org,
    start,
    end,
  });
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const permitted = (p: string) => session?.permissions.includes(p);
  useEffect(() => {
    let live = true;
    apiFetch(api + "/config")
      .then((config) => {
        configureNeonAuthUrl(config.neonAuthUrl);
        return apiFetch(api + "/session");
      })
      .then((s) => {
        if (!live) return;
        setSession(s);
        setSection(
          navigation.find((n) => s.permissions.includes(n.permission))?.key ||
            "",
        );
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!session || !section) return;
    let live = true;
    setBusy(true);
    setError("");
    setData(null);
    const url =
      api +
      "/" +
      section +
      (section === "overview" ? "?days=" + days : "?" + params);
    apiFetch(url)
      .then((d) => {
        if (live) setData(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [session, section, search, page, sort, org, start, end, days]);
  const refresh = async () => {
    setBusy(true);
    setError("");
    try {
      setData(
        await apiFetch(
          api +
            "/" +
            section +
            (section === "overview" ? "?days=" + days : "?" + params),
        ),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const select = (key: string) => {
    setSection(key);
    setPage(1);
    setQ("");
    setSearch("");
    setOrg("");
    setStart("");
    setEnd("");
    setDetail(null);
    setMobile(false);
    setNotice("");
  };
  const openDetail = async (row: any) => {
    setReason("");
    setConfirmation("");
    setNote("");
    setNextStatus("");
    await act(async () => {
      if (section === "communications")
        setDetail(
          await apiFetch(api + "/communications/" + encodeURIComponent(row.id)),
        );
      else if (section === "support")
        setDetail(
          await apiFetch(api + "/support/" + encodeURIComponent(row.id)),
        );
      else if (section === "users") {
        const result = await apiFetch(
          api + "/users/" + encodeURIComponent(row.id),
        );
        setDetail({ ...result.user, memberships: result.memberships });
      } else
        setDetail(
          (await apiFetch(api + "/organizations/" + encodeURIComponent(row.id)))
            .organization,
        );
    });
  };
  const download = async () =>
    act(async () => {
      const response = await fetch(
        api + "/reports/" + section + "?" + params + "&format=csv",
        { headers: await buildAuthHeaders(), cache: "no-store" },
      );
      if (!response.ok) throw Error("Export not authorized or unavailable");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "staywise-" + section + ".csv";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Export downloaded. Contains this filtered page only (maximum 25 rows).",
      );
    });
  if (!session)
    return (
      <main className="min-h-screen bg-brand-cloud grid place-items-center p-5">
        <Card className="max-w-lg w-full p-8 space-y-5">
          <Shield className="text-teal-800" />
          <h1 className="text-2xl font-semibold">Staywise Control Center</h1>
          <p className="text-sm text-slate-600">
            Internal personnel only. Your existing Neon identity must have an
            explicit administrative grant. After signing in, return to
            /app/control-center. No email address automatically grants access.
          </p>
          {error ? (
            <p role="alert" className="text-sm text-red-800">
              {error}
            </p>
          ) : (
            <p role="status">Validating administrative session…</p>
          )}
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => onNavigate("/auth")}>
              Sign in with existing account
            </Button>
            <Button variant="outline" onClick={() => onNavigate("/")}>
              Return to Staywise
            </Button>
          </div>
        </Card>
      </main>
    );
  const title =
    navigation.find((n) => n.key === section)?.label || "Control Center";
  return (
    <div className="min-h-screen bg-brand-cloud text-brand-navy lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside
        className={`${mobile ? "block" : "hidden"} lg:block lg:sticky lg:top-0 lg:h-screen bg-brand-navy text-white p-4 overflow-y-auto`}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="font-semibold text-lg">
              Staywise<span className="text-teal-300"> /</span>
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Internal control center
            </p>
          </div>
          <button
            aria-label="Close navigation"
            className="lg:hidden p-3"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Control center">
          {navigation
            .filter((n) => permitted(n.permission))
            .map((n) => (
              <button
                key={n.key}
                aria-current={section === n.key ? "page" : undefined}
                onClick={() => select(n.key)}
                className={`w-full min-h-[44px] flex gap-3 items-center px-3 py-2 rounded-lg text-sm mb-1 text-left ${section === n.key ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}
              >
                <n.icon aria-hidden="true" className="w-4 h-4 shrink-0" />
                {n.label}
              </button>
            ))}
        </nav>
        <p className="text-xs text-slate-300 border-t border-white/10 mt-5 pt-4">
          {session.role}
          <br />
          Explicit global internal scope
        </p>
      </aside>
      <div className="min-w-0">
        <header className="bg-white border-b border-slate-200 p-4 sm:px-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open control navigation"
              aria-expanded={mobile}
              className="lg:hidden p-2"
              onClick={() => setMobile(!mobile)}
            >
              <Menu />
            </button>
            <span className="text-sm font-medium">
              Administration / {title}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onNavigate("/app")}>
              <ArrowLeft className="w-4 h-4" />
              Workspace
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                act(async () => {
                  await apiFetch(api + "/logout", { method: "POST" });
                  await neonSignOut();
                  setSession(null);
                  setError("Administrative session signed out.");
                })
              }
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </header>
        <main className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6">
          <div className="flex flex-wrap gap-3 justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-widest text-teal-800 font-semibold">
                SaaS operations
              </p>
              <h1 className="text-2xl font-semibold mt-2">{title}</h1>
              <p className="text-xs text-slate-600 mt-2">
                Live database records. No simulated customers, revenue or
                readiness certification.
              </p>
            </div>
            <Button variant="outline" disabled={busy} onClick={refresh}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              {error}
            </div>
          )}
          {notice && (
            <div
              role="status"
              className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"
            >
              {notice}
            </div>
          )}
          {busy && (
            <p role="status" className="text-sm text-slate-600">
              Loading current records…
            </p>
          )}
          {section === "overview" && (
            <>
              <Select
                label="Reporting period"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              >
                {[
                  ["1", "Today (rolling 24h)"],
                  ["7", "Last 7 days"],
                  ["30", "Last 30 days"],
                  ["90", "Last 90 days"],
                  ["365", "Last 12 months"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
              {data && (
                <>
                  <p className="text-xs text-slate-600">
                    Updated {data.freshness} · {data.source}
                  </p>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Object.entries(data.counts).map(([key, value]) => (
                      <Card key={key} className="p-5">
                        <p className="text-xs capitalize text-slate-600">
                          {label(key)}
                        </p>
                        <p className="text-3xl font-semibold tabular-nums mt-2">
                          {cell(value)}
                        </p>
                      </Card>
                    ))}
                  </div>
                  <div className="grid xl:grid-cols-2 gap-5">
                    <Card className="p-5">
                      <h2 className="font-semibold mb-4">
                        Organization registrations
                      </h2>
                      {data.growth.length ? (
                        data.growth.map((row: any) => (
                          <div
                            key={row.day}
                            className="grid grid-cols-[90px_1fr_35px] items-center gap-3 py-2 text-xs"
                          >
                            <span>{row.day}</span>
                            <span className="bg-slate-100 rounded h-3">
                              <span
                                className="block bg-brand-600 rounded h-3"
                                style={{
                                  width: `${(100 * row.count) / Math.max(...data.growth.map((r: any) => r.count), 1)}%`,
                                }}
                              />
                            </span>
                            <span>{row.count}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600">
                          No registrations in this period.
                        </p>
                      )}
                    </Card>
                    <Card className="p-5">
                      <h2 className="font-semibold mb-4">Plan entitlements</h2>
                      {data.plans.map((p: any) => (
                        <p
                          className="flex justify-between border-b py-3 text-sm"
                          key={p.plan_tier}
                        >
                          <span>{p.plan_tier}</span>
                          <strong>{p.count}</strong>
                        </p>
                      ))}
                      <p className="text-xs text-slate-600 mt-4">
                        This is not a paid subscription or revenue report.
                      </p>
                    </Card>
                  </div>
                  <Card className="p-5 space-y-2">
                    <h2 className="font-semibold">
                      Not connected / unavailable
                    </h2>
                    <p className="text-sm text-slate-600">
                      {data.unavailable.join(" · ")}
                    </p>
                    <p className="text-sm text-slate-600">
                      Product adoption, active-user retention and acquisition
                      attribution require verified instrumentation.
                      Payment-derived reports require an integrated provider and
                      reconciled currency-specific ledger. No values are
                      estimated here.
                    </p>
                  </Card>
                </>
              )}
            </>
          )}
          {data?.rows && data.total !== undefined && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(q);
                  setPage(1);
                }}
                className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3 items-end"
              >
                <Input
                  label="Search name or ID"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Input
                  label="Organization scope / ID"
                  value={org}
                  onChange={(e) => {
                    setOrg(e.target.value);
                    setPage(1);
                  }}
                />
                <Input
                  type="date"
                  label="Created from"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setPage(1);
                  }}
                />
                <Input
                  type="date"
                  label="Created through"
                  value={end}
                  onChange={(e) => {
                    setEnd(e.target.value);
                    setPage(1);
                  }}
                />
                <Button type="submit">Search</Button>
              </form>
              <div className="flex flex-wrap gap-3 justify-between items-end">
                <div>
                  <p className="text-xs text-slate-600">
                    {data.total} records · {data.source}
                  </p>
                  {["properties", "turnovers"].includes(section) && (
                    <p className="text-xs text-amber-900 mt-2">
                      Legacy recorded status only. Reliable turnover-specific
                      READY certification unavailable.
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Select
                    aria-label="Sort by creation"
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </Select>
                  {permitted("reports.read") && (
                    <Button variant="outline" onClick={download}>
                      <Download className="w-4 h-4" />
                      Export page
                    </Button>
                  )}
                </div>
              </div>
              <Card className="overflow-hidden">
                <div
                  className="overflow-x-auto"
                  role="region"
                  aria-label={title + " directory"}
                  tabIndex={0}
                >
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">
                      {title} — current filtered page
                    </caption>
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        {Object.keys(data.rows[0] || { records: "" }).map(
                          (key) => (
                            <th
                              scope="col"
                              key={key}
                              className="p-3 whitespace-nowrap font-medium capitalize"
                            >
                              {label(key)}
                            </th>
                          ),
                        )}
                        {[
                          "organizations",
                          "users",
                          "support",
                          "communications",
                        ].includes(section) && (
                          <th scope="col" className="p-3">
                            Action
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.rows.map((row: any, index: number) => (
                        <tr key={row.id || index} className="hover:bg-slate-50">
                          {Object.entries(row).map(([key, value]) => (
                            <td
                              key={key}
                              className="p-3 min-w-[120px] max-w-[280px] break-words"
                            >
                              {cell(value)}
                            </td>
                          ))}
                          {[
                            "organizations",
                            "users",
                            "support",
                            "communications",
                          ].includes(section) && (
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDetail(row)}
                              >
                                Review
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!data.rows.length && (
                  <p className="p-8 text-center text-sm text-slate-600">
                    No records match these filters.
                  </p>
                )}
              </Card>
              <div className="flex items-center justify-between text-sm">
                <Button
                  variant="outline"
                  disabled={page === 1 || busy}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {Math.max(1, Math.ceil(data.total / 25))}
                </span>
                <Button
                  variant="outline"
                  disabled={page * 25 >= data.total || busy}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
          {section === "analytics" && data && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">Persisted record adoption</h2>
              <p className="text-sm text-slate-600">{data.source}</p>
              {data.rows.map((r: any) => (
                <div
                  key={r.feature}
                  className="border-b py-3 flex flex-wrap justify-between gap-3 text-sm"
                >
                  <strong>{r.feature}</strong>
                  <span>
                    {r.organizations} organizations · {r.records} records
                  </span>
                </div>
              ))}
              <p className="text-xs text-slate-600">
                {data.instrumentation}. Active users and retention unavailable.
              </p>
            </Card>
          )}
          {section === "revenue" && data && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">
                Payment-provider evidence required
              </h2>
              <p className="text-sm text-slate-600">{data.source}</p>
              <dl className="grid sm:grid-cols-2 gap-4">
                {Object.entries(data)
                  .filter(([key]) => key !== "source")
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs capitalize text-slate-600">
                        {label(k)}
                      </dt>
                      <dd className="text-sm font-medium mt-1">{cell(v)}</dd>
                    </div>
                  ))}
              </dl>
            </Card>
          )}
          {section === "communications" &&
            permitted("communications.write") && (
              <Card className="p-5 space-y-4">
                <h2 className="font-semibold">Draft an in-app notice</h2>
                <p className="text-xs text-slate-600">
                  Single organization audience. A different administrator must
                  approve before publication. No email or marketing delivery.
                </p>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      await apiFetch(api + "/communications", {
                        method: "POST",
                        body: JSON.stringify(announcement),
                      });
                      setAnnouncement({ ...announcement, title: "", body: "" });
                      setNotice("Draft saved. Not published or delivered.");
                      await refresh();
                    });
                  }}
                >
                  <Input
                    required
                    label="Audience organization ID"
                    value={announcement.organization_id}
                    onChange={(e) =>
                      setAnnouncement({
                        ...announcement,
                        organization_id: e.target.value,
                      })
                    }
                  />
                  <Input
                    required
                    minLength={3}
                    maxLength={160}
                    label="Notice title"
                    value={announcement.title}
                    onChange={(e) =>
                      setAnnouncement({
                        ...announcement,
                        title: e.target.value,
                      })
                    }
                  />
                  <TextArea
                    required
                    maxLength={4000}
                    label="Notice body — no sensitive information"
                    value={announcement.body}
                    onChange={(e) =>
                      setAnnouncement({ ...announcement, body: e.target.value })
                    }
                  />
                  <Button disabled={busy} type="submit">
                    Save draft
                  </Button>
                </form>
              </Card>
            )}
          {section === "support" && permitted("support.write") && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">Open an internal support case</h2>
              <p className="text-xs text-slate-600">
                No customer email is sent. Do not enter passwords, access codes
                or payment details.
              </p>
              <form
                className="grid sm:grid-cols-2 gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    await apiFetch(api + "/support", {
                      method: "POST",
                      headers: { "Idempotency-Key": ticketKey },
                      body: JSON.stringify(form),
                    });
                    setForm({ ...form, subject: "" });
                    setTicketKey(crypto.randomUUID());
                    setNotice(
                      "Internal case created. No message delivery claimed.",
                    );
                    await refresh();
                  });
                }}
              >
                <Input
                  required
                  label="Organization ID"
                  value={form.organization_id}
                  onChange={(e) =>
                    setForm({ ...form, organization_id: e.target.value })
                  }
                />
                <Input
                  required
                  minLength={3}
                  maxLength={200}
                  label="Subject"
                  value={form.subject}
                  onChange={(e) =>
                    setForm({ ...form, subject: e.target.value })
                  }
                />
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  {[
                    "Account",
                    "Authentication",
                    "Billing",
                    "Welcome Books",
                    "Guest Access",
                    "Reservations",
                    "Cleaning",
                    "Inspections",
                    "Incidents",
                    "Technical Issue",
                    "Feature Request",
                    "Other",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <Select
                  label="Priority"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  {["Low", "Normal", "High", "Urgent"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
                <Button disabled={busy} type="submit">
                  Create internal case
                </Button>
              </form>
            </Card>
          )}
          {detail && (
            <Card className="p-5 space-y-4">
              <div className="flex justify-between gap-3">
                <h2 className="font-semibold">
                  {section === "support"
                    ? "Ticket review"
                    : section === "users"
                      ? "Customer profile"
                      : section === "communications"
                        ? "Announcement preview"
                        : "Organization profile"}
                </h2>
                <Button variant="ghost" onClick={() => setDetail(null)}>
                  Close review
                </Button>
              </div>
              <dl className="grid sm:grid-cols-2 gap-4">
                {Object.entries(detail.ticket || detail).map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs text-slate-600 capitalize">
                      {label(k)}
                    </dt>
                    <dd className="text-sm mt-1 break-words">{cell(v)}</dd>
                  </div>
                ))}
              </dl>
              {["organizations", "users"].includes(section) &&
                permitted(section + ".write") && (
                  <form
                    className="space-y-3 border-t pt-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act(async () => {
                        await apiFetch(
                          api +
                            "/" +
                            section +
                            "/" +
                            encodeURIComponent(detail.id) +
                            "/status",
                          {
                            method: "PATCH",
                            body: JSON.stringify({
                              status:
                                detail.account_status === "Active"
                                  ? "Suspended"
                                  : "Active",
                              version: detail.control_version,
                              reason,
                              confirm: confirmation,
                            }),
                          },
                        );
                        setDetail(null);
                        setNotice(
                          "Account status updated and audited. No data deleted.",
                        );
                        await refresh();
                      });
                    }}
                  >
                    <h3 className="text-sm font-semibold">
                      {detail.account_status === "Active"
                        ? "Suspend"
                        : "Reactivate"}{" "}
                      {section === "users" ? "customer" : "organization"}
                    </h3>
                    <TextArea
                      required
                      minLength={10}
                      maxLength={500}
                      label="Reason (no secrets)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <Input
                      required
                      label="Type the exact record ID to confirm"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                    <Button
                      type="submit"
                      disabled={busy || confirmation !== detail.id}
                      variant="danger"
                    >
                      Confirm status change
                    </Button>
                  </form>
                )}
              {section === "organizations" && permitted("billing.write") && (
                <form
                  className="space-y-3 border-t pt-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      await apiFetch(
                        api + "/organizations/" + detail.id + "/plan",
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            plan,
                            version: detail.control_version,
                            reason,
                            confirm: confirmation,
                          }),
                        },
                      );
                      setDetail(null);
                      setNotice(
                        "Early Access entitlements updated. No payment operation performed.",
                      );
                      await refresh();
                    });
                  }}
                >
                  <h3 className="font-semibold text-sm">
                    Change Early Access entitlements
                  </h3>
                  <Select
                    label="Plan"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                  >
                    {["Starter", "Professional", "Portfolio"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                  <TextArea
                    required
                    minLength={10}
                    maxLength={500}
                    label="Reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Input
                    required
                    label="Retype organization ID"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <Button
                    disabled={busy || confirmation !== detail.id}
                    type="submit"
                  >
                    Confirm entitlement change
                  </Button>
                </form>
              )}
              {section === "communications" &&
                detail.status !== "Published" &&
                permitted("communications.publish") && (
                  <form
                    className="space-y-3 border-t pt-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void act(async () => {
                        await apiFetch(
                          api +
                            "/communications/" +
                            detail.id +
                            "/" +
                            (detail.status === "Draft" ? "approve" : "publish"),
                          {
                            method: "POST",
                            body: JSON.stringify({
                              version: detail.version,
                              confirm: confirmation,
                              reason,
                            }),
                          },
                        );
                        setDetail(
                          await apiFetch(api + "/communications/" + detail.id),
                        );
                        await refresh();
                      });
                    }}
                  >
                    <TextArea
                      required
                      minLength={10}
                      maxLength={500}
                      label="Approval / publication reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <Input
                      required
                      label="Retype announcement ID"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                    />
                    <Button
                      disabled={busy || confirmation !== detail.id}
                      type="submit"
                    >
                      {detail.status === "Draft"
                        ? "Approve draft (different administrator required)"
                        : "Publish to in-app inbox"}
                    </Button>
                  </form>
                )}
              {section === "support" && (
                <>
                  <h3 className="font-semibold text-sm">Internal notes</h3>
                  {detail.notes.map((n: any) => (
                    <p
                      className="border-l-2 border-slate-200 pl-3 text-sm whitespace-pre-wrap"
                      key={n.id}
                    >
                      {n.body}
                      <span className="block text-xs text-slate-500 mt-1">
                        {n.created_at}
                      </span>
                    </p>
                  ))}
                  {permitted("support.write") && (
                    <>
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void act(async () => {
                            await apiFetch(
                              api + "/support/" + detail.ticket.id + "/notes",
                              {
                                method: "POST",
                                body: JSON.stringify({ body: note }),
                              },
                            );
                            setDetail(
                              await apiFetch(
                                api + "/support/" + detail.ticket.id,
                              ),
                            );
                            setNote("");
                          });
                        }}
                      >
                        <TextArea
                          required
                          maxLength={4000}
                          label="Internal note — never sent to customer"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                        <Button disabled={busy} type="submit">
                          Add internal note
                        </Button>
                      </form>
                      <form
                        className="space-y-3 border-t pt-4"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void act(async () => {
                            await apiFetch(
                              api + "/support/" + detail.ticket.id,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  status: nextStatus,
                                  reason,
                                  version: detail.ticket.version,
                                }),
                              },
                            );
                            setDetail(
                              await apiFetch(
                                api + "/support/" + detail.ticket.id,
                              ),
                            );
                            await refresh();
                          });
                        }}
                      >
                        <Select
                          required
                          label="Next ticket status"
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value)}
                        >
                          <option value="">Select transition</option>
                          {(transitions[detail.ticket.status] || []).map(
                            (s) => (
                              <option key={s}>{s}</option>
                            ),
                          )}
                        </Select>
                        <TextArea
                          required
                          minLength={10}
                          maxLength={500}
                          label="Transition / resolution reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                        <Button type="submit" disabled={busy}>
                          Update ticket
                        </Button>
                      </form>
                    </>
                  )}
                </>
              )}
            </Card>
          )}
          {section === "security" && permitted("security.write") && (
            <Card className="p-5">
              <h2 className="font-semibold mb-3">
                Revoke administrator sessions
              </h2>
              <p className="text-xs text-slate-600 mb-4">
                Does not revoke ordinary customer/provider sessions. Existing
                administrative tokens are denied; tokens issued before
                revocation are rejected. Provider-wide session revocation is not
                performed here.
              </p>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    await apiFetch(api + "/security/revoke", {
                      method: "POST",
                      body: JSON.stringify({
                        user_id: revokeUser,
                        confirm: confirmation,
                        reason,
                      }),
                    });
                    setNotice("Administrative sessions revoked.");
                    await refresh();
                  });
                }}
              >
                <Input
                  required
                  label="Administrator user ID"
                  value={revokeUser}
                  onChange={(e) => setRevokeUser(e.target.value)}
                />
                <Input
                  required
                  label="Retype exact user ID"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
                <TextArea
                  required
                  minLength={10}
                  maxLength={500}
                  label="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  variant="danger"
                  type="submit"
                  disabled={busy || !revokeUser || confirmation !== revokeUser}
                >
                  Revoke sessions
                </Button>
              </form>
            </Card>
          )}
          {section === "system" && data && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">Measured dependency check</h2>
              <dl>
                {Object.entries(data).map(([k, v]) => (
                  <div key={k} className="border-b py-3">
                    <dt className="text-sm font-semibold capitalize">
                      {label(k)}
                    </dt>
                    <dd className="text-sm text-slate-600 mt-1 break-words">
                      {cell(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          {section === "settings" && data && (
            <>
              <Card className="p-5">
                <h2 className="font-semibold">Access policy</h2>
                <p className="text-sm text-slate-600 mt-3">{data.policy}</p>
              </Card>
              <Card className="p-5">
                <h2 className="font-semibold mb-3">
                  Explicit administrator grants
                </h2>
                {data.profiles.map((p: any) => (
                  <p
                    className="text-sm break-words border-b py-3"
                    key={p.user_id}
                  >
                    {p.user_id} · {p.role} · {p.status}
                  </p>
                ))}
              </Card>
              <Card className="p-5">
                <h2 className="font-semibold mb-3">Server permission matrix</h2>
                {data.permissions.map((p: any) => (
                  <p
                    className="text-xs break-words py-1"
                    key={p.role + p.permission}
                  >
                    {p.role} → {p.permission}
                  </p>
                ))}
              </Card>
            </>
          )}
          {section === "settings" && data && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold">
                Scoped server-enforced feature control
              </h2>
              <p className="text-xs text-slate-600">
                Only internal support-case creation is configurable. No flag
                grants permissions. Organization override takes precedence over
                global; absent flag means enabled.
              </p>
              {data.flags.map((f: any) => (
                <p key={f.name + f.scope} className="text-xs break-words">
                  {f.name} · {f.scope} · {f.enabled ? "enabled" : "disabled"} ·
                  version {f.version}
                </p>
              ))}
              {permitted("settings.write") && (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      await apiFetch(api + "/settings/flags", {
                        method: "PUT",
                        body: JSON.stringify({
                          name: "control_support_creation",
                          scope: flagScope,
                          enabled: flagEnabled === "true",
                          version: Number(flagVersion),
                          confirm: confirmation,
                          reason,
                        }),
                      });
                      setNotice(
                        "Flag changed and audited. Reload version before the next change.",
                      );
                      await refresh();
                    });
                  }}
                >
                  <Input
                    required
                    label="Scope: global or exact organization ID"
                    value={flagScope}
                    onChange={(e) => setFlagScope(e.target.value)}
                  />
                  <Select
                    label="Support-case creation"
                    value={flagEnabled}
                    onChange={(e) => setFlagEnabled(e.target.value)}
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </Select>
                  <Input
                    required
                    type="number"
                    min={0}
                    label="Current version (0 for a new override)"
                    value={flagVersion}
                    onChange={(e) => setFlagVersion(e.target.value)}
                  />
                  <Input
                    required
                    label="Retype scope to confirm"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <TextArea
                    required
                    minLength={10}
                    maxLength={500}
                    label="Change reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    disabled={busy || confirmation !== flagScope}
                    type="submit"
                  >
                    Confirm flag change
                  </Button>
                </form>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
