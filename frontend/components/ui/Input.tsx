import React, { ReactNode } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { getThemeColors, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftElement?: ReactNode;
    rightElement?: ReactNode;
}

export default function Input({ label, error, style, leftElement, rightElement, ...props }: InputProps) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);

    const inputStyle = [
        styles.input,
        {
            backgroundColor: colors.inputBackground,
            color: colors.textPrimary,
            borderColor: error ? colors.danger : 'transparent',
        },
        error ? { borderWidth: 1 } : {},
        leftElement || rightElement ? { flex: 1, marginBottom: 0 } : {},
        leftElement ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeftWidth: 0 } : {},
        rightElement ? { borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 } : {},
        style,
    ];

    return (
        <View style={styles.container}>
            {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
            {leftElement || rightElement ? (
                <View style={[
                    styles.inputRow,
                    {
                        backgroundColor: colors.inputBackground,
                        borderColor: error ? colors.danger : colors.border,
                        borderRadius: BORDER_RADIUS.md,
                    }
                ]}>
                    {leftElement}
                    <TextInput
                        style={inputStyle}
                        placeholderTextColor={colors.textSecondary}
                        {...props}
                    />
                    {rightElement}
                </View>
            ) : (
                <TextInput
                    style={inputStyle}
                    placeholderTextColor={colors.textSecondary}
                    {...props}
                />
            )}
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
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        overflow: 'hidden',
    },
    errorText: {
        ...TYPOGRAPHY.bodySmall,
        marginTop: 4,
    },
});
