import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { getThemeColors, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: colors.inputBackground,
                        color: colors.textPrimary,
                        borderColor: error ? colors.danger : 'transparent',
                    },
                    error ? { borderWidth: 1 } : {},
                    style,
                ]}
                placeholderTextColor={colors.textSecondary}
                {...props}
            />
            {error && <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        ...TYPOGRAPHY.label,
        marginBottom: SPACING.xs,
    },
    input: {
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        fontSize: 16,
        borderWidth: 1,
    },
    errorText: {
        ...TYPOGRAPHY.bodySmall,
        marginTop: 4,
    },
});
