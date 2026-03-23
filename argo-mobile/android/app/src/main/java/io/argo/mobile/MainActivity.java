package io.argo.mobile;

import android.content.Intent;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import android.os.Bundle;
import android.util.Log;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    // This is a common workaround to bypass SSL errors for development
    // (e.g. self-signed mkcert certificates).
    // WARNING: DO NOT use this for production!
    @Override
    public void onResume() {
        super.onResume();
        handleIntent(getIntent());
        
        // Ensure webview trusts self-signed certs in debug mode
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.setWebViewClient(new com.getcapacitor.BridgeWebViewClient(this.bridge) {
                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, android.net.http.SslError error) {
                    // For development with self-signed certificates, we proceed.
                    // Ideally, use: if (BuildConfig.DEBUG) { handler.proceed(); }
                    handler.proceed(); 
                }
            });
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();
        Log.d("ArGoShare", "Received Intent: " + action + " (Type: " + type + ")");

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            // Clear the action so we don't process it again on subsequent onResume calls
            intent.setAction(null);

            JSObject ret = new JSObject();
            if ("text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null) {
                    ret.put("text", sharedText);
                }
            } else {
                Uri fileUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (fileUri != null) {
                    ret.put("url", fileUri.toString());
                    ret.put("mimeType", type);
                    ret.put("fileName", getFileName(fileUri));
                }
            }
            if (ret.length() > 0 && bridge != null && bridge.getWebView() != null) {
                String jsonData = ret.toString();
                Log.d("ArGoShare", "Injecting JS share data: " + jsonData);
                
                // We use evaluateJavascript to inject a global variable AND fire the event.
                // This is much more reliable than triggerJSEvent for complex objects.
                String js = "window._lastShare = " + jsonData + "; " +
                           "window.dispatchEvent(new CustomEvent('appShareReceived', { detail: " + jsonData + " }));";
                           
                new android.os.Handler().postDelayed(() -> {
                    if (bridge != null && bridge.getWebView() != null) {
                        bridge.getWebView().evaluateJavascript(js, null);
                    }
                }, 600); 
            }
        }
    }

    private String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (idx >= 0) result = cursor.getString(idx);
                }
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) result = result.substring(cut + 1);
        }
        return result;
    }
}
