import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import storage from '../../utils/storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../lib/api';
import SearchablePartSelector from '../../components/SearchablePartSelector';
import SearchableProjectSelector from '../../components/SearchableProjectSelector';
import { getThemeColors, COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppHeader from '../../components/ui/AppHeader';
import ProjectPartsViewer from '../../components/ProjectPartsViewer';
import { useMasterData } from '../../contexts/MasterDataContext';
import SuccessModal from '../../components/ui/SuccessModal';


interface Part {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    part_description: string;
}

interface Project {
    project_number: string;
    project_name: string;
}

interface MTOEntry {
    cbf_part_number: string;
    required_quantity: number;
    pulled_quantity: number;
}

export default function MTOScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);
    const { parts, projects, ensureDataLoaded } = useMasterData();
    const [user, setUser] = useState<any>(null);
    const [selectedProject, setSelectedProject] = useState('');
    const [entries, setEntries] = useState<MTOEntry[]>([
        { cbf_part_number: '', required_quantity: 0, pulled_quantity: 0 },
    ]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [successModal, setSuccessModal] = useState<{ visible: boolean; count: number }>({ visible: false, count: 0 });

    useEffect(() => {
        loadUserAndData();
    }, []);

    const loadUserAndData = async () => {
        try {
            const userData = await storage.getItem('user');
            if (!userData) { router.replace('/auth/login' as any); return; }
            setUser(JSON.parse(userData));
            await ensureDataLoaded();
            setLoadingData(false);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
            setLoadingData(false);
        }
    };

    const addEntry = () => {
        setEntries([...entries, { cbf_part_number: '', required_quantity: 0, pulled_quantity: 0 }]);
    };

    const removeEntry = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
    };

    const updateEntry = (index: number, field: keyof MTOEntry, value: any) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const calculateRemaining = (required: number, pulled: number): number => {
        return Math.max(0, required - pulled);
    };

    const handleSubmit = async () => {
        if (!selectedProject) {
            Alert.alert('Error', 'Please select a project');
            return;
        }

        const validEntries = entries.filter(
            (e) => e.cbf_part_number && e.required_quantity > 0 && e.pulled_quantity >= 0
        );

        if (validEntries.length === 0) {
            Alert.alert('Error', 'Please add at least one part with quantities');
            return;
        }

        // Validate pulled <= required
        const invalidEntry = validEntries.find((e) => e.pulled_quantity > e.required_quantity);
        if (invalidEntry) {
            Alert.alert('Error', 'Pulled quantity cannot exceed required quantity');
            return;
        }

        setLoading(true);

        try {
            await apiClient.post('/api/mto', {
                employee_name: user.name,
                project: selectedProject,
                entries: validEntries,
            });

            setSuccessModal({ visible: true, count: validEntries.length });
        } catch (error: any) {
            console.error('Error submitting MTO:', error);
            Alert.alert('Error', 'Failed to submit MTO record');
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
                    {/* Success Modal */}
                    <SuccessModal
                        visible={successModal.visible}
                        title="MTO Submitted!"
                        message="Material Transfer Out has been recorded successfully."
                        detail={`${successModal.count} part(s) logged`}
                        onClose={() => { setSuccessModal({ visible: false, count: 0 }); router.back(); }}
                        confirmLabel="Done"
                    />
                    <View style={styles.infoRow}>
                        <Card style={styles.infoCard}>
                            <MaterialCommunityIcons name="clipboard-check" size={24} color={colors.accent} />
                            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>MTO</Text>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
                        </Card>
                        <Card style={styles.infoCard}>
                            <MaterialCommunityIcons name="account" size={24} color={colors.accent} />
                            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.name?.split(' ')[0]}</Text>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Employee</Text>
                        </Card>
                    </View>

                    <Card>
                        <SearchableProjectSelector
                            projects={projects}
                            selectedProject={selectedProject}
                            onSelectProject={setSelectedProject}
                        />
                    </Card>

                    {selectedProject && (
                        <ProjectPartsViewer
                            projectNumber={selectedProject}
                            transactionType="mto"
                            entries={entries}
                            onEntriesChange={(newEntries) => {
                                // Type assertion since ProjectPartsViewer ensures correct structure
                                setEntries(newEntries as MTOEntry[]);
                            }}
                            parts={parts}
                        />
                    )}



                    <Button
                        title="Submit MTO"
                        onPress={handleSubmit}
                        loading={loading}
                        style={styles.submitButton}
                        icon={<MaterialCommunityIcons name="check" size={20} color={colors.primary} />}
                    />

                    <View style={{ height: 40 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
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
        borderLeftColor: COLORS.warning, // Use Orange/Amber for MTO (processing)
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
        color: COLORS.warning,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    halfInput: {
        flex: 1,
    },
    remainingCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.sm,
        borderRadius: BORDER_RADIUS.sm,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    remainingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    remainingValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: SPACING.sm,
    },
    warningText: {
        fontSize: 14,
        color: COLORS.danger,
        fontWeight: '600',
    },
    addButton: {
        marginBottom: SPACING.md,
    },
    submitButton: {
        marginBottom: SPACING.lg,
    },
});

