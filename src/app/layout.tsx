import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "M.F.R. | แพลตฟอร์มสุขภาพผิวอาคารอัจฉริยะ",
  description:
    "Modul Facade Rover คือแพลตฟอร์มหุ่นยนต์ AI สำหรับตรวจสอบผิวอาคาร บำรุงรักษาเชิงคาดการณ์ และวิเคราะห์ข้อมูลอาคารอัจฉริยะ",
  keywords: ["M.F.R.", "Modul Facade Rover", "หุ่นยนต์ AI", "ตรวจสอบผิวอาคาร", "i-NEW GEN"],
  openGraph: {
    title: "M.F.R. แพลตฟอร์มสุขภาพผิวอาคารอัจฉริยะ",
    description: "หุ่นยนต์โมดูลาร์พร้อม AI inspection, predictive maintenance และ smart building analytics",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
