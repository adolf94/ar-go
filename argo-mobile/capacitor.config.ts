import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.argo.mobile',
  appName: 'argo-mobile',
  webDir: 'dist',
  server: {
    url: 'https://192.168.0.234:3000',
    allowNavigation: ['*']
  },
  plugins: {
    CapacitorHttp: {
      enabled: false
    }
  }
};

export default config;
