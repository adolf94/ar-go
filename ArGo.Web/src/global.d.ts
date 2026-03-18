interface WebConfig {
  api: string;
  clientId: string;
  redirectUri: string;
  authUri: string;
  scope: string;
}

interface Window {
  webConfig: WebConfig;
}

declare var webConfig: WebConfig;
