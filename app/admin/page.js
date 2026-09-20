"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // ฟอร์มเพิ่มเมนูใหม่
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    stock: "",
    spice_level: "",
    is_available: true,
  });

  // เก็บ id ของแถวที่กำลังแก้ไข inline อยู่ (null = ไม่มีแถวไหนแก้ไขอยู่)
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  // โหลดรายการเมนูทั้งหมดจาก Supabase
  async function fetchItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, name, price, stock, spice_level, is_available")
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setItems(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchItems();
  }, []);

  // เพิ่มเมนูใหม่
  async function handleAdd(e) {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;

    const { error } = await supabase.from("menu_items").insert({
      name: newItem.name,
      price: parseFloat(newItem.price),
      stock: parseInt(newItem.stock) || 0,
      spice_level: newItem.spice_level || null,
      is_available: newItem.is_available,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setNewItem({
      name: "",
      price: "",
      stock: "",
      spice_level: "",
      is_available: true,
    });
    fetchItems();
  }

  // เริ่มแก้ไขแถว: คัดลอกค่าปัจจุบันมาไว้ใน draft
  function startEdit(item) {
    setEditingId(item.id);
    setEditDraft({ ...item });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  // บันทึกการแก้ไข
  async function saveEdit(id) {
    const { error } = await supabase
      .from("menu_items")
      .update({
        name: editDraft.name,
        price: parseFloat(editDraft.price),
        stock: parseInt(editDraft.stock) || 0,
        spice_level: editDraft.spice_level || null,
        is_available: editDraft.is_available,
      })
      .eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setEditingId(null);
    fetchItems();
  }

  // ลบเมนู
  async function handleDelete(id) {
    if (!confirm("ต้องการลบเมนูนี้ใช่หรือไม่?")) return;

    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    fetchItems();
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold text-orange-600">
        จัดการเมนูอาหาร - KELVIN
      </h1>

      {errorMsg && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {/* ฟอร์มเพิ่มเมนูใหม่ */}
      <form
        onSubmit={handleAdd}
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 shadow-sm sm:grid-cols-6"
      >
        <input
          type="text"
          placeholder="ชื่อเมนู"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          className="rounded border px-3 py-2 text-sm sm:col-span-2"
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="ราคา"
          value={newItem.price}
          onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
          required
        />
        <input
          type="number"
          placeholder="สต๊อก"
          value={newItem.stock}
          onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
          className="rounded border px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="ความเผ็ด"
          value={newItem.spice_level}
          onChange={(e) =>
            setNewItem({ ...newItem, spice_level: e.target.value })
          }
          className="rounded border px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={newItem.is_available}
            onChange={(e) =>
              setNewItem({ ...newItem, is_available: e.target.checked })
            }
          />
          เปิดขาย
        </label>
        <button
          type="submit"
          className="rounded bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 sm:col-span-6"
        >
          + เพิ่มเมนู
        </button>
      </form>

      {/* ตารางรายการเมนู */}
      {loading ? (
        <p className="text-gray-500">กำลังโหลด...</p>
      ) : (
        <table className="w-full overflow-hidden rounded-lg border bg-white text-sm shadow-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">ชื่อเมนู</th>
              <th className="px-3 py-2">ราคา</th>
              <th className="px-3 py-2">สต๊อก</th>
              <th className="px-3 py-2">ความเผ็ด</th>
              <th className="px-3 py-2">สถานะ</th>
              <th className="px-3 py-2">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const isLowStock = item.stock <= 5;
              return (
                <tr key={item.id} className="border-t">
                  {/* ชื่อเมนู */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editDraft.name}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, name: e.target.value })
                        }
                        className="w-full rounded border px-2 py-1"
                      />
                    ) : (
                      item.name
                    )}
                  </td>

                  {/* ราคา */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={editDraft.price}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, price: e.target.value })
                        }
                        className="w-20 rounded border px-2 py-1"
                      />
                    ) : (
                      `฿${item.price}`
                    )}
                  </td>

                  {/* สต๊อก */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editDraft.stock}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, stock: e.target.value })
                        }
                        className="w-20 rounded border px-2 py-1"
                      />
                    ) : (
                      <span
                        className={
                          isLowStock ? "font-semibold text-red-600" : ""
                        }
                      >
                        {item.stock}
                        {isLowStock && " ⚠️"}
                      </span>
                    )}
                  </td>

                  {/* ความเผ็ด */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editDraft.spice_level || ""}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            spice_level: e.target.value,
                          })
                        }
                        className="w-24 rounded border px-2 py-1"
                      />
                    ) : (
                      item.spice_level || "-"
                    )}
                  </td>

                  {/* สถานะเปิดขาย */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={editDraft.is_available}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            is_available: e.target.checked,
                          })
                        }
                      />
                    ) : item.is_available ? (
                      <span className="rounded bg-green-100 px-2 py-1 text-green-700">
                        เปิดขาย
                      </span>
                    ) : (
                      <span className="rounded bg-gray-200 px-2 py-1 text-gray-600">
                        ปิดขาย
                      </span>
                    )}
                  </td>

                  {/* ปุ่มจัดการ */}
                  <td className="px-3 py-2">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(item.id)}
                          className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                        >
                          บันทึก
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded bg-gray-300 px-2 py-1 text-xs hover:bg-gray-400"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
