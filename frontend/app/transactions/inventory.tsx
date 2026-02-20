import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import storage from '../../utils/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../../lib/api';
import SearchablePartSelector from '../../components/SearchablePartSelector';
import SearchableProjectSelector from '../../components/SearchableProjectSelector';
import { getThemeColors, COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppHeader from '../../components/ui/AppHeader';
import InventoryDateViewer from '../../components/InventoryDateViewer';
import QRScanner from '../../components/QRScanner';
import { useMasterData } from '../../contexts/MasterDataContext';

interface Part {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    part_description: string;
}

interface InventoryEntry {
    cbf_part_number: string;
    rack: string;
    level: string;
    bin: string;
    quantity: number;
}

export default function InventoryScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);
    const { parts, ensureDataLoaded, loading: masterLoading } = useMasterData();
    const [user, setUser] = useState<any>(null);
    const [recordingDate, setRecordingDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Date viewer states
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [selectedViewDate, setSelectedViewDate] = useState<string>('');
    const [showDateDropdown, setShowDateDropdown] = useState(false);

    const [entries, setEntries] = useState<InventoryEntry[]>([
        { cbf_part_number: '', rack: '', level: '', bin: '', quantity: 0 },
    ]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [locationScannerVisible, setLocationScannerVisible] = useState(false);
    const [locationScanEntryIndex, setLocationScanEntryIndex] = useState<number | null>(null);
    // Ref ensures the latest index is always available inside the scan callback (no stale closure)
    const locationScanEntryIndexRef = useRef<number | null>(null);

    useEffect(() => {
        loadUserAndData();
    }, []);

    const loadUserAndData = async () => {
        try {
            const userData = await storage.getItem('user');
            if (!userData) {
                router.replace('/auth/login' as any);
                return;
            }
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);

            // Parts come from shared context (no extra network call if already cached)
            await Promise.all([
                ensureDataLoaded(),
                apiClient.get('/api/inventory/dates').catch(() => ({ data: [] }))
                    .then(res => setAvailableDates(res.data)),
            ]);
            setLoadingData(false);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
            setLoadingData(false);
        }
    };

    const addEntry = () => {
        setEntries([...entries, { cbf_part_number: '', rack: '', level: '', bin: '', quantity: 0 }]);
    };

    const removeEntry = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
    };

    const updateEntry = (index: number, field: keyof InventoryEntry, value: any) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    // Update multiple fields at once (avoids stale closure when setting rack+level+bin together)
    const updateEntryFields = (index: number, fields: Partial<InventoryEntry>) => {
        setEntries(prev => {
            const newEntries = [...prev];
            newEntries[index] = { ...newEntries[index], ...fields };
            return newEntries;
        });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setRecordingDate(selectedDate);
        }
    };

    const handleSubmit = async () => {
        const validEntries = entries.filter(
            (e) => e.cbf_part_number && e.rack && e.level && e.bin && e.quantity >= 0
        );

        if (validEntries.length === 0) {
            Alert.alert('Error', 'Please add at least one complete entry (Part, Location, Qty)');
            return;
        }

        setLoading(true);

        try {
            await apiClient.post('/api/inventory', {
                employee_name: user.name,
                recording_date: formatDate(recordingDate),
                entries: validEntries,
            });

            Alert.alert('Success', `${validEntries.length} inventory record(s) saved`, [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            console.error('Error submitting inventory:', error);
            Alert.alert('Error', 'Failed to submit inventory');
        } finally {
            setLoading(false);
        }
    };

    if (loadingData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    return (
        <>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
                <SafeAreaView style={styles.container}>
                    <AppHeader showBackButton />

                    <ScrollView style={styles.content}>
                        <View style={styles.infoRow}>
                            <Card style={styles.infoCard}>
                                <MaterialCommunityIcons name="warehouse" size={24} color={colors.accent} />
                                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Inventory</Text>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
                            </Card>
                            <Card style={styles.infoCard}>
                                <MaterialCommunityIcons name="account" size={24} color={colors.accent} />
                                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name?.split(' ')[0]}</Text>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Employee</Text>
                            </Card>
                        </View>

                        {/* View Past Inventory Section */}
                        <Card style={styles.viewSection}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="history" size={20} color={colors.accent} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                    View Past Inventory
                                </Text>
                            </View>

                            {availableDates.length === 0 ? (
                                <Text style={[styles.label, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 12 }]}>
                                    No inventory records found yet.{'\n'}Submit your first entry below.
                                </Text>
                            ) : (
                                <>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>Select Date</Text>
                                    <TouchableOpacity
                                        style={[styles.dateDropdown, { borderColor: colors.border }]}
                                        onPress={() => setShowDateDropdown(!showDateDropdown)}
                                    >
                                        <Text style={[styles.dateDropdownText, { color: selectedViewDate ? colors.textPrimary : colors.textLight }]}>
                                            {selectedViewDate || 'Select a date...'}
                                        </Text>
                                        <MaterialCommunityIcons
                                            name={showDateDropdown ? "chevron-up" : "chevron-down"}
                                            size={24}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>

                                    {showDateDropdown && (
                                        <ScrollView
                                            style={[styles.dateList, { backgroundColor: colors.card, borderColor: colors.border }]}
                                            nestedScrollEnabled={true}
                                            keyboardShouldPersistTaps="handled"
                                        >
                                            {availableDates.map((date, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={[
                                                        styles.dateItem,
                                                        selectedViewDate === date && styles.dateItemSelected,
                                                        selectedViewDate === date && { backgroundColor: colors.primaryLight }
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedViewDate(date);
                                                        setShowDateDropdown(false);
                                                    }}
                                                >
                                                    <MaterialCommunityIcons
                                                        name="calendar-check"
                                                        size={16}
                                                        color={selectedViewDate === date ? colors.primary : colors.textSecondary}
                                                    />
                                                    <Text style={[
                                                        styles.dateItemText,
                                                        { color: selectedViewDate === date ? colors.primary : colors.textPrimary }
                                                    ]}>
                                                        {date}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    )}
                                </>
                            )}
                        </Card>

                        {/* InventoryDateViewer Component */}
                        {selectedViewDate && (
                            <InventoryDateViewer
                                selectedDate={selectedViewDate}
                                parts={parts}
                            />
                        )}

                        {/* Divider */}
                        {selectedViewDate && (
                            <View style={styles.divider}>
                                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                            </View>
                        )}

                        {/* Add New Inventory Today Section */}
                        <Card>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.success} />
                                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                                    Add New Inventory
                                </Text>
                            </View>

                            <Text style={styles.label}>Recording Date</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.dateText}>{formatDate(recordingDate)}</Text>
                                <MaterialCommunityIcons name="calendar" size={24} color={colors.primary} />
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={recordingDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                />
                            )}
                        </Card>

                        {entries.map((entry, index) => (
                            <Card key={index} style={styles.entryCard}>
                                <View style={styles.entryHeader}>
                                    <Text style={[styles.entryTitle, { color: colors.accent }]}>Entry {index + 1}</Text>
                                    {entries.length > 1 && (
                                        <TouchableOpacity onPress={() => removeEntry(index)}>
                                            <MaterialCommunityIcons name="trash-can" size={24} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <SearchablePartSelector
                                    parts={parts}
                                    selectedPart={entry.cbf_part_number}
                                    onSelectPart={(partNo) => updateEntry(index, 'cbf_part_number', partNo)}
                                    label="CBF Part Number"
                                    showExternalScanner={true}
                                />

                                {/* Single QR scan fills Rack, Level & Bin at once */}
                                <TouchableOpacity
                                    style={[styles.scanLocationBtn, { borderColor: colors.primary }]}
                                    onPress={() => {
                                        locationScanEntryIndexRef.current = index;
                                        setLocationScanEntryIndex(index);
                                        setLocationScannerVisible(true);
                                    }}
                                >
                                    <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.primary} />
                                    <Text style={[styles.scanLocationText, { color: colors.primary }]}>Scan Location (Rack–Level–Bin)</Text>
                                </TouchableOpacity>

                                <View style={styles.row}>
                                    <View style={styles.thirdInput}>
                                        <Input
                                            label="Rack *"
                                            placeholder="X"
                                            value={entry.rack}
                                            onChangeText={(text) => updateEntry(index, 'rack', text)}
                                        />
                                    </View>
                                    <View style={styles.thirdInput}>
                                        <Input
                                            label="Level *"
                                            placeholder="1"
                                            value={entry.level}
                                            onChangeText={(text) => updateEntry(index, 'level', text)}
                                        />
                                    </View>
                                    <View style={styles.thirdInput}>
                                        <Input
                                            label="Bin *"
                                            placeholder="A"
                                            value={entry.bin}
                                            onChangeText={(text) => updateEntry(index, 'bin', text)}
                                        />
                                    </View>
                                </View>

                                <Input
                                    label="Quantity *"
                                    placeholder="Counted Qty"
                                    keyboardType="numeric"
                                    value={entry.quantity ? String(entry.quantity) : ''}
                                    onChangeText={(text) => updateEntry(index, 'quantity', parseInt(text) || 0)}
                                />
                            </Card>
                        ))}

                        <Button
                            title="Add Another Entry"
                            variant="secondary"
                            onPress={addEntry}
                            icon={<MaterialCommunityIcons name="plus" size={20} color={colors.primary} />}
                            style={styles.addButton}
                        />

                        <Button
                            title="Submit Inventory"
                            onPress={handleSubmit}
                            loading={loading}
                            style={styles.submitButton}
                            icon={<MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
                        />

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </SafeAreaView>
            </View>
            <QRScanner
                visible={locationScannerVisible}
                onClose={() => { setLocationScannerVisible(false); setLocationScanEntryIndex(null); locationScanEntryIndexRef.current = null; }}
                onScan={(data) => {
                    // Use ref (always current) instead of state (can be stale in closures)
                    const targetIndex = locationScanEntryIndexRef.current;
                    console.log('QR scanned:', data, 'targetIndex:', targetIndex);
                    if (targetIndex !== null) {
                        const segments = data.trim().split(/[-|\/]/);
                        if (segments.length >= 3) {
                            updateEntryFields(targetIndex, {
                                rack: segments[0].trim(),
                                level: segments[1].trim(),
                                bin: segments[2].trim(),
                            });
                        } else {
                            updateEntry(targetIndex, 'rack', data.trim());
                        }
                    }
                    locationScanEntryIndexRef.current = null;
                    setLocationScannerVisible(false);
                    setLocationScanEntryIndex(null);
                }}
                title="Scan Location QR (Rack–Level–Bin)"
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        padding: SPACING.md,
    },
    infoRow: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    infoCard: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.card,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    entryCard: {
        borderLeftWidth: 4,
        borderLeftColor: COLORS.info, // Blue for Inventory
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    entryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.info,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    dateText: {
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    thirdInput: {
        flex: 1,
    },
    addButton: {
        marginBottom: SPACING.md,
    },
    submitButton: {
        marginBottom: SPACING.lg,
    },
    viewSection: {
        marginBottom: SPACING.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    dateDropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.inputBackground,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.sm,
    },
    dateDropdownText: {
        fontSize: 16,
    },
    dateList: {
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        marginTop: -SPACING.sm,
        maxHeight: 200,
    },
    dateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    dateItemSelected: {
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    dateItemText: {
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: SPACING.md,
        fontSize: 14,
        fontWeight: '600',
    },
    scanLocationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 8,
        borderStyle: 'dashed',
        paddingVertical: 10,
        marginBottom: 8,
    },
    scanLocationText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

