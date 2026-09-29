"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);

  // โหลดออเดอร์ค้างอยู่ (received/cooking) ตอนเปิดหน้าครั้งแรก
  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from("dinein_orders")
        .select("id, table_number, items, status, created_at")
        .in("status", ["received", "cooking"])
        .order("created_at", { ascending: true });

      if (!error) setOrders(data);
    }
    fetchOrders();

    // ฟังการเปลี่ยนแปลงของตาราง dinein_orders แบบเรียลไทม์
    // ต้องเปิด Realtime ให้ตารางนี้ใน Supabase (Database > Publications) ก่อน
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dinein_orders" },
        (payload) => {
          setOrders((prev) => [...prev, payload.new]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dinein_orders" },
        (payload) => {
          setOrders((prev) => {
            // ถ้าเปลี่ยนเป็น served ให้เอาการ์ดออกจากจอทันที
            if (payload.new.status === "served") {
              return prev.filter((o) => o.id !== payload.new.id);
            }
            return prev.map((o) =>
              o.id === payload.new.id ? payload.new : o
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markCooking(orderId) {
    await supabase
      .from("dinein_orders")
      .update({ status: "cooking" })
      .eq("id", orderId);
    // ไม่ต้องอัปเดต state เอง เพราะ Realtime UPDATE event จะส่งค่ากลับมาให้อัตโนมัติ
  }

  async function markServed(orderId) {
    await supabase
      .from("dinein_orders")
      .update({ status: "served" })
      .eq("id", orderId);
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-3xl font-bold text-orange-600">จอครัว</h1>

      {orders.length === 0 ? (
        <p className="text-xl text-gray-400">ยังไม่มีออเดอร์เข้า</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`rounded-lg border-2 p-4 shadow ${
                order.status === "cooking"
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              <p className="mb-2 text-3xl font-bold">
                โต๊ะ {order.table_number}
              </p>
              <p className="mb-3 text-xs text-gray-500">
                {new Date(order.created_at).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              <ul className="mb-4 space-y-1 text-lg">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.name} × {item.quantity}
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                {order.status === "received" && (
                  <button
                    onClick={() => markCooking(order.id)}
                    className="flex-1 rounded bg-orange-600 px-3 py-2 font-medium text-white hover:bg-orange-700"
                  >
                    เริ่มทำ
                  </button>
                )}
                <button
                  onClick={() => markServed(order.id)}
                  className="flex-1 rounded bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700"
                >
                  จัดเสิร์ฟแล้ว
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
