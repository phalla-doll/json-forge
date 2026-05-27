import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ExpiredShareView() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">This share has expired</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Shared snapshots are kept for 30 days. Ask the person who shared this
          link to create a new one.
        </p>
      </div>
      <Button asChild variant="default" size="sm">
        <Link href="/">Open JSON Forge</Link>
      </Button>
    </div>
  );
}
