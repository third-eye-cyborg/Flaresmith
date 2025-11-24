/**
 * React Native Web className typing augmentation
 * 
 * React Native Web supports className prop via NativeWind, but TypeScript
 * doesn't recognize it on intrinsic elements by default.
 * 
 * This augmentation extends JSX intrinsic elements to accept className.
 */

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

  interface ImageProps {
    className?: string;
  }

  interface ScrollViewProps {
    className?: string;
  }

  interface TouchableOpacityProps {
    className?: string;
  }

  interface TextInputProps {
    className?: string;
  }
}
