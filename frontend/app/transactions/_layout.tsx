import { Stack } from 'expo-router';

export default function TransactionsLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="requisition" />
            <Stack.Screen name="receiving" />
            <Stack.Screen name="mto" />
            <Stack.Screen name="inventory" />
        </Stack>
    );
}
