import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, LoaderCircle, BookOpen, Moon, Sun } from "lucide-react";

export const cx = (...values) => values.filter(Boolean).join(" ");

export function Button({
  children,
  variant = "default",
  size = "default",
  className,
  busy,
  disabled,
  ...props
}) {
  return (
    <button
      className={cx("button", `button-${variant}`, `button-${size}`, className)}
      disabled={disabled || busy}
      {...props}
    >
      {busy && <LoaderCircle className="spin" size={15} />}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, ...props }) {
  return (
    <button
      type="button"
      className={cx("icon-button", className)}
      title={label}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  side = false,
  closeDisabled = false,
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="modal-overlay" />
        <DialogPrimitive.Content
          className={cx("modal", side && "modal-side", className)}
        >
          <div className="modal-heading">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="关闭弹窗" disabled={closeDisabled}>
                <X size={18} />
              </IconButton>
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <BookOpen size={21} strokeWidth={1.8} />
      </span>
      <span>
        CampusClaw<span className="brand-dot">.</span>
      </span>
    </div>
  );
}

export function Loading({ label = "正在加载" }) {
  return (
    <div className="loading">
      <LoaderCircle size={19} className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function ThemeToggle({ dark, onToggle }) {
  return (
    <IconButton label={dark ? "切换浅色" : "切换深色"} onClick={onToggle}>
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </IconButton>
  );
}
