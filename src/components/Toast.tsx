import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_COLORS } from '../theme/colors';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastOptions = {
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
};

type ActiveToast = ToastOptions & {
  id: number;
  type: ToastType;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastMeta = {
  success: {
    icon: 'checkmark-circle-outline',
    color: APP_COLORS.success,
    backgroundColor: APP_COLORS.successLight,
  },
  error: {
    icon: 'alert-circle-outline',
    color: APP_COLORS.danger,
    backgroundColor: APP_COLORS.dangerLight,
  },
  info: {
    icon: 'information-circle-outline',
    color: APP_COLORS.info,
    backgroundColor: APP_COLORS.infoLight,
  },
  warning: {
    icon: 'warning-outline',
    color: APP_COLORS.warning,
    backgroundColor: APP_COLORS.warningLight,
  },
} as const;

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    Animated.timing(translateY, {
      toValue: -120,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [clearTimer, translateY]);

  const showToast = useCallback(
    ({
      title,
      message,
      type = 'info',
      duration = 4000,
      actionLabel,
      onAction,
    }: ToastOptions) => {
      clearTimer();
      const nextToast = {
        id: Date.now(),
        title,
        message,
        type,
        duration,
        actionLabel,
        onAction,
      };
      setToast(nextToast);
      translateY.setValue(-120);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 180,
        mass: 0.8,
      }).start();

      if (duration > 0) {
        timeoutRef.current = setTimeout(hideToast, duration);
      }
    },
    [clearTimer, hideToast, translateY],
  );

  const value = useMemo(
    () => ({ showToast, hideToast }),
    [hideToast, showToast],
  );

  const meta = toast ? toastMeta[toast.type] : toastMeta.info;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.toastWrap,
            {
              paddingTop: Math.max(insets.top, 12),
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[
              styles.toastCard,
              {
                borderColor: meta.color,
                backgroundColor: meta.backgroundColor,
              },
            ]}
          >
            <Ionicons name={meta.icon} size={22} color={meta.color} />
            <View style={styles.toastTextWrap}>
              <Text style={styles.toastTitle} numberOfLines={2}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={styles.toastMessage} numberOfLines={3}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
            {toast.actionLabel && toast.onAction ? (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={() => {
                  const action = toast.onAction;
                  hideToast();
                  action?.();
                }}
              >
                <Text style={[styles.actionText, { color: meta.color }]}>
                  {toast.actionLabel}
                </Text>
              </Pressable>
            ) : (
              <Pressable style={styles.closeButton} onPress={hideToast}>
                <Ionicons name="close" size={18} color={APP_COLORS.textSecondary} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  toastWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 14,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  toastTextWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  toastTitle: {
    color: APP_COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  toastMessage: {
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  actionButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: APP_COLORS.surface,
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
