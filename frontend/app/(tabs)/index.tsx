import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Image,
    Platform,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import storage from '../../utils/storage';
import { getThemeColors, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export default function HomeScreen() {
    const router = useRouter();
    const { isDark, toggleTheme } = useTheme();
    const colors = getThemeColors(isDark);
    const [userName, setUserName] = useState('');

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await storage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUserName(user.name);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await storage.removeItem('user');
                        router.replace('/auth/login' as any);
                    },
                },
            ]
        );
    };

    const menuItems = [
        {
            id: 'requisition',
            title: 'Requisition',
            subtitle: 'Take parts out',
            icon: 'file-document-edit',
            color: '#ef4444',
            route: '/transactions/requisition',
        },
        {
            id: 'receiving',
            title: 'Receiving',
            subtitle: 'Add new stock',
            icon: 'package-variant-closed',
            color: '#10b981',
            route: '/transactions/receiving',
        },
        {
            id: 'mto',
            title: 'MTO',
            subtitle: 'Material Transfer Out',
            icon: 'truck-delivery',
            color: '#f59e0b',
            route: '/transactions/mto',
        },
        {
            id: 'inventory',
            title: 'Inventory',
            subtitle: 'Physical count',
            icon: 'clipboard-list',
            color: '#3b82f6',
            route: '/transactions/inventory',
        },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
                <View style={[styles.logoHeader, { borderBottomColor: colors.border }]}>
                    <Image
                        source={require('../../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <View style={styles.headerActions}>
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
                        <TouchableOpacity
                            style={[styles.logoutButton, { backgroundColor: colors.danger + '20' }]}
                            onPress={handleLogout}
                        >
                            <MaterialCommunityIcons name="logout" size={22} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Select Transaction Type</Text>

                <View style={styles.gridContainer}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.card, { backgroundColor: colors.card, borderLeftColor: item.color }]}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={40}
                                    color={item.color}
                                />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                            </View>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: SPACING.lg,
    },
    logoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
    },
    logo: {
        width: 180,
        height: 60,
    },
    headerActions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    themeButton: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
    logoutButton: {
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: SPACING.md,
    },
    gridContainer: {
        gap: SPACING.md,
    },
    card: {
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.lg,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: BORDER_RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
    },
});
