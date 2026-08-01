import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Fonts, Spacing, Radius } from '@/constants/theme';
import type { LucideIcon } from 'lucide-react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon: LeftIcon, rightIcon: RightIcon, onRightIconPress, containerStyle, style, onFocus, onBlur, ...props }, ref) => {
    const theme = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    
    // Animation for the border color
    const focusAnim = useSharedValue(0);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      focusAnim.value = withTiming(1, { duration: 200 });
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      focusAnim.value = withTiming(0, { duration: 200 });
      onBlur?.(e);
    };

    const animatedBorderStyle = useAnimatedStyle(() => {
      const errorColor = theme.error ?? '#ef4444';
      const defaultBorder = theme.inputBorder ?? '#d1d5db';
      const focusBorder = theme.inputFocusBorder ?? '#22c55e';

      const borderColor = interpolateColor(
        focusAnim.value,
        [0, 1],
        [error ? errorColor : defaultBorder, error ? errorColor : focusBorder]
      );

      return {
        borderColor,
      };
    });

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <ThemedText type="default" style={styles.label}>
            {label}
          </ThemedText>
        )}
        <Animated.View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.inputBackground },
            animatedBorderStyle,
          ]}
        >
          {LeftIcon && (
            <View style={styles.leftIcon}>
              <LeftIcon size={20} color={isFocused ? theme.primary : theme.textSecondary} />
            </View>
          )}
          <TextInput
            ref={ref}
            style={[
              styles.input,
              { color: theme.text },
              LeftIcon && styles.inputWithLeftIcon,
              RightIcon && styles.inputWithRightIcon,
              style,
            ]}
            placeholderTextColor={theme.textTertiary}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />
          {RightIcon && (
            <Pressable style={styles.rightIcon} onPress={onRightIconPress}>
              <RightIcon size={20} color={theme.textSecondary} />
            </Pressable>
          )}
        </Animated.View>
        {error && (
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            {error}
          </ThemedText>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.four,
  },
  label: {
    marginBottom: Spacing.two,
    fontSize: 14,
    fontFamily: Fonts.sans[500],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 48,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: Spacing.four,
    fontSize: 16,
    fontFamily: Fonts.sans[400],
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.ten,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.ten,
  },
  leftIcon: {
    position: 'absolute',
    left: Spacing.four,
    zIndex: 1,
  },
  rightIcon: {
    position: 'absolute',
    right: Spacing.four,
    zIndex: 1,
  },
  errorText: {
    marginTop: Spacing.one,
    fontSize: 12,
    fontFamily: Fonts.sans[500],
  },
});
