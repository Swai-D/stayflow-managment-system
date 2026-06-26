import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap transition-all duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary-hover",
        accent:
          "bg-[#fef3c7] text-[#92400e] border-[#fde68a] [a]:hover:bg-[#fde68a]",
        secondary:
          "bg-[#f3f4f6] text-[#6b7280] [a]:hover:bg-[#e5e7eb]",
        success:
          "bg-[#dcfce7] text-[#166534] [a]:hover:bg-[#bbf7d0]",
        warning:
          "bg-[#fef3c7] text-[#92400e] [a]:hover:bg-[#fde68a]",
        destructive:
          "bg-[#fee2e2] text-[#dc2626] [a]:hover:bg-[#fecaca]",
        info:
          "bg-[#dbeafe] text-[#2563eb] [a]:hover:bg-[#bfdbfe]",
        outline:
          "border-border text-foreground bg-background [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
