import { PageHeader } from "@/components/layout/page-header";
import { PrintButton } from "@/components/report/print-button";
import { ReportDocument } from "@/components/report/report-document";
import { getReportData } from "@/data/api";

export default function ReportPage() {
  const report = getReportData();

  return (
    <div>
      <PageHeader
        eyebrow="รายงานสำหรับพิมพ์"
        title="รายงานสุขภาพอาคาร"
        description="รายงานสำหรับผู้บริหารพร้อมคะแนน รายการตำหนิ พื้นที่เสี่ยงสูง คำแนะนำ และภาพจากการตรวจ"
        actions={<PrintButton />}
      />
      <ReportDocument report={report} />
    </div>
  );
}
