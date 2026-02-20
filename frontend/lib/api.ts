// API client configured for React Native
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://inventoryapp-hyoz.onrender.com';

// Create axios instance with proper configuration for React Native
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30s — Google Sheets can be slow on first call
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',  // Bypass ngrok warning page
    },
});

// Use XMLHttpRequest adapter explicitly (works in React Native)
if (axios.defaults.adapter) {
    apiClient.defaults.adapter = axios.defaults.adapter;
}

export default apiClient;
export { API_BASE_URL };
