"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ลำดับและคำอธิบายของแต่ละหมวด (ชื่อหมวดต้องตรงกับคอลัมน์ category ใน menu_items)
const CATEGORY_META = {
  "ชาใสคลาสสิก": { en: "Classic Clear Teas", note: "เน้นความหอมและรสชาติของใบชาแท้" },
  "ชานมยอดฮิต": { en: "Popular Milk Teas", note: "กลมกล่อม หอมมัน" },
  "ชาผลไม้รีเฟรชชิ่ง": { en: "Refreshing Fruit Teas", note: "ดื่มง่าย ดับกระหาย" },
  "ท็อปปิ้งและของว่าง": { en: "Toppings & Snacks", note: "เพิ่มความสนุกให้ทุกแก้ว" },
};
const CATEGORY_ORDER = Object.keys(CATEGORY_META);

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

export default function HomePage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function fetchMenu() {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, name_en, description, price, tag, image_url, category")
        .eq("is_available", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("โหลดเมนูไม่สำเร็จ:", error.message);
        setFailed(true);
      } else {
        setMenuItems(data);
      }
      setLoading(false);
    }
    fetchMenu();
  }, []);

  const groups = groupByCategory(menuItems);

  return (
    <div>
      {/* ส่วนหัว */}
      <section className="mb-6">
        <h1 className="font-serif text-4xl font-bold">KELVIN</h1>
        <p className="mt-2 max-w-md text-leaf-700">
          ชาชงสดทุกแก้ว ตั้งแต่ชาใสจนถึงชานมและชาผลไม้
        </p>
        <p className="mt-4 rounded-lg bg-leaf-100 px-4 py-3 text-sm text-leaf-800">
          นั่งที่ร้านแล้วสแกน QR บนโต๊ะ เพื่อเลือกเครื่องดื่มและสั่งได้ทันที
        </p>
      </section>

      {failed && (
        <p className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
          โหลดเมนูไม่สำเร็จ กรุณารีเฟรชหน้านี้อีกครั้ง
        </p>
      )}

      {loading ? (
        <p className="text-leaf-600">กำลังโหลดเมนู...</p>
      ) : (
        <>
          {/* แถบกระโดดไปแต่ละหมวด */}
          {groups.length > 1 && (
            <nav className="sticky top-0 z-10 -mx-4 mb-6 flex gap-2 overflow-x-auto bg-tea-mist/95 px-4 py-3">
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

          {groups.map(([cat, items], i) => (
            <section key={cat} id={`cat-${i}`} className="mb-10 scroll-mt-16">
              <h2 className="font-serif text-2xl font-bold">{cat}</h2>
              <p className="mb-4 text-sm text-leaf-600">
                {CATEGORY_META[cat]?.en}
                {CATEGORY_META[cat] && " – " + CATEGORY_META[cat].note}
              </p>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-leaf-200 bg-white"
                  >
                    <div className="relative aspect-square bg-leaf-100">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      )}
                      {item.tag && (
                        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-leaf-800">
                          {item.tag}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-serif font-semibold leading-snug">
                        {item.name}
                      </h3>
                      {item.name_en && (
                        <p className="text-xs text-leaf-500">{item.name_en}</p>
                      )}
                      {item.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm text-leaf-700">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-2 font-semibold text-tea-amber">
                        ฿{item.price}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
