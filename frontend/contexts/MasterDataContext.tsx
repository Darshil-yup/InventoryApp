import React, { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import apiClient from '../lib/api';
import storage from '../utils/storage';

export interface Part {
    cbf_part_no: string;
    vendor_part_no: string;
    finish: string;
    part_description: string;
}

export interface Project {
    project_number: string;
    project_name: string;
    status?: string;
}

interface MasterDataContextType {
    parts: Part[];
    projects: Project[];
    loading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    ensureDataLoaded: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

// In-memory TTL: 10 minutes. Persistent (AsyncStorage) TTL: 4 hours.
const MEMORY_TTL_MS = 10 * 60 * 1000;
const STORAGE_TTL_MS = 4 * 60 * 60 * 1000;
const STORAGE_KEY = 'masterData_v1';

interface StoredMasterData {
    parts: Part[];
    projects: Project[];
    savedAt: number;
}

async function loadFromStorage(): Promise<StoredMasterData | null> {
    try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data: StoredMasterData = JSON.parse(raw);
        const age = Date.now() - data.savedAt;
        if (age > STORAGE_TTL_MS) return null; // expired
        return data;
    } catch {
        return null;
    }
}

async function saveToStorage(parts: Part[], projects: Project[]) {
    try {
        const payload: StoredMasterData = { parts, projects, savedAt: Date.now() };
        await storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Non-fatal — just skip persistence
    }
}

interface MasterDataProviderProps {
    children: ReactNode;
}

export function MasterDataProvider({ children }: MasterDataProviderProps) {
    const [parts, setParts] = useState<Part[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastLoadedRef = useRef<number | null>(null);
    const loadInProgressRef = useRef<Promise<void> | null>(null);

    // On context mount: restore from AsyncStorage instantly (no network)
    useEffect(() => {
        (async () => {
            const cached = await loadFromStorage();
            if (cached && lastLoadedRef.current === null) {
                setParts(cached.parts);
                setProjects(cached.projects);
                // Mark as "loaded at savedAt" so we respect TTL
                lastLoadedRef.current = cached.savedAt;
            }
        })();
    }, []);

    const loadData = useCallback(async () => {
        if (loadInProgressRef.current) {
            return loadInProgressRef.current;
        }
        const promise = (async () => {
            try {
                setLoading(true);
                setError(null);
                const [projectsRes, partsRes] = await Promise.all([
                    apiClient.get('/api/projects'),
                    apiClient.get('/api/chicago-bifold'),
                ]);
                const newParts: Part[] = partsRes.data;
                const newProjects: Project[] = projectsRes.data;
                setParts(newParts);
                setProjects(newProjects);
                lastLoadedRef.current = Date.now();
                // Persist for next app launch
                await saveToStorage(newParts, newProjects);
            } catch (err) {
                console.error('Error loading master data:', err);
                setError('Failed to load data. Check your connection.');
            } finally {
                setLoading(false);
                loadInProgressRef.current = null;
            }
        })();
        loadInProgressRef.current = promise;
        return promise;
    }, []);

    /** Only fetches if memory cache is older than 10 min */
    const ensureDataLoaded = useCallback(async () => {
        const now = Date.now();
        const isStale = lastLoadedRef.current === null || (now - lastLoadedRef.current) > MEMORY_TTL_MS;
        if (isStale) {
            await loadData();
        }
    }, [loadData]);

    /** Force a fresh network reload */
    const refreshData = useCallback(async () => {
        lastLoadedRef.current = null;
        await loadData();
    }, [loadData]);

    return (
        <MasterDataContext.Provider value={{ parts, projects, loading, error, refreshData, ensureDataLoaded }}>
            {children}
        </MasterDataContext.Provider>
    );
}

export function useMasterData() {
    const context = useContext(MasterDataContext);
    if (context === undefined) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
}
