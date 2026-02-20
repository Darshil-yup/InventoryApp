import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import storage from '../utils/storage';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    useEffect(() => {
        checkLogin();
    }, []);

    const checkLogin = async () => {
        try {
            const userData = await storage.getItem('user');
            setIsLoggedIn(!!userData);
        } catch (error) {
            console.error('Error checking login:', error);
            setIsLoggedIn(false);
        }
    };

    if (isLoggedIn === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#2563eb" />
            </View>
        );
    }

    return <Redirect href={isLoggedIn ? '/(tabs)' : '/auth/login'} />;
}
