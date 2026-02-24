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
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [entrySearchQuery, setEntrySearchQuery] = useState('');

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
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Select Date</Text>

                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm }}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>New Entry</Text>
                                    </TouchableOpacity>
                                </View>

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

                    {showDatePicker && (
                        <DateTimePicker
                            value={recordingDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                        />
                    )}

                    {/* InventoryDateViewer Component */}
                    {selectedViewDate && !showDatePicker && (
                        <InventoryDateViewer
                            selectedDate={selectedViewDate}
                            parts={parts}
                        />
                    )}

                    {/* Add New Inventory Mode (Active when no historical date is selected) */}
                    {!selectedViewDate && !showDatePicker && (
                        <Card>
                            {/* Search bar */}
                            <View style={styles.searchContainer}>
                                <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                                <Input
                                    placeholder="Search by Part No. or Description..."
                                    value={entrySearchQuery}
                                    onChangeText={setEntrySearchQuery}
                                    style={{ flex: 1, marginBottom: 0 }}
                                />
                                {entrySearchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setEntrySearchQuery('')} style={styles.clearSearchBtn}>
                                        <MaterialCommunityIcons name="close-circle" size={20} color={colors.textLight} />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Sticky-header table */}
                            <ScrollView
                                style={[styles.tableScrollView, { borderColor: colors.border }]}
                                stickyHeaderIndices={[0]}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={true}
                            >
                                {/* Header row */}
                                <View style={[styles.tableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                                    <Text style={[styles.tableHeaderText, { flex: 2, color: colors.textSecondary }]}>CBF Part No.</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Rack</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Level</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Bin</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right', color: colors.textSecondary }]}>Qty</Text>
                                </View>

                                <View>
                                    {entries
                                        .map((entry, index) => ({ entry, originalIndex: index }))
                                        .filter(({ entry }) => {
                                            if (!entrySearchQuery) return true;
                                            const partDetails = parts.find(p => p.cbf_part_no === entry.cbf_part_number);
                                            const q = entrySearchQuery.toLowerCase();
                                            return (
                                                entry.cbf_part_number.toLowerCase().includes(q) ||
                                                (partDetails?.part_description?.toLowerCase() || '').includes(q)
                                            );
                                        })
                                        .map(({ entry, originalIndex }) => {
                                            const isEditing = editingRowIndex === originalIndex;
                                            const partDetails = parts.find(p => p.cbf_part_no === entry.cbf_part_number);

                                            if (isEditing) {
                                                return (
                                                    <View key={originalIndex} style={[styles.editCard, { backgroundColor: colors.card }]}>
                                                        <View style={styles.entryHeader}>
                                                            <TouchableOpacity
                                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                                                onPress={() => setEditingRowIndex(null)}
                                                            >
                                                                <MaterialCommunityIcons name="chevron-up" size={24} color={colors.textSecondary} />
                                                                <Text style={[styles.entryTitle, { color: colors.textSecondary, fontSize: 14 }]}>
                                                                    Editing Entry #{originalIndex + 1}
                                                                </Text>
                                                            </TouchableOpacity>
                                                            {entries.length > 1 && (
                                                                <TouchableOpacity onPress={() => { removeEntry(originalIndex); setEditingRowIndex(null); }}>
                                                                    <MaterialCommunityIcons name="trash-can" size={22} color={colors.danger} />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>

                                                        <SearchablePartSelector
                                                            parts={parts}
                                                            selectedPart={entry.cbf_part_number}
                                                            onSelectPart={(partNo) => updateEntry(originalIndex, 'cbf_part_number', partNo)}
                                                            label="CBF Part Number"
                                                            showExternalScanner={true}
                                                        />

                                                        <TouchableOpacity
                                                            style={[styles.scanLocationBtn, { borderColor: colors.primary }]}
                                                            onPress={() => {
                                                                locationScanEntryIndexRef.current = originalIndex;
                                                                setLocationScanEntryIndex(originalIndex);
                                                                setLocationScannerVisible(true);
                                                            }}
                                                        >
                                                            <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.primary} />
                                                            <Text style={[styles.scanLocationText, { color: colors.primary }]}>Scan Location (Rack–Level–Bin)</Text>
                                                        </TouchableOpacity>

                                                        <View style={styles.row}>
                                                            <View style={styles.thirdInput}>
                                                                <Input label="Rack *" placeholder="X" value={entry.rack} onChangeText={(t) => updateEntry(originalIndex, 'rack', t)} />
                                                            </View>
                                                            <View style={styles.thirdInput}>
                                                                <Input label="Level *" placeholder="1" value={entry.level} onChangeText={(t) => updateEntry(originalIndex, 'level', t)} />
                                                            </View>
                                                            <View style={styles.thirdInput}>
                                                                <Input label="Bin *" placeholder="A" value={entry.bin} onChangeText={(t) => updateEntry(originalIndex, 'bin', t)} />
                                                            </View>
                                                        </View>

                                                        <Input
                                                            label="Quantity *"
                                                            placeholder="Counted Qty"
                                                            keyboardType="numeric"
                                                            value={entry.quantity ? String(entry.quantity) : ''}
                                                            onChangeText={(t) => updateEntry(originalIndex, 'quantity', parseInt(t) || 0)}
                                                        />

                                                        <Button
                                                            title="Done Editing"
                                                            onPress={() => setEditingRowIndex(null)}
                                                            style={{ marginTop: SPACING.sm }}
                                                            variant="secondary"
                                                        />
                                                    </View>
                                                );
                                            }

                                            // View row
                                            return (
                                                <TouchableOpacity
                                                    key={originalIndex}
                                                    style={[styles.tableRow, { borderBottomColor: colors.border }]}
                                                    onPress={() => setEditingRowIndex(originalIndex)}
                                                >
                                                    <View style={{ flex: 2, paddingRight: SPACING.sm }}>
                                                        <Text style={[styles.partNumberText, { color: colors.textPrimary }]} numberOfLines={1}>
                                                            {entry.cbf_part_number || '<Empty>'}
                                                        </Text>
                                                        {partDetails && (
                                                            <Text style={[styles.partDescText, { color: colors.textSecondary }]} numberOfLines={1}>
                                                                {partDetails.part_description}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>{entry.rack || '-'}</Text>
                                                    <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>{entry.level || '-'}</Text>
                                                    <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>{entry.bin || '-'}</Text>
                                                    <Text style={[styles.cellText, { flex: 1, textAlign: 'right', color: colors.textPrimary }]}>{entry.quantity || 0}</Text>
                                                </TouchableOpacity>
                                            );
                                        })
                                    }
                                </View>
                            </ScrollView>

                            <Button
                                title="Add Another Entry"
                                variant="secondary"
                                onPress={() => { addEntry(); setEditingRowIndex(entries.length); }}
                                icon={<MaterialCommunityIcons name="plus" size={20} color={colors.primary} />}
                                style={styles.addButton}
                            />
                        </Card>
                    )}

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
        </View >
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
        marginTop: 8,
    },
    scanLocationText: {
        fontSize: 13,
        fontWeight: '600',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    searchIcon: {
        marginLeft: SPACING.sm,
        marginRight: -35, // Adjust this so the icon sits inside the input field padding
        zIndex: 1,
    },
    clearSearchBtn: {
        position: 'absolute',
        right: SPACING.sm,
        padding: SPACING.xs,
    },
    tableScrollView: {
        maxHeight: 400,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
        borderWidth: 1,
        marginTop: SPACING.sm,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    partNumberText: {
        fontSize: 14,
        fontWeight: '700',
    },
    partDescText: {
        fontSize: 12,
        marginTop: 2,
    },
    cellText: {
        fontSize: 14,
        fontWeight: '600',
    },
    editCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.info,
    },
});

