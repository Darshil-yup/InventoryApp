import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getThemeColors, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface AppHeaderProps {
    showBackButton?: boolean;
}

export default function AppHeader({ showBackButton = false }: AppHeaderProps) {
    const router = useRouter();
    const { isDark, toggleTheme } = useTheme();
    const colors = getThemeColors(isDark);

    return (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            {showBackButton ? (
                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.primary + '20' }]}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={colors.accent} />
                </TouchableOpacity>
            ) : (
                <View style={styles.placeholder} />
            )}

            <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />

            <TouchableOpacity
                style={[styles.themeButton, { backgroundColor: colors.accent + '20' }]}
                onPress={toggleTheme}
            >
                <MaterialCommunityIcons
                    name={isDark ? "weather-sunny" : "moon-waning-crescent"}
                    size={22}
                    color={colors.accent}
                />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
    placeholder: {
        width: 40,
    },
    logo: {
        width: 150,
        height: 60,
    },
    themeButton: {
        padding: 8,
        borderRadius: BORDER_RADIUS.md,
    },
});
