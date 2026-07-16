'use dom';

import { useEffect, useState } from 'react';

function assetUrl(asset: unknown): string {
  if (typeof asset === 'string') return asset;
  if (asset && typeof asset === 'object') {
    if ('uri' in asset && typeof asset.uri === 'string') return asset.uri;
    if ('src' in asset && typeof asset.src === 'string') return asset.src;
    if ('default' in asset) return assetUrl(asset.default);
  }
  throw new Error('Bundled prototype asset has no usable URL');
}

const prototypeUrl = assetUrl(require('@/assets/prototype/icm-mobile-app.html'));
// Metro loads the bundled Lucide runtime as a text asset for offline icons.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const lucideUrl = assetUrl(require('@/assets/prototype/lucide.txt'));
// Metro needs static require calls so these text fallbacks are included in native bundles.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fallbackTimetableUrl = assetUrl(require('@/assets/prototype/assets/content/fallback-timetable.txt'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fallbackContentUrl = assetUrl(require('@/assets/prototype/assets/content/fallback-content.txt'));
const kaabaUrl = assetUrl(require('@/assets/prototype/assets/kaaba-compass-centered.png'));
const ramadanUrl = assetUrl(require('@/assets/prototype/assets/news/ramadan.png'));
const eidUrl = assetUrl(require('@/assets/prototype/assets/news/eid.png'));
const campUrl = assetUrl(require('@/assets/prototype/assets/news/camp.png'));

type SafeArea = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type QiblaReading = {
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy: number | null;
  locationLabel: string;
  status: 'idle' | 'starting' | 'live' | 'permission-denied' | 'unavailable';
  message: string;
};

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

declare global {
  interface Window {
    ICM_APP_CONFIG?: { cmsEndpoint?: string };
    icmNativeQibla?: {
      start: () => Promise<QiblaReading>;
      read: () => Promise<QiblaReading>;
    };
    icmNativeNotifications?: {
      configure: (preferences: NotificationPreferences, items: NotificationScheduleItem[]) => Promise<NotificationSyncResult>;
      status: () => Promise<NotificationSyncResult>;
    };
    icmNativeContent?: {
      fetch: (url: string) => Promise<ContentFetchResult>;
    };
  }
}

function injectNativeShell(
  html: string,
  safeArea: SafeArea,
  lucideSource: string,
  fallbackTimetableSource: string,
  fallbackContentSource: string,
) {
  const nativeStyle = `<style id="icm-native-shell">:root{--safe-top:${safeArea.top}px;--safe-right:${safeArea.right}px;--safe-bottom:${safeArea.bottom}px;--safe-left:${safeArea.left}px}</style>`;
  const lucideBlobUrl = URL.createObjectURL(new Blob([lucideSource], { type: 'text/javascript' }));
  const bundledLucide = `<script src="${lucideBlobUrl}"></script>`;
  // iOS WebView does not reliably execute Metro text assets referenced as script URLs.
  // Inline the two trusted, bundled fallback sources so app startup is deterministic.
  const bundledTimetable = `<script>${fallbackTimetableSource}</script>`;
  const bundledContent = `<script>${fallbackContentSource}</script>`;

  return html
    .replaceAll('assets/kaaba-compass-centered.png', kaabaUrl)
    .replaceAll('assets/news/ramadan.png', ramadanUrl)
    .replaceAll('assets/news/eid.png', eidUrl)
    .replaceAll('assets/news/camp.png', campUrl)
    .replace('<script src="assets/content/fallback-timetable.js"></script>', bundledTimetable)
    .replace('<script src="assets/content/fallback-content.js"></script>', bundledContent)
    .replace('<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>', bundledLucide)
    .replace('</head>', `${nativeStyle}</head>`);
}

async function fetchText(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Bundled app asset returned ${response.status}`);
  return response.text();
}

export default function IcmPrototype({
  dom: _dom,
  safeAreaTop,
  safeAreaRight,
  safeAreaBottom,
  safeAreaLeft,
  startQibla,
  getQiblaReading,
  configureNotifications,
  getNotificationStatus,
  fetchContent,
  cmsEndpoint,
}: {
  dom?: import('expo/dom').DOMProps;
  safeAreaTop: number;
  safeAreaRight: number;
  safeAreaBottom: number;
  safeAreaLeft: number;
  startQibla: () => Promise<QiblaReading>;
  getQiblaReading: () => Promise<QiblaReading>;
  configureNotifications: (preferences: NotificationPreferences, items: NotificationScheduleItem[]) => Promise<NotificationSyncResult>;
  getNotificationStatus: () => Promise<NotificationSyncResult>;
  fetchContent: (url: string) => Promise<ContentFetchResult>;
  cmsEndpoint: string;
}) {
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    window.icmNativeQibla = {
      start: startQibla,
      read: getQiblaReading,
    };
    window.icmNativeNotifications = {
      configure: configureNotifications,
      status: getNotificationStatus,
    };
    window.icmNativeContent = { fetch: fetchContent };
    window.ICM_APP_CONFIG = { cmsEndpoint };

    Promise.all([
      fetchText(prototypeUrl),
      fetchText(lucideUrl),
      fetchText(fallbackTimetableUrl),
      fetchText(fallbackContentUrl),
    ])
      .then(([html, lucideSource, fallbackTimetableSource, fallbackContentSource]) => {
        if (cancelled) return;
        document.open();
        document.write(injectNativeShell(html, {
          top: safeAreaTop,
          right: safeAreaRight,
          bottom: safeAreaBottom,
          left: safeAreaLeft,
        }, lucideSource, fallbackTimetableSource, fallbackContentSource));
        document.close();
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load ICM Mobile');
      });

    return () => {
      cancelled = true;
      delete window.icmNativeQibla;
      delete window.icmNativeNotifications;
      delete window.icmNativeContent;
      delete window.ICM_APP_CONFIG;
    };
  }, [cmsEndpoint, configureNotifications, fetchContent, getNotificationStatus, getQiblaReading, safeAreaBottom, safeAreaLeft, safeAreaRight, safeAreaTop, startQibla]);

  if (error) {
    return <main style={{ padding: 24, fontFamily: 'system-ui', color: '#121827' }}>{error}</main>;
  }

  return <main style={{ minHeight: '100vh', background: '#fbfdfc' }} />;
}
