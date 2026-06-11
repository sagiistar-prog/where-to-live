"use client";

import { useEffect, useState } from "react";
import { defaultAppSettings, readAppSettings } from "@/lib/app-settings";
import { redactSensitiveText } from "@/lib/sensitive-redaction";

type SensitiveTextProps = {
  text: string;
  as?: "span" | "p";
  className?: string;
};

export function SensitiveText({
  text,
  as: Component = "span",
  className,
}: SensitiveTextProps) {
  const [maskSensitiveInfo, setMaskSensitiveInfo] = useState(
    defaultAppSettings.maskSensitiveInfo,
  );

  useEffect(() => {
    setMaskSensitiveInfo(readAppSettings().maskSensitiveInfo);
  }, []);

  return (
    <Component className={className}>
      {maskSensitiveInfo ? redactSensitiveText(text) : text}
    </Component>
  );
}
