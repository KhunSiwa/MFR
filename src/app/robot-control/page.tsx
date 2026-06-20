import { PageHeader } from "@/components/layout/page-header";
import { ControlConsole } from "@/components/robot-control/control-console";
import { getRobotStatus } from "@/data/mock-robot-control";

export default function RobotControlPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Semi-autonomous operations"
        title="Robot Remote Control System"
        description="Manual web control for forward, backward, turning, and stop commands while autonomous navigation is still in development."
      />
      <ControlConsole initialStatus={getRobotStatus()} />
    </div>
  );
}
