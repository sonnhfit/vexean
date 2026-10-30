import { StyleSheet, Text } from 'react-native';
import { APP_COLORS } from '../theme/colors';

export function SequenceBadge({ number }: { number: number }) {
  return (
    <Text accessibilityLabel={`Số thứ tự ${number}`} style={styles.badge}>
      {String(number).padStart(2, '0')}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: APP_COLORS.background,
    color: APP_COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
});
