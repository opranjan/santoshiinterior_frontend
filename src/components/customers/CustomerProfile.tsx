"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  customersApi,
  storesApi,
  type CustomerDto,
  type CustomerMessageKind,
  type CustomerWebsiteShop,
} from "@/services/crmApi";
import { enumToLabel, labelToEnum } from "@/lib/mappers";
import CustomerSendModal from "@/components/customers/CustomerSendModal";

type Tab = "overview" | "orders" | "addresses" | "projects" | "cart" | "wishlist";

function money(value?: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function stamp(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function prettyPhone(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

function initials(name?: string) {
  return (name || "C")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function itemThumb(row: { imgs?: { thumbnails?: string[]; previews?: string[] }; imageUrl?: string | null }) {
  return row.imgs?.thumbnails?.[0] || row.imgs?.previews?.[0] || row.imageUrl || "";
}

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

function orderStatusClass(status?: string) {
  const value = String(status || "").toUpperCase();
  if (value === "DELIVERED" || value === "COMPLETED") return "bg-[#E7F6EC] text-[#2F7D3A]";
  if (value === "CANCELLED") return "bg-[#FDE8EC] text-[#C45C4A]";
  if (value === "SHIPPED") return "bg-[#E8F0FB] text-[#3B6EA8]";
  if (value === "CONFIRMED" || value === "PROCESSING") return "bg-[#F3E7D4] text-[#7A4A28]";
  return "bg-[#F8EED4] text-[#9A6B16]";
}

function customerStatusClass(status?: string) {
  const value = String(status || "").toUpperCase();
  if (value === "ACTIVE") return "bg-[#E7F6EC] text-[#2F7D3A]";
  if (value === "VIP") return "bg-[#F6EDE0] text-[#7A4A28]";
  if (value === "LEAD") return "bg-[#E8F0FB] text-[#3B6EA8]";
  return "bg-[#F3EEE6] text-[#6b5b4b]";
}

const fieldClass =
  "h-11 w-full rounded-md border border-[#eadfcf] bg-white px-3 text-sm text-[#1c1610] outline-none focus:border-[#C4A574]";

function Card({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#eadfcf] bg-white p-3.5 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-[#1c1610]">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <div className="mb-2 text-[#C4A574]">{icon}</div>
      <p className="text-sm text-[#8a7b68]">{text}</p>
    </div>
  );
}

function ViewAll({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-[#7A4A28] hover:underline">
      View All →
    </button>
  );
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

export default function CustomerProfile({ customerId }: { customerId: string }) {
  const [dto, setDto] = useState<CustomerDto | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [sendOpen, setSendOpen] = useState(false);
  const [composer, setComposer] = useState<CustomerMessageKind | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{
    orderId: string;
    orderNumber: string;
    from: string;
    to: string;
  } | null>(null);
  const [convertConfirm, setConvertConfirm] = useState<{
    orderId: string;
    orderNumber: string;
    items: string;
    amount: number;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    alternatePhone: "",
    email: "",
    storeId: "",
    type: "INDIVIDUAL",
    status: "ACTIVE",
    city: "",
    address: "",
    source: "",
    notes: "",
    tags: "",
  });
  const sendRef = useRef<HTMLDivElement>(null);

  const reload = () =>
    customersApi.get(customerId).then((row) => {
      setDto(row);
      return row;
    });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([customersApi.get(customerId), storesApi.list({ limit: 100 }).catch(() => ({ items: [] }))])
      .then(([row, storeData]) => {
        if (cancelled) return;
        setDto(row);
        setStores((storeData.items || []).map((store) => ({ id: store.id, name: store.name })));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load customer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (sendRef.current && !sendRef.current.contains(event.target as Node)) setSendOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const node = document.querySelector(`[data-customer-tab="${tab}"]`);
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [tab]);

  const shop: CustomerWebsiteShop | null = dto?.websiteShop || null;
  const projects = shop?.projects || [];
  const orders = shop?.orders || [];
  const addresses = shop?.addresses || [];
  const cart = shop?.cart || [];
  const wishlist = shop?.wishlist || [];
  const cartTotal = cart.reduce((sum, row) => sum + Number(row.discountedPrice || row.price || 0) * Number(row.quantity || 1), 0);

  const activity = useMemo(() => {
    if (!dto) return [];
    const rows: Array<{ id: string; title: string; detail: string; at: string; kind: "order" | "customer" | "project" }> = [];
    orders.forEach((row) => {
      rows.push({
        id: `order-${row.id}`,
        title: "Order placed",
        detail: row.orderNumber,
        at: row.createdAt,
        kind: "order",
      });
    });
    projects.forEach((row) => {
      rows.push({
        id: `project-${row.id}`,
        title: row.name,
        detail: row.statusLabel || row.status,
        at: row.startDate || dto.createdAt,
        kind: "project",
      });
    });
    rows.push({
      id: "created",
      title: "Customer created",
      detail: "Customer profile created",
      at: dto.createdAt,
      kind: "customer",
    });
    return rows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);
  }, [dto, orders, projects]);

  const tabs: Array<{ id: Tab; label: string; count?: number; icon: React.ReactNode }> = [
    { id: "overview", label: "Overview", icon: <GridIcon /> },
    { id: "orders", label: "Orders", count: orders.length, icon: <DocIcon /> },
    { id: "addresses", label: "Addresses", count: addresses.length, icon: <PinIcon /> },
    { id: "projects", label: "Projects", count: projects.length, icon: <FolderIcon /> },
    { id: "cart", label: "Cart", count: cart.length, icon: <CartIcon /> },
    { id: "wishlist", label: "Wishlist", count: wishlist.length, icon: <HeartIcon /> },
  ];

  const openEdit = () => {
    if (!dto) return;
    setForm({
      name: dto.name || "",
      phone: dto.phone || "",
      alternatePhone: dto.alternatePhone || "",
      email: dto.email || "",
      storeId: dto.store?.id || dto.storeId || "",
      type: dto.type || "INDIVIDUAL",
      status: dto.status || "ACTIVE",
      city: dto.city || "",
      address: dto.address || "",
      source: dto.source || "",
      notes: dto.notes || "",
      tags: dto.tags || "",
    });
    setEditing(true);
  };

  const patchOrderStatus = (orderId: string, status: string) => {
    setDto((current) => {
      if (!current?.websiteShop) return current;
      return {
        ...current,
        websiteShop: {
          ...current.websiteShop,
          orders: current.websiteShop.orders.map((row) => (row.id === orderId ? { ...row, status } : row)),
        },
      };
    });
  };

  const requestOrderStatus = (orderId: string, status: string) => {
    const order = dto?.websiteShop?.orders.find((row) => row.id === orderId);
    const previous = order?.status;
    if (!previous || previous === status) return;
    setStatusConfirm({
      orderId,
      orderNumber: order?.orderNumber || "",
      from: previous,
      to: status,
    });
  };

  const changeOrderStatus = async () => {
    if (!statusConfirm) return;
    const { orderId, to, from } = statusConfirm;
    setStatusConfirm(null);
    patchOrderStatus(orderId, to);
    setSavingOrderId(orderId);
    try {
      const updated = await customersApi.updateOrderStatus(customerId, orderId, to);
      patchOrderStatus(orderId, updated.status);
    } catch (err) {
      patchOrderStatus(orderId, from);
      setError(err instanceof Error ? err.message : "Failed to update order status");
    } finally {
      setSavingOrderId(null);
    }
  };

  const requestConvertOrder = (orderId: string) => {
    const order = dto?.websiteShop?.orders.find((row) => row.id === orderId);
    if (!order) return;
    if (order.projectId) {
      setTab("projects");
      return;
    }
    setConvertConfirm({
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: order.items?.map((item) => `${item.title} × ${item.quantity}`).join(", ") || "—",
      amount: order.total,
    });
  };

  const convertOrderToProject = async () => {
    if (!convertConfirm) return;
    const { orderId } = convertConfirm;
    setConvertConfirm(null);
    setSavingOrderId(orderId);
    try {
      const result = await customersApi.convertOrderToProject(customerId, orderId);
      setDto((current) => {
        if (!current?.websiteShop) return current;
        const nextOrders = current.websiteShop.orders.map((row) =>
          row.id === result.order.id ? { ...row, ...result.order } : row
        );
        const nextProjects = result.project
          ? [result.project, ...(current.websiteShop.projects || []).filter((row) => row.id !== result.project.id)]
          : current.websiteShop.projects || [];
        return {
          ...current,
          websiteShop: {
            ...current.websiteShop,
            orders: nextOrders,
            projects: nextProjects,
          },
        };
      });
      setTab("projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert order to project");
    } finally {
      setSavingOrderId(null);
    }
  };

  const saveEdit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      const updated = await customersApi.update(customerId, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        alternatePhone: form.alternatePhone.trim() || null,
        email: form.email.trim() || null,
        storeId: form.storeId || null,
        type: labelToEnum(form.type) || form.type,
        status: labelToEnum(form.status) || form.status,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        source: form.source || null,
        notes: form.notes.trim() || null,
        tags: form.tags.trim() || null,
      });
      setDto(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const location = (() => {
    if (!dto) return "";
    if (!dto.address) return dto.city || "";
    const parts = dto.address.split(",").map((part) => part.trim());
    const cityIdx = dto.city
      ? parts.findIndex((part) => part.toLowerCase().includes(dto.city!.toLowerCase()))
      : -1;
    if (cityIdx >= 0) {
      const state = parts[cityIdx + 1]?.replace(/\d+/g, "").trim();
      return [parts[cityIdx].replace(/\d+/g, "").trim(), state].filter(Boolean).join(", ");
    }
    return dto.city || "";
  })();

  return (
    <div className="-mx-4 min-h-full min-w-0 overflow-x-hidden bg-[#F7F1E8] px-3.5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-1 sm:px-8 md:-mx-6 xl:px-10">
      <nav className="mb-4 flex min-w-0 items-center gap-2 overflow-hidden text-sm text-[#8a7b68]">
        <Link href="/" className="shrink-0 hover:text-[#7A4A28]">
          ⌂
        </Link>
        <span className="shrink-0">›</span>
        <Link href="/customers" className="shrink-0 hover:text-[#7A4A28]">
          Customers
        </Link>
        <span className="shrink-0">›</span>
        <span className="truncate font-medium text-[#1c1610]">{dto?.name || "Customer"}</span>
      </nav>

      {error ? <p className="mb-4 rounded-xl bg-[#FDE8EC] px-4 py-3 text-sm text-[#C45C4A]">{error}</p> : null}
      {loading && !dto ? <p className="py-16 text-center text-sm text-[#8a7b68]">Loading customer details…</p> : null}

      {dto ? (
        <>
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#EFE4D4] text-sm font-semibold text-[#7A4A28] sm:h-16 sm:w-16 sm:text-lg">
                {initials(dto.name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-[#1c1610] sm:text-2xl">{dto.name}</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${customerStatusClass(dto.status)}`}>
                    {enumToLabel(dto.status) || dto.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1.5 text-sm text-[#6b5b4b] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                  {dto.phone ? (
                    <a href={`tel:${dto.phone}`} className="inline-flex min-h-11 items-center gap-1.5 hover:text-[#7A4A28] sm:min-h-0">
                      <PhoneIcon /> {prettyPhone(dto.phone)}
                    </a>
                  ) : null}
                  {dto.email ? (
                    <a href={`mailto:${dto.email}`} className="inline-flex min-h-11 items-center gap-1.5 break-all hover:text-[#7A4A28] sm:min-h-0">
                      <span className="shrink-0"><IconMail /></span>
                      <span className="min-w-0">{dto.email}</span>
                    </a>
                  ) : null}
                  {location ? (
                    <span className="inline-flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0"><PinIcon /></span>
                      <span>{location}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={openEdit}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-[#eadfcf] bg-white px-3 text-sm font-medium text-[#3d342c] sm:h-10"
              >
                <span className="text-[#7A4A28]"><EditIcon /></span>
                Edit
              </button>
              <div className="relative" ref={sendRef}>
                <button
                  type="button"
                  onClick={() => setSendOpen((open) => !open)}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-[#eadfcf] bg-white px-3 text-sm font-medium text-[#3d342c] sm:h-10 sm:w-auto"
                >
                  <span className="text-[#7A4A28]"><MailBtnIcon /></span>
                  <span className="truncate">Send Message</span>
                  <span className="text-[10px]">▾</span>
                </button>
                {sendOpen ? (
                  <div className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-md border border-[#eadfcf] bg-white shadow-lg sm:left-auto sm:right-0 sm:w-44">
                    {(["whatsapp", "marketing", "broadcast"] as CustomerMessageKind[]).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        className="block w-full px-3 py-2.5 text-left text-sm capitalize text-[#1c1610] hover:bg-[#FBF7F1]"
                        onClick={() => {
                          setComposer(kind);
                          setSendOpen(false);
                        }}
                      >
                        {kind}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Link
                href={`/projects?fromCustomer=${dto.id}`}
                className="col-span-2 inline-flex h-11 items-center justify-center rounded-md bg-[#7A4A28] px-4 text-sm font-semibold text-white sm:col-auto sm:h-10"
              >
                + Create Project
              </Link>
            </div>
          </div>

          <div className="-mx-3.5 mb-5 border-b border-[#eadfcf] sm:-mx-8 xl:-mx-10">
            <div className="overflow-x-auto px-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:px-8 xl:px-10">
              <div className="flex min-w-max">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-customer-tab={item.id}
                    onClick={() => setTab(item.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-3 text-sm sm:gap-2 sm:px-3 ${
                      tab === item.id
                        ? "-mb-px border-[#7A4A28] font-semibold text-[#7A4A28]"
                        : "border-transparent text-[#6b5b4b]"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {item.count !== undefined ? (
                      <span className="rounded-full bg-[#F3E7D4] px-1.5 text-[11px] font-medium text-[#7A4A28]">{item.count}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {tab === "overview" ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.75fr)]">
              <div className="space-y-4">
                <Card
                  title="Profile Information"
                  action={<span className="max-w-full shrink-0 text-[11px] text-[#8a7b68] sm:text-xs">ID: {dto.id.slice(0, 8).toUpperCase()}</span>}
                >
                  <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                    <ProfileRow icon={<IconMail />} label="Email" value={dto.email || "—"} />
                    <ProfileRow icon={<PhoneIcon />} label="Alternate Phone" value={prettyPhone(dto.alternatePhone) || "—"} />
                    <ProfileRow icon={<StoreIcon />} label="Store" value={dto.store?.name || "—"} />
                    <ProfileRow icon={<GlobeIcon />} label="Source" value={dto.source || "—"} />
                    <ProfileRow
                      icon={<DotIcon />}
                      label="Status"
                      value={
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${customerStatusClass(dto.status)}`}>
                          {enumToLabel(dto.status) || dto.status}
                        </span>
                      }
                    />
                    <ProfileRow icon={<UserIcon />} label="Owner" value={dto.owner?.name || "—"} />
                    <ProfileRow icon={<UserIcon />} label="Type" value={enumToLabel(dto.type) || dto.type} />
                    <ProfileRow icon={<PinIcon />} label="City" value={dto.city || "—"} />
                    <ProfileRow icon={<CalIcon />} label="Last Contact" value={stamp(dto.lastContact)} />
                    <ProfileRow icon={<DocIcon />} label="Address" value={dto.address || "—"} />
                    <ProfileRow icon={<CalIcon />} label="Created" value={stamp(dto.createdAt)} />
                  </dl>
                </Card>

                <Card
                  title={`Recent Orders (${orders.length})`}
                  icon={<DocIcon />}
                  action={<ViewAll onClick={() => setTab("orders")} />}
                >
                  <OrdersTable
                    orders={orders.slice(0, 4)}
                    savingOrderId={savingOrderId}
                    onView={() => setTab("orders")}
                    onStatusChange={requestOrderStatus}
                    onConvert={requestConvertOrder}
                  />
                </Card>

                <Card title={`Saved Addresses (${addresses.length})`} icon={<PinIcon />}>
                  <AddressGrid addresses={addresses} />
                </Card>
              </div>

              <div className="space-y-4">
                <Card title={`Cart (${cart.length})`} icon={<CartIcon />} action={<ViewAll onClick={() => setTab("cart")} />}>
                  <CartList items={cart} total={cartTotal} compact />
                </Card>
                <Card title={`Wishlist (${wishlist.length})`} icon={<HeartIcon />} action={<ViewAll onClick={() => setTab("wishlist")} />}>
                  <WishlistList items={wishlist} />
                </Card>
                <Card title={`Projects (${projects.length})`} icon={<FolderIcon />} action={<ViewAll onClick={() => setTab("projects")} />}>
                  <ProjectsList projects={projects} />
                </Card>
                <Card title="Recent Activity" icon={<ClockIcon />}>
                  {activity.length ? (
                    <ol className="relative space-y-4 border-l border-[#eadfcf] pl-4">
                      {activity.map((row) => (
                        <li key={row.id} className="relative">
                          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#C4A574]" />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#1c1610]">{row.title}</p>
                              <p className="text-xs text-[#8a7b68]">{row.detail}</p>
                            </div>
                            <p className="shrink-0 text-xs text-[#8a7b68]">{stamp(row.at)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-[#8a7b68]">No activity yet.</p>
                  )}
                </Card>
              </div>
            </div>
          ) : null}

          {tab === "orders" ? (
            <Card title={`Orders (${orders.length})`}>
              <OrdersTable
                orders={orders}
                savingOrderId={savingOrderId}
                onView={() => setTab("orders")}
                onStatusChange={requestOrderStatus}
                onConvert={requestConvertOrder}
              />
            </Card>
          ) : null}
          {tab === "addresses" ? (
            <Card title={`Saved Addresses (${addresses.length})`}>
              <AddressGrid addresses={addresses} />
            </Card>
          ) : null}
          {tab === "projects" ? (
            <Card title={`Projects (${projects.length})`}>
              <ProjectsList projects={projects} />
            </Card>
          ) : null}
          {tab === "cart" ? (
            <Card title={`Cart (${cart.length})`}>
              <CartList items={cart} total={cartTotal} />
            </Card>
          ) : null}
          {tab === "wishlist" ? (
            <Card title={`Wishlist (${wishlist.length})`}>
              <WishlistList items={wishlist} />
            </Card>
          ) : null}
        </>
      ) : null}

      {convertConfirm ? (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <h3 className="text-lg font-semibold text-[#1c1610]">Convert order to project?</h3>
            <p className="mt-2 text-sm leading-6 text-[#6b5b4b]">
              Create a CRM project from{" "}
              <span className="font-semibold text-[#1c1610]">{convertConfirm.orderNumber}</span>
              {" "}({convertConfirm.items}, {money(convertConfirm.amount)}).
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConvertConfirm(null)}
                className="h-11 rounded-md px-4 text-sm text-[#6b5b4b] sm:h-10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void convertOrderToProject()}
                className="h-11 rounded-md bg-[#7A4A28] px-4 text-sm font-semibold text-white sm:h-10"
              >
                Convert to Project
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusConfirm ? (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6">
            <h3 className="text-lg font-semibold text-[#1c1610]">Change order status?</h3>
            <p className="mt-2 text-sm leading-6 text-[#6b5b4b]">
              Update {statusConfirm.orderNumber ? <span className="font-semibold text-[#1c1610]">{statusConfirm.orderNumber}</span> : "this order"} from{" "}
              <span className="font-medium text-[#1c1610]">{enumToLabel(statusConfirm.from)}</span> to{" "}
              <span className="font-medium text-[#1c1610]">{enumToLabel(statusConfirm.to)}</span>?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setStatusConfirm(null)}
                className="h-11 rounded-md px-4 text-sm text-[#6b5b4b] sm:h-10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void changeOrderStatus()}
                className="h-11 rounded-md bg-[#7A4A28] px-4 text-sm font-semibold text-white sm:h-10"
              >
                Update status
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1c1610]">Edit Customer</h3>
              <button type="button" onClick={() => setEditing(false)} className="text-[#8a7b68]">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["name", "Full name"],
                ["phone", "Phone"],
                ["alternatePhone", "Alternate phone"],
                ["email", "Email"],
                ["city", "City"],
                ["source", "Source"],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-medium text-[#8a7b68]">
                  {label}
                  <input
                    className={`${fieldClass} mt-1`}
                    value={(form as Record<string, string>)[key]}
                    onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="text-xs font-medium text-[#8a7b68]">
                Store
                <select
                  className={`${fieldClass} mt-1`}
                  value={form.storeId}
                  onChange={(e) => setForm((current) => ({ ...current, storeId: e.target.value }))}
                >
                  <option value="">—</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-[#8a7b68]">
                Status
                <select
                  className={`${fieldClass} mt-1`}
                  value={form.status}
                  onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}
                >
                  {["ACTIVE", "LEAD", "INACTIVE", "VIP"].map((value) => (
                    <option key={value} value={value}>
                      {enumToLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2 text-xs font-medium text-[#8a7b68]">
                Address
                <input
                  className={`${fieldClass} mt-1`}
                  value={form.address}
                  onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-md px-4 text-sm text-[#6b5b4b] sm:h-10">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEdit()}
                className="h-11 rounded-md bg-[#7A4A28] px-4 text-sm font-semibold text-white sm:h-10"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CustomerSendModal
        open={Boolean(composer)}
        kind={composer || "whatsapp"}
        customers={dto ? [{ id: dto.id, name: dto.name, phone: dto.phone }] : []}
        onClose={() => setComposer(null)}
        onSent={() => {
          setComposer(null);
          void reload();
        }}
      />
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-[#C4A574]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-[#8a7b68]">{label}</dt>
        <dd className="mt-0.5 break-words text-[#1c1610]">{value}</dd>
      </div>
    </div>
  );
}

function OrdersTable({
  orders,
  savingOrderId,
  onView,
  onStatusChange,
  onConvert,
}: {
  orders: NonNullable<CustomerWebsiteShop["orders"]>;
  savingOrderId?: string | null;
  onView: () => void;
  onStatusChange: (orderId: string, status: string) => void;
  onConvert: (orderId: string) => void;
}) {
  if (!orders.length) return <p className="text-sm text-[#8a7b68]">No website orders yet.</p>;
  return (
    <>
      <div className="space-y-3 md:hidden">
        {orders.map((row) => (
          <article key={row.id} className="rounded-xl border border-[#eadfcf] bg-[#FBF7F1] p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[#1c1610]">{row.orderNumber}</p>
              <p className="shrink-0 text-sm font-semibold text-[#1c1610]">{money(row.total)}</p>
            </div>
            <p className="mt-1 text-xs text-[#8a7b68]">{stamp(row.createdAt)}</p>
            <p className="mt-1 text-xs text-[#6b5b4b]">
              {row.items?.map((item) => `${item.title} × ${item.quantity}`).join(", ") || "—"}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusClass(row.status)}`}>
                {enumToLabel(row.status) || row.status}
              </span>
              <select
                value={String(row.status || "PENDING").toUpperCase()}
                disabled={savingOrderId === row.id}
                onChange={(event) => onStatusChange(row.id, event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-[#eadfcf] bg-white px-2 text-sm text-[#3d342c] outline-none"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {enumToLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onView}
                className="rounded-md border border-[#eadfcf] px-3 py-1.5 text-xs font-medium text-[#7A4A28]"
              >
                View
              </button>
              {row.projectId ? (
                <Link
                  href="/projects"
                  className="rounded-md border border-[#eadfcf] bg-white px-3 py-1.5 text-xs font-medium text-[#7A4A28]"
                >
                  Open Project
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={savingOrderId === row.id || String(row.status).toUpperCase() === "CANCELLED"}
                  onClick={() => onConvert(row.id)}
                  className="rounded-md bg-[#7A4A28] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Convert to Project
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-[#8a7b68]">
            <th className="pb-2 font-medium">Order ID</th>
            <th className="pb-2 font-medium">Date</th>
            <th className="pb-2 font-medium">Items</th>
            <th className="pb-2 font-medium">Amount</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((row) => (
            <tr key={row.id} className="border-t border-[#f0e6d8]">
              <td className="py-3 font-semibold text-[#1c1610]">{row.orderNumber}</td>
              <td className="py-3 text-[#6b5b4b]">{stamp(row.createdAt)}</td>
              <td className="py-3 text-[#6b5b4b]">
                {row.items?.map((item) => `${item.title} × ${item.quantity}`).join(", ") || "—"}
              </td>
              <td className="py-3 font-medium text-[#1c1610]">{money(row.total)}</td>
              <td className="py-3">
                <div className="flex flex-col gap-1.5">
                  <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusClass(row.status)}`}>
                    {enumToLabel(row.status) || row.status}
                  </span>
                  <select
                    value={String(row.status || "PENDING").toUpperCase()}
                    disabled={savingOrderId === row.id}
                    onChange={(event) => onStatusChange(row.id, event.target.value)}
                    className="h-8 w-[140px] rounded-md border border-[#eadfcf] bg-white px-2 text-xs text-[#3d342c] outline-none focus:border-[#C4A574]"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {enumToLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onView}
                    className="rounded-md border border-[#eadfcf] px-3 py-1 text-xs font-medium text-[#7A4A28]"
                  >
                    View
                  </button>
                  {row.projectId ? (
                    <Link
                      href="/projects"
                      className="rounded-md border border-[#eadfcf] px-3 py-1 text-xs font-medium text-[#7A4A28]"
                    >
                      Open Project
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={savingOrderId === row.id || String(row.status).toUpperCase() === "CANCELLED"}
                      onClick={() => onConvert(row.id)}
                      className="rounded-md bg-[#7A4A28] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Convert to Project
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

function AddressGrid({ addresses }: { addresses: CustomerWebsiteShop["addresses"] }) {
  if (!addresses.length) return <p className="text-sm text-[#8a7b68]">No saved website addresses.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {addresses.map((row) => (
        <article key={row.id} className="rounded-xl border border-[#eadfcf] bg-[#FBF7F1] p-3">
          <div className="flex items-start gap-2">
            <span className="text-[#C4A574]">
              <HomeIcon />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1c1610]">{row.name}</p>
              <p className="mt-1 text-xs leading-5 text-[#6b5b4b]">
                {row.line1}
                <br />
                {row.city}, {row.state} {row.pin}
                <br />
                {prettyPhone(row.phone)}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function CartList({
  items,
  total,
  compact,
}: {
  items: CustomerWebsiteShop["cart"];
  total: number;
  compact?: boolean;
}) {
  if (!items.length) {
    return <EmptyState icon={<CartIcon />} text="Cart is empty." />;
  }
  return (
    <div>
      <ul className="space-y-3">
        {items.map((row) => {
          const img = itemThumb(row);
          return (
            <li key={row.id} className="flex items-center gap-3">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-md bg-[#F3E7D4] text-[#7A4A28]">
                  <CartIcon />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1c1610]">
                  {row.title} × {row.quantity}
                </p>
              </div>
              <p className="text-sm font-semibold text-[#1c1610]">{money(row.discountedPrice || row.price)}</p>
            </li>
          );
        })}
      </ul>
      {compact ? (
        <div className="mt-3 flex items-center justify-between border-t border-[#eadfcf] pt-3 text-sm">
          <span className="text-[#8a7b68]">Total</span>
          <span className="font-semibold text-[#1c1610]">{money(total)}</span>
        </div>
      ) : null}
    </div>
  );
}

function WishlistList({ items }: { items: CustomerWebsiteShop["wishlist"] }) {
  if (!items.length) {
    return <EmptyState icon={<HeartIcon />} text="No items in wishlist yet." />;
  }
  return (
    <ul className="space-y-3">
      {items.map((row) => {
        const img = itemThumb(row);
        return (
          <li key={row.id} className="flex items-center gap-3">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-md bg-[#F3E7D4] text-[#7A4A28]">
                <HeartIcon />
              </span>
            )}
            <p className="flex-1 truncate text-sm font-medium text-[#1c1610]">{row.title}</p>
            {row.discountedPrice ? <p className="text-sm">{money(row.discountedPrice)}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

function ProjectsList({ projects }: { projects: NonNullable<CustomerWebsiteShop["projects"]> }) {
  if (!projects.length) {
    return <EmptyState icon={<FolderIcon />} text="No CRM projects linked to this customer." />;
  }
  return (
    <div className="space-y-2">
      {projects.map((row) => (
        <Link key={row.id} href={`/projects`} className="block rounded-xl bg-[#FBF7F1] px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-[#1c1610]">{row.name}</p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#7A4A28]">
              {row.statusLabel || row.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8a7b68]">
            {[row.projectType, row.address].filter(Boolean).join(" · ") || "Interior project"}
            {` · ${row.progress}%`}
          </p>
        </Link>
      ))}
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z" />
      <circle cx="12" cy="9" r="2" />
    </svg>
  );
}
function StoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 10l2-6h14l2 6M4 10h16v10H4z" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 4.5 6 4.5 9S15 18 12 21c-3-3-4.5-6-4.5-9S9 6 12 3z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0114 0" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M7 3h8l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <path d="M15 3v6h6" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M3 4h2l2.4 12h11.2L21 8H7" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 20s-7-4.4-9-9.2C1.6 7.6 4 5 7 5c1.8 0 3.4.9 5 2.4C13.6 5.9 15.2 5 17 5c3 0 5.4 2.6 4 5.8C19 15.6 12 20 12 20z" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 7h6l2 2h10v10H3z" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function DotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 11l8-7 8 7v9H4z" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20h4L18 10l-4-4L4 16z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}
function MailBtnIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}
