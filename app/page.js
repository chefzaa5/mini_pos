"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // แสดงเฉพาะเมนูที่เปิดขายอยู่
  useEffect(() => {
    async function fetchMenu() {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, description, price, spice_level, tag")
        .eq("is_available", true)
        .order("name", { ascending: true });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMenuItems(data);
      }
      setLoading(false);
    }
    fetchMenu();
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-orange-600">KELVIN Noodles</h1>
        <p className="mt-2 text-gray-600">
          บะหมี่ร้อน ๆ ส่งตรงถึงบ้านคุณ เลือกเมนูที่ชอบแล้วกดสั่งได้เลย
        </p>
        <Link
          href="/order"
          className="mt-4 inline-block rounded bg-orange-600 px-6 py-2 font-medium text-white hover:bg-orange-700"
        >
          สั่งเลย
        </Link>
      </div>

      {errorMsg && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {loading ? (
        <p className="text-center text-gray-500">กำลังโหลดเมนู...</p>
      ) : menuItems.length === 0 ? (
        <p className="text-center text-gray-500">ยังไม่มีเมนูเปิดขายตอนนี้</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold">{item.name}</h2>
                {item.tag && (
                  <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                    {item.tag}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mb-2 text-sm text-gray-600">
                  {item.description}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {item.spice_level || ""}
                </span>
                <span className="font-bold text-orange-700">
                  ฿{item.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
