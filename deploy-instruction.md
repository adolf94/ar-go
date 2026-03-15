# ArGo Deployment Guide: Azure (Single Domain)

This guide outlines the steps to deploy the ArGo application to Azure using a single domain. We will use **Azure Static Web Apps (SWA)** for the frontend, which allows us to "link" our **Azure Functions** backend under the same hostname.

## 1. Backend: Azure Functions (ArGo.Api)

Since you already have the blob storage and basic environment ready:

1.  **Create a Function App**:
    - In Azure Portal, create a new **Function App**.
    - **Runtime stack**: .NET 9 (In-process or Isolated, matching your code).
    - **Hosting**: Choose a plan (Consumption is usually fine).
2.  **Configure Environment Variables**:
    - Go to **Configuration** > **Application settings**.
    - Add your Cosmos DB Connection String, Blob Storage Connection String, and any other secrets.
3.  **Deploy**:
    - You can deploy directly from VS Code (Azure Functions extension) or via GitHub Actions.
    - Ensure your `local.settings.json` values are mirrored in the Azure Application Settings.

## 2. Frontend: Azure Static Web Apps (ArGo.Web)

The SWA will host your React app and act as the primary domain.

1.  **Create Static Web App**:
    - In Azure Portal, search for **Static Web Apps**.
    - Create a new one.
    - **Deployment details**: Select "Other" if deploying manually, or link your GitHub/Azure DevOps repo.
    - **Build Presets**: Vite (if available) or Custom.
        - **App location**: `/ArGo.Web`
        - **Api location**: (Leave empty for now as we will link an existing function).
        - **Output location**: `dist`
2.  **Link the Backend (Single Domain magic)**:
    - Once the SWA is created, go to **Settings** > **APIs**.
    - Select **Link a Function App**.
    - Choose your `ArGo.Api` function app created in Step 1.
    - **Result**: Your backend will now be reachable at `https://<your-swa-domain>/api/*`. No CORS configuration is needed because they share the same origin.

## 3. Root Level Redirection (/{shortCode})

To allow `domain.com/abc123` to trigger the backend redirect automatically:

1.  **staticwebapp.config.json**: I have created this file in your `ArGo.Web` folder. It contains a routing rule:
    ```json
    {
      "route": "/:shortCode",
      "rewrite": "/api/:shortCode",
      "methods": ["GET"]
    }
    ```
2.  **How it works**: When a user visits a path like `/abc123`, Azure Static Web Apps checks if a static file exists. If not, it rewrites the request to your linked API at `/api/abc123`, which triggers your `RedirectFunction`.

## 4. Google Cloud Console (OAuth)

Since your frontend uses `@react-oauth/google`, you need to update your credentials:

1.  Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Edit your **OAuth 2.0 Client ID**.
3.  **Authorized JavaScript origins**:
    - Add `https://<your-swa-domain>.azurestaticapps.net` (and your custom domain if you have one).
4.  **Authorized redirect URIs**:
    - Add the same domain.

## 4. Final Application Configuration

1.  **Vite Environment Variable**:
    - In the Azure Portal for your **Static Web App**, go to **Settings** > **Configuration**.
    - Add `VITE_API_BASE_URL` with value `/api`.
    - *Note: Because of the Linked Backend, `/api` is relative to the current domain.*
2.  **Google Client ID**:
    - Ensure `VITE_GOOGLE_CLIENT_ID` is set in the SWA configuration if your code pulls it from environment variables, or update it directly in `main.tsx`.

## 5. Summary of Domain Flow
- **Browser visits**: `argo.com`
- **Frontend**: Served by SWA.
- **API calls**: `argo.com/api/upload` -> Automatically routed by Azure to your Function App.
- **Authentication**: Google recognizes `argo.com` as an authorized origin.
