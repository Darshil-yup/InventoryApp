import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Alert,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import storage from '../../utils/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../lib/api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
import GradientBackground from '../../components/ui/GradientBackground';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ChangePINScreen() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [currentPIN, setCurrentPIN] = useState('');
    const [newPIN, setNewPIN] = useState('');
    const [confirmPIN, setConfirmPIN] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await storage.getItem('user');
            if (!userData) {
                router.replace('/auth/login' as any);
                return;
            }
            setUser(JSON.parse(userData));
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };

    const handleChangePIN = async () => {
        if (!currentPIN || !newPIN || !confirmPIN) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (currentPIN !== user.pin) {
            Alert.alert('Error', 'Current PIN is incorrect');
            return;
        }

        if (newPIN.length !== 4 || !/^\d+$/.test(newPIN)) {
            Alert.alert('Error', 'New PIN must be exactly 4 digits');
            return;
        }

        if (newPIN !== confirmPIN) {
            Alert.alert('Error', 'New PIN and confirmation do not match');
            return;
        }

        if (newPIN === currentPIN) {
            Alert.alert('Error', 'New PIN must be different from current PIN');
            return;
        }

        setLoading(true);

        try {
            await apiClient.post('/api/auth/change-pin', {
                name: user.name,
                current_pin: currentPIN,
                new_pin: newPIN,
            });

            const updatedUser = { ...user, pin: newPIN };
            await storage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            Alert.alert('Success', 'PIN changed successfully', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            console.error('Error changing PIN:', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to change PIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Change PIN</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <Card style={styles.infoCard}>
                        <View style={styles.userInfo}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {user?.name?.charAt(0).toUpperCase() || '?'}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.infoLabel}>Logged in as</Text>
                                <Text style={styles.infoValue}>{user?.name}</Text>
                            </View>
                        </View>
                    </Card>

                    <Card>
                        <Input
                            label="Current PIN *"
                            placeholder="Enter current 4-digit PIN"
                            keyboardType="numeric"
                            maxLength={4}
                            secureTextEntry
                            value={currentPIN}
                            onChangeText={setCurrentPIN}
                        />

                        <Input
                            label="New PIN *"
                            placeholder="Enter new 4-digit PIN"
                            keyboardType="numeric"
                            maxLength={4}
                            secureTextEntry
                            value={newPIN}
                            onChangeText={setNewPIN}
                        />

                        <Input
                            label="Confirm New PIN *"
                            placeholder="Re-enter new PIN"
                            keyboardType="numeric"
                            maxLength={4}
                            secureTextEntry
                            value={confirmPIN}
                            onChangeText={setConfirmPIN}
                        />

                        <Button
                            title="Update PIN"
                            onPress={handleChangePIN}
                            loading={loading}
                            style={styles.submitButton}
                            icon={<MaterialCommunityIcons name="lock-reset" size={20} color={COLORS.primary} />}
                        />
                    </Card>
                </ScrollView>
            </SafeAreaView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
    },
    backButton: {
        padding: SPACING.sm,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: BORDER_RADIUS.md,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textInverse,
    },
    content: {
        padding: SPACING.md,
    },
    infoCard: {
        marginBottom: SPACING.md,
        backgroundColor: 'rgba(255,255,255,0.9)',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: BORDER_RADIUS.circle,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: COLORS.accent,
        fontSize: 20,
        fontWeight: 'bold',
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    infoValue: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    submitButton: {
        marginTop: SPACING.md,
    },
});
