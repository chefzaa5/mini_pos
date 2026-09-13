"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // โหลดออเดอร์ทั้งหมด เรียงจากล่าสุดไปเก่าสุด
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, customer_name, status, total_price")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setOrders(data);
      }
      setLoading(false);
    }
    fetchOrders();
  }, []);

  // รวมยอดขายทั้งหมดจากทุกออเดอร์
  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total_price || 0),
    0
  );

  // แปลงวันเวลาให้อ่านง่ายแบบไทย
  function formatDate(dateString) {
    return new Date(dateString).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // สีป้ายสถานะแต่ละแบบ
  function statusBadge(status) {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-blue-100 text-blue-700",
      delivering: "bg-purple-100 text-purple-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-orange-600">
        ประวัติออเดอร์ - KELVIN
      </h1>

      {errorMsg && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {/* สรุปยอดขายรวม */}
      <div className="mb-6 flex items-center justify-between rounded-lg border bg-orange-50 p-4 shadow-sm">
        <span className="text-sm font-medium text-gray-700">
          ยอดขายรวมทั้งหมด ({orders.length} ออเดอร์)
        </span>
        <span className="text-xl font-bold text-orange-700">
          ฿{totalSales.toFixed(2)}
        </span>
      </div>

      {loading ? (
        <p className="text-gray-500">กำลังโหลด...</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500">ยังไม่มีออเดอร์</p>
      ) : (
        <table className="w-full overflow-hidden rounded-lg border bg-white text-sm shadow-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">วันเวลาที่สั่ง</th>
              <th className="px-3 py-2">ชื่อลูกค้า</th>
              <th className="px-3 py-2">สถานะ</th>
              <th className="px-3 py-2 text-right">ยอดรวม</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="px-3 py-2">{formatDate(order.created_at)}</td>
                <td className="px-3 py-2">{order.customer_name}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-1 text-xs ${statusBadge(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium">
                  ฿{Number(order.total_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
