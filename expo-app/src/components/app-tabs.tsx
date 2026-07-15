import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { IcmColors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: IcmColors.green,
      tabBarInactiveTintColor: IcmColors.muted,
      tabBarStyle: { backgroundColor: IcmColors.paper, borderTopColor: IcmColors.line },
      sceneStyle: { backgroundColor: IcmColors.background },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Prayer', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="news" options={{ title: 'News', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="qibla" options={{ title: 'Qibla', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'navigate-circle' : 'navigate-circle-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="donate" options={{ title: 'Donate', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'heart' : 'heart-outline'} color={color} size={size} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'More', tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} color={color} size={size} /> }} />
    </Tabs>
  );
}
