import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.uk.designspin.mvr',
  appName: 'Maximum Velocity Racing',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
