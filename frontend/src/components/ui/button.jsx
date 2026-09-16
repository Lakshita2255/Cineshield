import * as React from "react";
import { cn } from "@/lib/utils";

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const base = "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-amber-400 text-slate-950 hover:bg-amber-300 font-semibold shadow-sm",
    destructive: "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30",
    outline: "border border-[#242F46] bg-[#111620] hover:bg-slate-800 text-slate-200",
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700",
    ghost: "hover:bg-slate-800 hover:text-slate-100 text-slate-400",
    link: "text-amber-400 underline-offset-4 hover:underline",
  };
  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 px-3 text-xs",
    lg: "h-10 px-8 text-base",
    icon: "h-9 w-9",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

export { Button };
