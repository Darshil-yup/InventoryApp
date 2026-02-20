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
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../constants/theme';

interface Project {
    project_number: string;
    project_name: string;
}

interface SearchableProjectSelectorProps {
    projects: Project[];
    selectedProject: string;
    onSelectProject: (projectName: string) => void;
    label?: string;
}

export default function SearchableProjectSelector({
    projects,
    selectedProject,
    onSelectProject,
    label = 'Project',
}: SearchableProjectSelectorProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter projects based on search query
    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) {
            return projects;
        }

        const query = searchQuery.toLowerCase();
        return projects.filter(
            (project) =>
                project.project_name.toLowerCase().includes(query) ||
                project.project_number.toLowerCase().includes(query)
        );
    }, [searchQuery, projects]);

    const handleSelect = (projectName: string) => {
        onSelectProject(projectName);
        setModalVisible(false);
        setSearchQuery('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label} *</Text>

            <TouchableOpacity
                style={styles.selector}
                onPress={() => setModalVisible(true)}
            >
                <View style={styles.selectorContent}>
                    {selectedProject ? (
                        <Text style={styles.selectedProject}>{selectedProject}</Text>
                    ) : (
                        <Text style={styles.placeholderText}>Select a project...</Text>
                    )}
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Project</Text>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={28} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchContainer}>
                        <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search projects..."
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
                            {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
                        </Text>
                    </View>

                    <FlatList
                        data={filteredProjects}
                        keyExtractor={(item) => item.project_number}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.projectItem,
                                    item.project_name === selectedProject && styles.projectItemSelected,
                                ]}
                                onPress={() => handleSelect(item.project_name)}
                            >
                                <View style={styles.projectItemContent}>
                                    <Text style={styles.projectName}>{item.project_name}</Text>
                                    <Text style={styles.projectNumber}>#{item.project_number}</Text>
                                </View>
                                {item.project_name === selectedProject && (
                                    <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
                                )}
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        ListEmptyComponent={() => (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="folder-open" size={64} color={COLORS.border} />
                                <Text style={styles.emptyText}>No projects found</Text>
                                <Text style={styles.emptySubtext}>Try a different search term</Text>
                            </View>
                        )}
                    />
                </SafeAreaView>
            </Modal>
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
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: BORDER_RADIUS.md,
        padding: SPACING.md,
        backgroundColor: COLORS.inputBackground,
    },
    selectorContent: {
        flex: 1,
    },
    selectedProject: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.textPrimary,
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
    resultCount: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    resultCountText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    projectItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        backgroundColor: COLORS.card,
    },
    projectItemSelected: {
        backgroundColor: '#f0fdf4',
    },
    projectItemContent: {
        flex: 1,
    },
    projectName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    projectNumber: {
        fontSize: 14,
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
});
