"use client";

import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

const csv = [
  ["รายงาน", "สถานะ", "เจ้าของ"],
  ["รายงานการตรวจสอบ", "พร้อม", "MFR"],
  ["รายงาน AI", "พร้อม", "MFR"],
  ["รายงานบำรุงรักษา", "พร้อม", "MFR"],
].map((row) => row.join(",")).join("\n");

function downloadFile(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => window.print()}><Printer className="h-4 w-4" />ส่งออก PDF</Button>
      <Button variant="secondary" onClick={() => downloadFile("mfr-report.csv", "text/csv", csv)}><Download className="h-4 w-4" />ส่งออก CSV</Button>
      <Button variant="secondary" onClick={() => downloadFile("mfr-report.xls", "application/vnd.ms-excel", csv)}><FileSpreadsheet className="h-4 w-4" />ส่งออก Excel</Button>
      <Button variant="secondary" onClick={() => downloadFile("mfr-ai-report.txt", "text/plain", "รายงาน AI M.F.R.\nการจัดการสุขภาพผิวอาคาร")}>
        <FileText className="h-4 w-4" />รายงาน AI
      </Button>
    </div>
  );
}
