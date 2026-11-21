"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const robotImages = [
  {
    src: `${basePath}/images/mfr-cleaner-module.png`,
    alt: "หุ่นยนต์โมดูล่า M.F.R. ชุดปฏิบัติการทำความสะอาด",
    label: "ชุดทำความสะอาด",
  },
  {
    src: `${basePath}/images/mfr-camera-module.png`,
    alt: "หุ่นยนต์โมดูล่า M.F.R. ชุดปฏิบัติการกล้องตรวจสอบ",
    label: "ชุดกล้องตรวจสอบ",
  },
  {
    src: `${basePath}/images/mfr-assembled-configurations.png`,
    alt: "ชุดโมดูล่า M.F.R. ทั้งสองรูปแบบ (กล้องตรวจสอบและทำความสะอาด)",
    label: "โครงสร้างโมดูล่า",
  },
  {
    src: `${basePath}/images/mfr-hero-rover.png`,
    alt: "หุ่นยนต์โมดูล่า M.F.R. ปฏิบัติงานบนผนังอาคารกระจก",
    label: "ปฏิบัติงานบนอาคาร",
  },
];

export function RobotHeroSlider({
  className = "h-80 w-full lg:h-full",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % robotImages.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {robotImages.map((image, index) => (
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          width={1920}
          height={1080}
          priority={priority && index === 0}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
            activeIndex === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute bottom-2.5 right-5 z-10 flex gap-2" aria-label="ภาพชุดปฏิบัติการหุ่นยนต์โมดูล่า">
        {robotImages.map((image, index) => (
          <button
            key={image.src}
            type="button"
            aria-label={`แสดงภาพ ${image.label}`}
            aria-pressed={activeIndex === index}
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${
              activeIndex === index ? "w-8 bg-cyan-300" : "w-2.5 bg-white/45 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
