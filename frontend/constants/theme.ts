// Light Theme Colors
export const LIGHT_COLORS = {
    // Primary Brand Colors (Deep Navy & Gold)
    primary: '#0f172a', // Deep Navy / Slate 900
    primaryLight: '#1e293b', // Slate 800
    accent: '#f59e0b', // Amber 500 (Gold)
    accentLight: '#fbbf24', // Amber 400

    // Backgrounds
    background: '#f8fafc', // Slate 50
    card: '#ffffff',
    cardSecondary: '#f1f5f9', // Slate 100

    // Text
    textPrimary: '#0f172a', // Slate 900
    textSecondary: '#64748b', // Slate 500
    textLight: '#cbd5e1', // Slate 300
    textInverse: '#ffffff',

    // Status
    success: '#10b981', // Emerald 500
    danger: '#ef4444', // Red 500
    warning: '#f59e0b', // Amber 500
    info: '#3b82f6', // Blue 500

    // UI Elements
    border: '#e2e8f0', // Slate 200
    inputBackground: '#f1f5f9', // Slate 100
};

// Dark Theme Colors
export const DARK_COLORS = {
    // Primary Brand Colors (Navy & Gold)
    primary: '#1e293b', // Slate 800
    primaryLight: '#334155', // Slate 700
    accent: '#fbbf24', // Amber 400 (Gold)
    accentLight: '#fcd34d', // Amber 300

    // Backgrounds
    background: '#0f172a', // Deep Navy
    card: '#1e293b', // Slate 800
    cardSecondary: '#334155', // Slate 700

    // Text
    textPrimary: '#f1f5f9', // Slate 100
    textSecondary: '#94a3b8', // Slate 400
    textLight: '#64748b', // Slate 500
    textInverse: '#0f172a', // Deep Navy

    // Status
    success: '#34d399', // Emerald 400
    danger: '#f87171', // Red 400
    warning: '#fbbf24', // Amber 400
    info: '#60a5fa', // Blue 400

    // UI Elements
    border: '#334155', // Slate 700
    inputBackground: '#334155', // Slate 700
};

// Default export for backward compatibility
export const COLORS = LIGHT_COLORS;

// Function to get theme colors based on isDark flag
export const getThemeColors = (isDark: boolean) => {
    return isDark ? DARK_COLORS : LIGHT_COLORS;
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BORDER_RADIUS = {
    sm: 6,
    md: 12,
    lg: 20,
    xl: 30,
    circle: 9999,
};

export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
        elevation: 10,
    },
};

export const TYPOGRAPHY = {
    h1: { fontSize: 32, fontWeight: '700' as const, color: COLORS.textPrimary },
    h2: { fontSize: 24, fontWeight: '700' as const, color: COLORS.textPrimary },
    h3: { fontSize: 20, fontWeight: '600' as const, color: COLORS.textPrimary },
    body: { fontSize: 16, color: COLORS.textPrimary },
    bodySmall: { fontSize: 14, color: COLORS.textSecondary },
    label: { fontSize: 14, fontWeight: '600' as const, color: COLORS.textSecondary },
};
