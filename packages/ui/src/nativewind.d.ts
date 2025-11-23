// Augment React Native component prop types to accept `className` when using NativeWind.
// This is a lightweight declaration so TypeScript recognizes the utility classes applied.
// Spec Reference: FR-035 (observability spans rely on components rendering without type errors).
// TODO: Replace with upstream NativeWind type imports if package provides official declarations.
import 'react-native';
declare module 'react-native' {
  interface ViewProps { className?: string }
  interface TextProps { className?: string }
  interface PressableProps { className?: string }
  interface TextInputProps { className?: string }
}
