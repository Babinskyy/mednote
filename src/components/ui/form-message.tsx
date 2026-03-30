import { cn } from "@/lib/utils";

type FormMessageProps = {
  message?: string;
  tone?: "error" | "success" | "muted";
  className?: string;
};

export function FormMessage({ message, tone = "muted", className }: FormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={cn(
        "text-sm leading-6",
        tone === "error" && "text-danger",
        tone === "success" && "text-accent",
        tone === "muted" && "text-muted",
        className,
      )}
    >
      {message}
    </p>
  );
}