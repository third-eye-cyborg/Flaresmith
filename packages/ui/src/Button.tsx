// React import removed (automatic JSX runtime)
import { Pressable, Text, type PressableProps } from "react-native";

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: "primary" | "secondary" | "outline";
}

export function Button({ title, variant = "primary", ...props }: ButtonProps) {
  return (
    <Pressable
      className={`px-4 py-2 rounded-lg items-center justify-center ${
        variant === "primary"
          ? "bg-primary-600 active:bg-primary-700"
          : variant === "secondary"
          ? "bg-secondary-600 active:bg-secondary-700"
          : "bg-transparent border-2 border-primary-600"
      }`}
      {...props}
    >
      <Text className="text-white font-semibold">{title}</Text>
    </Pressable>
  );
}
