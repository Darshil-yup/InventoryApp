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
    const [isEditMode, setIsEditMode] = useState(false);
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
                            name={isEditMode ? 'pencil' : 'eye-outline'}
                            size={22}
                            color={colors.accent}
                        />
                        <View style={styles.modeTextContainer}>
                            <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>
                                {isEditMode ? 'Edit Mode' : 'View Mode'}
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
            </Card>

            {/* Parts List */}
            {isEditMode ? (
                // EDIT MODE - Editable entries
                <View>
                    {entries.map((entry, index) => {
                        const partDetails = getPartDetails(entry.cbf_part_number);
                        return (
                            <Card key={index} style={styles.entryCard}>
                                <View style={styles.entryHeader}>
                                    <Text style={[styles.entryTitle, { color: colors.accent }]}>
                                        Part {index + 1}
                                    </Text>
                                    {entries.length > 1 && (
                                        <TouchableOpacity onPress={() => removeEntry(index)}>
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
                                    onSelectPart={(partNo) => updateEntry(index, 'cbf_part_number', partNo)}
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
                                                    updateEntry(index, 'required_quantity', parseInt(text) || 0)
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
                                                    updateEntry(index, 'pulled_quantity', parseInt(text) || 0)
                                                }
                                            />
                                        </View>
                                    </View>
                                ) : (
                                    <Input
                                        label="Quantity *"
                                        placeholder="Enter quantity"
                                        keyboardType="numeric"
                                        value={entry.quantity ? String(entry.quantity) : ''}
                                        onChangeText={(text) =>
                                            updateEntry(index, 'quantity', parseInt(text) || 0)
                                        }
                                    />
                                )}
                            </Card>
                        );
                    })}

                    <Button
                        title="Add Another Part"
                        variant="secondary"
                        onPress={addEntry}
                        icon={<MaterialCommunityIcons name="plus" size={20} color={colors.primary} />}
                        style={styles.addButton}
                    />
                </View>
            ) : (
                // VIEW MODE - Read-only display
                <View>
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
                                Switch to Edit Mode to add parts
                            </Text>
                        </Card>
                    ) : (
                        entries.map((entry, index) => {
                            const partDetails = getPartDetails(entry.cbf_part_number);
                            return (
                                <Card key={index} style={styles.viewCard}>
                                    <View style={styles.viewHeader}>
                                        <View style={styles.partNumberContainer}>
                                            <Text style={[styles.partNumber, { color: colors.textPrimary }]}>
                                                {entry.cbf_part_number}
                                            </Text>
                                            {partDetails && (
                                                <Text
                                                    style={[styles.partDesc, { color: colors.textSecondary }]}
                                                    numberOfLines={1}
                                                >
                                                    {partDetails.part_description}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {transactionType === 'mto' ? (
                                        <View style={styles.viewQuantities}>
                                            <View style={styles.qtyItem}>
                                                <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>
                                                    Required
                                                </Text>
                                                <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>
                                                    {entry.required_quantity || 0}
                                                </Text>
                                            </View>
                                            <View style={styles.qtyItem}>
                                                <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>
                                                    Pulled
                                                </Text>
                                                <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>
                                                    {entry.pulled_quantity || 0}
                                                </Text>
                                            </View>
                                            <View style={styles.qtyItem}>
                                                <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>
                                                    Remaining
                                                </Text>
                                                <Text style={[styles.qtyValue, { color: COLORS.warning }]}>
                                                    {(entry.required_quantity || 0) - (entry.pulled_quantity || 0)}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.viewQuantities}>
                                            <View style={styles.qtyItem}>
                                                <Text style={[styles.qtyLabel, { color: colors.textSecondary }]}>
                                                    Quantity
                                                </Text>
                                                <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>
                                                    {entry.quantity || 0}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </Card>
                            );
                        })
                    )}
                </View>
            )}
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
        marginBottom: SPACING.md,
    },
    viewCard: {
        marginBottom: SPACING.md,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.success,
    },
    viewHeader: {
        marginBottom: SPACING.sm,
    },
    partNumberContainer: {
        flex: 1,
    },
    partNumber: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    partDesc: {
        fontSize: 14,
    },
    viewQuantities: {
        flexDirection: 'row',
        gap: SPACING.lg,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    qtyItem: {
        flex: 1,
    },
    qtyLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    qtyValue: {
        fontSize: 18,
        fontWeight: '700',
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
