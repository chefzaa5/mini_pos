import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "KELVIN Noodles",
  description: "สั่งบะหมี่ออนไลน์ง่าย ๆ ผ่าน KELVIN",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white shadow-sm">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold text-orange-600">
              KELVIN Noodles
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              <Link href="/" className="hover:text-orange-600">
                เมนู
              </Link>
              <Link href="/cart" className="hover:text-orange-600">
                ตะกร้า
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
