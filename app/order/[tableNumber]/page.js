"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const CATEGORY_ORDER = [
  "ชาใสคลาสสิก",
  "ชานมยอดฮิต",
  "ชาผลไม้รีเฟรชชิ่ง",
  "ท็อปปิ้งและของว่าง",
];

function groupByCategory(items) {
  const map = new Map();
  items.forEach((item) => {
    const c = item.category || "อื่น ๆ";
    if (!map.has(c)) map.set(c, []);
    map.get(c).push(item);
  });
  return [...map.entries()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a[0]);
    const ib = CATEGORY_ORDER.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

// หมายเหตุ: โปรเจกต์นี้ใช้ Next.js 14.2.5 ซึ่ง params ของ Dynamic Route
// ยังเป็น object ธรรมดา ไม่ใช่ Promise (ต่างจาก Next.js 15+ ที่ต้อง unwrap ด้วย use())
export default function TableOrderPage({ params }) {
  const tableNumber = parseInt(params.tableNumber);

  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]); // [{menu_item_id, name, price, quantity}]

  const [submitting, setSubmitting] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutTotal, setCheckoutTotal] = useState(0);
  const [closed, setClosed] = useState(false);

  // เช็คว่าโต๊ะนี้มี session เปิดอยู่ไหม
  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase
        .from("table_sessions")
        .select("id, table_number, status")
        .eq("table_number", tableNumber)
        .eq("status", "open")
        .maybeSingle();

      if (!error && data) {
        setSession(data);
        fetchMenu();
      }
      setCheckingSession(false);
    }
    checkSession();
  }, [tableNumber]);

  async function fetchMenu() {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, name_en, description, price, tag, image_url, category")
      .eq("is_available", true)
      .order("sort_order", { ascending: true });

    if (!error) setMenuItems(data);
  }

  function qtyInCart(menuItemId) {
    return cart.find((c) => c.menu_item_id === menuItemId)?.quantity || 0;
  }

  // เพิ่มเมนูลงตะกร้า (ถ้ามีแล้วให้บวกจำนวนเพิ่ม สูงสุด 5 ต่อรายการ)
  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id
            ? { ...c, quantity: Math.min(c.quantity + 1, 5) }
            : c
        );
      }
      return [
        ...prev,
        { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1 },
      ];
    });
  }

  function updateQuantity(menuItemId, qty) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((c) => c.menu_item_id !== menuItemId));
    } else {
      setCart((prev) =>
        prev.map((c) =>
          c.menu_item_id === menuItemId ? { ...c, quantity: Math.min(qty, 5) } : c
        )
      );
    }
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // ส่งออเดอร์เข้าครัว
  async function handleSendOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setErrorMsg("");

    const { error } = await supabase.from("dinein_orders").insert({
      session_id: session.id,
      table_number: tableNumber,
      items: cart,
      total_price: cartTotal,
      status: "received",
    });

    if (error) {
      setErrorMsg("ส่งออเดอร์ไม่สำเร็จ กรุณาลองอีกครั้ง หรือเรียกพนักงาน");
      console.error(error.message);
      setSubmitting(false);
      return;
    }

    setCart([]);
    setSentMsg("ส่งออเดอร์แล้ว รอสักครู่นะครับ");
    setSubmitting(false);
    setTimeout(() => setSentMsg(""), 3000);
  }

  // กดปุ่ม "เรียกเก็บเงิน" -> คำนวณยอดรวมทั้งหมดของโต๊ะนี้
  async function handleOpenCheckout() {
    const { data, error } = await supabase
      .from("dinein_orders")
      .select("total_price")
      .eq("session_id", session.id);

    if (error) {
      setErrorMsg("คำนวณยอดไม่สำเร็จ กรุณาเรียกพนักงาน");
      console.error(error.message);
      return;
    }

    setCheckoutTotal(data.reduce((sum, o) => sum + Number(o.total_price), 0));
    setShowCheckout(true);
  }

  // ยืนยันปิดโต๊ะ + เรียกเก็บเงิน
  async function handleConfirmCheckout() {
    const { error } = await supabase
      .from("table_sessions")
      .update({ status: "closed" })
      .eq("id", session.id);

    if (error) {
      setErrorMsg("ปิดโต๊ะไม่สำเร็จ กรุณาเรียกพนักงาน");
      console.error(error.message);
      return;
    }

    setClosed(true);
    setShowCheckout(false);
  }

  // ---------- สถานะหน้าจอ ----------

  if (checkingSession) {
    return <p className="py-10 text-center text-leaf-600">กำลังโหลด...</p>;
  }

  if (closed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="font-serif text-3xl font-bold">ขอบคุณที่ใช้บริการ</h1>
        <p className="mt-3 text-leaf-700">
          ยอดที่ต้องชำระ{" "}
          <span className="font-semibold text-tea-amber">
            ฿{checkoutTotal.toFixed(2)}
          </span>
        </p>
        <p className="mt-1 text-sm text-leaf-600">
          กรุณาชำระเงินกับพนักงานที่เคาน์เตอร์
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="font-serif text-2xl font-bold">โต๊ะนี้ยังไม่เปิดใช้งาน</h1>
        <p className="mt-2 text-leaf-600">กรุณาแจ้งพนักงาน</p>
      </div>
    );
  }

  const groups = groupByCategory(menuItems);

  return (
    <div className={cart.length > 0 ? "pb-72" : "pb-8"}>
      {/* หัวหน้า + ปุ่มเรียกเก็บเงิน */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold">โต๊ะ {tableNumber}</h1>
          <p className="text-sm text-leaf-600">เลือกเครื่องดื่มแล้วกดส่งออเดอร์</p>
        </div>
        <button
          onClick={handleOpenCheckout}
          className="shrink-0 rounded-lg border border-leaf-600 px-3 py-2 text-sm font-medium text-leaf-700 hover:bg-leaf-100"
        >
          เรียกเก็บเงิน
        </button>
      </div>

      {errorMsg && (
        <p className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}
      {sentMsg && (
        <p className="mb-4 rounded-lg bg-leaf-100 p-3 text-sm text-leaf-800">
          {sentMsg}
        </p>
      )}

      {/* แถบกระโดดไปแต่ละหมวด */}
      {groups.length > 1 && (
        <nav className="sticky top-0 z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-tea-mist/95 px-4 py-3">
          {groups.map(([cat], i) => (
            <a
              key={cat}
              href={`#cat-${i}`}
              className="whitespace-nowrap rounded-full border border-leaf-300 bg-white px-4 py-1.5 text-sm text-leaf-800 hover:bg-leaf-100"
            >
              {cat}
            </a>
          ))}
        </nav>
      )}

      {/* รายการเมนู */}
      {groups.map(([cat, items], i) => (
        <section key={cat} id={`cat-${i}`} className="mb-8 scroll-mt-16">
          <h2 className="mb-3 font-serif text-xl font-bold">{cat}</h2>
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const qty = qtyInCart(item.id);
              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-xl border border-leaf-200 bg-white p-3"
                >
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-leaf-100">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start gap-2">
                      <h3 className="font-serif font-semibold leading-snug">
                        {item.name}
                      </h3>
                      {item.tag && (
                        <span className="shrink-0 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-800">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-2 text-sm text-leaf-700">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-semibold text-tea-amber">
                        ฿{item.price}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        aria-label={`เพิ่ม ${item.name}`}
                        className="rounded-full bg-leaf-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-leaf-700"
                      >
                        {qty > 0 ? `เพิ่ม (${qty})` : "เพิ่ม"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* ตะกร้าลอยด้านล่าง */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-leaf-200 bg-white p-4 shadow-lg">
          <div className="mx-auto max-w-4xl">
            <p className="mb-2 text-sm font-medium text-leaf-700">
              ตะกร้า ({cartCount} รายการ)
            </p>
            <div className="mb-2 max-h-36 overflow-y-auto">
              {cart.map((c) => (
                <div
                  key={c.menu_item_id}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate pr-2">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(c.menu_item_id, c.quantity - 1)}
                      aria-label="ลดจำนวน"
                      className="h-7 w-7 rounded-full bg-leaf-100 text-leaf-800 hover:bg-leaf-200"
                    >
                      -
                    </button>
                    <span className="w-4 text-center">{c.quantity}</span>
                    <button
                      onClick={() => updateQuantity(c.menu_item_id, c.quantity + 1)}
                      aria-label="เพิ่มจำนวน"
                      className="h-7 w-7 rounded-full bg-leaf-100 text-leaf-800 hover:bg-leaf-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-2 flex items-center justify-between font-semibold">
              <span>ยอดรวมรอบนี้</span>
              <span className="text-tea-amber">฿{cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={handleSendOrder}
              disabled={submitting}
              className="w-full rounded-lg bg-leaf-700 px-4 py-3 font-medium text-white hover:bg-leaf-800 disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง..." : "ส่งออเดอร์"}
            </button>
          </div>
        </div>
      )}

      {/* กล่องยืนยันเรียกเก็บเงิน */}
      {showCheckout && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 className="mb-2 font-serif text-xl font-bold">ยืนยันเรียกเก็บเงิน</h2>
            <p className="mb-1 text-leaf-700">ยอดรวมทุกออเดอร์ของโต๊ะนี้</p>
            <p className="mb-4 text-2xl font-semibold text-tea-amber">
              ฿{checkoutTotal.toFixed(2)}
            </p>
            <p className="mb-4 text-sm text-leaf-600">
              เมื่อยืนยันแล้วจะสั่งเพิ่มไม่ได้อีก
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmCheckout}
                className="flex-1 rounded-lg bg-leaf-700 px-4 py-2 font-medium text-white hover:bg-leaf-800"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 rounded-lg bg-leaf-100 px-4 py-2 text-leaf-800 hover:bg-leaf-200"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
