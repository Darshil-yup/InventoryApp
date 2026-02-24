import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getThemeColors, COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import SearchablePartSelector from './SearchablePartSelector';
import apiClient from '../lib/api';

interface Part {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    part_description: string;
}

interface ProjectPart {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    part_description: string;
    mto_required?: number;
    mto_pulled?: number;
    receiving_qty?: number;
    requisition_qty?: number;
}

interface Entry {
    cbf_part_number: string;
    quantity?: number;
    required_quantity?: number;
    pulled_quantity?: number;
}

interface ProjectPartsViewerProps {
    projectNumber: string;
    transactionType: 'mto' | 'receiving' | 'requisition';
    entries: Entry[];
    onEntriesChange: (entries: Entry[]) => void;
    parts: Part[]; // Master parts list for adding new parts
}

export default function ProjectPartsViewer({
    projectNumber,
    transactionType,
    entries,
    onEntriesChange,
    parts,
}: ProjectPartsViewerProps) {
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);

    // Instead of global edit mode, we track which row is currently expanded for editing
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [projectParts, setProjectParts] = useState<ProjectPart[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (projectNumber) {
            loadProjectParts();
        }
    }, [projectNumber]);

    const loadProjectParts = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/api/projects/${projectNumber}/parts`);
            const parts: ProjectPart[] = response.data;
            setProjectParts(parts);

            // Auto-populate entries based on transaction type if not already set
            if (entries.length === 0 || (entries.length === 1 && !entries[0].cbf_part_number)) {
                const initialEntries = parts.map((part) => {
                    if (transactionType === 'mto') {
                        return {
                            cbf_part_number: part.cbf_part_no,
                            required_quantity: part.mto_required || 0,
                            pulled_quantity: part.mto_pulled || 0,
                        };
                    } else if (transactionType === 'receiving') {
                        return {
                            cbf_part_number: part.cbf_part_no,
                            quantity: part.receiving_qty || 0,
                        };
                    } else { // requisition
                        return {
                            cbf_part_number: part.cbf_part_no,
                            quantity: part.requisition_qty || 0,
                        };
                    }
                });
                onEntriesChange(initialEntries);
            }
        } catch (error) {
            console.error('Error loading project parts:', error);
        } finally {
            setLoading(false);
        }
    };

    const addEntry = () => {
        const newEntry: Entry = transactionType === 'mto'
            ? { cbf_part_number: '', required_quantity: 0, pulled_quantity: 0 }
            : { cbf_part_number: '', quantity: 0 };
        onEntriesChange([...entries, newEntry]);
    };

    const removeEntry = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index);
        onEntriesChange(newEntries);
    };

    const updateEntry = (index: number, field: string, value: any) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        onEntriesChange(newEntries);
    };

    const getPartDetails = (cbfPartNo: string): Part | undefined => {
        return parts.find((p) => p.cbf_part_no === cbfPartNo);
    };

    // Filter entries based on search query
    const filteredEntries = entries.map((entry, index) => ({ entry, originalIndex: index })).filter(({ entry }) => {
        if (!searchQuery) return true;
        const partDetails = getPartDetails(entry.cbf_part_number);
        const searchLower = searchQuery.toLowerCase();
        return (
            entry.cbf_part_number.toLowerCase().includes(searchLower) ||
            (partDetails?.part_description?.toLowerCase() || '').includes(searchLower)
        );
    });

    if (loading) {
        return (
            <Card style={styles.loadingCard}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading project parts...
                </Text>
            </Card>
        );
    }

    return (
        <View style={styles.container}>
            {/* Mode Toggle Header */}
            <Card style={styles.modeCard}>
                <View style={styles.modeHeader}>
                    <View style={styles.modeInfo}>
                        <MaterialCommunityIcons
                            name={editingRowIndex !== null ? 'pencil' : 'eye-outline'}
                            size={22}
                            color={colors.accent}
                        />
                        <View style={styles.modeTextContainer}>
                            <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>
                                {editingRowIndex !== null ? 'Edit Mode' : 'View Mode'}
                            </Text>
                            <Text style={[styles.modeSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                {entries.length} part(s) loaded
                            </Text>
                        </View>
                    </View>

                    {/* Segmented Control Toggle */}
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
                                // Default logic: open the first one for edit if none is open
                                if (editingRowIndex === null && filteredEntries.length > 0) {
                                    setEditingRowIndex(filteredEntries[0].originalIndex);
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
            </Card>

            {/* Parts List */}
            {entries.length === 0 ? (
                <Card style={styles.emptyCard}>
                    <MaterialCommunityIcons
                        name="package-variant"
                        size={48}
                        color={colors.border}
                    />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No parts in this project yet
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
                        Click 'Add Another Part' below to add parts
                    </Text>
                </Card>
            ) : (
                <ScrollView
                    style={styles.tableScrollView}
                    stickyHeaderIndices={[0]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Sticky Table Header */}
                    <View style={[styles.tableHeader, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                        <Text style={[styles.tableHeaderText, { flex: 2, color: colors.textSecondary }]}>CBF Part No.</Text>

                        {transactionType === 'mto' ? (
                            <>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Req.</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Pulled</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>Rem.</Text>
                            </>
                        ) : transactionType === 'requisition' ? (
                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right', color: colors.textSecondary }]}>Req. Qty</Text>
                        ) : (
                            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right', color: colors.textSecondary }]}>Qty</Text>
                        )}
                    </View>

                    <View>
                        {filteredEntries.map(({ entry, originalIndex }) => {
                            const isEditing = editingRowIndex === originalIndex;
                            const partDetails = getPartDetails(entry.cbf_part_number);

                            if (isEditing) {
                                // EDIT MODE CARD
                                return (
                                    <Card key={originalIndex} style={styles.entryCard}>
                                        <View style={styles.entryHeader}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                                                onPress={() => setEditingRowIndex(null)}
                                            >
                                                <MaterialCommunityIcons name="chevron-up" size={24} color={colors.accent} />
                                                <Text style={[styles.entryTitle, { color: colors.accent }]}>
                                                    Editing Row {originalIndex + 1}
                                                </Text>
                                            </TouchableOpacity>

                                            {entries.length > 1 && (
                                                <TouchableOpacity onPress={() => removeEntry(originalIndex)}>
                                                    <MaterialCommunityIcons
                                                        name="trash-can"
                                                        size={24}
                                                        color={colors.danger}
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        <SearchablePartSelector
                                            parts={parts}
                                            selectedPart={entry.cbf_part_number}
                                            onSelectPart={(partNo) => updateEntry(originalIndex, 'cbf_part_number', partNo)}
                                            label="CBF Part Number"
                                            placeholder="Search by part number or description..."
                                            showExternalScanner={true}
                                        />

                                        {transactionType === 'mto' ? (
                                            <View style={styles.row}>
                                                <View style={styles.halfInput}>
                                                    <Input
                                                        label="Required *"
                                                        placeholder="Req. Qty"
                                                        keyboardType="numeric"
                                                        value={entry.required_quantity ? String(entry.required_quantity) : ''}
                                                        onChangeText={(text) =>
                                                            updateEntry(originalIndex, 'required_quantity', parseInt(text) || 0)
                                                        }
                                                    />
                                                </View>
                                                <View style={styles.halfInput}>
                                                    <Input
                                                        label="Pulled *"
                                                        placeholder="Pulled Qty"
                                                        keyboardType="numeric"
                                                        value={entry.pulled_quantity ? String(entry.pulled_quantity) : ''}
                                                        onChangeText={(text) =>
                                                            updateEntry(originalIndex, 'pulled_quantity', parseInt(text) || 0)
                                                        }
                                                    />
                                                </View>
                                            </View>
                                        ) : (
                                            <Input
                                                label="Quantity *"
                                                placeholder="Enter quantity"
                                                keyboardType="numeric"
                                                value={entry.quantity !== undefined ? String(entry.quantity) : ''}
                                                onChangeText={(text) =>
                                                    updateEntry(originalIndex, 'quantity', parseInt(text) || 0)
                                                }
                                            />
                                        )}
                                        <Button
                                            title="Done Editing"
                                            onPress={() => setEditingRowIndex(null)}
                                            style={{ marginTop: SPACING.md }}
                                            variant="secondary"
                                        />
                                    </Card>
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
                                            {entry.cbf_part_number || '<Empty>'}
                                        </Text>
                                        {partDetails && (
                                            <Text style={[styles.partDescText, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {partDetails.part_description}
                                            </Text>
                                        )}
                                    </View>

                                    {transactionType === 'mto' ? (
                                        <>
                                            <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>
                                                {entry.required_quantity || 0}
                                            </Text>
                                            <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: colors.textPrimary }]}>
                                                {entry.pulled_quantity || 0}
                                            </Text>
                                            <Text style={[styles.cellText, { flex: 1, textAlign: 'center', color: COLORS.warning, fontWeight: '700' }]}>
                                                {(entry.required_quantity || 0) - (entry.pulled_quantity || 0)}
                                            </Text>
                                        </>
                                    ) : (
                                        <Text style={[styles.cellText, { flex: 1, textAlign: 'right', color: colors.textPrimary }]}>
                                            {entry.quantity || 0}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            )}

            <Button
                title="Add Another Part"
                variant="secondary"
                onPress={() => {
                    addEntry();
                    setEditingRowIndex(entries.length); // auto-open new row for editing
                }}
                icon={<MaterialCommunityIcons name="plus" size={20} color={colors.primary} />}
                style={styles.addButton}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    loadingCard: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: 14,
    },
    modeCard: {
        marginBottom: SPACING.md,
    },
    modeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        flex: 1,
        marginRight: SPACING.sm,
    },
    modeTextContainer: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    modeSubtitle: {
        fontSize: 11,
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
        padding: 2,
        flexShrink: 0,
    },
    segmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        gap: 4,
        minWidth: 60,
    },
    segmentLeft: {
        borderTopLeftRadius: BORDER_RADIUS.sm,
        borderBottomLeftRadius: BORDER_RADIUS.sm,
    },
    segmentRight: {
        borderTopRightRadius: BORDER_RADIUS.sm,
        borderBottomRightRadius: BORDER_RADIUS.sm,
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
        fontWeight: '700',
    },
    entryCard: {
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accent,
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
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    halfInput: {
        flex: 1,
    },
    addButton: {
        marginTop: SPACING.md,
        marginBottom: SPACING.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        gap: SPACING.sm,
    },
    searchIcon: {
        marginRight: -SPACING.md,
        zIndex: 1,
        paddingLeft: SPACING.sm,
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
    emptyCard: {
        alignItems: 'center',
        padding: SPACING.xl,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: SPACING.md,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 4,
    },
});
