import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web-compatible storage wrapper
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === 'web') {
            try {
                return localStorage.getItem(key);
            } catch (error) {
                console.error('Error getting item from localStorage:', error);
                return null;
            }
        }
        return AsyncStorage.getItem(key);
    },

    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, value);
            } catch (error) {
                console.error('Error setting item to localStorage:', error);
            }
            return;
        }
        return AsyncStorage.setItem(key, value);
    },

    async removeItem(key: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('Error removing item from localStorage:', error);
            }
            return;
        }
        return AsyncStorage.removeItem(key);
    },

    async clear(): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                localStorage.clear();
            } catch (error) {
                console.error('Error clearing localStorage:', error);
            }
            return;
        }
        return AsyncStorage.clear();
    }
};

export default storage;
