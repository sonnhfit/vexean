import { PropsWithChildren } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { APP_COLORS } from '../theme/colors';

type ScreenContainerProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function ScreenContainer({ title, subtitle, children }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        <View style={styles.body}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: APP_COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    color: APP_COLORS.textSecondary,
  },
  body: {
    flex: 1,
    marginTop: 14,
  },
});
