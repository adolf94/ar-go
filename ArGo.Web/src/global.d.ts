interface WebConfig {
  api: string;
  clientId: string;
  redirectUri: string;
  authUri: string;
}

interface Window {
  webConfig: WebConfig;
}

declare var webConfig: WebConfig;
