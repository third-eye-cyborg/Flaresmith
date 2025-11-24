// Type augmentation for NativeWind className support on React Native components
// Ensures web typecheck passes when using className on View/Text/Pressable/TextInput.
import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface PressableProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
}
