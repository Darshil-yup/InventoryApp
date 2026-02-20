import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { LIGHT_COLORS, DARK_COLORS } from '../../constants/theme';

interface GradientBackgroundProps {
    children: React.ReactNode;
    style?: ViewStyle;
}

export default function GradientBackground({ children, style }: GradientBackgroundProps) {
    const { isDark } = useTheme();

    const gradientColors = isDark
        ? [DARK_COLORS.background, DARK_COLORS.primary]
        : [LIGHT_COLORS.primary, LIGHT_COLORS.primaryLight];

    const bgColor = isDark ? DARK_COLORS.background : LIGHT_COLORS.primary;

    return (
        <View style={[styles.container, { backgroundColor: bgColor }, style]}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
});
