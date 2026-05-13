import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apptaro.dog.health',
  appName: 'わんこの健康手帳',

  server: {
    url: 'https://dog-health-app-six.vercel.app',
    cleartext: true,
  },

  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
};

export default config;
