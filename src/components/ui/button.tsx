import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs sm:text-sm font-semibold tracking-tight cursor-pointer transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-primary/95 hover:shadow-[0_4px_16px_rgba(180,90,250,0.35)] active:shadow-inner border border-primary/40",
        premium:
          "bg-gradient-to-r from-primary via-accent to-emerald-400 text-primary-foreground font-bold shadow-[0_4px_20px_rgba(180,90,250,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110 hover:shadow-[0_6px_24px_rgba(180,90,250,0.5)] border border-white/25",
        pro:
          "bg-card/90 text-foreground border border-border/90 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-primary/60 hover:bg-secondary/90 hover:text-foreground active:bg-secondary",
        success:
          "bg-emerald-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-emerald-600 hover:shadow-[0_4px_16px_rgba(16,185,129,0.35)] border border-emerald-400/40",
        amber:
          "bg-amber-500 text-black font-bold shadow-[0_1px_2px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.3)] hover:bg-amber-400 hover:shadow-[0_4px_16px_rgba(245,158,11,0.35)] border border-amber-300/50",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-destructive/25 border border-destructive/40",
        outline:
          "border border-border/80 bg-card/60 backdrop-blur-md text-foreground shadow-xs hover:bg-secondary/80 hover:text-foreground hover:border-primary/50 hover:shadow-sm",
        secondary:
          "border border-border/60 bg-secondary/80 text-secondary-foreground shadow-xs hover:bg-secondary hover:border-border hover:shadow-sm",
        ghost:
          "text-muted-foreground hover:bg-secondary/70 hover:text-foreground active:bg-secondary",
        link:
          "text-primary underline-offset-4 hover:underline font-semibold p-0 h-auto",
        glow:
          "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 hover:border-primary/50 shadow-[0_0_15px_rgba(180,90,250,0.2)]",
      },
      size: {
        default: "h-9.5 px-4 py-2 text-xs sm:text-sm [&_svg]:size-4",
        xs: "h-7 rounded-lg px-2.5 text-[11px] font-mono [&_svg]:size-3",
        sm: "h-8.5 rounded-lg px-3 text-xs font-mono font-medium [&_svg]:size-3.5",
        lg: "h-11 rounded-xl px-6 text-sm font-bold [&_svg]:size-4.5",
        xl: "h-12 rounded-2xl px-7 text-base font-bold [&_svg]:size-5",
        icon: "size-9.5 rounded-xl [&_svg]:size-4",
        "icon-sm": "size-8 rounded-lg [&_svg]:size-3.5",
        "icon-xs": "size-7 rounded-md [&_svg]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
