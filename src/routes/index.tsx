import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Trash2, Package, ShoppingCart, Boxes, History, Search, Lock, LogOut,
  User, Wrench, Truck, Clock, Settings as SettingsIcon, Eye, Phone,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Gate,
});

const AUTH_KEY = "inv_auth_v1"; // "1" = owner
const CRED_KEY = "inv_cred_v1";
const THEME_KEY = "inv_theme_v1";
const LANG_KEY = "inv_lang_v1";
const PHONE_KEY = "inv_phone_v1";

const DEFAULT_USER = "Vũ";
const DEFAULT_PASS = "Leewuu0962267267";
const DEFAULT_PHONE = "0962 267 267";

type Lang = "vi" | "en";
type Theme = "neon" | "ocean" | "sunset" | "light";

const DICT: Record<string, { vi: string; en: string }> = {
  appTitle: { vi: "Quản lý hàng hoá", en: "Inventory Manager" },
  appSub: { vi: "Nhập – Bán – Dịch vụ – Theo dõi tồn kho và lãi", en: "Import – Sell – Service – Track stock & profit" },
  login: { vi: "Đăng nhập", en: "Sign in" },
  user: { vi: "Tên đăng nhập", en: "Username" },
  password: { vi: "Mật khẩu", en: "Password" },
  wrong: { vi: "❌ Sai tên đăng nhập hoặc mật khẩu", en: "❌ Wrong username or password" },
  logout: { vi: "Đăng xuất", en: "Sign out" },
  contact: { vi: "Liên hệ", en: "Contact" },
  tabImport: { vi: "Nhập hàng", en: "Import" },
  tabSell: { vi: "Bán hàng", en: "Sell" },
  tabStock: { vi: "Hàng còn lại", en: "Stock" },
  tabVu: { vi: "Hàng của Vũ", en: "Vũ's stock" },
  tabReceive: { vi: "Nhận hàng", en: "Receive" },
  tabDeliver: { vi: "Giao hàng", en: "Deliver" },
  tabPending: { vi: "Dịch vụ chờ", en: "Pending" },
  tabSales: { vi: "Lịch sử bán", en: "Sales history" },
  tabSettings: { vi: "Cài đặt", en: "Settings" },
  itemName: { vi: "Tên hàng", en: "Item name" },
  qty: { vi: "Số lượng", en: "Quantity" },
  cost: { vi: "Số tiền vốn / đơn vị", en: "Unit cost" },
  price: { vi: "Giá bán / đơn vị", en: "Unit price" },
  note: { vi: "Ghi chú (chứa \"Vũ\" → tự động vào kho Vũ)", en: "Note (contains \"Vũ\" → auto to Vũ's stock)" },
  save: { vi: "Lưu nhập hàng", en: "Save import" },
  saveSell: { vi: "Ghi nhận bán", en: "Record sale" },
  totalStock: { vi: "Tổng vốn tồn", en: "Stock value" },
  vuProfit: { vi: "Lãi Vũ", en: "Vũ's profit" },
  shopProfit: { vi: "Lãi tiệm", en: "Shop profit" },
  totalProfit: { vi: "Tổng lãi", en: "Total profit" },
  search: { vi: "Tìm kiếm hàng...", en: "Search items..." },
  noItems: { vi: "Không có hàng nào.", en: "No items." },
  loading: { vi: "Đang tải...", en: "Loading..." },
  readOnly: { vi: "Chế độ chỉ xem — không thể thao tác.", en: "View-only mode — actions disabled." },
  settingsTitle: { vi: "Cài đặt", en: "Settings" },
  theme: { vi: "Giao diện", en: "Theme" },
  language: { vi: "Ngôn ngữ", en: "Language" },
  phone: { vi: "Số điện thoại liên hệ", en: "Contact phone" },
  changePw: { vi: "Đổi mật khẩu", en: "Change password" },
  oldUser: { vi: "Tên đăng nhập cũ", en: "Current username" },
  oldPw: { vi: "Mật khẩu cũ", en: "Current password" },
  newUser: { vi: "Tên đăng nhập mới", en: "New username" },
  newPw: { vi: "Mật khẩu mới", en: "New password" },
  confirm: { vi: "Xác nhận", en: "Confirm" },
  saved: { vi: "✅ Đã lưu", en: "✅ Saved" },
  verifyFail: { vi: "❌ Sai tài khoản/mật khẩu cũ", en: "❌ Wrong current credentials" },
  fillAll: { vi: "⚠️ Vui lòng nhập đầy đủ và hợp lệ", en: "⚠️ Please fill all fields" },
};

function useLang() {
  const [lang, setLangState] = useState<Lang>("vi");
  useEffect(() => {
    const v = (typeof window !== "undefined" && localStorage.getItem(LANG_KEY)) as Lang | null;
    if (v === "en" || v === "vi") setLangState(v);
  }, []);
  const setLang = (l: Lang) => { localStorage.setItem(LANG_KEY, l); setLangState(l); };
  const t = (k: keyof typeof DICT) => DICT[k]?.[lang] ?? String(k);
  return { lang, setLang, t };
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme === "neon" ? "" : theme;
}

function Gate() {
  const [authed, setAuthed] = useState<boolean | undefined>(undefined);
  const [phone, setPhone] = useState(DEFAULT_PHONE);

  useEffect(() => {
    const v = localStorage.getItem(AUTH_KEY);
    setAuthed(v === "1");
    const theme = (localStorage.getItem(THEME_KEY) as Theme | null) || "neon";
    applyTheme(theme);
    setPhone(localStorage.getItem(PHONE_KEY) || DEFAULT_PHONE);
  }, []);

  if (authed === undefined) return null;
  if (!authed) return <Login phone={phone} onOwner={() => { localStorage.setItem(AUTH_KEY, "1"); setAuthed(true); }} />;
  return <Index onLogout={() => { localStorage.removeItem(AUTH_KEY); setAuthed(false); }} />;
}

function getCred() {
  try {
    const raw = localStorage.getItem(CRED_KEY);
    if (raw) return JSON.parse(raw) as { user: string; pass: string };
  } catch {}
  return { user: DEFAULT_USER, pass: DEFAULT_PASS };
}

function Login({ phone, onOwner }: { phone: string; onOwner: () => void }) {
  const { lang, setLang, t } = useLang();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = getCred();
    if (u.trim() === c.user && p === c.pass) onOwner();
    else setErr(t("wrong"));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="rainbow-bar h-1.5 w-full absolute top-0 left-0" />
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <a href={`tel:${phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Phone className="w-3.5 h-3.5" /> {t("contact")}: <span className="font-medium text-foreground">{phone}</span>
        </a>
        <select
          value={lang}
          onChange={e => setLang(e.target.value as Lang)}
          className="rounded-md border border-border bg-card/60 px-2 py-1 text-xs"
        >
          <option value="vi">🇻🇳 VI</option>
          <option value="en">🇺🇸 EN</option>
        </select>
      </div>
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card/70 backdrop-blur p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--neon-pink)] to-[var(--neon-purple)]">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold rainbow-text">{t("login")}</h1>
            <p className="text-xs text-muted-foreground">{t("appTitle")}</p>
          </div>
        </div>
        <label className="block">
          <span className="block text-sm font-medium mb-1.5">{t("user")}</span>
          <input value={u} onChange={e => setU(e.target.value)} className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1.5">{t("password")}</span>
          <input type="password" value={p} onChange={e => setP(e.target.value)} className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className="w-full rounded-lg bg-gradient-to-r from-[var(--neon-pink)] via-[var(--neon-purple)] to-[var(--neon-cyan)] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
          {t("login")}
        </button>
      </form>
    </div>
  );
}

type Owner = "shop" | "vu" | "service";
type StockItem = { id: string; name: string; quantity: number; cost: number; owner: Owner };
type Sale = { id: string; name: string; quantity: number; price: number; profit: number; created_at: string; owner: Owner };
type ServiceItem = { id: string; name: string; quantity: number; status: string; note: string; created_at: string };
type Tab = "import" | "sell" | "stock" | "vu" | "receive" | "deliver" | "pending" | "sales" | "settings";

const sb = supabase as any;

function Index({ role, onLogout }: { role: "owner" | "guest"; onLogout: () => void }) {
  const { lang, setLang, t } = useLang();
  const readOnly = role === "guest";
  const [tab, setTab] = useState<Tab>("import");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vuSearch, setVuSearch] = useState("");

  const refresh = useCallback(async () => {
    const [s, sa, sv] = await Promise.all([
      sb.from("stock_items").select("*").order("name"),
      sb.from("sales").select("*").order("created_at", { ascending: false }),
      sb.from("service_items").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    if (s.data) setStock(s.data as StockItem[]);
    if (sa.data) setSales(sa.data as Sale[]);
    if (sv.data) setServices(sv.data as ServiceItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Import
  const [iName, setIName] = useState("");
  const [iQty, setIQty] = useState("");
  const [iCost, setICost] = useState("");
  const [iOwner, setIOwner] = useState<Owner>("shop");
  const [iNote, setINote] = useState("");
  const [iMsg, setIMsg] = useState<string | null>(null);

  // Sell
  const [sName, setSName] = useState("");
  const [sQty, setSQty] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sMsg, setSMsg] = useState<string | null>(null);

  // Receive
  const [rName, setRName] = useState("");
  const [rQty, setRQty] = useState("1");
  const [rNote, setRNote] = useState("");
  const [rMsg, setRMsg] = useState<string | null>(null);

  // Deliver
  const [dServiceId, setDServiceId] = useState("");
  const [dPrice, setDPrice] = useState("");
  const [dVuShare, setDVuShare] = useState("");
  const [dMsg, setDMsg] = useState<string | null>(null);

  const guard = () => { if (readOnly) { alert(t("readOnly")); return true; } return false; };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guard()) return;
    const name = iName.trim();
    const qty = Number(iQty);
    const cost = Number(iCost);
    if (!name || !qty || qty <= 0 || cost < 0) { setIMsg(t("fillAll")); return; }
    const effectiveOwner: Owner = /vũ|vu\b/i.test(iNote) ? "vu" : iOwner;

    const sameNameItems = stock.filter(x => baseName(x.name).toLowerCase() === name.toLowerCase() && x.owner === effectiveOwner);
    const sameNameSameCost = sameNameItems.find(x => Number(x.cost) === cost);
    let finalName = name;

    if (sameNameSameCost) {
      const totalQty = Number(sameNameSameCost.quantity) + qty;
      const { error } = await sb.from("stock_items")
        .update({ quantity: totalQty, updated_at: new Date().toISOString() })
        .eq("id", sameNameSameCost.id);
      if (error) { setIMsg("Lỗi: " + error.message); return; }
      finalName = sameNameSameCost.name;
    } else {
      if (sameNameItems.length > 0) finalName = `${name} (${formatVND(cost)})`;
      const { error } = await sb.from("stock_items").insert({ name: finalName, quantity: qty, cost, owner: effectiveOwner });
      if (error) { setIMsg("Lỗi: " + error.message); return; }
    }
    setIName(""); setIQty(""); setICost(""); setINote("");
    setIMsg(`✅ ${qty} × ${finalName} → ${effectiveOwner === "vu" ? (lang === "vi" ? "kho Vũ" : "Vũ's stock") : (lang === "vi" ? "kho tiệm" : "shop stock")}`);
    refresh();
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guard()) return;
    const name = sName.trim();
    const qty = Number(sQty);
    const price = Number(sPrice);
    if (!name || !qty || qty <= 0 || price < 0) { setSMsg(t("fillAll")); return; }
    const item = stock.find(x => x.name.toLowerCase() === name.toLowerCase() && (x.owner === "shop" || x.owner === "vu"));
    if (!item || Number(item.quantity) < qty) { setSMsg(lang === "vi" ? "❌ Không có hoặc không đủ số lượng" : "❌ Not in stock or insufficient"); return; }
    const profit = (price - Number(item.cost)) * qty;
    const remain = Number(item.quantity) - qty;
    if (remain === 0) await sb.from("stock_items").delete().eq("id", item.id);
    else await sb.from("stock_items").update({ quantity: remain, updated_at: new Date().toISOString() }).eq("id", item.id);
    const { error } = await sb.from("sales").insert({ name: item.name, quantity: qty, price, profit, owner: item.owner });
    if (error) { setSMsg("Lỗi: " + error.message); return; }
    setSName(""); setSQty(""); setSPrice("");
    setSMsg(`✅ ${qty} × ${item.name} — ${formatVND(profit)}`);
    refresh();
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guard()) return;
    const name = rName.trim();
    const qty = Number(rQty);
    if (!name || !qty || qty <= 0) { setRMsg(t("fillAll")); return; }
    const { error } = await sb.from("service_items").insert({ name, quantity: qty, status: "pending", note: rNote.trim() });
    if (error) { setRMsg("Lỗi: " + error.message); return; }
    setRName(""); setRQty("1"); setRNote("");
    setRMsg(`✅ ${name} × ${qty}`);
    refresh();
  };

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guard()) return;
    const svc = services.find(x => x.id === dServiceId);
    const price = Number(dPrice);
    const vuShare = Number(dVuShare);
    if (!svc) { setDMsg(t("fillAll")); return; }
    if (!price || price < 0) { setDMsg(t("fillAll")); return; }
    if (vuShare < 0 || vuShare > price) { setDMsg("⚠️ 0 – " + formatVND(price)); return; }
    const shopShare = price - vuShare;
    await sb.from("sales").insert([
      { name: `[DV] ${svc.name}`, quantity: 1, price, profit: vuShare, owner: "vu" },
      { name: `[DV] ${svc.name}`, quantity: 0, price: 0, profit: shopShare, owner: "service" },
    ]);
    const remain = Number(svc.quantity) - 1;
    if (remain <= 0) await sb.from("service_items").delete().eq("id", svc.id);
    else await sb.from("service_items").update({ quantity: remain }).eq("id", svc.id);
    setDServiceId(""); setDPrice(""); setDVuShare("");
    setDMsg(`✅ Vũ: ${formatVND(vuShare)} / ${formatVND(shopShare)}`);
    refresh();
  };

  const deleteSale = async (id: string) => { if (guard()) return; await sb.from("sales").delete().eq("id", id); refresh(); };
  const clearAllSales = async () => {
    if (guard()) return;
    if (!confirm(lang === "vi" ? "Xoá toàn bộ lịch sử bán hàng?" : "Delete all sales history?")) return;
    await sb.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    refresh();
  };
  const deleteStock = async (id: string, name: string) => {
    if (guard()) return;
    if (!confirm(`${lang === "vi" ? "Xoá" : "Delete"} "${name}"?`)) return;
    await sb.from("stock_items").delete().eq("id", id);
    refresh();
  };
  const deleteService = async (id: string, name: string) => {
    if (guard()) return;
    if (!confirm(`${lang === "vi" ? "Xoá" : "Delete"} "${name}"?`)) return;
    await sb.from("service_items").delete().eq("id", id);
    refresh();
  };

  const shopStock = useMemo(() => stock.filter(x => x.owner === "shop"), [stock]);
  const vuStock = useMemo(() => stock.filter(x => x.owner === "vu"), [stock]);
  const filteredShopStock = useMemo(() => shopStock.filter(x => x.name.toLowerCase().includes(search.toLowerCase())), [shopStock, search]);
  const filteredVuStock = useMemo(() => vuStock.filter(x => x.name.toLowerCase().includes(vuSearch.toLowerCase())), [vuStock, vuSearch]);
  const totalProfit = useMemo(() => sales.reduce((s, x) => s + Number(x.profit), 0), [sales]);
  const vuProfit = useMemo(() => sales.filter(s => s.owner === "vu").reduce((s, x) => s + Number(x.profit), 0), [sales]);
  const shopProfit = useMemo(() => sales.filter(s => s.owner !== "vu").reduce((s, x) => s + Number(x.profit), 0), [sales]);
  const totalStockValue = useMemo(() => stock.reduce((s, x) => s + Number(x.cost) * Number(x.quantity), 0), [stock]);

  const tabs: [Tab, string, React.ReactNode][] = [
    ["import", t("tabImport"), <Package className="w-4 h-4" />],
    ["sell", t("tabSell"), <ShoppingCart className="w-4 h-4" />],
    ["stock", t("tabStock"), <Boxes className="w-4 h-4" />],
    ["vu", t("tabVu"), <User className="w-4 h-4" />],
    ["receive", t("tabReceive"), <Wrench className="w-4 h-4" />],
    ["deliver", t("tabDeliver"), <Truck className="w-4 h-4" />],
    ["pending", t("tabPending"), <Clock className="w-4 h-4" />],
    ["sales", t("tabSales"), <History className="w-4 h-4" />],
    ...((!readOnly ? [["settings", t("tabSettings"), <SettingsIcon className="w-4 h-4" />]] : []) as [Tab, string, React.ReactNode][]),
  ];

  return (
    <div className="min-h-screen text-foreground">
      <div className="rainbow-bar h-1.5 w-full" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <header className="mb-8 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold rainbow-text tracking-tight">{t("appTitle")}</h1>
              <p className="text-sm text-muted-foreground mt-2">{t("appSub")}</p>
              {readOnly && (
                <span className="inline-flex items-center gap-1.5 mt-3 rounded-md px-2 py-1 text-xs font-medium bg-[var(--neon-yellow)]/20 text-[var(--neon-yellow)] border border-[var(--neon-yellow)]/40">
                  <Eye className="w-3.5 h-3.5" /> {t("guestBadge")}
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> {t("logout")}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label={t("totalStock")} value={formatVND(totalStockValue)} accent="cyan" />
            <StatCard label={t("vuProfit")} value={formatVND(vuProfit)} accent={vuProfit >= 0 ? "green" : "pink"} />
            <StatCard label={t("shopProfit")} value={formatVND(shopProfit)} accent={shopProfit >= 0 ? "green" : "pink"} />
            <StatCard label={t("totalProfit")} value={formatVND(totalProfit)} accent="purple" />
          </div>
        </header>

        <nav className="flex flex-wrap gap-1 mb-6 p-1 rounded-xl bg-card/60 border border-border backdrop-blur">
          {tabs.map(([k, label, icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === k
                  ? "bg-gradient-to-r from-[var(--neon-pink)] via-[var(--neon-purple)] to-[var(--neon-cyan)] text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </nav>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : (
          <>
            {tab === "import" && (
              <Card title={t("tabImport")} accent="cyan">
                <fieldset disabled={readOnly} className={readOnly ? "opacity-60" : ""}>
                <form onSubmit={handleImport} className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <OwnerToggle value={iOwner} onChange={setIOwner} />
                  </div>
                  <Field label={t("itemName")}><Input value={iName} onChange={setIName} placeholder="VD: Nước ngọt" /></Field>
                  <Field label={t("qty")}><Input value={iQty} onChange={setIQty} type="number" placeholder="0" /></Field>
                  <Field label={t("cost")}><Input value={iCost} onChange={setICost} type="number" placeholder="0" /></Field>
                  <Field label={t("note")}><Input value={iNote} onChange={setINote} placeholder='VD: "Hàng Vũ gửi"' /></Field>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button className="rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] text-black font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
                      {t("save")}
                    </button>
                    {iMsg && <span className="text-sm text-muted-foreground">{iMsg}</span>}
                  </div>
                </form>
                </fieldset>
              </Card>
            )}

            {tab === "sell" && (
              <Card title={t("tabSell")} accent="pink">
                <fieldset disabled={readOnly} className={readOnly ? "opacity-60" : ""}>
                <form onSubmit={handleSell} className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("itemName")}>
                    <Input value={sName} onChange={setSName} placeholder={t("itemName")} list="stock-names" />
                    <datalist id="stock-names">
                      {stock.filter(s => s.owner !== "service").map(s => (
                        <option key={s.id} value={s.name} label={s.owner === "vu" ? "Vũ" : "Shop"} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label={t("qty")}><Input value={sQty} onChange={setSQty} type="number" placeholder="0" /></Field>
                  <Field label={t("price")}><Input value={sPrice} onChange={setSPrice} type="number" placeholder="0" /></Field>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button className="rounded-lg bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
                      {t("saveSell")}
                    </button>
                    {sMsg && <span className="text-sm text-muted-foreground">{sMsg}</span>}
                  </div>
                </form>
                </fieldset>
              </Card>
            )}

            {tab === "stock" && (
              <Card title={t("tabStock")} accent="purple">
                <StockTable items={filteredShopStock} search={search} setSearch={setSearch} onDelete={deleteStock} showOwner readOnly={readOnly} placeholder={t("search")} emptyText={t("noItems")} />
              </Card>
            )}

            {tab === "vu" && (
              <Card title={t("tabVu")} accent="pink">
                <StockTable items={filteredVuStock} search={vuSearch} setSearch={setVuSearch} onDelete={deleteStock} readOnly={readOnly} placeholder={t("search")} emptyText={t("noItems")} />
              </Card>
            )}

            {tab === "receive" && (
              <Card title={t("tabReceive")} accent="cyan">
                <fieldset disabled={readOnly} className={readOnly ? "opacity-60" : ""}>
                <form onSubmit={handleReceive} className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("itemName")}><Input value={rName} onChange={setRName} placeholder="Sửa iPhone 16" /></Field>
                  <Field label={t("qty")}><Input value={rQty} onChange={setRQty} type="number" placeholder="1" /></Field>
                  <div className="sm:col-span-2"><Field label={t("note")}><Input value={rNote} onChange={setRNote} placeholder='VD: "Khách Nam - 0901..."' /></Field></div>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button className="rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">

                      {t("save")}
                    </button>
                    {rMsg && <span className="text-sm text-muted-foreground">{rMsg}</span>}
                  </div>
                </form>
                </fieldset>
              </Card>
            )}

            {tab === "deliver" && (
              <Card title={t("tabDeliver")} accent="green">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("noItems")}</p>
                ) : (
                  <fieldset disabled={readOnly} className={readOnly ? "opacity-60" : ""}>
                  <form onSubmit={handleDeliver} className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("tabReceive")}>
                      <select value={dServiceId} onChange={e => setDServiceId(e.target.value)} className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">--</option>
                        {services.map(s => (<option key={s.id} value={s.id}>{s.name} ({Number(s.quantity)})</option>))}
                      </select>
                    </Field>
                    <Field label={t("price")}><Input value={dPrice} onChange={setDPrice} type="number" placeholder="0" /></Field>
                    <Field label={t("vuProfit")}><Input value={dVuShare} onChange={setDVuShare} type="number" placeholder="0" /></Field>
                    <Field label={t("shopProfit")}>
                      <div className="w-full rounded-lg border border-input bg-input/50 px-3 py-2 text-sm text-muted-foreground">
                        {formatVND(Math.max(0, Number(dPrice || 0) - Number(dVuShare || 0)))}
                      </div>
                    </Field>
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <button className="rounded-lg bg-gradient-to-r from-[var(--neon-green)] to-[var(--neon-cyan)] text-black font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
                        {t("confirm")}
                      </button>
                      {dMsg && <span className="text-sm text-muted-foreground">{dMsg}</span>}
                    </div>
                  </form>
                  </fieldset>
                )}
              </Card>
            )}

            {tab === "pending" && (
              <Card title={t("tabPending")} accent="purple">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("noItems")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-border text-muted-foreground">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">{t("itemName")}</th>
                          <th className="py-2 pr-4">{t("qty")}</th>
                          <th className="py-2 pr-4">{t("note")}</th>
                          <th className="py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map(s => (
                          <tr key={s.id} className="border-b border-border/40 hover:bg-accent/30">
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")}</td>
                            <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                            <td className="py-2.5 pr-4">{Number(s.quantity)}</td>
                            <td className="py-2.5 pr-4 text-muted-foreground">{s.note || "—"}</td>
                            <td className="py-2.5">
                              {!readOnly && (
                                <button onClick={() => deleteService(s.id, s.name)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {tab === "sales" && (
              <Card title={t("tabSales")} accent="green">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <span className="text-sm">
                    {t("totalProfit")}:{" "}
                    <span className={totalProfit >= 0 ? "text-[var(--neon-green)] font-bold" : "text-destructive font-bold"}>{formatVND(totalProfit)}</span>
                  </span>
                  {!readOnly && sales.length > 0 && (
                    <button onClick={clearAllSales} className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground transition">
                      <Trash2 className="w-3.5 h-3.5" /> {lang === "vi" ? "Xoá toàn bộ" : "Clear all"}
                    </button>
                  )}
                </div>
                {sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">{t("noItems")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-border text-muted-foreground">
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Type</th>
                          <th className="py-2 pr-4">{t("itemName")}</th>
                          <th className="py-2 pr-4">{t("qty")}</th>
                          <th className="py-2 pr-4">{t("price")}</th>
                          <th className="py-2 pr-4">{t("totalProfit")}</th>
                          <th className="py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map(s => (
                          <tr key={s.id} className="border-b border-border/40 hover:bg-accent/30">
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString(lang === "vi" ? "vi-VN" : "en-US")}</td>
                            <td className="py-2.5 pr-4"><OwnerBadge owner={s.owner} /></td>
                            <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                            <td className="py-2.5 pr-4">{Number(s.quantity)}</td>
                            <td className="py-2.5 pr-4">{formatVND(Number(s.price))}</td>
                            <td className={`py-2.5 pr-4 font-semibold ${Number(s.profit) >= 0 ? "text-[var(--neon-green)]" : "text-destructive"}`}>{formatVND(Number(s.profit))}</td>
                            <td className="py-2.5">
                              {!readOnly && (
                                <button onClick={() => deleteSale(s.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {tab === "settings" && !readOnly && (
              <SettingsPanel lang={lang} setLang={setLang} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ lang, setLang, t }: { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof DICT) => string }) {
  const [theme, setThemeState] = useState<Theme>("neon");
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);
  const [ou, setOu] = useState("");
  const [op, setOp] = useState("");
  const [nu, setNu] = useState("");
  const [np, setNp] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  useEffect(() => {
    setThemeState((localStorage.getItem(THEME_KEY) as Theme | null) || "neon");
    setPhone(localStorage.getItem(PHONE_KEY) || DEFAULT_PHONE);
  }, []);

  const setTheme = (v: Theme) => { setThemeState(v); localStorage.setItem(THEME_KEY, v); applyTheme(v); };

  const savePhone = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(PHONE_KEY, phone.trim() || DEFAULT_PHONE);
    setPhoneMsg(t("saved"));
    setTimeout(() => setPhoneMsg(null), 2000);
  };

  const changePw = (e: React.FormEvent) => {
    e.preventDefault();
    const c = getCred();
    if (ou.trim() !== c.user || op !== c.pass) { setPwMsg(t("verifyFail")); return; }
    if (!nu.trim() || !np) { setPwMsg(t("fillAll")); return; }
    localStorage.setItem(CRED_KEY, JSON.stringify({ user: nu.trim(), pass: np }));
    setOu(""); setOp(""); setNu(""); setNp("");
    setPwMsg(t("saved"));
  };

  const themes: [Theme, string][] = [
    ["neon", "Neon"],
    ["ocean", "Ocean"],
    ["sunset", "Sunset"],
    ["light", "Light"],
  ];

  return (
    <div className="grid gap-6">
      <Card title={t("theme")} accent="purple">
        <div className="flex flex-wrap gap-2">
          {themes.map(([v, label]) => (
            <button key={v} onClick={() => setTheme(v)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${theme === v ? "bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white border-transparent" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}>
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card title={t("language")} accent="cyan">
        <div className="flex gap-2">
          <button onClick={() => setLang("vi")} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${lang === "vi" ? "bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] text-black border-transparent" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}>🇻🇳 Tiếng Việt</button>
          <button onClick={() => setLang("en")} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${lang === "en" ? "bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] text-black border-transparent" : "border-border text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}>🇺🇸 English</button>
        </div>
      </Card>

      <Card title={t("phone")} accent="green">
        <form onSubmit={savePhone} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Input value={phone} onChange={setPhone} placeholder="0900 000 000" />
          </div>
          <button className="rounded-lg bg-gradient-to-r from-[var(--neon-green)] to-[var(--neon-cyan)] text-black font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">{t("confirm")}</button>
          {phoneMsg && <span className="text-sm text-muted-foreground">{phoneMsg}</span>}
        </form>
      </Card>

      <Card title={t("changePw")} accent="pink">
        <form onSubmit={changePw} className="grid gap-4 sm:grid-cols-2">
          <Field label={t("oldUser")}><Input value={ou} onChange={setOu} /></Field>
          <Field label={t("oldPw")}><PasswordInput value={op} onChange={setOp} /></Field>
          <Field label={t("newUser")}><Input value={nu} onChange={setNu} /></Field>
          <Field label={t("newPw")}><PasswordInput value={np} onChange={setNp} /></Field>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className="rounded-lg bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">{t("confirm")}</button>
            {pwMsg && <span className="text-sm text-muted-foreground">{pwMsg}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}

function StockTable({
  items, search, setSearch, onDelete, showOwner, readOnly, placeholder, emptyText,
}: {
  items: StockItem[]; search: string; setSearch: (v: string) => void;
  onDelete: (id: string, name: string) => void; showOwner?: boolean; readOnly?: boolean;
  placeholder: string; emptyText: string;
}) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-input bg-input pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border text-muted-foreground">
                <th className="py-2 pr-4">Name</th>
                {showOwner && <th className="py-2 pr-4">Type</th>}
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Cost</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border/40 hover:bg-accent/30">
                  <td className="py-2.5 pr-4 font-medium">{item.name}</td>
                  {showOwner && <td className="py-2.5 pr-4"><OwnerBadge owner={item.owner} /></td>}
                  <td className="py-2.5 pr-4">{Number(item.quantity)}</td>
                  <td className="py-2.5 pr-4">{formatVND(Number(item.cost))}</td>
                  <td className="py-2.5 pr-4 text-[var(--neon-cyan)]">{formatVND(Number(item.cost) * Number(item.quantity))}</td>
                  <td className="py-2.5">
                    {!readOnly && (
                      <button onClick={() => onDelete(item.id, item.name)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function OwnerToggle({ value, onChange }: { value: Owner; onChange: (v: Owner) => void }) {
  const opts: [Owner, string][] = [["shop", "Shop"], ["vu", "Vũ"]];
  return (
    <div className="inline-flex rounded-lg border border-border p-1 bg-card/60">
      {opts.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${value === v ? "bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white" : "text-muted-foreground hover:text-foreground"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function OwnerBadge({ owner }: { owner: Owner }) {
  if (owner === "vu") return <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--neon-pink)]/20 text-[var(--neon-pink)] border border-[var(--neon-pink)]/40">Vũ</span>;
  if (owner === "service") return <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/40">Service</span>;
  return <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-muted/40 text-muted-foreground border border-border">Shop</span>;
}

function Card({ title, accent, children }: { title: string; accent: "cyan" | "pink" | "purple" | "green"; children: React.ReactNode }) {
  const barColor = {
    cyan: "from-[var(--neon-cyan)] to-[var(--neon-green)]",
    pink: "from-[var(--neon-pink)] to-[var(--neon-purple)]",
    purple: "from-[var(--neon-purple)] to-[var(--neon-cyan)]",
    green: "from-[var(--neon-green)] to-[var(--neon-yellow)]",
  }[accent];
  return (
    <section className="rounded-xl border border-border bg-card/70 backdrop-blur overflow-hidden">
      <div className={`h-1 w-full bg-gradient-to-r ${barColor}`} />
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: "cyan" | "pink" | "purple" | "green" }) {
  const color = { cyan: "text-[var(--neon-cyan)]", pink: "text-[var(--neon-pink)]", purple: "text-[var(--neon-purple)]", green: "text-[var(--neon-green)]" }[accent];
  return (
    <div className="rounded-xl border border-border bg-card/60 backdrop-blur p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = "text", placeholder, list }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; list?: string }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} type={type} placeholder={placeholder} list={list} className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input type="password" value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />;
}

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function baseName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}
