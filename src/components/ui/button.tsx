import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/*
  Themed per the Axom design brief:
  - low-contrast, muted, bordered buttons — never attention-grabbing
  - hover = border/opacity shift, not a background explosion
  - no gradients, no shadows, no glow
  - rounded-md
*/
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // primary: near-white text on a dark muted surface, subtle border
        default:
          "border-border bg-secondary text-foreground hover:border-[#3f3f46] hover:bg-accent",
        primary:
          "border-border bg-secondary text-foreground hover:border-[#3f3f46] hover:bg-accent",
        // secondary: transparent, muted border, dim text that brightens
        secondary:
          "border-border bg-transparent text-muted-foreground hover:border-[#3f3f46] hover:text-foreground",
        outline:
          "border-border bg-transparent text-muted-foreground hover:border-[#3f3f46] hover:text-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        subtle:
          "border-transparent bg-muted text-foreground hover:bg-accent",
        destructive:
          "border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10",
        danger:
          "border-destructive/30 bg-transparent text-destructive hover:bg-destructive/10",
        link: "border-transparent bg-transparent text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4",
        md: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5",
        icon: "size-9",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
