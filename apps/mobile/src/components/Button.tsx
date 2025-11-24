import React from "react";
import { Button as BaseButton, type ButtonProps as BaseButtonProps } from "@flaresmith/ui";
import { Text } from "react-native";

/**
 * Mobile-specific Button (T027)
 * Applies NativeWind state styles; leverages accessibility roles and keeps token-driven variant logic.
 */
export interface ButtonProps extends BaseButtonProps {}

export function Button({ children, title, ...props }: ButtonProps) {
  return (
    <BaseButton
      accessibilityHint={title}
      {...props}
    >
      {children ?? <Text className="font-semibold">{title}</Text>}
    </BaseButton>
  );
}

export default Button;
