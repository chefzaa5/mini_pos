import { Noto_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import Nav from "./Nav";
import "./globals.css";

const sans = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-sans",
  display: "swap",
});
const serif = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata = {
  title: "KELVIN",
  description: "ร้านชาชงสด สั่งง่ายผ่าน QR ที่โต๊ะ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body
        className={`${sans.variable} ${serif.variable} min-h-screen bg-tea-mist font-sans text-leaf-900`}
      >
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
