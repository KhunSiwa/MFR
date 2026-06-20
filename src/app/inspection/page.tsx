import { AnalysisPanel } from "@/components/ai/analysis-panel";
import { PageHeader } from "@/components/layout/page-header";
import { InspectionGallery } from "@/components/robot-control/inspection-gallery";
import { LiveCameraConsole } from "@/components/robot-control/live-camera-console";
import { InspectionCard } from "@/features/mfr/components/cards";
import { db } from "@/data/api";
import { getCameraStream, getGalleryImages } from "@/data/mock-robot-control";
import type { InspectionImage } from "@/lib/types";

export default function InspectionPage() {
  const galleryImages = getGalleryImages();
  const analysisImages: InspectionImage[] = db.inspectionImages.map((image) => {
    const galleryImage = galleryImages.find((item) => item.id === image.id);
    const imageUrl = galleryImage?.imageUrl ?? image.originalUrl;
    return { ...image, originalUrl: imageUrl, detectedUrl: imageUrl };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="การตรวจสอบ"
        title="พื้นที่ตรวจสอบ"
        description="กล้องสด ภาพก่อน/หลัง วิเคราะห์ด้วย AI ตรวจจับรอยแตกร้าว สนิม ซิลิโคน แผงโซลาร์ และคลังภาพตรวจสอบ"
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <InspectionCard title="ตรวจจับรอยแตกร้าว" value="กำลังทำงาน" tone="rose" />
        <InspectionCard title="ตรวจจับสนิม" value="กำลังทำงาน" tone="amber" />
        <InspectionCard title="ตรวจซิลิโคน" value="กำลังทำงาน" tone="cyan" />
        <InspectionCard title="ตรวจแผงโซลาร์" value="พร้อมใช้งาน" tone="emerald" />
      </div>

      <LiveCameraConsole initialStream={getCameraStream()} />

      <section className="grid gap-5 lg:grid-cols-4">
        <InspectionCard title="ภาพจากกล้อง" value="สด" tone="cyan" />
        <InspectionCard title="ภาพก่อน / หลัง" value="เปิดใช้งาน" tone="blue" />
        <InspectionCard title="กรอบตรวจจับ" value="AI ROI" tone="amber" />
        <InspectionCard title="เฟรมที่ตรวจแล้ว" value={galleryImages.length} tone="emerald" />
      </section>

      <AnalysisPanel images={analysisImages} />
      <InspectionGallery images={galleryImages} />
    </div>
  );
}
