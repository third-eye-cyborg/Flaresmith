"use client";
import React from "react";
import { Button as BaseButton, type ButtonProps as BaseButtonProps } from "@flaresmith/ui";

/**
 * Web-specific Button (T026)
 * Adds Tailwind hover/active states using semantic tokens without hard-coded colors.
 */
export interface ButtonProps extends BaseButtonProps {}

const hoverMap: Record<string, string> = {
  primary: "hover:bg-[var(--color-primary-600)] active:bg-[var(--color-primary-700)]",
  secondary: "hover:bg-[var(--color-neutral-200)] active:bg-[var(--color-neutral-300)]",
  destructive: "hover:bg-[var(--color-error-600)] active:bg-[var(--color-error-700)]",
};

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  return (
    <BaseButton
      {...props}
      className={`${props.className ?? ""} ${hoverMap[variant]}`.trim()}
    />
  );
}

export default Button;
