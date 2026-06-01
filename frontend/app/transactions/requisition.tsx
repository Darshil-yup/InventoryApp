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
import { getThemeColors, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants/theme';
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

interface RequisitionEntry {
    cbf_part_number: string;
    quantity: number;
}

export default function RequisitionScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const colors = getThemeColors(isDark);
    const { parts, projects, ensureDataLoaded } = useMasterData();
    const [user, setUser] = useState<any>(null);
    const [selectedProject, setSelectedProject] = useState('');
    const [entries, setEntries] = useState<RequisitionEntry[]>([
        { cbf_part_number: '', quantity: 0 },
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
            await ensureDataLoaded(); // uses shared cache — instant if already loaded
            setLoadingData(false);
        } catch (error) {
            console.error('Error loading data:', error);
            Alert.alert('Error', 'Failed to load data');
            setLoadingData(false);
        }
    };

    const addEntry = () => {
        setEntries([...entries, { cbf_part_number: '', quantity: 0 }]);
    };

    const removeEntry = (index: number) => {
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
    };

    const updateEntry = (index: number, field: keyof RequisitionEntry, value: any) => {
        const newEntries = [...entries];
        newEntries[index] = { ...newEntries[index], [field]: value };
        setEntries(newEntries);
    };

    const handleSubmit = async () => {
        if (!selectedProject) {
            Alert.alert('Error', 'Please select a project');
            return;
        }

        const validEntries = entries.filter(e => e.cbf_part_number && e.quantity > 0);
        if (validEntries.length === 0) {
            Alert.alert('Error', 'Please add at least one part with quantity');
            return;
        }

        setLoading(true);

        try {
            await apiClient.post('/api/requisition', {
                employee_name: user.name,
                project: selectedProject,
                entries: validEntries,
            });

            setSuccessModal({ visible: true, count: validEntries.length });
        } catch (error: any) {
            console.error('Error submitting requisition:', error);
            Alert.alert('Error', 'Failed to submit requisition');
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
                    <SuccessModal
                        visible={successModal.visible}
                        title="Requisition Submitted!"
                        message="Parts have been successfully requisitioned for this project."
                        detail={`${successModal.count} part(s) issued`}
                        color="#ef4444"
                        icon="file-document-check"
                        onClose={() => { setSuccessModal({ visible: false, count: 0 }); router.back(); }}
                        confirmLabel="Done"
                    />
                    <View style={styles.infoRow}>
                        <Card style={styles.infoCard}>
                            <MaterialCommunityIcons name="file-document-edit" size={24} color={colors.accent} />
                            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>Requisition</Text>
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
                            transactionType="requisition"
                            entries={entries}
                            onEntriesChange={(newEntries) => {
                                setEntries(newEntries as RequisitionEntry[]);
                            }}
                            parts={parts}
                        />
                    )}


                    <Button
                        title="Submit Requisition"
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
        backgroundColor: 'transparent',
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
        borderLeftColor: COLORS.danger, // Use Danger/Red color for Requisition (taking out)
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
        color: COLORS.danger,
    },
    addButton: {
        marginBottom: SPACING.md,
    },
    submitButton: {
        marginBottom: SPACING.lg,
    },
});

