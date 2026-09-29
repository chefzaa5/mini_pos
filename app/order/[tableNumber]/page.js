"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// หมายเหตุ: โปรเจกต์นี้ใช้ Next.js 14.2.5 ซึ่ง params ของ Dynamic Route
// ยังเป็น object ธรรมดา ไม่ใช่ Promise (ต่างจาก Next.js 15+ ที่ต้อง unwrap ด้วย use())
export default function TableOrderPage({ params }) {
  const tableNumber = parseInt(params.tableNumber);

  const [session, setSession] = useState(null); // session ที่เปิดอยู่ของโต๊ะนี้
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
      .select("id, name, price, spice_level, tag")
      .eq("is_available", true)
      .order("name", { ascending: true });

    if (!error) setMenuItems(data);
  }

  // เพิ่มเมนูลงตะกร้า (ถ้ามีแล้วให้บวกจำนวนเพิ่ม)
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
          c.menu_item_id === menuItemId ? { ...c, quantity: qty } : c
        )
      );
    }
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

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
      setErrorMsg(error.message);
      setSubmitting(false);
      return;
    }

    setCart([]);
    setSentMsg("ส่งออเดอร์แล้ว! รอสักครู่นะครับ");
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
      setErrorMsg(error.message);
      return;
    }

    const total = data.reduce((sum, o) => sum + Number(o.total_price), 0);
    setCheckoutTotal(total);
    setShowCheckout(true);
  }

  // ยืนยันปิดโต๊ะ + เรียกเก็บเงิน
  async function handleConfirmCheckout() {
    const { error } = await supabase
      .from("table_sessions")
      .update({ status: "closed" })
      .eq("id", session.id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setClosed(true);
    setShowCheckout(false);
  }

  // ---------- UI states ----------

  if (checkingSession) {
    return <p className="p-6 text-center text-gray-500">กำลังโหลด...</p>;
  }

  if (closed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-orange-600">
          ขอบคุณที่ใช้บริการ
        </h1>
        <p className="mt-2 text-gray-600">
          ยอดที่ต้องชำระ ฿{checkoutTotal.toFixed(2)}
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-gray-700">
          โต๊ะนี้ยังไม่เปิดใช้งาน
        </h1>
        <p className="mt-2 text-gray-500">กรุณาแจ้งพนักงาน</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md p-4 pb-32">
      {/* หัวหน้า + ปุ่มเรียกเก็บเงิน */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-orange-600">
          โต๊ะ {tableNumber}
        </h1>
        <button
          onClick={handleOpenCheckout}
          className="rounded bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-900"
        >
          เรียกเก็บเงิน
        </button>
      </div>

      {errorMsg && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}
      {sentMsg && (
        <p className="mb-4 rounded bg-green-100 p-2 text-sm text-green-700">
          {sentMsg}
        </p>
      )}

      {/* รายการเมนู */}
      <div className="grid grid-cols-1 gap-3">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border bg-white p-3 shadow-sm"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-500">
                ฿{item.price} {item.spice_level && `· ${item.spice_level}`}
              </p>
            </div>
            <button
              onClick={() => addToCart(item)}
              className="rounded-full bg-orange-600 px-3 py-1 text-sm font-bold text-white hover:bg-orange-700"
            >
              +
            </button>
          </div>
        ))}
      </div>

      {/* ตะกร้าลอยด้านล่าง */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-lg">
          <div className="mx-auto max-w-md">
            <div className="mb-2 max-h-32 overflow-y-auto">
              {cart.map((c) => (
                <div
                  key={c.menu_item_id}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateQuantity(c.menu_item_id, c.quantity - 1)
                      }
                      className="rounded bg-gray-200 px-2 hover:bg-gray-300"
                    >
                      -
                    </button>
                    <span>{c.quantity}</span>
                    <button
                      onClick={() =>
                        updateQuantity(c.menu_item_id, c.quantity + 1)
                      }
                      className="rounded bg-gray-200 px-2 hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-2 flex items-center justify-between font-bold">
              <span>ยอดรวม</span>
              <span className="text-orange-700">
                ฿{cartTotal.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleSendOrder}
              disabled={submitting}
              className="w-full rounded bg-orange-600 px-4 py-3 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง..." : "ส่งออเดอร์"}
            </button>
          </div>
        </div>
      )}

      {/* กล่องยืนยันเรียกเก็บเงิน */}
      {showCheckout && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-2 text-lg font-bold">ยืนยันเรียกเก็บเงิน</h2>
            <p className="mb-4 text-gray-600">
              ยอดรวมทั้งหมด{" "}
              <span className="font-bold text-orange-700">
                ฿{checkoutTotal.toFixed(2)}
              </span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmCheckout}
                className="flex-1 rounded bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
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
