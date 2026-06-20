# Vertical Surface Robot Platform

Modern modular robotics operating platform for vertical building surfaces. The app models a core robot unit with interchangeable modules for cleaning, inspection, thermal inspection, advertising, digital twin operations, mission management, facade health, defect management, inspection history, and printable reports.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style reusable primitives
- Recharts
- Lucide Icons
- next-themes dark/light mode
- Local JSON mock database
- Mock API routes

## Run

```bash
npm install
npm run dev
```

## Project Structure

```txt
src/app
  page.tsx                         Platform overview dashboard and surface health map
  modules/page.tsx                 Module management page
  module-dashboard/page.tsx        Installed module dashboard
  digital-twin/page.tsx            Robot digital twin page
  missions/page.tsx                Mission management page
  roadmap/page.tsx                 Future module roadmap
  defects/page.tsx                 Defect management page
  ai-analysis/page.tsx             AI image analysis page
  history/page.tsx                 Inspection history and trend page
  report/page.tsx                  Printable building health report
  api/*/route.ts                   Mock API endpoints

src/components
  ai/analysis-panel.tsx            Original/detected image review
  charts/*                         Gauge and Recharts visualizations
  defects/defect-table.tsx         Filterable defect table
  facade/surface-health-map.tsx    Clickable facade zone map
  history/history-timeline.tsx     Inspection timeline
  layout/*                         App shell, header, theme controls
  robot/*                          Robot platform, module, and mission components
  report/*                         Printable report UI
  ui/*                             shadcn/ui-style primitives

src/data
  database.json                    1 building, 10 facade zones, 50 images, 20 defects
  api.ts                           Typed mock data access helpers
  robot-platform.ts                Core robot, modules, missions, twin, roadmap mock data

src/lib
  types.ts                         TypeScript domain types
  robot-labels.ts                  Thai labels for robot platform statuses
  utils.ts                         Shared formatting and risk helpers
```

## Mock API

- `/api/building`
- `/api/facade-zones`
- `/api/defects`
- `/api/inspection-images`
- `/api/inspection-history`
- `/api/report`
- `/api/robot-platform`
- `/api/modules`
- `/api/digital-twin`
- `/api/missions`
- `/api/roadmap`
