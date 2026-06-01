import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    TextInput,
    Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import QRScanner from './QRScanner';

interface Part {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    part_description: string;
}

interface SearchablePartSelectorProps {
    parts: Part[];
    selectedPart: string;
    onSelectPart: (partNo: string) => void;
    label?: string;
    placeholder?: string;
    showExternalScanner?: boolean; // Show scanner button beside dropdown
}

export default function SearchablePartSelector({
    parts,
    selectedPart,
    onSelectPart,
    label = 'CBF Part Number',
    placeholder = 'Search by part number or description...',
    showExternalScanner = false,
}: SearchablePartSelectorProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [scannerVisible, setScannerVisible] = useState(false);

    // Get selected part details
    const selectedPartData = parts.find((p) => p.cbf_part_no === selectedPart);

    // Filter parts based on search query
    const filteredParts = useMemo(() => {
        if (!searchQuery.trim()) {
            return parts;
        }

        const query = searchQuery.toLowerCase();
        return parts.filter(
            (part) =>
                part.cbf_part_no.toLowerCase().includes(query) ||
                part.part_description.toLowerCase().includes(query) ||
                part.vendor_part_no.toLowerCase().includes(query) ||
                part.finish.toLowerCase().includes(query)
        );
    }, [searchQuery, parts]);

    const handleSelect = (partNo: string) => {
        onSelectPart(partNo);
        setModalVisible(false);
        setSearchQuery('');
    };

    const handleScan = (scannedData: string) => {
        const cleanedData = scannedData.trim();
        let part = parts.find((p) => p.cbf_part_no.toLowerCase() === cleanedData.toLowerCase());

        if (!part) {
            part = parts.find((p) => p.cbf_part_no.toLowerCase().includes(cleanedData.toLowerCase()));
        }

        if (!part) {
            part = parts.find((p) => cleanedData.toLowerCase().includes(p.cbf_part_no.toLowerCase()));
        }

        if (part) {
            onSelectPart(part.cbf_part_no);
            setModalVisible(false);
            setScannerVisible(false);
            Alert.alert('Success', `Part found: ${part.cbf_part_no}`);
        } else {
            Alert.alert(
                'Part Not Found',
                `Scanned: "${cleanedData}"\nNo matching part found.`,
                [{ text: 'Search Manually', onPress: () => setScannerVisible(false) }, { text: 'Scan Again', style: 'cancel' }]
            );
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label} *</Text>

            <View style={styles.selectorRow}>
                <TouchableOpacity
                    style={[styles.selector, showExternalScanner && styles.selectorWithScanner]}
                    onPress={() => setModalVisible(true)}
                >
                    <View style={styles.selectorContent}>
                        {selectedPartData ? (
                            <>
                                <Text style={styles.selectedPartNo}>{selectedPartData.cbf_part_no}</Text>
                                <Text style={styles.selectedPartDesc} numberOfLines={1}>
                                    {selectedPartData.part_description}
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.placeholderText}>Select a part...</Text>
                        )}
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>

                {showExternalScanner && (
                    <TouchableOpacity
                        style={styles.scannerButton}
                        onPress={() => setScannerVisible(true)}
                    >
                        <MaterialCommunityIcons name="qrcode-scan" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Part Details - Show vendor and finish for quick verification */}
            {selectedPartData && (
                <View style={styles.partDetails}>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="package-variant" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.detailLabel}>Vendor:</Text>
                        <Text style={styles.detailValue}>{selectedPartData.vendor_part_no || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="palette" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.detailLabel}>Finish:</Text>
                        <Text style={styles.detailValue}>{selectedPartData.finish || 'N/A'}</Text>
                    </View>
                </View>
            )}

            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Part</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={28} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={placeholder}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholderTextColor={COLORS.textSecondary}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.resultCount}>
                        <Text style={styles.resultCountText}>
                            {filteredParts.length} part{filteredParts.length !== 1 ? 's' : ''} found
                        </Text>
                    </View>

                    <FlatList
                        data={filteredParts}
                        keyExtractor={(item) => item.cbf_part_no}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.partItem,
                                    item.cbf_part_no === selectedPart && styles.partItemSelected,
                                ]}
                                onPress={() => handleSelect(item.cbf_part_no)}
                            >
                                <View style={styles.partItemContent}>
                                    <Text style={styles.partNo}>{item.cbf_part_no}</Text>
                                    <Text style={styles.partDesc} numberOfLines={2}>
                                        {item.part_description}
                                    </Text>
                                    <View style={styles.partMeta}>
                                        <Text style={styles.partMetaText}>Vendor: {item.vendor_part_no}</Text>
                                        <Text style={styles.partMetaText}>• {item.finish}</Text>
                                    </View>
                                </View>
                                {item.cbf_part_no === selectedPart && (
                                    <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="package-variant-closed" size={64} color={COLORS.border} />
                                <Text style={styles.emptyText}>No parts found</Text>
                                <Text style={styles.emptySubtext}>Try a different search term</Text>
                            </View>
                        )}
                    />
                </SafeAreaView>
            </Modal>

            <QRScanner
                visible={scannerVisible}
                onClose={() => setScannerVisible(false)}
                onScan={handleScan}
                title="Scan Part Number"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        ...TYPOGRAPHY.label,
        marginBottom: SPACING.xs,
        color: COLORS.primary,
    },
    selectorRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
        alignItems: 'center',
    },
    selector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        backgroundColor: COLORS.inputBackground,
    },
    selectorWithScanner: {
        // Additional styling when scanner button is shown
    },
    scannerButton: {
        width: 50,
        height: 50,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectorContent: {
        flex: 1,
    },
    selectedPartNo: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    selectedPartDesc: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    placeholderText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        margin: SPACING.md,
        padding: 12,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    scanButton: {
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
    },
    resultCount: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    resultCountText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    listContent: {
        paddingBottom: SPACING.xl,
    },
    partItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.card,
    },
    partItemSelected: {
        backgroundColor: '#f0fdf4', // Light green bg for selected
    },
    partItemContent: {
        flex: 1,
    },
    partNo: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    partDesc: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    partMeta: {
        flexDirection: 'row',
        gap: 8,
    },
    partMetaText: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 4,
    },
    partDetails: {
        marginTop: SPACING.xs,
        padding: SPACING.sm,
        backgroundColor: '#f8fafc',
        borderRadius: BORDER_RADIUS.sm,
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontWeight: '600',
        flex: 1,
    },
});
