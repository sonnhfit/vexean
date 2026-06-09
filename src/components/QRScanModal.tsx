import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { APP_COLORS } from '../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned?: (value: string) => void;
};

// Inner component — only mounts when Modal is open, so Camera hooks
// never run before the native module is ready.
function ScannerContent({
  onClose,
  onScanned,
}: {
  onClose: () => void;
  onScanned?: (value: string) => void;
}) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const device = useCameraDevice('back');

  useEffect(() => {
    try {
      Camera.requestCameraPermission().then((status) => {
        const granted = status === 'granted';
        setHasPermission(granted);
        if (granted) setIsActive(true);
      });
    } catch {
      setHasPermission(false);
    }
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'data-matrix'],
    onCodeScanned: (codes) => {
      const value = codes[0]?.value;
      if (!value || scannedValue) return;
      Vibration.vibrate(80);
      setScannedValue(value);
      setIsActive(false);
    },
  });

  function handleClose() {
    onClose();
  }

  function handleConfirm() {
    if (scannedValue) onScanned?.(scannedValue);
    handleClose();
  }

  function handleRescan() {
    setScannedValue(null);
    setIsActive(true);
  }

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quét mã QR</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.8}>
          <Ionicons name="close" size={18} color={APP_COLORS.surface} />
        </TouchableOpacity>
      </View>

      {/* Camera / States */}
      <View style={styles.cameraWrapper}>
        {hasPermission === null && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={APP_COLORS.primaryDark} />
            <Text style={styles.stateText}>Đang kiểm tra quyền truy cập...</Text>
          </View>
        )}

        {hasPermission === false && (
          <View style={styles.centerState}>
            <Ionicons name="camera-outline" size={48} color={APP_COLORS.textSecondary} />
            <Text style={styles.stateText}>Không có quyền dùng camera.</Text>
            <Text style={styles.stateSubText}>Vào Cài đặt → Vexean → Camera để cấp quyền.</Text>
          </View>
        )}

        {hasPermission && device && !scannedValue && (
          <Camera
            style={styles.camera}
            device={device}
            isActive={isActive}
            codeScanner={codeScanner}
          />
        )}

        {hasPermission && !device && !scannedValue && (
          <View style={styles.centerState}>
            <Ionicons name="camera-outline" size={48} color={APP_COLORS.textSecondary} />
            <Text style={styles.stateText}>Không tìm thấy camera.</Text>
          </View>
        )}

        {/* Scan frame overlay */}
        {hasPermission && device && !scannedValue && (
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.hint}>Đặt mã QR vào khung để quét</Text>
          </View>
        )}

        {/* Scanned result */}
        {scannedValue && (
          <View style={styles.resultBox}>
            <Ionicons name="checkmark-circle" size={44} color={APP_COLORS.success} />
            <Text style={styles.resultLabel}>Quét thành công</Text>
            <Text style={styles.resultValue} numberOfLines={3} selectable>
              {scannedValue}
            </Text>
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan} activeOpacity={0.85}>
                <Ionicons name="scan-outline" size={16} color={APP_COLORS.primaryDark} />
                <Text style={styles.rescanText}>Quét lại</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
                <Ionicons name="checkmark" size={16} color={APP_COLORS.surface} />
                <Text style={styles.confirmText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </>
  );
}

export function QRScanModal({ visible, onClose, onScanned }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Only mount ScannerContent (and its Camera hooks) when the modal is open */}
        {visible && <ScannerContent onClose={onClose} onScanned={onScanned} />}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: APP_COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrapper: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  centerState: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  stateText: {
    fontSize: 15,
    color: APP_COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateSubText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: APP_COLORS.surface,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    marginTop: 16,
    color: APP_COLORS.surface,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  resultBox: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: APP_COLORS.success,
  },
  resultValue: {
    fontSize: 14,
    color: APP_COLORS.textPrimary,
    textAlign: 'center',
    backgroundColor: APP_COLORS.successLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    width: '100%',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rescanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: APP_COLORS.primaryDark,
    borderRadius: 10,
    paddingVertical: 11,
  },
  rescanText: {
    color: APP_COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: APP_COLORS.primaryDark,
    borderRadius: 10,
    paddingVertical: 11,
  },
  confirmText: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '700',
  },
});
