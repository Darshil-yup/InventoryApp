import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import storage from '../../utils/storage';
import apiClient from '../../lib/api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
import GradientBackground from '../../components/ui/GradientBackground';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
    const router = useRouter();
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);

    useEffect(() => {
        checkExistingLogin();
    }, []);

    const checkExistingLogin = async () => {
        try {
            const userData = await storage.getItem('user');
            if (userData) {
                router.replace('/(tabs)' as any);
            }
        } catch (error) {
            console.error('Error checking login:', error);
        }
    };

    const handleLogin = async () => {
        if (!selectedEmployee) {
            Alert.alert('Error', 'Please enter your name');
            return;
        }

        if (!pin || pin.length !== 4) {
            Alert.alert('Error', 'Please enter a 4-digit PIN');
            return;
        }

        setLoading(true);

        try {
            const response = await apiClient.post('/api/auth/login', {
                name: selectedEmployee.trim(),
                pin: pin,
            });

            if (response.data.success) {
                const userData = {
                    name: selectedEmployee,
                    pin: pin,
                    loginTime: new Date().toISOString(),
                };

                await storage.setItem('user', JSON.stringify(userData));
                router.replace('/(tabs)' as any);
            }
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.response?.status === 401) {
                Alert.alert('Error', 'Incorrect PIN');
            } else if (error.response?.status === 404) {
                Alert.alert('Error', 'Employee not found');
            } else {
                Alert.alert('Error', 'Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground>
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={styles.header}>
                            <View style={styles.iconContainer}>
                                <MaterialCommunityIcons name="cube-scan" size={48} color={COLORS.accent} />
                            </View>
                            <Text style={styles.title}>Chicago Bifold</Text>
                            <Text style={styles.subtitle}>Inventory Management</Text>
                        </View>

                        <Card style={styles.formCard}>
                            <Text style={styles.formTitle}>Welcome Back</Text>
                            <Text style={styles.formSubtitle}>Please sign in to continue</Text>

                            <Input
                                label="Employee Name"
                                placeholder="Enter your name"
                                value={selectedEmployee}
                                onChangeText={setSelectedEmployee}
                                editable={!loading}
                                autoCapitalize="words"
                                autoCorrect={false}
                                placeholderTextColor={COLORS.textLight}
                            />

                            <Input
                                label="PIN"
                                placeholder="Enter 4-digit PIN"
                                secureTextEntry={!showPin}
                                keyboardType="numeric"
                                maxLength={4}
                                value={pin}
                                onChangeText={setPin}
                                editable={!loading}
                                placeholderTextColor={COLORS.textLight}
                                rightElement={
                                    <TouchableOpacity
                                        onPress={() => setShowPin(!showPin)}
                                        style={{ paddingHorizontal: SPACING.sm }}
                                    >
                                        <MaterialCommunityIcons
                                            name={showPin ? 'eye-off' : 'eye'}
                                            size={22}
                                            color={COLORS.textLight}
                                        />
                                    </TouchableOpacity>
                                }
                            />

                            <Button
                                title="Login"
                                onPress={handleLogin}
                                loading={loading}
                                style={styles.loginButton}
                                icon={<MaterialCommunityIcons name="login" size={20} color={COLORS.primary} />}
                            />
                        </Card>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: BORDER_RADIUS.circle,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.textInverse,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.accent,
        fontWeight: '500',
        letterSpacing: 1,
    },
    formCard: {
        padding: SPACING.xl,
    },
    formTitle: {
        ...TYPOGRAPHY.h2,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    formSubtitle: {
        ...TYPOGRAPHY.bodySmall,
        marginBottom: SPACING.xl,
        textAlign: 'center',
    },
    loginButton: {
        marginTop: SPACING.md,
    },
});
