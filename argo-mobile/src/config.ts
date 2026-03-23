export const config = {
  api: 'https://go.adolfrey.com/api', // 10.0.2.2 is the android emulator alias to localhost
  authUri: 'https://auth.adolfrey.com/api',
  clientId: 'ar-go-mobile',
  redirectUri: 'io.argo.mobile://auth/callback',
  scope: 'openid profile email offline_access api://ar-go-api/user api://ar-go-api/files:create'
};
