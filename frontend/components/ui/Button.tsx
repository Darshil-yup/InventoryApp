import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { getThemeColors, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    textStyle,
    icon,
}: ButtonProps) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);

    const getBackgroundColor = () => {
        if (disabled) return colors.textSecondary;
        switch (variant) {
            case 'primary': return colors.accent;
            case 'secondary': return colors.primaryLight;
            case 'danger': return colors.danger;
            case 'outline': return 'transparent';
            default: return colors.accent;
        }
    };

    const getTextColor = () => {
        if (variant === 'outline') return colors.primary;
        if (variant === 'primary') return colors.primary; // Dark text on gold button
        return colors.textInverse;
    };

    const getBorderColor = () => {
        if (variant === 'outline') return colors.primary;
        return 'transparent';
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    backgroundColor: getBackgroundColor(),
                    borderColor: getBorderColor(),
                    borderWidth: variant === 'outline' ? 1 : 0,
                },
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon}
                    <Text
                        style={[
                            styles.text,
                            {
                                color: getTextColor(),
                                marginLeft: icon ? 8 : 0,
                            },
                            textStyle,
                        ]}
                    >
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        borderRadius: BORDER_RADIUS.md,
        minHeight: 50,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
