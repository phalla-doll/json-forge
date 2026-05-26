"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CircleCheck,
  Info,
  AlertTriangle,
  OctagonXIcon,
  LoaderCircle,
} from "@hugeicons/core-free-icons";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <HugeiconsIcon icon={CircleCheck} className="size-4" />,
        info: <HugeiconsIcon icon={Info} className="size-4" />,
        warning: <HugeiconsIcon icon={AlertTriangle} className="size-4" />,
        error: <HugeiconsIcon icon={OctagonXIcon} className="size-4" />,
        loading: (
          <HugeiconsIcon icon={LoaderCircle} className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
