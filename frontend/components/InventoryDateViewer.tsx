import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../lib/api';
import { getThemeColors, COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import SearchablePartSelector from './SearchablePartSelector';
import QRScanner from './QRScanner';
import { useMasterData } from '../contexts/MasterDataContext';

interface Part {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    part_description: string;
}

interface InventoryItem {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    rack: string;
    level: string;
    bin: string;
    quantity: number;
}

interface InventoryDateViewerProps {
    selectedDate: string;  // YYYY-MM-DD format or DD/MM/YYYY
    parts: Part[];
}

export default function InventoryDateViewer({ selectedDate, parts: propParts }: InventoryDateViewerProps) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);
    // Use shared context parts if available (avoid prop-drilling; context is faster after first load)
    const { parts: contextParts } = useMasterData();
    const parts = contextParts.length > 0 ? contextParts : propParts;
    const [isEditMode, setIsEditMode] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [scannerVisible, setScannerVisible] = useState(false);
    const [locationScanItemIndex, setLocationScanItemIndex] = useState<number | null>(null);
    // Ref ensures the latest index is always available inside the scan callback (no stale closure)
    const locationScanItemIndexRef = useRef<number | null>(null);

    useEffect(() => {
        if (selectedDate) {
            loadInventoryForDate();
        }
    }, [selectedDate]);

    const loadInventoryForDate = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/inventory/by-date`, { params: { date: selectedDate } });
            setInventoryItems(response.data);
        } catch (error) {
            console.error('Error loading inventory:', error);
            Alert.alert('Error', 'Failed to load inventory for selected date');
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setInventoryItems([
            ...inventoryItems,
            { cbf_part_no: '', vendor_part_no: '', finish: '', rack: '', level: '', bin: '', quantity: 0 }
        ]);
    };

    const removeItem = (index: number) => {
        const newItems = inventoryItems.filter((_, i) => i !== index);
        setInventoryItems(newItems);
    };

    const updateItem = (index: number, field: keyof InventoryItem, value: any) => {
        const newItems = [...inventoryItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setInventoryItems(newItems);
    };

    // Update multiple fields at once (avoids stale closure when setting rack+level+bin together)
    const updateItemFields = (index: number, fields: Partial<InventoryItem>) => {
        setInventoryItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], ...fields };
            return newItems;
        });
    };

    const handlePartSelect = (index: number, partNo: string) => {
        const part = parts.find(p => p.cbf_part_no === partNo);
        if (part) {
            // Single state update — avoids stale closure overwriting previous fields
            updateItemFields(index, {
                cbf_part_no: partNo,
                vendor_part_no: part.vendor_part_no,
                finish: part.finish,
            });
        }
    };

    const openLocationScanner = (itemIndex: number) => {
        locationScanItemIndexRef.current = itemIndex;
        setLocationScanItemIndex(itemIndex);
        setScannerVisible(true);
    };

    const handleLocationScan = (data: string) => {
        // Use ref (always current) instead of state (can be stale in closures)
        const targetIndex = locationScanItemIndexRef.current;
        if (targetIndex !== null) {
            const segments = data.trim().split(/[-|/]/);
            if (segments.length >= 3) {
                updateItemFields(targetIndex, {
                    rack: segments[0].trim(),
                    level: segments[1].trim(),
                    bin: segments[2].trim(),
                });
            } else {
                updateItem(targetIndex, 'rack', data.trim());
            }
        }
        locationScanItemIndexRef.current = null;
        setScannerVisible(false);
        setLocationScanItemIndex(null);
    };

    if (loading) {
        return (
            <Card style={styles.card}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Loading inventory...
                    </Text>
                </View>
            </Card>
        );
    }

    return (
        <>
            <QRScanner
                visible={scannerVisible}
                onClose={() => { setScannerVisible(false); setLocationScanItemIndex(null); }}
                onScan={handleLocationScan}
                title="Scan Location QR (Rack–Level–Bin)"
            />
            <Card style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.headerInfo}>
                        <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                            Inventory for {selectedDate}
                        </Text>
                    </View>

                    {/* View/Edit Toggle */}
                    <View style={styles.segmentedControl}>
                        <TouchableOpacity
                            style={[
                                styles.segmentButton,
                                styles.segmentLeft,
                                !isEditMode && styles.segmentActive,
                                !isEditMode && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setIsEditMode(false)}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name="eye-outline"
                                size={16}
                                color={!isEditMode ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.segmentText,
                                { color: !isEditMode ? '#fff' : colors.textSecondary }
                            ]}>
                                View
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.segmentButton,
                                styles.segmentRight,
                                isEditMode && styles.segmentActive,
                                isEditMode && { backgroundColor: COLORS.warning }
                            ]}
                            onPress={() => setIsEditMode(true)}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name="pencil"
                                size={16}
                                color={isEditMode ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.segmentText,
                                { color: isEditMode ? '#fff' : colors.textSecondary }
                            ]}>
                                Edit
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {inventoryItems.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={colors.textLight} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No inventory recorded for this date
                        </Text>
                        {isEditMode && (
                            <Button
                                title="Add First Item"
                                onPress={addItem}
                                style={styles.addButton}
                                icon={<MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />}
                            />
                        )}
                    </View>
                ) : (
                    <ScrollView style={styles.itemsList}>
                        {inventoryItems.map((item, index) => (
                            <View key={index} style={[styles.itemCard, { backgroundColor: colors.card }]}>
                                <View style={styles.itemHeader}>
                                    <Text style={[styles.itemNumber, { color: colors.textSecondary }]}>
                                        Item #{index + 1}
                                    </Text>
                                    {isEditMode && (
                                        <TouchableOpacity onPress={() => removeItem(index)}>
                                            <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {isEditMode ? (
                                    <>
                                        <SearchablePartSelector
                                            parts={parts}
                                            selectedPart={item.cbf_part_no}
                                            onSelectPart={(partNo) => handlePartSelect(index, partNo)}
                                            label="CBF Part Number"
                                            showExternalScanner={true}
                                        />
                                        {/* Single QR scan fills Rack, Level & Bin */}
                                        <TouchableOpacity
                                            style={[styles.scanLocationBtn, { borderColor: colors.primary }]}
                                            onPress={() => openLocationScanner(index)}
                                        >
                                            <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.primary} />
                                            <Text style={[styles.scanLocationText, { color: colors.primary }]}>Scan Location (Rack–Level–Bin)</Text>
                                        </TouchableOpacity>

                                        <View style={styles.row}>
                                            <View style={{ flex: 1 }}>
                                                <Input
                                                    label="Rack"
                                                    value={item.rack}
                                                    onChangeText={(val) => updateItem(index, 'rack', val)}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Input
                                                    label="Level"
                                                    value={item.level}
                                                    onChangeText={(val) => updateItem(index, 'level', val)}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Input
                                                    label="Bin"
                                                    value={item.bin}
                                                    onChangeText={(val) => updateItem(index, 'bin', val)}
                                                />
                                            </View>
                                        </View>
                                        <Input
                                            label="Quantity"
                                            value={item.quantity.toString()}
                                            onChangeText={(val) => updateItem(index, 'quantity', parseInt(val) || 0)}
                                            keyboardType="numeric"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.infoRow}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>Part:</Text>
                                            <Text style={[styles.value, { color: colors.textPrimary }]}>{item.cbf_part_no}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>Vendor Part:</Text>
                                            <Text style={[styles.value, { color: colors.textPrimary }]}>{item.vendor_part_no || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={[styles.label, { color: colors.textSecondary }]}>Finish:</Text>
                                            <Text style={[styles.value, { color: colors.textPrimary }]}>{item.finish || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.locationRow}>
                                            <View style={styles.locationBadge}>
                                                <MaterialCommunityIcons name="warehouse" size={14} color={colors.primary} />
                                                <Text style={[styles.locationText, { color: colors.textPrimary }]}>
                                                    Rack: {item.rack}
                                                </Text>
                                            </View>
                                            <View style={styles.locationBadge}>
                                                <MaterialCommunityIcons name="stairs" size={14} color={colors.primary} />
                                                <Text style={[styles.locationText, { color: colors.textPrimary }]}>
                                                    Level: {item.level}
                                                </Text>
                                            </View>
                                            <View style={styles.locationBadge}>
                                                <MaterialCommunityIcons name="package-variant" size={14} color={colors.primary} />
                                                <Text style={[styles.locationText, { color: colors.textPrimary }]}>
                                                    Bin: {item.bin}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.quantityRow}>
                                            <MaterialCommunityIcons name="counter" size={18} color={COLORS.success} />
                                            <Text style={[styles.quantityText, { color: colors.textPrimary }]}>
                                                Quantity: <Text style={styles.quantityValue}>{item.quantity}</Text>
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        ))}

                        {isEditMode && (
                            <Button
                                title="Add Another Item"
                                onPress={addItem}
                                style={styles.addAnotherButton}
                                variant="outline"
                                icon={<MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />}
                            />
                        )}
                    </ScrollView>
                )}
            </Card>
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        flex: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: COLORS.border,
        borderRadius: BORDER_RADIUS.sm,
        padding: 2,
    },
    segmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm - 2,
    },
    segmentLeft: {
        marginRight: 2,
    },
    segmentRight: {
        marginLeft: 2,
    },
    segmentActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 12,
        fontWeight: '600',
    },
    loadingContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: SPACING.sm,
        fontSize: 14,
    },
    emptyContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: 14,
        marginBottom: SPACING.md,
    },
    addButton: {
        marginTop: SPACING.sm,
    },
    itemsList: {
        maxHeight: 500,
    },
    itemCard: {
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    itemNumber: {
        fontSize: 12,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    locationInput: {
        flex: 1,
    },
    locationInputWrap: {
        flex: 1,
        flexDirection: 'column' as const,
    },
    scanBtn: {
        alignSelf: 'center',
        marginTop: 4,
        padding: 6,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
    },
    value: {
        fontSize: 13,
        fontWeight: '600',
    },
    locationRow: {
        flexDirection: 'row',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
        flexWrap: 'wrap',
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.sm,
    },
    locationText: {
        fontSize: 12,
        fontWeight: '500',
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        backgroundColor: '#f0fdf4',
        borderRadius: BORDER_RADIUS.sm,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: '500',
    },
    quantityValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.success,
    },
    addAnotherButton: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.md,
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
