// React import removed (automatic JSX runtime)
import { View, type ViewProps } from "react-native";

export interface CardProps extends ViewProps {}

export function Card({ children, ...props }: CardProps) {
  return (
    <View className="bg-white rounded-lg shadow-md p-4 border border-gray-200" {...props}>
      {children}
    </View>
  );
}
