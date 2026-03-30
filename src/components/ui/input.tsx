import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-border bg-white/80 px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted focus:border-accent focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}