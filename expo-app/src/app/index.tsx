import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import IcmPrototype from '@/components/icm-prototype';

type QiblaReading = {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
  locationLabel: string;
  status: 'idle' | 'starting' | 'live' | 'permission-denied' | 'unavailable';
  message: string;
};

const ICM_LOCATION = { latitude: 35.8235, longitude: -78.8256 };

type NotificationPreferences = {
  enabled: boolean;
  adhanEnabled: boolean;
  prayerLeadMinutes: number;
  jummahEnabled: boolean;
  jummahLeadMinutes: number;
  selectedPrayers: string[];
  selectedJummahShifts: string[];
  adhanSound: string;
};

type NotificationScheduleItem = {
  id: string;
  title: string;
  body: string;
  date: number;
  kind: 'prayer' | 'jummah';
};

type NotificationSyncResult = {
  granted: boolean;
  scheduledCount: number;
  message: string;
};

type ContentFetchResult = {
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
};

if (process.env.EXPO_OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function notificationsAllowed(settings: Notifications.NotificationPermissionsStatus) {
  const iosStatus = settings.ios?.status;
  return settings.granted
    || iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED
    || iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
    || iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL;
}

export default function IndexScreen() {
  const insets = useSafeAreaInsets();
  const headingSubscription = useRef<Location.LocationSubscription | null>(null);
  const latestQiblaReading = useRef<QiblaReading>({
    ...ICM_LOCATION,
    heading: null,
    accuracy: null,
    locationLabel: 'ICM in Morrisville',
    status: 'idle',
    message: 'Tap Start Compass and allow location access.',
  });

  useEffect(() => () => {
    headingSubscription.current?.remove();
    headingSubscription.current = null;
  }, []);

  const getQiblaReading = useCallback(async () => ({ ...latestQiblaReading.current }), []);

  const getNotificationStatus = useCallback(async (): Promise<NotificationSyncResult> => {
    if (process.env.EXPO_OS === 'web') {
      return { granted: false, scheduledCount: 0, message: 'Notification scheduling is available in Expo Go and installed builds.' };
    }
    const [permissions, scheduled] = await Promise.all([
      Notifications.getPermissionsAsync(),
      Notifications.getAllScheduledNotificationsAsync(),
    ]);
    return {
      granted: notificationsAllowed(permissions),
      scheduledCount: scheduled.length,
      message: scheduled.length ? `${scheduled.length} reminders scheduled.` : 'No reminders scheduled.',
    };
  }, []);

  const fetchContent = useCallback(async (url: string): Promise<ContentFetchResult> => {
    const parsed = new URL(url);
    const isLocalDevelopment = parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (parsed.protocol !== 'https:' && !isLocalDevelopment) {
      throw new Error('CMS endpoints must use HTTPS.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(parsed.href, {
        headers: { Accept: 'application/json, text/html;q=0.9' },
        signal: controller.signal,
      });
      const body = await response.text();
      if (body.length > 2_000_000) throw new Error('CMS response is too large.');
      return {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') ?? '',
        body,
      };
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  const configureNotifications = useCallback(async (
    preferences: NotificationPreferences,
    items: NotificationScheduleItem[],
  ): Promise<NotificationSyncResult> => {
    if (process.env.EXPO_OS === 'web') {
      return { granted: false, scheduledCount: 0, message: 'Open this app in Expo Go to enable reminders.' };
    }

    if (process.env.EXPO_OS === 'android') {
      await Notifications.setNotificationChannelAsync('icm-reminders', {
        name: 'ICM prayer and Jummah reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 180, 120, 180],
        lightColor: '#D99A24',
      });
    }

    if (!preferences.enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return { granted: true, scheduledCount: 0, message: 'Notifications are off.' };
    }

    let permissions = await Notifications.getPermissionsAsync();
    if (!notificationsAllowed(permissions)) {
      permissions = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      });
    }

    if (!notificationsAllowed(permissions)) {
      return { granted: false, scheduledCount: 0, message: 'Notifications are disabled in your device settings.' };
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    const futureItems = items
      .filter((item) => Number.isFinite(item.date) && item.date > Date.now() + 5000)
      .sort((a, b) => a.date - b.date)
      .slice(0, 58);

    for (const item of futureItems) {
      await Notifications.scheduleNotificationAsync({
        identifier: `icm-${item.id}`,
        content: {
          title: item.title,
          body: item.body,
          sound: 'default',
          data: { kind: item.kind, source: 'icm-mobile', adhanSound: preferences.adhanSound },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(item.date),
          channelId: 'icm-reminders',
        },
      });
    }

    return {
      granted: true,
      scheduledCount: futureItems.length,
      message: futureItems.length ? `${futureItems.length} reminders scheduled.` : 'No upcoming reminders were found.',
    };
  }, []);

  const startQibla = useCallback(async (): Promise<QiblaReading> => {
    latestQiblaReading.current = {
      ...latestQiblaReading.current,
      status: 'starting',
      message: 'Getting your location and compass…',
    };

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        latestQiblaReading.current = {
          ...latestQiblaReading.current,
          status: 'permission-denied',
          message: 'Location was not allowed. Using ICM as the location; use the manual heading slider below.',
        };
        return { ...latestQiblaReading.current };
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      latestQiblaReading.current = {
        ...latestQiblaReading.current,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        locationLabel: 'Your location',
        status: 'starting',
        message: 'Location found. Starting the compass…',
      };

      if (!headingSubscription.current) {
        headingSubscription.current = await Location.watchHeadingAsync((value) => {
          const heading = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
          latestQiblaReading.current = {
            ...latestQiblaReading.current,
            heading,
            accuracy: value.accuracy,
            status: 'live',
            message: 'Compass is live. Hold your phone flat and turn until the arrow points straight up.',
          };
        });
      }

      return { ...latestQiblaReading.current };
    } catch {
      latestQiblaReading.current = {
        ...latestQiblaReading.current,
        status: 'unavailable',
        message: 'The compass is unavailable right now. Use the manual heading slider below.',
      };
      return { ...latestQiblaReading.current };
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#fbfdfc' }}>
      <StatusBar hidden />
      <IcmPrototype
        safeAreaTop={insets.top}
        safeAreaRight={insets.right}
        safeAreaBottom={insets.bottom}
        safeAreaLeft={insets.left}
        startQibla={startQibla}
        getQiblaReading={getQiblaReading}
        configureNotifications={configureNotifications}
        getNotificationStatus={getNotificationStatus}
        fetchContent={fetchContent}
        cmsEndpoint={process.env.EXPO_PUBLIC_CMS_URL ?? ''}
        dom={{
          style: { flex: 1 },
          scrollEnabled: false,
          contentInsetAdjustmentBehavior: 'never',
          allowsInlineMediaPlayback: true,
          geolocationEnabled: true,
          allowsBackForwardNavigationGestures: false,
          onOpenWindow: ({ nativeEvent }) => {
            Linking.openURL(nativeEvent.targetUrl);
          },
        }}
      />
    </View>
  );
}
