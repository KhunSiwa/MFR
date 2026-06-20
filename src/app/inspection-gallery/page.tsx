import { PageHeader } from "@/components/layout/page-header";
import { InspectionGallery } from "@/components/robot-control/inspection-gallery";
import { getGalleryImages } from "@/data/mock-robot-control";

export default function InspectionGalleryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inspection archive"
        title="Inspection Image Gallery"
        description="Captured robot imagery with capture time, robot position, inspection type, AI status, search, filtering, and sorting."
      />
      <InspectionGallery images={getGalleryImages()} />
    </div>
  );
}
