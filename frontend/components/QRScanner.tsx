import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface QRScannerProps {
    visible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
    title?: string;
}

export default function QRScanner({ visible, onClose, onScan, title = 'Scan Part Number' }: QRScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (visible) {
            requestCameraPermission();
            setScanned(false);
        }
    }, [visible]);

    const requestCameraPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
    };

    const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
        if (scanned) return;

        setScanned(true);
        onScan(data);

        // Close after a brief delay
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleClose = () => {
        setScanned(false);
        onClose();
    };

    if (!visible) return null;

    if (hasPermission === null) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.messageText}>Requesting camera permission...</Text>
                </View>
            </Modal>
        );
    }

    if (hasPermission === false) {
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.centerContainer}>
                    <MaterialCommunityIcons name="camera-off" size={64} color="#ef4444" />
                    <Text style={styles.errorTitle}>Camera Permission Denied</Text>
                    <Text style={styles.errorText}>
                        Please enable camera access in your device settings to scan QR codes.
                    </Text>
                    <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <TouchableOpacity onPress={handleClose} style={styles.closeIconButton}>
                        <MaterialCommunityIcons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Camera View */}
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={styles.camera}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
                        }}
                    >
                        {/* Scanning Overlay */}
                        <View style={styles.overlay}>
                            <View style={styles.unfocusedContainer} />
                            <View style={styles.middleContainer}>
                                <View style={styles.unfocusedContainer} />
                                <View style={styles.focusedContainer}>
                                    <View style={[styles.corner, styles.topLeft]} />
                                    <View style={[styles.corner, styles.topRight]} />
                                    <View style={[styles.corner, styles.bottomLeft]} />
                                    <View style={[styles.corner, styles.bottomRight]} />
                                </View>
                                <View style={styles.unfocusedContainer} />
                            </View>
                            <View style={styles.unfocusedContainer} />
                        </View>

                        {/* Instructions */}
                        <View style={styles.instructionsContainer}>
                            <MaterialCommunityIcons name="qrcode-scan" size={32} color="#fff" />
                            <Text style={styles.instructionsText}>
                                Position QR code within the frame
                            </Text>
                            {scanned && (
                                <View style={styles.scannedBadge}>
                                    <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                                    <Text style={styles.scannedText}>Scanned!</Text>
                                </View>
                            )}
                        </View>
                    </CameraView>
                </View>

                {/* Bottom Actions */}
                <View style={styles.bottomContainer}>
                    <TouchableOpacity style={styles.manualButton} onPress={handleClose}>
                        <MaterialCommunityIcons name="keyboard" size={24} color="#2563eb" />
                        <Text style={styles.manualButtonText}>Enter Manually</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 50,
        backgroundColor: '#2563eb',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeIconButton: {
        padding: 4,
    },
    cameraContainer: {
        flex: 1,
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    middleContainer: {
        flexDirection: 'row',
        flex: 1.5,
    },
    focusedContainer: {
        flex: 6,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#fff',
    },
    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 4,
        borderLeftWidth: 4,
    },
    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 4,
        borderRightWidth: 4,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 4,
        borderRightWidth: 4,
    },
    instructionsContainer: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 8,
    },
    instructionsText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
        textAlign: 'center',
    },
    scannedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#10b981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 8,
    },
    scannedText: {
        color: '#fff',
        fontWeight: '600',
    },
    bottomContainer: {
        padding: 24,
        backgroundColor: '#000',
    },
    manualButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
    },
    manualButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2563eb',
    },
    messageText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        marginTop: 16,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    closeButton: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
