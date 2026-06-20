export type RiskLevel = "Good" | "Warning" | "Critical";

export type DefectType =
  | "Crack"
  | "Rust"
  | "Water Stain"
  | "Water Leak"
  | "Silicone Damage"
  | "Silicone Deterioration"
  | "Dirt Accumulation";

export type Severity = "Low" | "Medium" | "High" | "Critical";

export type DefectStatus = "New" | "Monitoring" | "Repair Scheduled" | "Fixed";

export type Building = {
  id: string;
  name: string;
  address: string;
  floors: number;
  facadeAreaSqm: number;
  healthScore: number;
  riskLevel: RiskLevel;
  lastInspectionDate: string;
  nextInspectionDate: string;
};

export type FacadeZone = {
  id: string;
  name: string;
  elevation: "North" | "East" | "South" | "West";
  floorRange: string;
  healthScore: number;
  crackCount: number;
  rustCount: number;
  waterStainCount: number;
  siliconeIssueCount: number;
  dirtCount: number;
  inspectionDate: string;
};

export type Defect = {
  id: string;
  type: DefectType;
  severity: Severity;
  location: string;
  zoneId: string;
  detectionDate: string;
  status: DefectStatus;
  confidence: number;
  description: string;
};

export type InspectionImage = {
  id: string;
  zoneId: string;
  originalUrl: string;
  detectedUrl: string;
  capturedAt: string;
  robotPass: string;
  detections: {
    type: DefectType;
    confidence: number;
    bbox: [number, number, number, number];
  }[];
};

export type InspectionHistory = {
  date: string;
  areasInspected: number;
  defects: number;
  healthScore: number;
};

export type Database = {
  building: Building;
  facadeZones: FacadeZone[];
  defects: Defect[];
  inspectionImages: InspectionImage[];
  inspectionHistory: InspectionHistory[];
};

export type RobotCoreSystem = {
  name: string;
  status: "Operational" | "Warning" | "Maintenance";
  health: number;
  details: string;
};

export type RobotModule = {
  id: string;
  name: string;
  type: "Cleaning" | "Inspection" | "Thermal Inspection" | "Advertising";
  status: "Installed" | "Available" | "Maintenance" | "Offline";
  installationDate: string;
  compatibility: string[];
  healthStatus: number;
  functions: string[];
  outputs: string[];
  performance: number;
  lastMaintenanceDate: string;
};

export type RobotTwin = {
  position: string;
  coordinates: { x: number; y: number; floor: number };
  currentModule: string;
  batteryStatus: number;
  surfaceHealthData: string;
  currentMission: string;
  adhesionForce: number;
  networkSignal: number;
};

export type Mission = {
  id: string;
  name: string;
  type: "Cleaning Mission" | "Inspection Mission" | "Thermal Survey Mission" | "Advertisement Mission";
  status: "Scheduled" | "Running" | "Completed" | "Paused";
  startTime: string;
  endTime: string;
  areaCovered: string;
  results: string;
  generatedReport: string;
  moduleId: string;
};

export type FutureModule = {
  id: string;
  name: string;
  category: string;
  purpose: string;
  expectedOutputs: string[];
  readiness: number;
};
