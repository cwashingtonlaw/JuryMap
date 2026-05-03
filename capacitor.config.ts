import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danielswashington.juryselection',
  appName: 'Jury Selection',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'desktop',
    backgroundColor: '#0f172a',
  },
  server: {
    // Allow IndexedDB persistence
    iosScheme: 'capacitor',
  },
};

export default config;
