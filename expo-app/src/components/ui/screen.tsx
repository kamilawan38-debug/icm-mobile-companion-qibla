import { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IcmColors } from '@/constants/theme';

export function Screen({ title, eyebrow, children, right }: PropsWithChildren<{ title: string; eyebrow?: string; right?: ReactNode }>) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          {eyebrow ? <Text selectable style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text selectable style={styles.title}>{title}</Text>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  return <Text selectable style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: IcmColors.background },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 120, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  headerCopy: { flex: 1 },
  eyebrow: { color: IcmColors.green, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { color: IcmColors.ink, fontSize: 33, lineHeight: 39, fontWeight: '900', letterSpacing: -1.2 },
  sectionTitle: { color: IcmColors.ink, fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 10 },
});
