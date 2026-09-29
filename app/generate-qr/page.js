"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function GenerateQrPage() {
  const [tableNumber, setTableNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ข้อมูล session ที่เพิ่งเปิดสำเร็จ (ใช้แสดง QR)
  const [openedSession, setOpenedSession] = useState(null);

  // ข้อมูล session เก่าที่ยังค้างอยู่ (โต๊ะไม่ว่าง)
  const [stuckSession, setStuckSession] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  function resetAll() {
    setTableNumber("");
    setOpenedSession(null);
    setStuckSession(null);
    setShowConfirmClose(false);
    setErrorMsg("");
    setCopied(false);
  }

  // กดปุ่ม "เปิดโต๊ะ"
  async function handleOpenTable(e) {
    e.preventDefault();
    setErrorMsg("");
    setOpenedSession(null);

    const tableNum = parseInt(tableNumber);
    if (!tableNum || tableNum < 1) {
      setErrorMsg("กรุณากรอกเลขโต๊ะให้ถูกต้อง");
      return;
    }

    // เช็คก่อนว่าโต๊ะนี้มี session เปิดค้างอยู่ไหม
    const { data: existing, error: checkError } = await supabase
      .from("table_sessions")
      .select("id, table_number, status, created_at")
      .eq("table_number", tableNum)
      .eq("status", "open")
      .maybeSingle();

    if (checkError) {
      setErrorMsg(checkError.message);
      return;
    }

    if (existing) {
      // โต๊ะไม่ว่าง แสดงกล่องเตือน
      setStuckSession(existing);
      return;
    }

    // โต๊ะว่าง สร้าง session ใหม่
    const { data: newSession, error: insertError } = await supabase
      .from("table_sessions")
      .insert({ table_number: tableNum, status: "open" })
      .select()
      .single();

    if (insertError) {
      setErrorMsg(insertError.message);
      return;
    }

    setOpenedSession(newSession);
  }

  // กดปุ่ม "ปิดออเดอร์เดิม" ในกล่องเตือน -> เปิดกล่องยืนยัน
  function handleRequestClose() {
    setShowConfirmClose(true);
  }

  // กดยืนยันปิดโต๊ะเดิมจริง
  async function handleConfirmClose() {
    const { error } = await supabase
      .from("table_sessions")
      .update({ status: "closed" })
      .eq("id", stuckSession.id)
      .eq("status", "open"); // กันกดซ้ำซ้อน

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setStuckSession(null);
    setShowConfirmClose(false);
    // ฟอร์มเดิม (เลขโต๊ะที่กรอกไว้) ยังอยู่ ให้พนักงานกด "เปิดโต๊ะ" อีกครั้งเอง
  }

  function minutesAgo(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    return Math.floor(diffMs / 60000);
  }

  function handleCopyLink() {
    const link = `${siteUrl}/order/${openedSession.table_number}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrUrl = openedSession
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        `${siteUrl}/order/${openedSession.table_number}`
      )}`
    : null;

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold text-orange-600">
        เปิดโต๊ะ - KELVIN
      </h1>

      {errorMsg && (
        <p className="mb-4 rounded bg-red-100 p-2 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      {/* กล่องเตือนโต๊ะไม่ว่าง */}
      {stuckSession && !showConfirmClose && (
        <div className="mb-4 rounded-lg border-2 border-red-400 bg-red-50 p-4">
          <p className="font-semibold text-red-700">
            โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร กรุณาปิดออเดอร์เดิมก่อน
          </p>
          <button
            onClick={handleRequestClose}
            className="mt-3 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            ปิดออเดอร์เดิม
          </button>
        </div>
      )}

      {/* กล่องยืนยันปิดโต๊ะเดิม */}
      {showConfirmClose && stuckSession && (
        <div className="mb-4 rounded-lg border-2 border-red-400 bg-red-50 p-4">
          <p className="mb-2 font-semibold text-red-700">
            ยืนยันปิดออเดอร์เดิมของโต๊ะนี้?
          </p>
          <p className="mb-3 text-sm text-gray-700">
            โต๊ะ {stuckSession.table_number} · เปิดมาแล้ว{" "}
            {minutesAgo(stuckSession.created_at)} นาที
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmClose}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              ยืนยันปิดโต๊ะเดิม
            </button>
            <button
              onClick={() => setShowConfirmClose(false)}
              className="rounded bg-gray-300 px-4 py-2 text-sm hover:bg-gray-400"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* ฟอร์มเปิดโต๊ะ - ซ่อนถ้ามี session เปิดสำเร็จแล้ว */}
      {!openedSession && (
        <form
          onSubmit={handleOpenTable}
          className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm"
        >
          <label className="text-sm font-medium">เลขโต๊ะ</label>
          <input
            type="number"
            min={1}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            className="rounded border px-3 py-2 text-lg"
            placeholder="เช่น 5"
          />
          <button
            type="submit"
            className="mt-2 rounded bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
          >
            เปิดโต๊ะ
          </button>
        </form>
      )}

      {/* แสดง QR หลังเปิดโต๊ะสำเร็จ */}
      {openedSession && qrUrl && (
        <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
          <img
            src={qrUrl}
            alt="QR โต๊ะ"
            className="mx-auto mb-3 h-64 w-64"
          />
          <p className="mb-2 font-semibold">
            โต๊ะ {openedSession.table_number}
          </p>
          <p className="mb-3 break-all text-xs text-gray-500">
            {siteUrl}/order/{openedSession.table_number}
          </p>
          <button
            onClick={handleCopyLink}
            className="mb-3 rounded bg-gray-200 px-3 py-1 text-xs hover:bg-gray-300"
          >
            {copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
          </button>
          <button
            onClick={resetAll}
            className="block w-full rounded bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
          >
            เปิดโต๊ะใหม่
          </button>
        </div>
      )}
    </div>
  );
}
