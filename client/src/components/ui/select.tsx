import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-8 w-full min-w-0 appearance-none border-b-2 border-border bg-transparent pr-6 pl-1 text-sm transition-colors outline-none focus:border-accent disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted-fg"
      />
    </div>
  );
}

export { Select };
