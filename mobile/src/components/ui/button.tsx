import { forwardRef } from 'react';
import {
  StyleSheet,
  Pressable,
  type PressableProps,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, Radius } from '@/constants/theme';
import type { LucideIcon } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      title,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      containerStyle,
      textStyle,
      fullWidth = true,
      disabled,
      style,
      onPressIn,
      onPressOut,
      ...props
    },
    ref
  ) => {
    const theme = useTheme();
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const handlePressIn = (e: any) => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0.8, { duration: 100 });
      onPressIn?.(e);
    };

    const handlePressOut = (e: any) => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
      onPressOut?.(e);
    };

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: disabled ? 0.5 : opacity.value,
    }));

    // Theme-based styles
    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
          };
        case 'secondary':
          return {
            backgroundColor: theme.backgroundSelected,
            borderColor: theme.backgroundSelected,
          };
        case 'outline':
          return {
            backgroundColor: 'transparent',
            borderColor: theme.border,
            borderWidth: 1,
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          };
        case 'danger':
          return {
            backgroundColor: theme.error ?? '#ef4444',
            borderColor: theme.error ?? '#ef4444',
          };
        default:
          return {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
          };
      }
    };

    const getTextColor = () => {
      if (variant === 'primary' || variant === 'danger') return '#ffffff';
      if (variant === 'outline' || variant === 'ghost' || variant === 'secondary') return theme.text;
      return '#ffffff';
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return { height: 36, paddingHorizontal: Spacing.four };
        case 'lg':
          return { height: 56, paddingHorizontal: Spacing.six };
        case 'md':
        default:
          return { height: 48, paddingHorizontal: Spacing.five };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();
    const textColor = getTextColor();

    return (
      <AnimatedPressable
        ref={ref}
        disabled={disabled || isLoading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          variantStyles,
          sizeStyles,
          fullWidth && styles.fullWidth,
          style as any,
          animatedStyle,
          containerStyle,
        ]}
        {...props}
      >
        {isLoading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.contentContainer}>
            {LeftIcon && <LeftIcon size={size === 'sm' ? 16 : 20} color={textColor} style={styles.leftIcon} />}
            <ThemedText
              style={[
                styles.text,
                { color: textColor },
                size === 'sm' && styles.textSm,
                size === 'lg' && styles.textLg,
                textStyle,
              ]}
            >
              {title}
            </ThemedText>
            {RightIcon && <RightIcon size={size === 'sm' ? 16 : 20} color={textColor} style={styles.rightIcon} />}
          </View>
        )}
      </AnimatedPressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: Fonts.sans[600],
    fontSize: 16,
    textAlign: 'center',
  },
  textSm: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 18,
  },
  leftIcon: {
    marginRight: Spacing.two,
  },
  rightIcon: {
    marginLeft: Spacing.two,
  },
});
