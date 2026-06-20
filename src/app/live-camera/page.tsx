import { PageHeader } from "@/components/layout/page-header";
import { LiveCameraConsole } from "@/components/robot-control/live-camera-console";
import { getCameraStream } from "@/data/mock-robot-control";

export default function LiveCameraPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Live monitoring"
        title="Robot Camera Monitoring"
        description="MVP camera page with one-second simulated image refresh, frame history, fullscreen viewing, snapshots, and recording state."
      />
      <LiveCameraConsole initialStream={getCameraStream()} />
    </div>
  );
}
