import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex h-5 w-fit items-center gap-1 px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-fg text-bg",
        outline: "border text-fg",
        muted: "bg-muted-bg text-muted-fg",
        accent: "bg-accent text-accent-fg",
        destructive: "bg-red/10 text-red",
        success: "bg-green/10 text-green",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
