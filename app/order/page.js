"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// เกณฑ์เตือนภัยสต๊อกใกล้หมด (เหมือนหน้า /sell)
const LOW_STOCK_THRESHOLD = 5;

// ต้องห่อด้วย Suspense เพราะใช้ useSearchParams (ข้อกำหนดของ Next.js App Router)
export default function OrderPage() {
  return (
    <Suspense fallback={<p className="p-6 text-gray-500">กำลังโหลด...</p>}>
      <OrderForm />
    </Suspense>
  );
}

function OrderForm() {
  const searchParams = useSearchParams();
  const menuIdFromUrl = searchParams.get("menu"); // id เมนูที่ส่งมาจากปุ่ม "สั่งเมนูนี้" ในหน้าแรก

  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    address: "",
    note: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // โหลดเฉพาะเมนูที่เปิดขาย (is_available = true) พร้อมจำนวนสต๊อก
  async function fetchMenu() {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, price, stock")
      .eq("is_available", true)
      .order("name", { ascending: true });

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setMenuItems(data);

    // ถ้ามี menu id ส่งมาจาก URL และเมนูนั้นยังเปิดขายอยู่ ให้เลือกอันนั้นก่อน
    if (menuIdFromUrl && data.some((m) => m.id === menuIdFromUrl)) {
      setSelectedMenuId(menuIdFromUrl);
    } else if (data.length > 0 && !selectedMenuId) {
      setSelectedMenuId(data[0].id);
    }
  }

  useEffect(() => {
    fetchMenu();
  }, [menuIdFromUrl]);

  const selectedMenu = menuItems.find((m) => m.id === selectedMenuId);
  const totalPrice = selectedMenu ? selectedMenu.price * quantity : 0;

  function resetForm() {
    setForm({ customer_name: "", phone: "", address: "", note: "" });
    setQuantity(1);
  }

  // ส่งแจ้งเตือนผ่าน API route ฝั่ง server — ไม่ให้กระทบ flow การสั่งซื้อถ้า Telegram ล่ม
  async function sendTelegramNotifications(messages) {
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
    } catch (err) {
      console.error("ส่งแจ้งเตือน Telegram ไม่สำเร็จ:", err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // ตรวจสอบข้อมูลจำเป็นให้ครบก่อนบันทึก
    if (
      !selectedMenuId ||
      !form.customer_name ||
      !form.phone ||
      !form.address ||
      quantity < 1
    ) {
      setErrorMsg("กรุณากรอกข้อมูลให้ครบ: ชื่อ, เบอร์โทร, ที่อยู่ และเมนูที่ต้องการ");
      return;
    }

    // ตรวจสอบสต๊อกก่อนบันทึก
    if (selectedMenu.stock < quantity) {
      setErrorMsg(
        `สต๊อกไม่พอ! คงเหลือ ${selectedMenu.stock} ชิ้น แต่สั่ง ${quantity} ชิ้น`
      );
      return;
    }

    setSubmitting(true);

    // ขั้นที่ 1: สร้างออเดอร์ในตาราง orders ก่อน แล้วรับ id กลับมา
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_name: form.customer_name,
        phone: form.phone,
        address: form.address,
        note: form.note || null,
        total_price: totalPrice,
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      setErrorMsg(orderError.message);
      setSubmitting(false);
      return;
    }

    // ขั้นที่ 2: บันทึกรายการสินค้าลง order_items โดยผูกกับ order_id ที่เพิ่งได้
    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: orderData.id,
      menu_item_id: selectedMenuId,
      quantity: quantity,
      price_at_order: selectedMenu.price,
    });

    if (itemError) {
      setErrorMsg(itemError.message);
      setSubmitting(false);
      return;
    }

    // ขั้นที่ 3: ตัดสต๊อก
    const newStock = selectedMenu.stock - quantity;
    const { error: stockError } = await supabase
      .from("menu_items")
      .update({ stock: newStock })
      .eq("id", selectedMenuId);

    if (stockError) {
      setErrorMsg("บันทึกออเดอร์แล้ว แต่ตัดสต๊อกไม่สำเร็จ: " + stockError.message);
      setSubmitting(false);
      return;
    }

    // ขั้นที่ 4: แจ้งเตือน Telegram
    const now = new Date().toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const messages = [
      `🛍️ <b>มีรายการขายใหม่!</b>\n\n` +
        `• สินค้า: ${selectedMenu.name}\n` +
        `• จำนวน: ${quantity} ชิ้น\n` +
        `• ราคารวม: ${totalPrice.toFixed(2)} บาท\n` +
        `• สต๊อกคงเหลือปัจจุบัน: ${newStock} ชิ้น\n` +
        `• เวลา: ${now}`,
    ];

    if (newStock <= LOW_STOCK_THRESHOLD) {
      messages.push(
        `🚨 <b>[เตือนภัย] สต๊อกสินค้าใกล้หมด!</b>\n\n` +
          `• สินค้า: ${selectedMenu.name}\n` +
          `• คงเหลือเพียง: ${newStock} ชิ้น\n\n` +
          `⚠️ กรุณาเติมสต๊อกสินค้าด่วน!`
      );
    }

    await sendTelegramNotifications(messages);

    setSuccessMsg("สั่งซื้อสำเร็จ! ทางร้านจะติดต่อกลับเพื่อยืนยันออเดอร์");
    resetForm();
    fetchMenu(); // โหลดสต๊อกใหม่มาแสดง
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold text-orange-600">
        สั่งบะหมี่ - KELVIN
      </h1>

      {errorMsg && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}
      {successMsg && (
        <p className="mb-4 rounded bg-green-100 p-2 text-sm text-green-700">
          {successMsg}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm"
      >
        {/* เลือกเมนู */}
        <label className="text-sm font-medium">เมนู</label>
        <select
          value={selectedMenuId}
          onChange={(e) => setSelectedMenuId(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        >
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} - ฿{item.price} (เหลือ {item.stock})
            </option>
          ))}
        </select>

        {/* จำนวน */}
        <label className="text-sm font-medium">จำนวน</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="rounded border px-3 py-2 text-sm"
        />

        {/* ข้อมูลลูกค้า */}
        <label className="text-sm font-medium">ชื่อผู้สั่ง</label>
        <input
          type="text"
          value={form.customer_name}
          onChange={(e) =>
            setForm({ ...form, customer_name: e.target.value })
          }
          className="rounded border px-3 py-2 text-sm"
          placeholder="ชื่อ-นามสกุล"
        />

        <label className="text-sm font-medium">เบอร์โทร</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
          placeholder="0812345678"
        />

        <label className="text-sm font-medium">ที่อยู่จัดส่ง</label>
        <textarea
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
          rows={2}
          placeholder="บ้านเลขที่ ถนน ตำบล/แขวง..."
        />

        <label className="text-sm font-medium">หมายเหตุ (ถ้ามี)</label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
          placeholder="เช่น ไม่ใส่ผัก, เผ็ดน้อย"
        />

        {/* ยอดรวม */}
        <div className="mt-2 flex items-center justify-between rounded bg-orange-50 px-3 py-2">
          <span className="text-sm font-medium">ยอดรวม</span>
          <span className="text-lg font-bold text-orange-700">
            ฿{totalPrice.toFixed(2)}
          </span>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {submitting ? "กำลังบันทึก..." : "สั่งซื้อ"}
        </button>
      </form>
    </div>
  );
}
