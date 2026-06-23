import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Ganti dengan URL Apps Script kamu setelah deploy
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzbgzq1LZhEL4W_0uFP_d0jlZZf7XGks5yiPaZaw404M7JN4Eo8Xtbc2L0ahkJE-ZU/exec";
const USE_SHEETS = APPS_SCRIPT_URL.includes("script.google.com/macros/s/") && !APPS_SCRIPT_URL.includes("GANTI");

// ─── API LAYER ────────────────────────────────────────────────────────────────
const api = {
  async get(action, params = {}) {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    return res.json();
  },
  async post(action, data) {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action, data }),
    });
    return res.json();
  },
};

// ─── LOCAL STORAGE FALLBACK ───────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { id: "p1", name: "Nasi Goreng", category: "Makanan", price: 15000, stock: 50, unit: "porsi", barcode: "001" },
  { id: "p2", name: "Mie Goreng", category: "Makanan", price: 13000, stock: 40, unit: "porsi", barcode: "002" },
  { id: "p3", name: "Es Teh Manis", category: "Minuman", price: 5000, stock: 100, unit: "gelas", barcode: "003" },
  { id: "p4", name: "Kopi Hitam", category: "Minuman", price: 7000, stock: 80, unit: "gelas", barcode: "004" },
  { id: "p5", name: "Kerupuk", category: "Snack", price: 2000, stock: 200, unit: "bungkus", barcode: "005" },
];
const INITIAL_CUSTOMERS = [
  { id: "1", name: "Pelanggan Umum", phone: "", address: "" },
  { id: "2", name: "Bu Sari", phone: "081234567890", address: "Jl. Mawar No. 5" },
];
const CATEGORIES = ["Semua", "Makanan", "Minuman", "Snack", "Lainnya"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat("id-ID").format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
const today = () => new Date().toISOString().split("T")[0];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const useLS = (key, init) => {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [val, set];
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, color = "currentColor" }) => {
  const icons = {
    pos: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    product: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
    report: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    debt: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    minus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    print: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    x: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    search: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    warning: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    tag: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    cart: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
    cloud: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
    refresh: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
    history: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-3"/><polyline points="3 4 3 11 10 11"/></svg>,
    sheet: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>,
  };
  return icons[name] || null;
};

// ─── LOADING OVERLAY ──────────────────────────────────────────────────────────
const Spinner = ({ msg = "Memuat..." }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:40, color:"#888" }}>
    <div style={{ width:32, height:32, border:"3px solid #e8eaed", borderTopColor:"#1a73e8", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    <div style={{ fontSize:13 }}>{msg}</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Toast = ({ msg, type = "success" }) => (
  <div style={{ position:"fixed", bottom:24, right:24, background: type === "error" ? "#e53e3e" : type === "warning" ? "#f6900a" : "#0f9d58", color:"#fff", padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
    {type === "error" ? "❌" : type === "warning" ? "⚠️" : "✅"} {msg}
  </div>
);

// ─── RECEIPT MODAL ────────────────────────────────────────────────────────────
const ReceiptModal = ({ tx, onClose }) => {
  const printRef = useRef();
  const handlePrint = () => {
    const w = window.open("", "_blank", "width=320,height=600");
    w.document.write(`<html><head><title>Struk</title><style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:'Courier New',monospace;font-size:12px;}
      body{width:280px;padding:10px;}
      .c{text-align:center;} .b{font-weight:bold;} .d{border-top:1px dashed #000;margin:6px 0;}
      .r{display:flex;justify-content:space-between;margin:2px 0;}
    </style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close(); w.print(); w.close();
  };
  if (!tx) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:340, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ fontSize:16, fontWeight:700 }}>Struk Pembayaran</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon name="x" /></button>
        </div>
        <div ref={printRef} style={{ fontFamily:"'Courier New', monospace", fontSize:12 }}>
          <div style={{ textAlign:"center", fontWeight:700, fontSize:14 }}>🏪 KASIR WARUNG</div>
          <div style={{ textAlign:"center", fontSize:11, color:"#666" }}>Terima kasih sudah berbelanja</div>
          <div style={{ borderTop:"1px dashed #999", margin:"8px 0" }} />
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
            <span>No: {String(tx.id).slice(-8).toUpperCase()}</span>
            <span>{fmtDate(tx.date)} {fmtTime(tx.date)}</span>
          </div>
          <div style={{ fontSize:11 }}>Pelanggan: {tx.customerName}</div>
          <div style={{ borderTop:"1px dashed #999", margin:"8px 0" }} />
          {(tx.items || []).map((it, i) => (
            <div key={i}>
              <div style={{ fontWeight:600 }}>{it.name}</div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span>{it.qty} x {fmt(it.price)}</span>
                <span>{fmt(it.qty * it.price)}</span>
              </div>
            </div>
          ))}
          <div style={{ borderTop:"1px dashed #999", margin:"8px 0" }} />
          <div style={{ display:"flex", justifyContent:"space-between" }}><span>Subtotal</span><span>{fmt(tx.subtotal)}</span></div>
          {tx.discount > 0 && <div style={{ display:"flex", justifyContent:"space-between", color:"#e53" }}><span>Diskon ({tx.discountLabel})</span><span>-{fmt(tx.discount)}</span></div>}
          <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:14, marginTop:4 }}><span>TOTAL</span><span>{fmt(tx.total)}</span></div>
          <div style={{ borderTop:"1px dashed #999", margin:"8px 0" }} />
          <div style={{ display:"flex", justifyContent:"space-between" }}><span>Bayar ({tx.payMethod})</span><span>{fmt(tx.paid)}</span></div>
          <div style={{ display:"flex", justifyContent:"space-between" }}><span>Kembalian</span><span>{fmt(tx.change)}</span></div>
          {tx.isDebt && <div style={{ textAlign:"center", color:"#e53", fontWeight:700, marginTop:4 }}>⚠ KASBON: {fmt(tx.debtAmount)}</div>}
          <div style={{ borderTop:"1px dashed #999", margin:"8px 0" }} />
          <div style={{ textAlign:"center", fontSize:11 }}>=== Terima kasih! ===</div>
        </div>
        <button onClick={handlePrint} style={{ marginTop:16, width:"100%", padding:"10px 0", background:"#1a73e8", color:"#fff", border:"none", borderRadius:8, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Icon name="print" size={16} color="#fff" /> Cetak Struk
        </button>
      </div>
    </div>
  );
};

// ─── PRODUCT MODAL ────────────────────────────────────────────────────────────
const ProductModal = ({ product, onSave, onClose, saving }) => {
  const [form, setForm] = useState(product || { name:"", category:"Makanan", price:"", stock:"", unit:"pcs", barcode:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = () => {
    if (!form.name || !form.price) return alert("Nama dan harga wajib diisi");
    onSave({ ...form, price: Number(form.price), stock: Number(form.stock), id: form.id || uid() });
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:360, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontWeight:700 }}>{product ? "Edit Produk" : "Tambah Produk"}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon name="x" /></button>
        </div>
        {[
          { label:"Nama Produk *", key:"name", type:"text" },
          { label:"Harga (Rp) *", key:"price", type:"number" },
          { label:"Stok", key:"stock", type:"number" },
          { label:"Satuan", key:"unit", type:"text" },
          { label:"Barcode", key:"barcode", type:"text" },
        ].map(f => (
          <div key={f.key} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:4 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:4 }}>Kategori</label>
          <select value={form.category} onChange={e => set("category", e.target.value)}
            style={{ width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14 }}>
            {CATEGORIES.filter(c => c !== "Semua").map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", border:"1px solid #ddd", borderRadius:8, background:"#f5f5f5", cursor:"pointer", fontWeight:600 }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"10px 0", border:"none", borderRadius:8, background: saving ? "#aaa" : "#1a73e8", color:"#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight:700 }}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── DEBT MODAL ───────────────────────────────────────────────────────────────
const DebtModal = ({ customers, onSave, onClose, saving }) => {
  const [form, setForm] = useState({ customerId:"", customerName:"", amount:"", note:"", date: today() });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleCust = (id) => {
    const c = customers.find(c => String(c.id) === String(id));
    set("customerId", id); if (c) set("customerName", c.name);
  };
  const handleSave = () => {
    if (!form.customerName || !form.amount) return alert("Pelanggan dan jumlah wajib diisi");
    onSave({ ...form, id: uid(), amount: Number(form.amount), paid: false });
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:900, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:12, padding:24, width:360 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ fontWeight:700 }}>Tambah Piutang</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon name="x" /></button>
        </div>
        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:4 }}>Pelanggan</label>
          <select value={form.customerId} onChange={e => handleCust(e.target.value)}
            style={{ width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14 }}>
            <option value="">-- Pilih Pelanggan --</option>
            {customers.filter(c => c.id !== "1").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__new">+ Pelanggan baru...</option>
          </select>
        </div>
        {(form.customerId === "__new" || !customers.find(c => String(c.id) === form.customerId)) && form.customerId && form.customerId !== "" && (
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:4 }}>Nama Pelanggan</label>
            <input value={form.customerName} onChange={e => set("customerName", e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, boxSizing:"border-box" }} />
          </div>
        )}
        {[{ label:"Jumlah (Rp)", key:"amount", type:"number" }, { label:"Tanggal", key:"date", type:"date" }, { label:"Keterangan", key:"note", type:"text" }].map(f => (
          <div key={f.key} style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#555", display:"block", marginBottom:4 }}>{f.label}</label>
            <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, boxSizing:"border-box" }} />
          </div>
        ))}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px 0", border:"1px solid #ddd", borderRadius:8, background:"#f5f5f5", cursor:"pointer", fontWeight:600 }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"10px 0", border:"none", borderRadius:8, background: saving ? "#aaa" : "#e53e3e", color:"#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight:700 }}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── POS PAGE ─────────────────────────────────────────────────────────────────
const POSPage = ({ products, customers, setProducts, setTransactions, setDebts, showToast, syncing }) => {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [selCustomer, setSelCustomer] = useState("1");
  const [payMethod, setPayMethod] = useState("Tunai");
  const [cashPaid, setCashPaid] = useState("");
  const [discType, setDiscType] = useState("none");
  const [discVal, setDiscVal] = useState("");
  const [lastTx, setLastTx] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [isDebtTx, setIsDebtTx] = useState(false);
  const [checking, setChecking] = useState(false);

  const filtered = products.filter(p => {
    const matchCat = catFilter === "Semua" || p.category === catFilter;
    const matchQ = p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || "").includes(search);
    return matchCat && matchQ;
  });

  const addToCart = (prod) => {
    if (prod.stock <= 0) return showToast("Stok habis!", "error");
    setCart(c => {
      const ex = c.find(i => i.id === prod.id);
      if (ex) {
        if (ex.qty >= prod.stock) { showToast("Stok tidak cukup!", "warning"); return c; }
        return c.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...c, { ...prod, qty: 1 }];
    });
  };

  const updateQty = (id, qty) => {
    const prod = products.find(p => p.id === id);
    if (qty > prod.stock) return showToast("Stok tidak cukup!", "warning");
    if (qty < 1) return removeItem(id);
    setCart(c => c.map(i => i.id === id ? { ...i, qty } : i));
  };

  const removeItem = (id) => setCart(c => c.filter(i => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = discType === "pct" ? Math.round(subtotal * (Number(discVal) || 0) / 100) : discType === "flat" ? (Number(discVal) || 0) : 0;
  const discLabel = discType === "pct" ? `${discVal}%` : discType === "flat" ? `Rp ${fmtNum(Number(discVal) || 0)}` : "";
  const total = Math.max(0, subtotal - discountAmt);
  const paidNum = Number(cashPaid) || 0;
  const change = Math.max(0, paidNum - total);
  const debtAmount = isDebtTx ? Math.max(0, total - paidNum) : 0;
  const canCheckout = cart.length > 0 && !checking && (payMethod !== "Tunai" || isDebtTx || paidNum >= total);

  const CATCOLORS = { Makanan:"#ff6b35", Minuman:"#1a73e8", Snack:"#0f9d58", Lainnya:"#9c27b0" };

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setChecking(true);
    const customer = customers.find(c => String(c.id) === String(selCustomer));
    const tx = {
      id: uid(), date: new Date().toISOString(),
      customerName: customer?.name || "Umum",
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      subtotal, discount: discountAmt, discountLabel: discLabel,
      total, payMethod,
      paid: payMethod === "Tunai" || isDebtTx ? paidNum : total,
      change: payMethod === "Tunai" && !isDebtTx ? change : 0,
      isDebt: isDebtTx && debtAmount > 0, debtAmount,
    };
    const newStocks = products.map(p => {
      const ci = cart.find(c => c.id === p.id);
      return ci ? { ...p, stock: p.stock - ci.qty } : p;
    });

    if (USE_SHEETS) {
      try {
        await api.post("saveTransaction", tx);
        await api.post("updateStock", cart.map(c => ({ id: c.id, newStock: newStocks.find(p => p.id === c.id)?.stock })));
        if (isDebtTx && debtAmount > 0) {
          await api.post("saveDebt", { id: uid(), customerId: selCustomer, customerName: customer?.name || "Umum", amount: debtAmount, date: today(), note: `Kasbon #${tx.id.slice(-6)}`, paid: false });
          setDebts(prev => [...prev, { id: uid(), customerId: selCustomer, customerName: customer?.name, amount: debtAmount, date: today(), note: `Kasbon #${tx.id.slice(-6)}`, paid: false }]);
        }
        showToast("Transaksi tersimpan ke Google Sheets ✓");
      } catch (e) {
        showToast("Gagal sync ke Sheets, tersimpan lokal", "warning");
      }
    } else {
      if (isDebtTx && debtAmount > 0) {
        setDebts(prev => [...prev, { id: uid(), customerId: selCustomer, customerName: customer?.name, amount: debtAmount, date: today(), note: `Kasbon #${tx.id.slice(-6)}`, paid: false }]);
      }
    }

    setTransactions(prev => [tx, ...prev]);
    setProducts(newStocks);
    setLastTx(tx); setShowReceipt(true);
    setCart([]); setCashPaid(""); setDiscVal(""); setDiscType("none"); setIsDebtTx(false);
    setChecking(false);
  };

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden" }}>
      {/* LEFT */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:"1px solid #e8eaed" }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #e8eaed", background:"#fff" }}>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", opacity:0.4 }}><Icon name="search" size={16} /></span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk / barcode..."
              style={{ width:"100%", padding:"8px 12px 8px 34px", border:"1px solid #ddd", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }} />
          </div>
        </div>
        <div style={{ display:"flex", gap:6, padding:"8px 14px", overflowX:"auto", borderBottom:"1px solid #e8eaed", background:"#fff" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              style={{ padding:"4px 12px", borderRadius:20, border:"none", cursor:"pointer", whiteSpace:"nowrap", fontSize:12, fontWeight:600,
                background: catFilter === c ? "#1a73e8" : "#f0f2f5", color: catFilter === c ? "#fff" : "#555" }}>{c}</button>
          ))}
        </div>
        {syncing ? <Spinner msg="Memuat produk dari Google Sheets..." /> : (
          <div style={{ flex:1, overflowY:"auto", padding:10, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:8, alignContent:"start" }}>
            {filtered.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock <= 0}
                style={{ background:"#fff", border:"1px solid #e8eaed", borderRadius:10, padding:10, cursor: p.stock > 0 ? "pointer" : "not-allowed", textAlign:"left", opacity: p.stock <= 0 ? 0.5 : 1, boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ width:30, height:30, borderRadius:8, background: CATCOLORS[p.category] || "#999", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:6 }}>
                  <Icon name="product" size={15} color="#fff" />
                </div>
                <div style={{ fontSize:13, fontWeight:600, color:"#222", lineHeight:1.3, marginBottom:3 }}>{p.name}</div>
                <div style={{ fontSize:12, color:"#1a73e8", fontWeight:700 }}>{fmt(p.price)}</div>
                <div style={{ fontSize:11, color: p.stock <= 5 ? "#e53" : "#888", marginTop:2 }}>Stok: {p.stock}</div>
              </button>
            ))}
            {filtered.length === 0 && <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, color:"#bbb" }}>Tidak ada produk</div>}
          </div>
        )}
      </div>

      {/* RIGHT: CART */}
      <div style={{ width:310, display:"flex", flexDirection:"column", background:"#fafafa", overflow:"hidden" }}>
        <div style={{ padding:"10px 14px", borderBottom:"1px solid #e8eaed", background:"#fff" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, fontWeight:700, fontSize:14 }}>
              <Icon name="cart" size={17} /> Keranjang
              {cart.length > 0 && <span style={{ background:"#1a73e8", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11 }}>{cart.reduce((s,i)=>s+i.qty,0)}</span>}
            </div>
            {cart.length > 0 && <button onClick={() => setCart([])} style={{ background:"none", border:"none", cursor:"pointer", color:"#e53", fontSize:12 }}>Hapus Semua</button>}
          </div>
          <select value={selCustomer} onChange={e => setSelCustomer(e.target.value)}
            style={{ width:"100%", padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }}>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
          {cart.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#bbb" }}><Icon name="cart" size={36} color="#ddd" /><div style={{ marginTop:8, fontSize:13 }}>Keranjang kosong</div></div>}
          {cart.map(item => (
            <div key={item.id} style={{ background:"#fff", borderRadius:8, padding:"8px 10px", marginBottom:6, boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:5 }}>{item.name}</div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ width:22, height:22, borderRadius:5, border:"1px solid #ddd", background:"#f5f5f5", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="minus" size={11} /></button>
                  <span style={{ fontSize:14, fontWeight:700, minWidth:22, textAlign:"center" }}>{item.qty}</span>
                  <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ width:22, height:22, borderRadius:5, border:"1px solid #ddd", background:"#f5f5f5", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="plus" size={11} /></button>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a73e8" }}>{fmt(item.price * item.qty)}</div>
                  <div style={{ fontSize:11, color:"#999" }}>{fmt(item.price)}/item</div>
                </div>
                <button onClick={() => removeItem(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#ddd", padding:2 }}><Icon name="trash" size={13} /></button>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding:10, borderTop:"1px solid #e8eaed", background:"#fff" }}>
            {/* Diskon */}
            <div style={{ marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#777", marginBottom:5, display:"flex", alignItems:"center", gap:4 }}><Icon name="tag" size={12} />Diskon</div>
              <div style={{ display:"flex", gap:5, marginBottom:5 }}>
                {["none","pct","flat"].map(t => (
                  <button key={t} onClick={() => { setDiscType(t); setDiscVal(""); }}
                    style={{ flex:1, padding:"3px 0", fontSize:11, border:"none", borderRadius:5, cursor:"pointer", background: discType === t ? "#1a73e8" : "#f0f2f5", color: discType === t ? "#fff" : "#666", fontWeight:600 }}>
                    {t === "none" ? "Tidak Ada" : t === "pct" ? "%" : "Rp"}
                  </button>
                ))}
              </div>
              {discType !== "none" && (
                <input type="number" value={discVal} onChange={e => setDiscVal(e.target.value)} placeholder={discType === "pct" ? "Persen diskon" : "Nominal diskon"}
                  style={{ width:"100%", padding:"5px 8px", border:"1px solid #ddd", borderRadius:6, fontSize:13, boxSizing:"border-box" }} />
              )}
            </div>
            {/* Summary */}
            <div style={{ fontSize:13, marginBottom:8, padding:"6px 8px", background:"#f8f9fa", borderRadius:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", color:"#666", marginBottom:2 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              {discountAmt > 0 && <div style={{ display:"flex", justifyContent:"space-between", color:"#e53" }}><span>Diskon ({discLabel})</span><span>-{fmt(discountAmt)}</span></div>}
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:15, borderTop:"1px solid #e8eaed", marginTop:4, paddingTop:4 }}><span>Total</span><span style={{ color:"#1a73e8" }}>{fmt(total)}</span></div>
            </div>
            {/* Payment Method */}
            <div style={{ display:"flex", gap:5, marginBottom:7 }}>
              {["Tunai","QRIS","Transfer"].map(m => (
                <button key={m} onClick={() => setPayMethod(m)}
                  style={{ flex:1, padding:"5px 0", fontSize:11, border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, background: payMethod === m ? "#0f9d58" : "#f0f2f5", color: payMethod === m ? "#fff" : "#555" }}>{m}</button>
              ))}
            </div>
            {(payMethod === "Tunai" || isDebtTx) && (
              <div style={{ marginBottom:6 }}>
                <input type="number" value={cashPaid} onChange={e => setCashPaid(e.target.value)} placeholder="Jumlah bayar (Rp)"
                  style={{ width:"100%", padding:"7px 10px", border:"1px solid #ddd", borderRadius:7, fontSize:13, boxSizing:"border-box" }} />
                {cashPaid && <div style={{ fontSize:12, color:"#0f9d58", marginTop:3 }}>Kembalian: {fmt(Math.max(0, change))}</div>}
              </div>
            )}
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, marginBottom:8, cursor:"pointer" }}>
              <input type="checkbox" checked={isDebtTx} onChange={e => setIsDebtTx(e.target.checked)} />
              <span style={{ color:"#e53", fontWeight:600 }}>Tandai sebagai kasbon / hutang</span>
            </label>
            <button onClick={handleCheckout} disabled={!canCheckout}
              style={{ width:"100%", padding:"11px 0", background: canCheckout ? "#1a73e8" : "#ccc", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:14, cursor: canCheckout ? "pointer" : "not-allowed" }}>
              {checking ? "Memproses..." : `Bayar ${fmt(total)}`}
            </button>
          </div>
        )}
      </div>
      {showReceipt && <ReceiptModal tx={lastTx} onClose={() => setShowReceipt(false)} />}
    </div>
  );
};

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────
const ProductsPage = ({ products, setProducts, showToast, syncing }) => {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = products.filter(p => (catFilter === "Semua" || p.category === catFilter) && p.name.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async (prod) => {
    setSaving(true);
    if (USE_SHEETS) {
      try { await api.post("saveProduct", prod); showToast("Produk tersimpan ke Sheets ✓"); }
      catch { showToast("Gagal sync ke Sheets", "warning"); }
    }
    setProducts(prev => {
      const exists = prev.find(p => p.id === prod.id);
      return exists ? prev.map(p => p.id === prod.id ? prod : p) : [...prev, prod];
    });
    setSaving(false); setModal(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus produk ini?")) return;
    if (USE_SHEETS) {
      try { await api.post("deleteProduct", { id }); } catch { showToast("Gagal hapus dari Sheets", "warning"); }
    }
    setProducts(prev => prev.filter(p => p.id !== id));
    showToast("Produk dihapus");
  };

  const totalValue = products.reduce((s, p) => s + p.price * p.stock, 0);
  const lowStock = products.filter(p => p.stock <= 5).length;

  return (
    <div style={{ padding:20, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12, marginBottom:20 }}>
        {[
          { label:"Total Produk", value: fmtNum(products.length), color:"#1a73e8" },
          { label:"Nilai Stok", value: fmt(totalValue), color:"#0f9d58" },
          { label:"Stok Menipis (≤5)", value: fmtNum(lowStock), color:"#e53e3e" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:11, color:"#888" }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:s.color, marginTop:3 }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:160 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", opacity:0.4 }}><Icon name="search" size={15} /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..."
            style={{ width:"100%", padding:"7px 12px 7px 32px", border:"1px solid #ddd", borderRadius:8, fontSize:13, boxSizing:"border-box" }} />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding:"7px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setModal("add")} style={{ padding:"7px 14px", background:"#1a73e8", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13, display:"flex", alignItems:"center", gap:5 }}>
          <Icon name="plus" size={15} color="#fff" /> Tambah
        </button>
      </div>
      {syncing ? <Spinner msg="Memuat dari Sheets..." /> : (
        <div style={{ background:"#fff", borderRadius:10, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#f8f9fa" }}>
                {["Produk","Kategori","Harga","Stok","Nilai Stok","Aksi"].map(h => (
                  <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:600, color:"#555", fontSize:12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} style={{ borderTop:"1px solid #f0f0f0", background: i%2===0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding:"9px 12px" }}>
                    <div style={{ fontWeight:600 }}>{p.name}</div>
                    {p.barcode && <div style={{ fontSize:11, color:"#bbb" }}>#{p.barcode}</div>}
                  </td>
                  <td style={{ padding:"9px 12px" }}><span style={{ background:"#e8f0fe", color:"#1a73e8", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600 }}>{p.category}</span></td>
                  <td style={{ padding:"9px 12px", fontWeight:600 }}>{fmt(p.price)}</td>
                  <td style={{ padding:"9px 12px" }}>
                    <span style={{ color: p.stock <= 5 ? "#e53e3e" : p.stock <= 10 ? "#f6900a" : "#0f9d58", fontWeight:700 }}>{p.stock} {p.unit}</span>
                    {p.stock <= 5 && <span style={{ marginLeft:4 }}><Icon name="warning" size={12} color="#e53e3e" /></span>}
                  </td>
                  <td style={{ padding:"9px 12px", color:"#666" }}>{fmt(p.price * p.stock)}</td>
                  <td style={{ padding:"9px 12px" }}>
                    <div style={{ display:"flex", gap:5 }}>
                      <button onClick={() => setModal(p)} style={{ padding:"3px 9px", border:"1px solid #1a73e8", borderRadius:5, background:"#fff", color:"#1a73e8", cursor:"pointer", fontSize:12, fontWeight:600 }}>Edit</button>
                      <button onClick={() => handleDelete(p.id)} style={{ padding:"3px 9px", border:"1px solid #e53e3e", borderRadius:5, background:"#fff", color:"#e53e3e", cursor:"pointer", fontSize:12, fontWeight:600 }}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>Tidak ada produk</div>}
        </div>
      )}
      {modal && <ProductModal product={modal === "add" ? null : modal} onSave={handleSave} onClose={() => setModal(null)} saving={saving} />}
    </div>
  );
};

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
const ReportsPage = ({ transactions, syncing }) => {
  const [period, setPeriod] = useState("today");
  const [viewTx, setViewTx] = useState(null);
  const now = new Date();

  const filterTx = transactions.filter(tx => {
    const d = new Date(tx.date);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "week") { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
    if (period === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalRevenue = filterTx.reduce((s, tx) => s + tx.total, 0);
  const totalDiscount = filterTx.reduce((s, tx) => s + (tx.discount||0), 0);
  const totalItems = filterTx.reduce((s, tx) => s + tx.items.reduce((a,i)=>a+i.qty,0), 0);
  const avgTx = filterTx.length ? totalRevenue / filterTx.length : 0;

  const productSales = {};
  filterTx.forEach(tx => tx.items.forEach(it => { productSales[it.name] = (productSales[it.name]||0) + it.qty; }));
  const topProducts = Object.entries(productSales).sort((a,b)=>b[1]-a[1]).slice(0, 5);

  const byMethod = {};
  filterTx.forEach(tx => { byMethod[tx.payMethod] = (byMethod[tx.payMethod]||0) + tx.total; });

  return (
    <div style={{ padding:20, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        {[["today","Hari Ini"],["week","7 Hari"],["month","Bulan Ini"],["all","Semua"]].map(([v,l]) => (
          <button key={v} onClick={() => setPeriod(v)} style={{ padding:"6px 14px", border:"none", borderRadius:20, cursor:"pointer", fontWeight:600, fontSize:12, background: period===v ? "#1a73e8" : "#f0f2f5", color: period===v ? "#fff" : "#555" }}>{l}</button>
        ))}
      </div>
      {syncing ? <Spinner msg="Memuat laporan..." /> : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:12, marginBottom:18 }}>
            {[
              { label:"Total Pendapatan", value: fmt(totalRevenue), sub:`${filterTx.length} transaksi`, color:"#1a73e8" },
              { label:"Item Terjual", value: fmtNum(totalItems), sub:`Rata-rata ${Math.round(totalItems/Math.max(filterTx.length,1))}/transaksi`, color:"#0f9d58" },
              { label:"Rata-rata Transaksi", value: fmt(avgTx), sub:"Per transaksi", color:"#f6900a" },
              { label:"Total Diskon", value: fmt(totalDiscount), sub:"Diberikan ke pelanggan", color:"#e53e3e" },
            ].map(s => (
              <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize:11, color:"#888" }}>{s.label}</div>
                <div style={{ fontSize:18, fontWeight:700, color:s.color, margin:"4px 0" }}>{s.value}</div>
                <div style={{ fontSize:11, color:"#bbb" }}>{s.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
            <div style={{ background:"#fff", borderRadius:10, padding:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <h4 style={{ margin:"0 0 12px", fontSize:13, fontWeight:700 }}>🏆 Produk Terlaris</h4>
              {topProducts.length === 0 ? <div style={{ color:"#bbb", fontSize:13 }}>Belum ada data</div> :
                topProducts.map(([name,qty],i) => (
                  <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <span style={{ width:18, height:18, borderRadius:"50%", background:["#ffd700","#c0c0c0","#cd7f32","#e8f0fe","#f0f0f0"][i], display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{i+1}</span>
                      <span style={{ fontSize:13 }}>{name}</span>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color:"#0f9d58" }}>{qty}x</span>
                  </div>
                ))}
            </div>
            <div style={{ background:"#fff", borderRadius:10, padding:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
              <h4 style={{ margin:"0 0 12px", fontSize:13, fontWeight:700 }}>💳 Metode Pembayaran</h4>
              {Object.entries(byMethod).length === 0 ? <div style={{ color:"#bbb", fontSize:13 }}>Belum ada data</div> :
                Object.entries(byMethod).map(([method,amount]) => {
                  const pct = totalRevenue > 0 ? Math.round(amount/totalRevenue*100) : 0;
                  const colors = { Tunai:"#0f9d58", QRIS:"#1a73e8", Transfer:"#9c27b0" };
                  return (
                    <div key={method} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:12, fontWeight:600 }}>{method}</span>
                        <span style={{ fontSize:12, color:"#666" }}>{pct}%</span>
                      </div>
                      <div style={{ height:5, background:"#f0f0f0", borderRadius:3 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background: colors[method]||"#999", borderRadius:3 }} />
                      </div>
                      <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{fmt(amount)}</div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div style={{ background:"#fff", borderRadius:10, padding:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <h4 style={{ margin:"0 0 12px", fontSize:13, fontWeight:700 }}>📋 Riwayat Transaksi ({filterTx.length})</h4>
            {filterTx.length === 0 && <div style={{ textAlign:"center", padding:24, color:"#bbb" }}>Belum ada transaksi pada periode ini</div>}
            <div style={{ maxHeight:280, overflowY:"auto" }}>
              {filterTx.map(tx => (
                <div key={tx.id} onClick={() => setViewTx(tx)}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 10px", borderBottom:"1px solid #f5f5f5", cursor:"pointer", borderRadius:6 }}
                  onMouseEnter={e => e.currentTarget.style.background="#f8f9fa"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>{tx.customerName}</div>
                    <div style={{ fontSize:11, color:"#999" }}>{fmtDate(tx.date)} {fmtTime(tx.date)} · {tx.payMethod}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:700, color:"#1a73e8", fontSize:13 }}>{fmt(tx.total)}</div>
                    {tx.isDebt && <span style={{ fontSize:11, color:"#e53e3e" }}>Kasbon</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {viewTx && <ReceiptModal tx={viewTx} onClose={() => setViewTx(null)} />}
    </div>
  );
};

// ─── DEBT PAGE ────────────────────────────────────────────────────────────────
const DebtPage = ({ debts, setDebts, customers, showToast, syncing }) => {
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState("unpaid");
  const [saving, setSaving] = useState(false);

  const filtered = debts.filter(d => filter === "all" || (filter === "unpaid" ? !d.paid : d.paid));
  const totalDebt = debts.filter(d => !d.paid).reduce((s,d) => s+d.amount, 0);
  const totalPaid = debts.filter(d => d.paid).reduce((s,d) => s+d.amount, 0);

  const handlePay = async (id) => {
    if (!confirm("Tandai hutang ini sebagai LUNAS?")) return;
    if (USE_SHEETS) {
      try { await api.post("payDebt", { id }); showToast("Piutang dilunasi ✓"); }
      catch { showToast("Gagal sync ke Sheets", "warning"); }
    }
    setDebts(prev => prev.map(d => d.id === id ? { ...d, paid:true, paidDate:today() } : d));
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus catatan piutang ini?")) return;
    if (USE_SHEETS) {
      try { await api.post("deleteDebt", { id }); } catch { showToast("Gagal hapus dari Sheets", "warning"); }
    }
    setDebts(prev => prev.filter(d => d.id !== id));
    showToast("Piutang dihapus");
  };

  const handleAdd = async (debt) => {
    setSaving(true);
    if (USE_SHEETS) {
      try { await api.post("saveDebt", debt); showToast("Piutang tersimpan ✓"); }
      catch { showToast("Gagal sync ke Sheets", "warning"); }
    }
    setDebts(prev => [...prev, debt]);
    setSaving(false); setModal(false);
  };

  const byCustomer = {};
  debts.filter(d => !d.paid).forEach(d => { byCustomer[d.customerName] = (byCustomer[d.customerName]||0) + d.amount; });

  return (
    <div style={{ padding:20, overflowY:"auto", height:"100%" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:18 }}>
        {[
          { label:"Total Piutang Aktif", value:fmt(totalDebt), color:"#e53e3e" },
          { label:"Total Lunas", value:fmt(totalPaid), color:"#0f9d58" },
          { label:"Pelanggan Berhutang", value:`${Object.keys(byCustomer).length} orang`, color:"#f6900a" },
        ].map(s => (
          <div key={s.label} style={{ background:"#fff", borderRadius:10, padding:14, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize:11, color:"#888" }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:700, color:s.color, marginTop:3 }}>{s.value}</div>
          </div>
        ))}
      </div>
      {Object.keys(byCustomer).length > 0 && (
        <div style={{ background:"#fff8f8", border:"1px solid #ffe0e0", borderRadius:10, padding:14, marginBottom:14 }}>
          <h4 style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:"#e53e3e" }}>⚠ Pelanggan dengan Piutang Aktif</h4>
          {Object.entries(byCustomer).sort((a,b)=>b[1]-a[1]).map(([name,amt]) => (
            <div key={name} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
              <span>{name}</span><span style={{ fontWeight:700, color:"#e53e3e" }}>{fmt(amt)}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:8, marginBottom:14, justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:6 }}>
          {[["unpaid","Belum Lunas"],["paid","Lunas"],["all","Semua"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{ padding:"5px 12px", border:"none", borderRadius:20, cursor:"pointer", fontWeight:600, fontSize:12, background: filter===v ? "#e53e3e" : "#f0f2f5", color: filter===v ? "#fff" : "#555" }}>{l}</button>
          ))}
        </div>
        <button onClick={() => setModal(true)} style={{ padding:"5px 12px", background:"#e53e3e", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:12, display:"flex", alignItems:"center", gap:5 }}>
          <Icon name="plus" size={13} color="#fff" /> Tambah
        </button>
      </div>
      {syncing ? <Spinner msg="Memuat piutang..." /> : (
        <div style={{ background:"#fff", borderRadius:10, boxShadow:"0 1px 4px rgba(0,0,0,0.06)", overflow:"hidden" }}>
          {filtered.length === 0 && <div style={{ textAlign:"center", padding:36, color:"#bbb" }}>Tidak ada data piutang</div>}
          {filtered.map(d => (
            <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", borderBottom:"1px solid #f5f5f5" }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, display:"flex", alignItems:"center", gap:6 }}><Icon name="user" size={13} />{d.customerName}</div>
                <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{fmtDate(d.date)} · {d.note}</div>
                {d.paid && <div style={{ fontSize:11, color:"#0f9d58", marginTop:2 }}>✓ Lunas {fmtDate(d.paidDate)}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:15, fontWeight:700, color: d.paid ? "#0f9d58" : "#e53e3e" }}>{fmt(d.amount)}</div>
                {!d.paid && (
                  <div style={{ display:"flex", gap:5, marginTop:5 }}>
                    <button onClick={() => handlePay(d.id)} style={{ padding:"3px 9px", background:"#0f9d58", color:"#fff", border:"none", borderRadius:5, cursor:"pointer", fontSize:12, fontWeight:600 }}>Lunas</button>
                    <button onClick={() => handleDelete(d.id)} style={{ padding:"3px 9px", background:"none", border:"1px solid #e53e3e", color:"#e53e3e", borderRadius:5, cursor:"pointer", fontSize:12 }}>Hapus</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <DebtModal customers={customers} onSave={handleAdd} onClose={() => setModal(false)} saving={saving} />}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [products, setProductsLS] = useLS("kw_products", INITIAL_PRODUCTS);
  const [transactions, setTransactionsLS] = useLS("kw_transactions", []);
  const [customers, setCustomersLS] = useLS("kw_customers", INITIAL_CUSTOMERS);
  const [debts, setDebtsLS] = useLS("kw_debts", []);
  const [page, setPage] = useState("pos");
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync dari Google Sheets saat load
  const syncFromSheets = useCallback(async () => {
    if (!USE_SHEETS) return;
    setSyncing(true);
    try {
      const [prods, txs, dbs, custs] = await Promise.all([
        api.get("getProducts"),
        api.get("getTransactions"),
        api.get("getDebts"),
        api.get("getCustomers"),
      ]);
      if (!prods.error) setProductsLS(prods);
      if (!txs.error) setTransactionsLS(txs);
      if (!dbs.error) setDebtsLS(dbs);
      if (!custs.error) setCustomersLS(custs);
      setLastSync(new Date());
      showToast("Sinkronisasi berhasil ✓");
    } catch (e) {
      showToast("Gagal sync, menggunakan data lokal", "warning");
    }
    setSyncing(false);
  }, []);

  useEffect(() => { syncFromSheets(); }, []);

  const todayTx = transactions.filter(tx => new Date(tx.date).toDateString() === new Date().toDateString());
  const todayRevenue = todayTx.reduce((s, tx) => s + tx.total, 0);
  const activeDebts = debts.filter(d => !d.paid).length;
  const lowStock = products.filter(p => p.stock <= 5).length;

  const NAV = [
    { id:"pos", label:"Kasir", icon:"pos" },
    { id:"products", label:"Produk", icon:"product" },
    { id:"reports", label:"Laporan", icon:"report" },
    { id:"debts", label:"Piutang", icon:"debt" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background:"#f0f2f5", overflow:"hidden" }}>
      {/* SIDEBAR */}
      <div style={{ width:196, background:"#1e2330", display:"flex", flexDirection:"column", color:"#fff" }}>
        <div style={{ padding:"18px 14px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight:800, fontSize:17, color:"#fff" }}>🏪 KasirWarung</div>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>Sistem Kasir UMKM</div>
        </div>
        {/* Sync Status */}
        <div style={{ padding:"8px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background: USE_SHEETS ? "#4caf86" : "#f6900a" }} />
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>{USE_SHEETS ? "Google Sheets ✓" : "Mode Lokal"}</span>
          </div>
          {USE_SHEETS && (
            <button onClick={syncFromSheets} disabled={syncing}
              style={{ display:"flex", alignItems:"center", gap:5, background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, padding:"3px 8px", color:"rgba(255,255,255,0.55)", cursor:"pointer", fontSize:11 }}>
              <Icon name="refresh" size={11} color="rgba(255,255,255,0.55)" /> {syncing ? "Syncing..." : "Refresh"}
            </button>
          )}
          {lastSync && <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:4 }}>Terakhir: {fmtTime(lastSync)}</div>}
        </div>
        {/* Quick Stats */}
        <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, marginBottom:4 }}>Hari Ini</div>
          <div style={{ color:"#4caf86", fontWeight:700, fontSize:15 }}>{fmt(todayRevenue)}</div>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:10, marginTop:2 }}>{todayTx.length} transaksi</div>
        </div>
        {/* Nav */}
        <nav style={{ flex:1, padding:"10px 8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)}
              style={{ width:"100%", padding:"9px 10px", display:"flex", alignItems:"center", gap:9, borderRadius:8, border:"none", cursor:"pointer", marginBottom:3, textAlign:"left", fontWeight:600, fontSize:13,
                background: page===n.id ? "rgba(255,255,255,0.12)" : "transparent",
                color: page===n.id ? "#fff" : "rgba(255,255,255,0.5)" }}>
              <Icon name={n.icon} size={17} color={page===n.id ? "#fff" : "rgba(255,255,255,0.5)"} />
              {n.label}
              {n.id==="debts" && activeDebts>0 && <span style={{ marginLeft:"auto", background:"#e53e3e", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10 }}>{activeDebts}</span>}
              {n.id==="products" && lowStock>0 && <span style={{ marginLeft:"auto", background:"#f6900a", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10 }}>{lowStock}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:"10px 14px", borderTop:"1px solid rgba(255,255,255,0.08)", fontSize:10, color:"rgba(255,255,255,0.2)" }}>
          v2.0 · {USE_SHEETS ? "Google Sheets" : "LocalStorage"}
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"#fff", padding:"10px 18px", borderBottom:"1px solid #e8eaed", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h1 style={{ margin:0, fontSize:15, fontWeight:700, color:"#333" }}>{NAV.find(n=>n.id===page)?.label}</h1>
          <div style={{ fontSize:12, color:"#999" }}>{new Date().toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</div>
        </div>
        <div style={{ flex:1, overflow:"hidden" }}>
          {page==="pos" && <POSPage products={products} customers={customers} setProducts={setProductsLS} setTransactions={setTransactionsLS} setDebts={setDebtsLS} showToast={showToast} syncing={syncing} />}
          {page==="products" && <ProductsPage products={products} setProducts={setProductsLS} showToast={showToast} syncing={syncing} />}
          {page==="reports" && <ReportsPage transactions={transactions} syncing={syncing} />}
          {page==="debts" && <DebtPage debts={debts} setDebts={setDebtsLS} customers={customers} showToast={showToast} syncing={syncing} />}
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}
