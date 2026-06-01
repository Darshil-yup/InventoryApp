import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { getThemeColors, BORDER_RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    noPadding?: boolean;
}

export default function Card({ children, style, noPadding = false }: CardProps) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                },
                noPadding ? { padding: 0 } : { padding: SPACING.md },
                style,
            ]}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BORDER_RADIUS.md,
        ...SHADOWS.sm,
        marginBottom: SPACING.md,
        borderWidth: 1,
    },
});
