import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ReportDocument } from "@/components/report/report-document";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportActions } from "@/features/mfr/components/report-actions";
import { getReportData } from "@/data/api";
import { formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const report = getReportData();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="รายงาน"
        title="รายงาน"
        description="รายงานการตรวจสอบ รายงาน AI รายงานบำรุงรักษา การส่งออก ประวัติ ค้นหา และตัวกรอง"
      />

      <Card className="no-print">
        <CardHeader>
          <CardTitle>ศูนย์รายงาน</CardTitle>
          <CardDescription>ส่งออก PDF, Excel, CSV และตรวจประวัติการตรวจสอบ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-white/5">
              <Search className="h-4 w-4 text-slate-500" />
              <input className="w-full bg-transparent outline-none" placeholder="ค้นหารายงาน ตำหนิ หรือโซน" />
            </label>
            <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-slate-950">
              <option>รายงานทั้งหมด</option>
              <option>รายงานการตรวจสอบ</option>
              <option>รายงาน AI</option>
              <option>รายงานบำรุงรักษา</option>
            </select>
          </div>
          <ReportActions />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3 no-print">
        {["รายงานการตรวจสอบ", "รายงาน AI", "รายงานบำรุงรักษา"].map((item) => (
          <Card key={item}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{item}</CardTitle>
                  <CardDescription>อัปเดต {formatDate(report.building.lastInspectionDate)}</CardDescription>
                </div>
                <Badge tone="good">พร้อม</Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <ReportDocument report={report} />
    </div>
  );
}
