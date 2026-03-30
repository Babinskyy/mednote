import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[220px] w-full resize-y rounded-[24px] border border-border bg-white/80 px-4 py-4 text-base leading-7 text-foreground outline-none transition placeholder:text-muted focus:border-accent focus:bg-white",
        className,
      )}
      {...props}
    />
  );
}