// React import removed (automatic JSX runtime)
import { Pressable, Text, type PressableProps } from "react-native";

/**
 * Unified cross-platform Button primitive (T025)
 *
 * Token-driven: derives background / foreground / spacing / radius from semantic & spacing tokens.
 * No hard-coded color values: references CSS variables emitted by token generation (Tailwind layer).
 *
 * Variant semantic mapping (tokens.base.json → semantic.action.*):
 *  - primary:   action.primary-bg / action.primary-fg
 *  - secondary: action.secondary-bg / action.secondary-fg
 *  - destructive: action.destructive-bg / action.destructive-fg
 *
 * Size mapping (spacing tokens):
 *  - sm: xs vertical, sm horizontal
 *  - md: sm vertical, md horizontal (default)
 *  - lg: md vertical, lg horizontal
 */
export type ButtonVariant = "primary" | "secondary" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  children?: React.ReactNode;
  title?: string; // legacy convenience prop
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
}

const variantTokenClass: Record<ButtonVariant, string> = {
  primary: "bg-[var(--action-primary-bg)] text-[var(--action-primary-fg)]",
  secondary: "bg-[var(--action-secondary-bg)] text-[var(--action-secondary-fg)]",
  destructive: "bg-[var(--action-destructive-bg)] text-[var(--action-destructive-fg)]",
};

// Radius + focus styles leverage semantic.border.focus & radius.md tokens
const baseClasses = "rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] disabled:opacity-50 disabled:pointer-events-none";

const sizeSpacing: Record<ButtonSize, { px: string; py: string }> = {
  sm: { px: "var(--spacing-sm)", py: "var(--spacing-xs)" },
  md: { px: "var(--spacing-md)", py: "var(--spacing-sm)" },
  lg: { px: "var(--spacing-lg)", py: "var(--spacing-md)" },
};

export function Button({
  children,
  title,
  variant = "primary",
  size = "md",
  disabled = false,
  style,
  ...props
}: ButtonProps) {
  const content = children ?? <Text className="font-semibold">{title}</Text>;
  const spacing = sizeSpacing[size];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`${baseClasses} ${variantTokenClass[variant]}`}
      style={[
        style,
        {
          paddingHorizontal: spacing ? spacing.px : undefined,
          paddingVertical: spacing ? spacing.py : undefined,
        },
      ]}
      {...props}
    >
      {content}
    </Pressable>
  );
}

export default Button;
