"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyDocumentButtonProps = {
  content: string;
};

export function CopyDocumentButton({ content }: CopyDocumentButtonProps) {
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  }

  return (
    <Button onClick={handleCopy} size="sm" variant="secondary">
      {status === "idle" && "Kopiuj"}
      {status === "done" && "Skopiowano"}
      {status === "error" && "Błąd kopiowania"}
    </Button>
  );
}