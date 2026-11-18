export function moduleTypeLabel(type: string) {
  const labels: Record<string, string> = {
    Cleaning: "ชุดปฏิบัติการทำความสะอาด",
    Inspection: "ชุดปฏิบัติการตรวจสอบ",
    "Thermal Inspection": "ชุดปฏิบัติการตรวจสอบความร้อน",
    Advertising: "ชุดปฏิบัติการโฆษณา/ประกาศ",
  };

  return labels[type] ?? type;
}

export function moduleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Installed: "ติดตั้งอยู่",
    Available: "พร้อมติดตั้ง",
    Maintenance: "บำรุงรักษา",
    Offline: "ออฟไลน์",
  };

  return labels[status] ?? status;
}

export function missionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    "Cleaning Mission": "ภารกิจทำความสะอาด",
    "Inspection Mission": "ภารกิจตรวจสอบ",
    "Thermal Survey Mission": "ภารกิจสำรวจความร้อน",
    "Advertisement Mission": "ภารกิจโฆษณา/ประกาศ",
  };

  return labels[type] ?? type;
}

export function missionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Scheduled: "รอเริ่ม",
    Running: "กำลังทำงาน",
    Completed: "เสร็จสิ้น",
    Paused: "หยุดชั่วคราว",
  };

  return labels[status] ?? status;
}

export function statusTone(status: string) {
  if (["Installed", "Running", "Operational", "Completed"].includes(status)) return "good";
  if (["Available", "Scheduled"].includes(status)) return "default";
  if (["Warning", "Paused", "Maintenance"].includes(status)) return "warning";
  return "critical";
}
