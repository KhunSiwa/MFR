"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUpDown, CheckCircle2, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GalleryImage } from "@/data/mock-robot-control";

type SortMode = "newest" | "oldest" | "detections";

export function InspectionGallery({ images }: { images: GalleryImage[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState<SortMode>("newest");

  const filtered = useMemo(() => {
    return images
      .filter((image) => filter === "All" || image.aiDetectionStatus === filter)
      .filter((image) => {
        const value = `${image.id} ${image.robotPosition} ${image.inspectionType} ${image.aiDetectionStatus}`.toLowerCase();
        return value.includes(query.toLowerCase());
      })
      .sort((a, b) => {
        if (sort === "detections") return b.detectionCount - a.detectionCount;
        const diff = new Date(b.captureTime).getTime() - new Date(a.captureTime).getTime();
        return sort === "newest" ? diff : -diff;
      });
  }, [filter, images, query, sort]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Inspection Image Gallery</CardTitle>
          <CardDescription>Captured robot images with AI detection metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                className="w-full bg-transparent outline-none"
                placeholder="Search images, positions, inspection types"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SlidersHorizontal className="h-4 w-4 text-slate-500" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All AI statuses</SelectItem>
                <SelectItem value="Clear">Clear</SelectItem>
                <SelectItem value="Detected">Detected</SelectItem>
                <SelectItem value="Review Required">Review Required</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
              <SelectTrigger><ArrowUpDown className="h-4 w-4 text-slate-500" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="detections">Most detections</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((image) => (
          <Card key={image.id} className="overflow-hidden">
            <Image
              src={image.imageUrl}
              alt={image.inspectionType}
              width={1280}
              height={720}
              unoptimized
              className="aspect-video w-full object-cover"
            />
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{image.id}</CardTitle>
                  <CardDescription>{image.robotPosition}</CardDescription>
                </div>
                <Badge tone={image.aiDetectionStatus === "Clear" ? "good" : image.aiDetectionStatus === "Detected" ? "warning" : "critical"}>
                  {image.aiDetectionStatus}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <GalleryRow label="Capture Time" value={new Date(image.captureTime).toLocaleString()} />
              <GalleryRow label="Inspection Type" value={image.inspectionType} />
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  {image.detectionCount > 0 ? <TriangleAlert className="h-4 w-4 text-orange-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  AI Detection Status
                </span>
                <span className="font-semibold">{image.detectionCount} findings</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

function GalleryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
