import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getThemeColors, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface SuccessModalProps {
    visible: boolean;
    title: string;
    message: string;
    /** Optional sub-details like "5 parts recorded" */
    detail?: string;
    /** Icon name from MaterialCommunityIcons, default: check-circle */
    icon?: string;
    /** Icon + accent color override */
    color?: string;
    onClose: () => void;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Set to 'danger' for destructive confirm buttons */
    variant?: 'success' | 'danger' | 'warning';
}

export default function SuccessModal({
    visible,
    title,
    message,
    detail,
    icon,
    color,
    onClose,
    onConfirm,
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
    variant = 'success',
}: SuccessModalProps) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const accentColor =
        color ||
        (variant === 'danger'
            ? colors.danger
            : variant === 'warning'
            ? '#f59e0b'
            : '#10b981');

    const iconName = icon || (variant === 'danger' ? 'alert-circle' : variant === 'warning' ? 'alert' : 'check-circle');

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <Animated.View
                    style={[
                        styles.card,
                        {
                            backgroundColor: colors.card,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                    ]}
                    // Prevent touches inside the card from closing the modal
                    // @ts-ignore
                    onStartShouldSetResponder={() => true}
                >
                    {/* Icon area */}
                    <View style={[styles.iconCircle, { backgroundColor: accentColor + '18' }]}>
                        <MaterialCommunityIcons name={iconName as any} size={54} color={accentColor} />
                    </View>

                    <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                    {detail ? (
                        <View style={[styles.detailBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '40' }]}>
                            <MaterialCommunityIcons name="information-outline" size={15} color={accentColor} />
                            <Text style={[styles.detailText, { color: accentColor }]}>{detail}</Text>
                        </View>
                    ) : null}

                    {/* Button row */}
                    <View style={styles.buttonRow}>
                        {onConfirm ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]}
                                    onPress={onClose}
                                    activeOpacity={0.75}
                                >
                                    <Text style={[styles.btnText, { color: colors.textSecondary }]}>{cancelLabel}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btn, styles.confirmBtn, { backgroundColor: accentColor }]}
                                    onPress={() => { onClose(); onConfirm(); }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.btnText, { color: '#fff' }]}>{confirmLabel}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <TouchableOpacity
                                style={[styles.btn, styles.confirmBtn, styles.singleBtn, { backgroundColor: accentColor }]}
                                onPress={onClose}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.btnText, { color: '#fff' }]}>{confirmLabel}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    card: {
        width: '100%',
        maxWidth: 360,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xl,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: SPACING.md,
    },
    detailBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        borderWidth: 1,
        marginBottom: SPACING.lg,
    },
    detailText: {
        fontSize: 13,
        fontWeight: '600',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        width: '100%',
    },
    btn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    cancelBtn: {
        borderWidth: 1,
    },
    confirmBtn: {},
    singleBtn: {
        flex: 1,
    },
    btnText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
