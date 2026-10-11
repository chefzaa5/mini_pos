/** @type {import('tailwindcss').Config} */

// โทนสีชา: เขียวใบชาเข้ม -> เขียวอ่อน
const leaf = {
  50: "#f0f6f1",
  100: "#dcebdf",
  200: "#bcd7c3",
  300: "#8fbb9d",
  400: "#5e9a75",
  500: "#3f8059",
  600: "#2f6b4a",
  700: "#27563c",
  800: "#214631",
  900: "#14301f",
};

module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./app/*/**/*.{js,jsx,ts,tsx,mdx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        leaf,
        // หน้า admin/sell/history/kitchen/generate-qr ยังใช้ชื่อคลาส orange-* อยู่
        // จึง map ชื่อนี้ไปที่โทนเขียวชา จะได้เปลี่ยนสีทั้งเว็บโดยไม่ต้องแก้ทุกไฟล์
        orange: leaf,
        tea: { amber: "#b0651a", mist: "#f3f7f2" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
