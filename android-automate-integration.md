---
description: Android Share Integration via LlamaLabs Automate
---

# Android Share Integration for ArGo

This workflow allows you to create shortlinks directly from any Android app using the "Share" menu.

## Prerequisites

1.  **LlamaLabs Automate** app installed on your Android device.
2.  **Authentication Token**: A valid Bearer token from ArGo is required. See the [Obtaining a Token](#obtaining-a-token) section below.

## Obtaining a Token

There are two primary ways to get a token for use in Automate.

### Method 1: The "Quick" Way (Browser Extraction)
This is the easiest method for personal use. Your browser already has a valid token if you are logged into the ArGo web app.

1.  Open the **ArGo Web App** and log in.
2.  Press **F12** to open Developer Tools.
3.  Navigate to the **Application** tab (on Chrome) or **Storage** tab (on Firefox).
4.  Under **Session Storage**, select your ArGo URL (e.g., `https://localhost:5174` or your production URL).
5.  Look for a key named `oidc.user:https://auth.adolfrey.com/api:ar-go-web`.
6.  Copy the `access_token` from the JSON object.
7.  **Note**: This token is temporary and will eventually expire.

### Method 2: The "Proper" Way (Manual OAuth Exchange)
For a permanent integration, you can perform a manual OAuth 2.0 exchange as described in the `ar-auth` README.

1.  **Register a Client**: Ensure you have a client registered in **AR Auth** with the `authorization_code` grant type.
2.  **Required Scopes**: Request the following scopes:
    - `openid profile email api://ar-go-api/user`
3.  **Exchange for Token**: Use the standard OAuth 2.0 flow (Authorize -> Exchange Code -> Get Token) to receive an `access_token` and a `refresh_token`.

---

## Automate Flow Configuration

### 1. Intent Received
- **Block**: `Intent received`
- **Action**: `android.intent.action.SEND`
- **MIME type**: `text/plain`
- **Proceed**: `When received`
- **Output variables**:
    - `Extras`: `intentExtras`

### 2. Variable Set (Extract URL)
- **Block**: `Variable set`
- **Variable**: `sharedUrl`
- **Value**: `intentExtras["android.intent.extra.TEXT"]`

### 3. HTTP Request
- **Block**: `HTTP request`
- **Request URL**: `https://<YOUR_API_DOMAIN>/api/shorten`
- **Method**: `POST`
- **Content type**: `application/json`
- **Request headers**: `{"Authorization": "Bearer <YOUR_TOKEN>"}`
- **Request content**: `{"longUrl": jsonEncode(sharedUrl)}`
- **Response content mapping**: `responseBody`

### 4. Parse Response
- **Block**: `Variable set`
- **Variable**: `shortCode`
- **Value**: `jsonDecode(responseBody)["shortCode"]`

### 5. Construct Final URL
- **Block**: `Variable set`
- **Variable**: `finalLink`
- **Value**: `"https://<YOUR_REDIRECTOR_DOMAIN>/" ++ shortCode`

### 6. Set Clipboard
- **Block**: `Set clipboard`
- **Text**: `finalLink`

### 7. Notification
- **Block**: `Toast show` / `Notification show`
- **Message**: `"Shortlink copied to clipboard: " ++ finalLink`

## Automated Authentication (Browser Login)

If you want Automate to handle the login itself, you can add a path for when the API returns an "Unauthorized" (401) status code.

### 1. Check for 401 Unauthorized
In your **HTTP Request** block:
- **Proceed**: `When response`
- **Output variables**: `responseData`, `responseStatus`

### 2. Login Flow (If responseStatus = 401)
If the token is expired or missing:

- **Block**: `Dialog web` (Recommended)
  - **URL**: `https://auth.adolfrey.com/api/authorize?client_id=argo-automate&redirect_uri=automate://callback&response_type=code`
  - **Interception URL**: `automate://callback.*`
  - **Proceed**: `When URL intercepted`
  - **Output variables**: `interceptedUrl`
- **Block**: `Variable set` (Extract Code)
  - **Variable**: `authCode`
  - **Value**: `replaceAll(interceptedUrl, r".*code=([^&]+).*", "$1")`

**Note on Custom URL Schemes:**
Automate uses the `automate://` scheme by default. While you cannot register your own unique scheme (like `argo://`) within the app, you can use any path (e.g., `automate://argo-callback`) to distinguish your flow's redirects. Ensure this URL is added to your OAuth provider's **Allowed Redirect URIs**.

### 3. Alternative: Intent Received (Deep Linking)
If you prefer not to use `Dialog web`, you can use a separate listener:

- **Block**: `Content view` or `Browser open` (To open the login page)
- **Block**: `Intent received` (To catch the return)
  - **Action**: `android.intent.action.VIEW`
  - **Data URI**: `automate://callback`
  - **Category**: `android.intent.category.BROWSABLE`
  - **Proceed**: `When received`
  - **Output variables**: `dataUri`

### Method 3: Zero-Touch Sync (Cloud Message receive)
This is the most advanced and seamless method. Instead of copy-pasting, AR Auth pushes the token directly to your device via the Automate Cloud Messaging API.

1.  **Configure Automate**:
    - Add a **Cloud message receive** block to your flow.
    - Set the **Output variable** for the message data (e.g., `payload`).
2.  **Redirect & Push**:
    - After a successful login, the AR Auth redirect page (e.g., `/api/token-sync`) makes a POST request to `https://llamalab.com/automate/cloud/message`.
    - **Payload**: `{"to": "<YOUR_AUTOMATE_EMAIL>", "secret": "<YOUR_AUTOMATE_SECRET>", "payload": "bearer_token"}`.
3.  **Update Variable**:
    - When the **Cloud message receive** block triggers, parse the `payload` and update your local `token` variable.
    - This allows you to log in on your phone, and have the flow instantly resume with the new token.

---

## Automate Flow Configuration

## Final Security Note
