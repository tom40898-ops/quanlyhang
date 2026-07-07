import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

type InventoryItem = { name: string; quantity: number; cost: number };
type Sale = { name: string; quantity: number; price: number; profit: number; date: string };

const STOCK_KEY = "inv_stock_v1";
const SALES_KEY = "inv_sales_v1";

function loadStock(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STOCK_KEY) || "[]"); } catch { return []; }
}
function loadSales(): Sale[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SALES_KEY) || "[]"); } catch { return []; }
}

type Tab = "import" | "sell" | "stock" | "sales";

function Index() {
  const [tab, setTab] = useState<Tab>("import");
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { setStock(loadStock()); setSales(loadSales()); }, []);
  useEffect(() => { localStorage.setItem(STOCK_KEY, JSON.stringify(stock)); }, [stock]);
  useEffect(() => { localStorage.setItem(SALES_KEY, JSON.stringify(sales)); }, [sales]);

  // Import form
  const [iName, setIName] = useState("");
  const [iQty, setIQty] = useState("");
  const [iCost, setICost] = useState("");
  const [iMsg, setIMsg] = useState<string | null>(null);

  // Sell form
  const [sName, setSName] = useState("");
  const [sQty, setSQty] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sMsg, setSMsg] = useState<string | null>(null);

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const name = iName.trim();
    const qty = Number(iQty);
    const cost = Number(iCost);
    if (!name || !qty || qty <= 0 || cost < 0) { setIMsg("Vui lòng nhập đầy đủ và hợp lệ"); return; }
    setStock(prev => {
      const idx = prev.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
      if (idx >= 0) {
        const cur = prev[idx];
        const totalQty = cur.quantity + qty;
        // Weighted average cost per unit
        const avgCost = (cur.cost * cur.quantity + cost) / totalQty * totalQty / totalQty;
        // Simpler: store cost as total cost, but spec says vốn. Treat cost as unit cost weighted avg.
        const newUnit = (cur.cost * cur.quantity + cost * qty) / totalQty;
        const next = [...prev];
        next[idx] = { name: cur.name, quantity: totalQty, cost: newUnit };
        void avgCost;
        return next;
      }
      return [...prev, { name, quantity: qty, cost }];
    });
    setIName(""); setIQty(""); setICost("");
    setIMsg(`Đã nhập ${qty} ${name}`);
  };

  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    const name = sName.trim();
    const qty = Number(sQty);
    const price = Number(sPrice);
    if (!name || !qty || qty <= 0 || price < 0) { setSMsg("Vui lòng nhập đầy đủ và hợp lệ"); return; }
    const idx = stock.findIndex(x => x.name.toLowerCase() === name.toLowerCase());
    if (idx < 0 || stock[idx].quantity < qty) {
      setSMsg("Không có loại hàng đang tìm hoặc không đủ số lượng");
      return;
    }
    const item = stock[idx];
    const profit = (price - item.cost) * qty;
    setStock(prev => {
      const next = [...prev];
      const cur = next[idx];
      const remain = cur.quantity - qty;
      if (remain === 0) next.splice(idx, 1);
      else next[idx] = { ...cur, quantity: remain };
      return next;
    });
    setSales(prev => [
      { name: item.name, quantity: qty, price, profit, date: new Date().toISOString() },
      ...prev,
    ]);
    setSName(""); setSQty(""); setSPrice("");
    setSMsg(`Đã bán ${qty} ${item.name} — Lãi: ${formatVND(profit)}`);
  };

  const filteredStock = useMemo(
    () => stock.filter(x => x.name.toLowerCase().includes(search.toLowerCase())),
    [stock, search]
  );

  const totalProfit = useMemo(() => sales.reduce((s, x) => s + x.profit, 0), [sales]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Quản lý hàng hoá</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nhập – Bán – Theo dõi tồn kho và lãi
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 mb-6 border-b border-border">
          {([
            ["import", "Nhập hàng"],
            ["sell", "Bán hàng"],
            ["stock", "Hàng còn lại"],
            ["sales", "Lịch sử bán"],
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
                tab === k
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "import" && (
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Nhập hàng</h2>
            <form onSubmit={handleImport} className="grid gap-4 sm:grid-cols-2">
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
                <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
                  Lưu nhập hàng
                </button>
                {iMsg && <span className="text-sm text-muted-foreground">{iMsg}</span>}
              </div>
            </form>
          </section>
        )}

        {tab === "sell" && (
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">Bán hàng</h2>
            <form onSubmit={handleSell} className="grid gap-4 sm:grid-cols-2">
              <Field label="Tên hàng">
                <Input value={sName} onChange={setSName} placeholder="Nhập tên hàng" list="stock-names" />
                <datalist id="stock-names">
                  {stock.map(s => <option key={s.name} value={s.name} />)}
                </datalist>
              </Field>
              <Field label="Số lượng">
                <Input value={sQty} onChange={setSQty} type="number" placeholder="0" />
              </Field>
              <Field label="Giá bán / đơn vị">
                <Input value={sPrice} onChange={setSPrice} type="number" placeholder="0" />
              </Field>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
                  Ghi nhận bán
                </button>
                {sMsg && <span className="text-sm text-muted-foreground">{sMsg}</span>}
              </div>
            </form>
          </section>
        )}

        {tab === "stock" && (
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold">Hàng còn lại</h2>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm hàng..."
                className="rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-64"
              />
            </div>
            {filteredStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có hàng nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4">Tên hàng</th>
                      <th className="py-2 pr-4">Số lượng</th>
                      <th className="py-2 pr-4">Vốn / đv</th>
                      <th className="py-2">Tổng vốn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map(item => (
                      <tr key={item.name} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{item.name}</td>
                        <td className="py-2 pr-4">{item.quantity}</td>
                        <td className="py-2 pr-4">{formatVND(item.cost)}</td>
                        <td className="py-2">{formatVND(item.cost * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "sales" && (
          <section className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Lịch sử bán hàng</h2>
              <span className="text-sm">
                Tổng lãi:{" "}
                <span className={totalProfit >= 0 ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
                  {formatVND(totalProfit)}
                </span>
              </span>
            </div>
            {sales.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có giao dịch.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border text-muted-foreground">
                      <th className="py-2 pr-4">Ngày</th>
                      <th className="py-2 pr-4">Tên hàng</th>
                      <th className="py-2 pr-4">SL</th>
                      <th className="py-2 pr-4">Giá bán</th>
                      <th className="py-2">Lãi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4">{new Date(s.date).toLocaleString("vi-VN")}</td>
                        <td className="py-2 pr-4 font-medium">{s.name}</td>
                        <td className="py-2 pr-4">{s.quantity}</td>
                        <td className="py-2 pr-4">{formatVND(s.price)}</td>
                        <td className={`py-2 ${s.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {formatVND(s.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
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
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}
