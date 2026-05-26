import { cn } from "@/lib/utils";

function Switch({
  className,
  checked,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<"button">, "role" | "type" | "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        checked
          ? "bg-accent border-accent"
          : "bg-transparent border-border-strong",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "block size-3 transition-transform",
          checked
            ? "translate-x-3.5 bg-accent-fg"
            : "translate-x-0.5 bg-muted-fg",
        )}
      />
    </button>
  );
}

export { Switch };
