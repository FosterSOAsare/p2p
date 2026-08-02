import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans[500],
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans[700],
  },
  default: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans[500],
  },
  // Headings take the web's `font-display` — Space Grotesk.
  title: {
    fontSize: 28,
    fontFamily: Fonts.display[600],
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Fonts.display[600],
  },
  link: {
    lineHeight: 22,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
  },
  linkPrimary: {
    lineHeight: 22,
    fontSize: 13,
    fontFamily: Fonts.sans[400],
    color: '#16a34a',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
