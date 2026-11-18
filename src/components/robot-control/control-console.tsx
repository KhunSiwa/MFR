"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BatteryMedium,
  CircleStop,
  Gauge,
  Gamepad2,
  Keyboard,
  Radio,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { RobotCommand, RobotSystemStatus } from "@/data/mock-robot-control";
import { cn } from "@/lib/utils";

type RobotStatus = {
  batteryLevel: number;
  signalStrength: number;
  currentSpeed: number;
  currentModule: string;
  systemStatus: RobotSystemStatus;
};

const commands: { command: RobotCommand; label: string; icon: ElementType; keyHint: string }[] = [
  { command: "FORWARD", label: "Forward", icon: ArrowUp, keyHint: "W" },
  { command: "BACKWARD", label: "Backward", icon: ArrowDown, keyHint: "S" },
  { command: "TURN_LEFT", label: "Turn Left", icon: ArrowLeft, keyHint: "A" },
  { command: "TURN_RIGHT", label: "Turn Right", icon: ArrowRight, keyHint: "D" },
  { command: "STOP", label: "Stop", icon: CircleStop, keyHint: "Space" },
];

const commandLabels: Record<RobotCommand, string> = {
  FORWARD: "FORWARD",
  BACKWARD: "BACKWARD",
  TURN_LEFT: "TURN LEFT",
  TURN_RIGHT: "TURN RIGHT",
  STOP: "STOP",
};

const keyMap: Record<string, RobotCommand> = {
  w: "FORWARD",
  arrowup: "FORWARD",
  s: "BACKWARD",
  arrowdown: "BACKWARD",
  a: "TURN_LEFT",
  arrowleft: "TURN_LEFT",
  d: "TURN_RIGHT",
  arrowright: "TURN_RIGHT",
  " ": "STOP",
  escape: "STOP",
};

export function ControlConsole({ initialStatus }: { initialStatus: RobotStatus }) {
  const [command, setCommand] = useState<RobotCommand>("STOP");
  const [status, setStatus] = useState(initialStatus);
  const [lastInput, setLastInput] = useState("Manual");

  const sendCommand = useCallback((nextCommand: RobotCommand, source: string) => {
    setCommand(nextCommand);
    setLastInput(source);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const nextCommand = keyMap[event.key.toLowerCase()];
      if (!nextCommand) return;
      event.preventDefault();
      sendCommand(nextCommand, "Keyboard");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sendCommand]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const response = await fetch("/api/robot-status");
      setStatus(await response.json());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const derivedStatus = command === "STOP" ? "Idle" : status.systemStatus === "Charging" ? "Moving" : status.systemStatus;
  const commandTone = command === "STOP" ? "critical" : "good";

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_420px]">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Remote Motor Control</CardTitle>
                <CardDescription>Phase 1 command path: Web Dashboard to ESP32 to robot motors</CardDescription>
              </div>
              <Badge tone={commandTone}>{lastInput}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(280px,0.95fr)_minmax(0,1fr)]">
            <JoystickPad command={command} onCommand={sendCommand} />
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white dark:border-slate-800">
                <div className="text-xs font-semibold uppercase text-slate-400">Current Command</div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="font-mono text-3xl font-semibold tracking-normal text-cyan-300">{commandLabels[command]}</div>
                  <Gamepad2 className="h-9 w-9 text-cyan-300" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-300">
                  <span>Input: {lastInput}</span>
                  <span>Speed: {command === "STOP" ? "0.00" : status.currentSpeed.toFixed(2)} m/s</span>
                  <span>Status: {derivedStatus}</span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {commands.map((item) => (
                  <CommandButton
                    key={item.command}
                    active={command === item.command}
                    command={item.command}
                    icon={item.icon}
                    keyHint={item.keyHint}
                    label={item.label}
                    onCommand={sendCommand}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Control Modes</CardTitle>
            <CardDescription>Keyboard, joystick, and mobile touch are active</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ModeRow icon={Gamepad2} title="Virtual Joystick" value="Vector control ready" />
            <ModeRow icon={Keyboard} title="Keyboard Control" value="WASD + arrows + space" />
            <ModeRow icon={Smartphone} title="Mobile Touch Control" value="Pointer and touch optimized" />
            <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-100">
              Semi-autonomous mode is enabled. Manual commands override mission movement while telemetry and camera polling continue.
            </div>
          </CardContent>
        </Card>
      </section>

      <RobotStatusPanel status={{ ...status, systemStatus: derivedStatus }} command={command} />
    </div>
  );
}

function CommandButton({
  active,
  command,
  icon: Icon,
  keyHint,
  label,
  onCommand,
}: {
  active: boolean;
  command: RobotCommand;
  icon: ElementType;
  keyHint: string;
  label: string;
  onCommand: (command: RobotCommand, source: string) => void;
}) {
  return (
    <Button
      className={cn("h-14 justify-between px-4", active && "ring-2 ring-cyan-400")}
      variant={command === "STOP" ? "destructive" : active ? "default" : "secondary"}
      onClick={() => onCommand(command, "Touch Panel")}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="rounded bg-black/10 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10">{keyHint}</span>
    </Button>
  );
}

function JoystickPad({
  command,
  onCommand,
}: {
  command: RobotCommand;
  onCommand: (command: RobotCommand, source: string) => void;
}) {
  const direction = useMemo(() => {
    if (command === "FORWARD") return "translate-y-[-46px]";
    if (command === "BACKWARD") return "translate-y-[46px]";
    if (command === "TURN_LEFT") return "translate-x-[-46px]";
    if (command === "TURN_RIGHT") return "translate-x-[46px]";
    return "";
  }, [command]);

  function handlePointer(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    if (Math.abs(x) < 22 && Math.abs(y) < 22) {
      onCommand("STOP", "Joystick");
      return;
    }
    onCommand(Math.abs(x) > Math.abs(y) ? (x < 0 ? "TURN_LEFT" : "TURN_RIGHT") : y < 0 ? "FORWARD" : "BACKWARD", "Joystick");
  }

  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-5 dark:border-slate-800 dark:bg-slate-900">
      <div
        className="relative h-72 w-72 touch-none rounded-full border border-slate-300 bg-slate-200 shadow-inner dark:border-slate-700 dark:bg-slate-950"
        onPointerDown={handlePointer}
        onPointerMove={(event) => event.buttons === 1 && handlePointer(event)}
        onPointerUp={() => onCommand("STOP", "Joystick")}
      >
        <div className="absolute inset-4 rounded-full border border-dashed border-slate-400 dark:border-slate-700" />
        <div className="absolute left-1/2 top-5 -translate-x-1/2 text-slate-500"><ArrowUp className="h-5 w-5" /></div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-slate-500"><ArrowDown className="h-5 w-5" /></div>
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"><ArrowLeft className="h-5 w-5" /></div>
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500"><ArrowRight className="h-5 w-5" /></div>
        <button
          className={cn(
            "absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-950/20 transition-transform",
            direction,
          )}
          onClick={() => onCommand("STOP", "Joystick")}
        >
          <CircleStop className="h-8 w-8" />
        </button>
      </div>
      <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">Drag or tap a direction to command movement</div>
    </div>
  );
}

function RobotStatusPanel({ status, command }: { status: RobotStatus; command: RobotCommand }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Robot Status Panel</CardTitle>
        <CardDescription>Live operational state from the mock ESP32 bridge</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <StatusMeter icon={BatteryMedium} label="Battery Level" value={status.batteryLevel} suffix="%" />
        <StatusMeter icon={Radio} label="Signal Strength" value={status.signalStrength} suffix="%" />
        <StatusReadout icon={Gauge} label="Current Speed" value={`${command === "STOP" ? "0.00" : status.currentSpeed.toFixed(2)} m/s`} />
        <StatusReadout icon={ShieldCheck} label="ชุดปฏิบัติการปัจจุบัน" value={status.currentModule} />
        <StatusReadout icon={Gamepad2} label="System Status" value={status.systemStatus} />

        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div className="mb-3 text-sm font-semibold">Control Architecture</div>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <ArchitecturePhase active label="Phase 1" path="User -> Web Dashboard -> ESP32 -> Robot Motors" />
            <ArchitecturePhase label="Phase 2" path="User -> Web Dashboard -> Cloud Server -> Robot" />
            <ArchitecturePhase label="Phase 3" path="User -> Cloud -> Autonomous Navigation -> Robot" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusMeter({ icon: Icon, label, value, suffix }: { icon: ElementType; label: string; value: number; suffix: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-cyan-600" />{label}</span>
        <span className="font-mono">{value}{suffix}</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function StatusReadout({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Icon className="h-4 w-4 text-cyan-600" />{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function ModeRow({ icon: Icon, title, value }: { icon: ElementType; title: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <span className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-cyan-600" />{title}</span>
      <span className="text-right text-xs text-slate-500 dark:text-slate-400">{value}</span>
    </div>
  );
}

function ArchitecturePhase({ active, label, path }: { active?: boolean; label: string; path: string }) {
  return (
    <div className={cn("rounded-md border p-3", active ? "border-cyan-300 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/30" : "border-slate-200 dark:border-slate-800")}>
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <span className={cn("h-2 w-2 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
        {label}
      </div>
      <div className="text-xs">{path}</div>
    </div>
  );
}
