import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.apptaro.dog.health',
  appName: 'わんこの健康手帳',

  server: {
    url: 'https://dog-health-app-six.vercel.app',
    cleartext: true,
  },

  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Firebase Console → Authentication → Sign-in method → Google →
      // 「ウェブSDK設定」→「ウェブクライアントID」をここに貼る
      serverClientId: '665471268961-9rphq2qhms1crol5jb0hqijceibng7nt.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
