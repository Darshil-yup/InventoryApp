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
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
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

    // Filter items based on search query
    const filteredItems = inventoryItems.map((item, index) => ({ item, originalIndex: index })).filter(({ item }) => {
        if (!searchQuery) return true;
        const partDetails = parts.find(p => p.cbf_part_no === item.cbf_part_no);
        const searchLower = searchQuery.toLowerCase();
        return (
            item.cbf_part_no.toLowerCase().includes(searchLower) ||
            (partDetails?.part_description?.toLowerCase() || '').includes(searchLower)
        );
    });

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
                                editingRowIndex === null && styles.segmentActive,
                                editingRowIndex === null && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setEditingRowIndex(null)}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name="format-list-bulleted"
                                size={16}
                                color={editingRowIndex === null ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.segmentText,
                                { color: editingRowIndex === null ? '#fff' : colors.textSecondary }
                            ]}>
                                View All
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.segmentButton,
                                styles.segmentRight,
                                editingRowIndex !== null && styles.segmentActive,
                                editingRowIndex !== null && { backgroundColor: COLORS.warning }
                            ]}
                            onPress={() => {
                                if (editingRowIndex === null && filteredItems.length > 0) {
                                    setEditingRowIndex(filteredItems[0].originalIndex);
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons
                                name="pencil"
                                size={16}
                                color={editingRowIndex !== null ? '#fff' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.segmentText,
                                { color: editingRowIndex !== null ? '#fff' : colors.textSecondary }
                            ]}>
                                Edit Row
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                    <Input
                        placeholder="Search by Part No. or Description..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{ flex: 1, marginBottom: 0 }}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                            <MaterialCommunityIcons name="close-circle" size={20} color={colors.textLight} />
                        </TouchableOpacity>
                    )}
                </View>

                {inventoryItems.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="package-variant-closed" size={48} color={colors.textLight} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            No inventory recorded for this date
                        </Text>
                        {editingRowIndex !== null && (
                            <Button
                                title="Add First Item"
                                onPress={() => { addItem(); setEditingRowIndex(0); }}
                                style={styles.addButton}
                                icon={<MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />}
                            />
                        )}
                    </View>
                ) : (
                    <ScrollView
                        style={styles.tableScrollView}
                        stickyHeaderIndices={[0]}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Sticky Table Header */}
                        <View style={[styles.tableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                            <Text style={[styles.tableHeaderText, { flex: 2, color: colors.textSecondary }]}>CBF Part No.</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Rack</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Level</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Bin</Text>
                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right', color: colors.textSecondary }]}>Qty</Text>
                        </View>

                        <View>
                            {filteredItems.map(({ item, originalIndex }) => {
                                const isEditing = editingRowIndex === originalIndex;
                                const partDetails = parts.find(p => p.cbf_part_no === item.cbf_part_no);

                                if (isEditing) {
                                    // EDIT MODE CARD
                                    return (
                                        <View key={originalIndex} style={[styles.itemCard, { backgroundColor: colors.card }]}>
                                            <View style={styles.itemHeader}>
                                                <TouchableOpacity
                                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                                    onPress={() => setEditingRowIndex(null)}
                                                >
                                                    <MaterialCommunityIcons name="chevron-up" size={24} color={colors.textSecondary} />
                                                    <Text style={[styles.itemNumber, { color: colors.textSecondary, fontSize: 14 }]}>
                                                        Editing Item #{originalIndex + 1}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity onPress={() => removeItem(originalIndex)}>
                                                    <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>

                                            <SearchablePartSelector
                                                parts={parts}
                                                selectedPart={item.cbf_part_no}
                                                onSelectPart={(partNo) => handlePartSelect(originalIndex, partNo)}
                                                label="CBF Part Number"
                                                showExternalScanner={true}
                                            />
                                            {/* Single QR scan fills Rack, Level & Bin */}
                                            <TouchableOpacity
                                                style={[styles.scanLocationBtn, { borderColor: colors.primary }]}
                                                onPress={() => openLocationScanner(originalIndex)}
                                            >
                                                <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.primary} />
                                                <Text style={[styles.scanLocationText, { color: colors.primary }]}>Scan Location (Rack–Level–Bin)</Text>
                                            </TouchableOpacity>

                                            <View style={styles.row}>
                                                <View style={{ flex: 1 }}>
                                                    <Input
                                                        label="Rack"
                                                        value={item.rack}
                                                        onChangeText={(val) => updateItem(originalIndex, 'rack', val)}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Input
                                                        label="Level"
                                                        value={item.level}
                                                        onChangeText={(val) => updateItem(originalIndex, 'level', val)}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Input
                                                        label="Bin"
                                                        value={item.bin}
                                                        onChangeText={(val) => updateItem(originalIndex, 'bin', val)}
                                                    />
                                                </View>
                                            </View>
                                            <Input
                                                label="Quantity"
                                                value={item.quantity.toString()}
                                                onChangeText={(val) => updateItem(originalIndex, 'quantity', parseInt(val) || 0)}
                                                keyboardType="numeric"
                                            />
                                            <Button
                                                title="Done Editing"
                                                onPress={() => setEditingRowIndex(null)}
                                                style={{ marginTop: SPACING.md }}
                                                variant="secondary"
                                            />
                                        </View>
                                    );
                                }

                                // VIEW MODE ROW
                                return (
                                    <TouchableOpacity
                                        key={originalIndex}
                                        style={[styles.tableRow, { borderBottomColor: colors.border }]}
                                        onPress={() => setEditingRowIndex(originalIndex)}
                                    >
                                        <View style={{ flex: 2, paddingRight: SPACING.sm }}>
                                            <Text style={[styles.partNumberText, { color: colors.textPrimary }]} numberOfLines={1}>
                                                {item.cbf_part_no || '<Empty>'}
                                            </Text>
                                            {partDetails && (
                                                <Text style={[styles.partDescText, { color: colors.textSecondary }]} numberOfLines={1}>
                                                    {partDetails.part_description}
                                                </Text>
                                            )}
                                        </View>

                                        <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>
                                            {item.rack || '-'}
                                        </Text>
                                        <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>
                                            {item.level || '-'}
                                        </Text>
                                        <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>
                                            {item.bin || '-'}
                                        </Text>
                                        <Text style={[styles.cellText, { flex: 1, textAlign: 'right', color: colors.textPrimary }]}>
                                            {item.quantity || 0}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                <Button
                    title="Add Another Item"
                    onPress={() => { addItem(); setEditingRowIndex(inventoryItems.length); }}
                    style={styles.addAnotherButton}
                    variant="outline"
                    icon={<MaterialCommunityIcons name="plus" size={20} color={COLORS.primary} />}
                />
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
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
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
        maxHeight: 450,
        backgroundColor: COLORS.card,
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
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
});
