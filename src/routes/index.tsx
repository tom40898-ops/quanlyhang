import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Trash2, Package, ShoppingCart, Boxes, History, Search, Lock, LogOut,
  User, Wrench, Truck, Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Gate,
});

const AUTH_USER = "Vũ";
const AUTH_PASS = "Leewuu0962267267";
const AUTH_KEY = "inv_auth_v1";

function Gate() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(typeof window !== "undefined" && localStorage.getItem(AUTH_KEY) === "1");
  }, []);

  if (authed === null) return null;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Index onLogout={() => { localStorage.removeItem(AUTH_KEY); setAuthed(false); }} />;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (u.trim() === AUTH_USER && p === AUTH_PASS) {
      localStorage.setItem(AUTH_KEY, "1");
      onSuccess();
    } else {
      setErr("❌ Sai tên đăng nhập hoặc mật khẩu");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="rainbow-bar h-1.5 w-full absolute top-0 left-0" />
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card/70 backdrop-blur p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--neon-pink)] to-[var(--neon-purple)]">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold rainbow-text">Đăng nhập</h1>
            <p className="text-xs text-muted-foreground">Quản lý hàng hoá</p>
          </div>
        </div>
        <label className="block">
          <span className="block text-sm font-medium mb-1.5">Tên đăng nhập</span>
          <input value={u} onChange={e => setU(e.target.value)} className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
        </label>
        <label className="block">
          <span className="block text-sm font-medium mb-1.5">Mật khẩu</span>
          <input type="password" value={p} onChange={e => setP(e.target.value)} className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button className="w-full rounded-lg bg-gradient-to-r from-[var(--neon-pink)] via-[var(--neon-purple)] to-[var(--neon-cyan)] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
          Đăng nhập
        </button>
      </form>
    </div>
  );
}

type Owner = "shop" | "vu" | "service";
type StockItem = { id: string; name: string; quantity: number; cost: number; owner: Owner };
type Sale = { id: string; name: string; quantity: number; price: number; profit: number; created_at: string; owner: Owner };
type ServiceItem = { id: string; name: string; quantity: number; status: string; created_at: string };
type Tab = "import" | "sell" | "stock" | "vu" | "receive" | "deliver" | "pending" | "sales";

const sb = supabase as any;

function Index({ onLogout }: { onLogout: () => void }) {
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
  const [iMsg, setIMsg] = useState<string | null>(null);

  // Sell
  const [sName, setSName] = useState("");
  const [sQty, setSQty] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sMsg, setSMsg] = useState<string | null>(null);

  // Receive service
  const [rName, setRName] = useState("");
  const [rQty, setRQty] = useState("1");
  const [rMsg, setRMsg] = useState<string | null>(null);

  // Deliver service
  const [dServiceId, setDServiceId] = useState("");
  const [dPrice, setDPrice] = useState("");
  const [dVuShare, setDVuShare] = useState("");
  const [dMsg, setDMsg] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = iName.trim();
    const qty = Number(iQty);
    const cost = Number(iCost);
    if (!name || !qty || qty <= 0 || cost < 0) { setIMsg("⚠️ Vui lòng nhập đầy đủ và hợp lệ"); return; }

    const sameNameItems = stock.filter(x => baseName(x.name).toLowerCase() === name.toLowerCase() && x.owner === iOwner);
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
      const { error } = await sb.from("stock_items").insert({ name: finalName, quantity: qty, cost, owner: iOwner });
      if (error) { setIMsg("Lỗi: " + error.message); return; }
    }
    setIName(""); setIQty(""); setICost("");
    setIMsg(`✅ Đã nhập ${qty} ${finalName} vào ${iOwner === "vu" ? "kho Vũ" : "kho tiệm"}`);
    refresh();
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sName.trim();
    const qty = Number(sQty);
    const price = Number(sPrice);
    if (!name || !qty || qty <= 0 || price < 0) { setSMsg("⚠️ Vui lòng nhập đầy đủ và hợp lệ"); return; }

    const item = stock.find(x => x.name.toLowerCase() === name.toLowerCase() && (x.owner === "shop" || x.owner === "vu"));
    if (!item || Number(item.quantity) < qty) {
      setSMsg("❌ Không có loại hàng đang tìm hoặc không đủ số lượng");
      return;
    }
    const profit = (price - Number(item.cost)) * qty;
    const remain = Number(item.quantity) - qty;

    if (remain === 0) {
      await sb.from("stock_items").delete().eq("id", item.id);
    } else {
      await sb.from("stock_items")
        .update({ quantity: remain, updated_at: new Date().toISOString() })
        .eq("id", item.id);
    }
    const { error } = await sb.from("sales").insert({ name: item.name, quantity: qty, price, profit, owner: item.owner });
    if (error) { setSMsg("Lỗi: " + error.message); return; }

    setSName(""); setSQty(""); setSPrice("");
    setSMsg(`✅ Đã bán ${qty} ${item.name} — Lãi: ${formatVND(profit)}`);
    refresh();
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = rName.trim();
    const qty = Number(rQty);
    if (!name || !qty || qty <= 0) { setRMsg("⚠️ Vui lòng nhập tên và số lượng"); return; }
    const { error } = await sb.from("service_items").insert({ name, quantity: qty, status: "pending" });
    if (error) { setRMsg("Lỗi: " + error.message); return; }
    setRName(""); setRQty("1");
    setRMsg(`✅ Đã nhận: ${name} × ${qty}`);
    refresh();
  };

  const handleDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    const svc = services.find(x => x.id === dServiceId);
    const price = Number(dPrice);
    const vuShare = Number(dVuShare);
    if (!svc) { setDMsg("⚠️ Chọn đơn dịch vụ"); return; }
    if (!price || price < 0) { setDMsg("⚠️ Nhập giá bán"); return; }
    if (vuShare < 0 || vuShare > price) { setDMsg("⚠️ Lãi Vũ phải trong khoảng 0 – giá bán"); return; }
    const shopShare = price - vuShare;

    // 2 sales rows to split profit
    await sb.from("sales").insert([
      { name: `[DV] ${svc.name}`, quantity: 1, price, profit: vuShare, owner: "vu" },
      { name: `[DV] ${svc.name}`, quantity: 0, price: 0, profit: shopShare, owner: "service" },
    ]);

    const remain = Number(svc.quantity) - 1;
    if (remain <= 0) {
      await sb.from("service_items").delete().eq("id", svc.id);
    } else {
      await sb.from("service_items").update({ quantity: remain }).eq("id", svc.id);
    }

    setDServiceId(""); setDPrice(""); setDVuShare("");
    setDMsg(`✅ Đã giao "${svc.name}" — Vũ: ${formatVND(vuShare)}, Tiệm: ${formatVND(shopShare)}`);
    refresh();
  };

  const deleteSale = async (id: string) => { await sb.from("sales").delete().eq("id", id); refresh(); };
  const clearAllSales = async () => {
    if (!confirm("Xoá toàn bộ lịch sử bán hàng?")) return;
    await sb.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    refresh();
  };
  const deleteStock = async (id: string, name: string) => {
    if (!confirm(`Xoá "${name}" khỏi kho?`)) return;
    await sb.from("stock_items").delete().eq("id", id);
    refresh();
  };
  const deleteService = async (id: string, name: string) => {
    if (!confirm(`Xoá đơn dịch vụ "${name}"?`)) return;
    await sb.from("service_items").delete().eq("id", id);
    refresh();
  };

  const shopStock = useMemo(() => stock.filter(x => x.owner === "shop"), [stock]);
  const vuStock = useMemo(() => stock.filter(x => x.owner === "vu"), [stock]);

  const filteredShopStock = useMemo(
    () => shopStock.filter(x => x.name.toLowerCase().includes(search.toLowerCase())),
    [shopStock, search]
  );
  const filteredVuStock = useMemo(
    () => vuStock.filter(x => x.name.toLowerCase().includes(vuSearch.toLowerCase())),
    [vuStock, vuSearch]
  );

  const totalProfit = useMemo(() => sales.reduce((s, x) => s + Number(x.profit), 0), [sales]);
  const vuProfit = useMemo(
    () => sales.filter(s => s.owner === "vu").reduce((s, x) => s + Number(x.profit), 0),
    [sales]
  );
  const shopProfit = useMemo(
    () => sales.filter(s => s.owner !== "vu").reduce((s, x) => s + Number(x.profit), 0),
    [sales]
  );
  const totalStockValue = useMemo(
    () => stock.reduce((s, x) => s + Number(x.cost) * Number(x.quantity), 0),
    [stock]
  );

  const tabs: [Tab, string, React.ReactNode][] = [
    ["import", "Nhập hàng", <Package className="w-4 h-4" />],
    ["sell", "Bán hàng", <ShoppingCart className="w-4 h-4" />],
    ["stock", "Hàng còn lại", <Boxes className="w-4 h-4" />],
    ["vu", "Hàng của Vũ", <User className="w-4 h-4" />],
    ["receive", "Nhận hàng", <Wrench className="w-4 h-4" />],
    ["deliver", "Giao hàng", <Truck className="w-4 h-4" />],
    ["pending", "Dịch vụ chờ", <Clock className="w-4 h-4" />],
    ["sales", "Lịch sử bán", <History className="w-4 h-4" />],
  ];

  return (
    <div className="min-h-screen text-foreground">
      <div className="rainbow-bar h-1.5 w-full" />

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <header className="mb-8 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold rainbow-text tracking-tight">
                Quản lý hàng hoá
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Nhập – Bán – Dịch vụ – Theo dõi tồn kho và lãi
              </p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition"
            >
              <LogOut className="w-3.5 h-3.5" /> Đăng xuất
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Tổng vốn tồn" value={formatVND(totalStockValue)} accent="cyan" />
            <StatCard label="Lãi Vũ" value={formatVND(vuProfit)} accent={vuProfit >= 0 ? "green" : "pink"} />
            <StatCard label="Lãi tiệm" value={formatVND(shopProfit)} accent={shopProfit >= 0 ? "green" : "pink"} />
            <StatCard label="Tổng lãi" value={formatVND(totalProfit)} accent="purple" />
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
              {icon}
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <>
            {tab === "import" && (
              <Card title="Nhập hàng" accent="cyan">
                <form onSubmit={handleImport} className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 flex flex-wrap gap-2">
                    <OwnerToggle value={iOwner} onChange={setIOwner} />
                  </div>
                  <Field label="Tên hàng">
                    <Input value={iName} onChange={setIName} placeholder="VD: Nước ngọt" />
                  </Field>
                  <Field label="Số lượng">
                    <Input value={iQty} onChange={setIQty} type="number" placeholder="0" />
                  </Field>
                  <Field label="Số tiền vốn / đơn vị">
                    <Input value={iCost} onChange={setICost} type="number" placeholder="0" />
                  </Field>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button className="rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-green)] text-black font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
                      Lưu nhập hàng
                    </button>
                    {iMsg && <span className="text-sm text-muted-foreground">{iMsg}</span>}
                  </div>
                </form>
              </Card>
            )}

            {tab === "sell" && (
              <Card title="Bán hàng" accent="pink">
                <form onSubmit={handleSell} className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tên hàng">
                    <Input value={sName} onChange={setSName} placeholder="Nhập tên hàng" list="stock-names" />
                    <datalist id="stock-names">
                      {stock.filter(s => s.owner !== "service").map(s => (
                        <option key={s.id} value={s.name} label={s.owner === "vu" ? "Hàng của Vũ" : "Hàng tiệm"} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Số lượng">
                    <Input value={sQty} onChange={setSQty} type="number" placeholder="0" />
                  </Field>
                  <Field label="Giá bán / đơn vị">
                    <Input value={sPrice} onChange={setSPrice} type="number" placeholder="0" />
                  </Field>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button className="rounded-lg bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
                      Ghi nhận bán
                    </button>
                    {sMsg && <span className="text-sm text-muted-foreground">{sMsg}</span>}
                  </div>
                </form>
              </Card>
            )}

            {tab === "stock" && (
              <Card title="Hàng còn lại (Tiệm)" accent="purple">
                <StockTable
                  items={filteredShopStock}
                  search={search}
                  setSearch={setSearch}
                  onDelete={deleteStock}
                  showOwner
                />
              </Card>
            )}

            {tab === "vu" && (
              <Card title="Kho hàng của Vũ" accent="pink">
                <StockTable
                  items={filteredVuStock}
                  search={vuSearch}
                  setSearch={setVuSearch}
                  onDelete={deleteStock}
                />
              </Card>
            )}

            {tab === "receive" && (
              <Card title="Nhận hàng (Dịch vụ)" accent="cyan">
                <form onSubmit={handleReceive} className="grid gap-4 sm:grid-cols-2">
                  <Field label="Tên đơn (VD: Sửa iPhone 16)">
                    <Input value={rName} onChange={setRName} placeholder="Sửa iPhone 16" />
                  </Field>
                  <Field label="Số lượng">
                    <Input value={rQty} onChange={setRQty} type="number" placeholder="1" />
                  </Field>
                  <div className="sm:col-span-2 flex items-center gap-3">
                    <button className="rounded-lg bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-purple)] text-white font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
                      Lưu nhận hàng
                    </button>
                    {rMsg && <span className="text-sm text-muted-foreground">{rMsg}</span>}
                  </div>
                </form>
              </Card>
            )}

            {tab === "deliver" && (
              <Card title="Giao hàng (Dịch vụ)" accent="green">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chưa có đơn dịch vụ nào chờ giao.</p>
                ) : (
                  <form onSubmit={handleDeliver} className="grid gap-4 sm:grid-cols-2">
                    <Field label="Chọn đơn dịch vụ">
                      <select
                        value={dServiceId}
                        onChange={e => setDServiceId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">-- Chọn --</option>
                        {services.map(s => (
                          <option key={s.id} value={s.id}>{s.name} (còn {Number(s.quantity)})</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Tổng giá thu">
                      <Input value={dPrice} onChange={setDPrice} type="number" placeholder="0" />
                    </Field>
                    <Field label="Lãi chia cho Vũ">
                      <Input value={dVuShare} onChange={setDVuShare} type="number" placeholder="0" />
                    </Field>
                    <Field label="Lãi tiệm (tự tính)">
                      <div className="w-full rounded-lg border border-input bg-input/50 px-3 py-2 text-sm text-muted-foreground">
                        {formatVND(Math.max(0, Number(dPrice || 0) - Number(dVuShare || 0)))}
                      </div>
                    </Field>
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <button className="rounded-lg bg-gradient-to-r from-[var(--neon-green)] to-[var(--neon-cyan)] text-black font-semibold px-5 py-2.5 text-sm hover:opacity-90 transition">
                        Xác nhận giao hàng
                      </button>
                      {dMsg && <span className="text-sm text-muted-foreground">{dMsg}</span>}
                    </div>
                  </form>
                )}
              </Card>
            )}

            {tab === "pending" && (
              <Card title="Kho dịch vụ đang chờ" accent="purple">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Không có đơn nào.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-border text-muted-foreground">
                          <th className="py-2 pr-4">Ngày nhận</th>
                          <th className="py-2 pr-4">Tên đơn</th>
                          <th className="py-2 pr-4">Số lượng</th>
                          <th className="py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map(s => (
                          <tr key={s.id} className="border-b border-border/40 hover:bg-accent/30">
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("vi-VN")}</td>
                            <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                            <td className="py-2.5 pr-4">{Number(s.quantity)}</td>
                            <td className="py-2.5">
                              <button
                                onClick={() => deleteService(s.id, s.name)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
              <Card title="Lịch sử bán hàng" accent="green">
                <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                  <span className="text-sm">
                    Tổng lãi:{" "}
                    <span className={totalProfit >= 0 ? "text-[var(--neon-green)] font-bold" : "text-destructive font-bold"}>
                      {formatVND(totalProfit)}
                    </span>
                  </span>
                  {sales.length > 0 && (
                    <button
                      onClick={clearAllSales}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/50 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive hover:text-destructive-foreground transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xoá toàn bộ
                    </button>
                  )}
                </div>
                {sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chưa có giao dịch.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-border text-muted-foreground">
                          <th className="py-2 pr-4">Ngày</th>
                          <th className="py-2 pr-4">Loại</th>
                          <th className="py-2 pr-4">Tên hàng</th>
                          <th className="py-2 pr-4">SL</th>
                          <th className="py-2 pr-4">Giá bán</th>
                          <th className="py-2 pr-4">Lãi</th>
                          <th className="py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map(s => (
                          <tr key={s.id} className="border-b border-border/40 hover:bg-accent/30">
                            <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                              {new Date(s.created_at).toLocaleString("vi-VN")}
                            </td>
                            <td className="py-2.5 pr-4"><OwnerBadge owner={s.owner} /></td>
                            <td className="py-2.5 pr-4 font-medium">{s.name}</td>
                            <td className="py-2.5 pr-4">{Number(s.quantity)}</td>
                            <td className="py-2.5 pr-4">{formatVND(Number(s.price))}</td>
                            <td className={`py-2.5 pr-4 font-semibold ${Number(s.profit) >= 0 ? "text-[var(--neon-green)]" : "text-destructive"}`}>
                              {formatVND(Number(s.profit))}
                            </td>
                            <td className="py-2.5">
                              <button
                                onClick={() => deleteSale(s.id)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StockTable({
  items, search, setSearch, onDelete, showOwner,
}: {
  items: StockItem[]; search: string; setSearch: (v: string) => void;
  onDelete: (id: string, name: string) => void; showOwner?: boolean;
}) {
  return (
    <>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm hàng..."
          className="w-full rounded-lg border border-input bg-input pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Không có hàng nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border text-muted-foreground">
                <th className="py-2 pr-4">Tên hàng</th>
                {showOwner && <th className="py-2 pr-4">Loại</th>}
                <th className="py-2 pr-4">Số lượng</th>
                <th className="py-2 pr-4">Vốn / đv</th>
                <th className="py-2 pr-4">Tổng vốn</th>
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
                    <button
                      onClick={() => onDelete(item.id, item.name)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
  const opts: [Owner, string][] = [["shop", "Kho tiệm"], ["vu", "Kho Vũ"]];
  return (
    <div className="inline-flex rounded-lg border border-border p-1 bg-card/60">
      {opts.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            value === v
              ? "bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function OwnerBadge({ owner }: { owner: Owner }) {
  if (owner === "vu") return <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--neon-pink)]/20 text-[var(--neon-pink)] border border-[var(--neon-pink)]/40">Vũ</span>;
  if (owner === "service") return <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/40">Dịch vụ</span>;
  return <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-muted/40 text-muted-foreground border border-border">Tiệm</span>;
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
  const color = {
    cyan: "text-[var(--neon-cyan)]",
    pink: "text-[var(--neon-pink)]",
    purple: "text-[var(--neon-purple)]",
    green: "text-[var(--neon-green)]",
  }[accent];
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

function Input({
  value, onChange, type = "text", placeholder, list,
}: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string; list?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      list={list}
      className="w-full rounded-lg border border-input bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

function baseName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}
