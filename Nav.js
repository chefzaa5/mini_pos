"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STAFF_LINKS = [
  { href: "/", label: "เมนู" },
  { href: "/generate-qr", label: "เปิดโต๊ะ" },
  { href: "/kitchen", label: "จอครัว" },
  { href: "/sell", label: "ขายหน้าร้าน" },
  { href: "/history", label: "ประวัติ" },
  { href: "/admin", label: "จัดการเมนู" },
];

export default function Nav() {
  const pathname = usePathname();
  // ลูกค้าที่สแกน QR (หน้า /order/เลขโต๊ะ) ไม่ต้องเห็นเมนูของพนักงาน
  const isCustomerPage = pathname.startsWith("/order/");

  return (
    <header className="bg-leaf-900 text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-serif text-xl font-bold">
          KELVIN Tea
        </Link>
        {!isCustomerPage && (
          <nav className="flex gap-4 overflow-x-auto whitespace-nowrap text-sm text-leaf-100">
            {STAFF_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
