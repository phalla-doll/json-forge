"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

export interface DiffViewProps {
  original: string;
  modified: string;
  onModifiedChange: (value: string) => void;
  theme?: "light" | "dark";
}

const JsonDiffViewInner = dynamic(
  () => import("./json-diff-view-inner").then((mod) => mod.JsonDiffViewInner),
  {
    ssr: false,
    loading: () => <div className="size-full bg-background" />,
  },
) as ComponentType<DiffViewProps>;

export function JsonDiffView(props: DiffViewProps) {
  return <JsonDiffViewInner {...props} />;
}
