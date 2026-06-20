import { PageHeader } from "@/components/layout/page-header";
import { TelemetryConsole } from "@/components/robot-control/telemetry-console";
import { getTelemetry } from "@/data/mock-robot-control";

export default function TelemetryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Real-time telemetry"
        title="Robot Telemetry Page"
        description="Live mock data for position, battery, speed, temperature, and mission status with one-second updates."
      />
      <TelemetryConsole initialTelemetry={getTelemetry()} />
    </div>
  );
}
