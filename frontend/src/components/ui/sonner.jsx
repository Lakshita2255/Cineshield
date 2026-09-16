import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#111620] group-[.toaster]:text-slate-100 group-[.toaster]:border-[#242F46] group-[.toaster]:shadow-lg font-mono text-xs",
          description: "group-[.toast]:text-slate-400",
          actionButton:
            "group-[.toast]:bg-amber-400 group-[.toast]:text-slate-950 font-semibold",
          cancelButton:
            "group-[.toast]:bg-slate-800 group-[.toast]:text-slate-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
