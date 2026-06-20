import { AlertTriangle, BrainCircuit, Gauge, Timer } from "lucide-react";
import { AnalysisPanel } from "@/components/ai/analysis-panel";
import { PageHeader } from "@/components/layout/page-header";
import { AiChatConsole } from "@/components/ai/ai-chat-console";
import { HealthCard, RecommendationCard, StatCard } from "@/features/mfr/components/cards";
import { aiRecommendations, mvpMetrics } from "@/features/mfr/constants";
import { db } from "@/data/api";
import { getGalleryImages } from "@/data/mock-robot-control";
import type { InspectionImage } from "@/lib/types";

export default function AiAnalysisPage() {
  const galleryImages = getGalleryImages();
  const analysisImages: InspectionImage[] = db.inspectionImages.map((image) => {
    const galleryImage = galleryImages.find((item) => item.id === image.id);
    const imageUrl = galleryImage?.imageUrl ?? image.originalUrl;
    return { ...image, originalUrl: imageUrl, detectedUrl: imageUrl };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="วิเคราะห์ AI"
        title="ระบบวิเคราะห์ผิวอาคารด้วย AI"
        description="คะแนนสุขภาพผิวอาคาร คะแนนความเสี่ยง คำแนะนำ AI การบำรุงรักษาเชิงคาดการณ์ อายุคงเหลือ และสรุปการตรวจสอบ"
      />

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <HealthCard score={mvpMetrics.surfaceHealth} risk={mvpMetrics.riskLevel} />
        <div className="grid gap-5 md:grid-cols-2">
          <StatCard icon={AlertTriangle} label="คะแนนความเสี่ยง" value="68/100" tone="amber" />
          <StatCard icon={Gauge} label="ระดับความเสี่ยง" value={mvpMetrics.riskLevel} tone="rose" />
          <StatCard icon={Timer} label="อายุใช้งานคงเหลือ" value="18 เดือน" tone="cyan" />
          <StatCard icon={BrainCircuit} label="สรุปการตรวจสอบ" value="50 ภาพ" tone="blue" />
        </div>
      </div>

      <RecommendationCard items={aiRecommendations} />
      <AnalysisPanel images={analysisImages} />
      <AiChatConsole />
    </div>
  );
}
