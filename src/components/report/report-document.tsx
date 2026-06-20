import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReportData } from "@/data/api";
import {
  defectTypeLabel,
  elevationLabel,
  formatDate,
  locationLabel,
  riskTone,
  severityLabel,
  statusLabel,
  zoneNameLabel,
} from "@/lib/utils";

type ReportData = ReturnType<typeof getReportData>;

export function ReportDocument({ report }: { report: ReportData }) {
  return (
    <div className="mx-auto max-w-5xl space-y-5 print:max-w-none">
      <Card className="print:border-slate-300 print:shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">รายงานสุขภาพอาคาร</div>
              <CardTitle className="mt-2 text-2xl">อาคารออเรเลียทาวเวอร์</CardTitle>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">88 ย่านอาคารอัจฉริยะสาทร กรุงเทพฯ</p>
            </div>
            <Badge tone={riskTone(report.building.healthScore)}>คะแนนสุขภาพ {report.building.healthScore}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          {[
            ["ตรวจล่าสุด", formatDate(report.building.lastInspectionDate)],
            ["พื้นที่ผนังอาคาร", `${report.building.facadeAreaSqm.toLocaleString()} ตร.ม.`],
            ["ตำหนิที่ตรวจพบ", `${report.criticalDefects.length} รายการเสี่ยงสูง`],
            ["ตรวจครั้งถัดไป", formatDate(report.building.nextInspectionDate)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
              <div className="mt-1 font-semibold">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>สรุปสำหรับผู้บริหาร</CardTitle></CardHeader>
          <CardContent className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            ผลการตรวจล่าสุดจากหุ่นยนต์แม่เหล็กระบุว่าสภาพเปลือกอาคารโดยรวมอยู่ในระดับเฝ้าระวัง
            โซนส่วนใหญ่ยังใช้งานได้ตามปกติ แต่บริเวณยอดอาคารทิศตะวันตกและผิวอาคารรับแดดทิศใต้
            ต้องวางแผนบำรุงรักษาเร่งด่วนจากสัญญาณรอยแตกร้าว สนิม น้ำรั่วซึม และซิลิโคนเสื่อมสภาพ
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>คำแนะนำในการดำเนินการ</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {report.recommendations.map((item) => (
                <li key={item} className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>พื้นที่เสี่ยงสูง</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {report.highRiskZones.map((zone) => (
            <div key={zone.id} className="rounded-md border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{zoneNameLabel(zone.name)}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{elevationLabel(zone.elevation)} · ชั้น {zone.floorRange}</div>
                </div>
                <Badge tone={riskTone(zone.healthScore)}>{zone.healthScore}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ตำหนิที่ตรวจพบ</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2">รหัส</th><th>ประเภท</th><th>ความรุนแรง</th><th>ตำแหน่ง</th><th>สถานะ</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {report.criticalDefects.map((defect) => (
                <tr key={defect.id}>
                  <td className="py-3 font-medium">{defect.id}</td>
                  <td>{defectTypeLabel(defect.type)}</td>
                  <td>{severityLabel(defect.severity)}</td>
                  <td>{locationLabel(defect.location)}</td>
                  <td>{statusLabel(defect.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>ภาพจากการตรวจ</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {report.images.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="relative aspect-[4/3]">
                <Image src={image.detectedUrl} alt={image.id} fill className="object-cover" sizes="33vw" />
              </div>
              <div className="p-3 text-sm">
                <div className="font-medium">{image.id}</div>
                <div className="text-slate-500 dark:text-slate-400">{image.zoneId} · ตรวจพบ {image.detections.length} รายการ</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
