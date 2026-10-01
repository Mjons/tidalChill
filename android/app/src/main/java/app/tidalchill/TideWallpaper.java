package app.tidalchill;

import android.app.Presentation;
import android.content.SharedPreferences;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.net.Uri;
import android.service.wallpaper.WallpaperService;
import android.util.Log;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Live wallpaper that renders the Tidal Chill sim in a WebView.
 * The WebView lives in a Presentation on a private VirtualDisplay whose surface is the
 * wallpaper surface, so it stays GPU accelerated. Launcher scroll offsets go to JS.
 */
public class TideWallpaper extends WallpaperService {
  static final String TAG = "TidalChill";
  static final String BASE = "https://mjons.github.io/tidalChill/";
  static final Set<TideEngine> ENGINES = new HashSet<>();

  @Override public Engine onCreateEngine() { return new TideEngine(); }

  /** Send a command (event name, calm, surprise...) to every live wallpaper. Returns false if none. */
  static boolean send(String cmd) {
    boolean any = false;
    for (TideEngine e : ENGINES) { if (!e.isPreview() || ENGINES.size() == 1) { e.cmd(cmd); any = true; } }
    return any;
  }

  static String query(SharedPreferences p) {
    StringBuilder q = new StringBuilder("?wall");
    String topic = p.getString(Prefs.TOPIC, Prefs.DEF_TOPIC).trim();
    if (!topic.isEmpty()) q.append("&topic=").append(Uri.encode(topic));
    q.append("&chaos=").append(p.getInt(Prefs.CHAOS, 6));
    q.append("&fps=").append(p.getInt(Prefs.FPS, 30));
    q.append("&pan=").append(String.format(Locale.US, "%.2f", p.getInt(Prefs.PAN, 50) / 100f));
    if (!p.getBoolean(Prefs.TOASTS, true)) q.append("&toasts=0");
    return q.toString();
  }

  class TideEngine extends Engine implements SharedPreferences.OnSharedPreferenceChangeListener {
    VirtualDisplay vd;
    Presentation pres;
    WebView web;
    GestureDetector gd;
    float off = 0.5f;
    boolean ready;

    @Override public void onCreate(SurfaceHolder sh) {
      super.onCreate(sh);
      setTouchEventsEnabled(true);
      setOffsetNotificationsEnabled(true);
      gd = new GestureDetector(TideWallpaper.this, new GestureDetector.SimpleOnGestureListener() {
        @Override public boolean onDoubleTap(MotionEvent e) { surprise(); return true; }
      });
      Prefs.get(TideWallpaper.this).registerOnSharedPreferenceChangeListener(this);
      ENGINES.add(this);
    }

    @Override public void onSurfaceChanged(SurfaceHolder holder, int format, int w, int h) {
      super.onSurfaceChanged(holder, format, w, h);
      int dpi = getResources().getDisplayMetrics().densityDpi;
      try {
        if (vd == null) {
          DisplayManager dm = (DisplayManager) getSystemService(DISPLAY_SERVICE);
          vd = dm.createVirtualDisplay("tidalchill", w, h, dpi, holder.getSurface(), 0);
          pres = new Presentation(TideWallpaper.this, vd.getDisplay());
          web = new WebView(pres.getContext());
          setupWeb();
          pres.setContentView(web);
          pres.show();
          loadPage();
        } else {
          vd.resize(w, h, dpi);
          vd.setSurface(holder.getSurface());
        }
      } catch (Throwable t) {
        Log.e(TAG, "surface setup failed", t);
      }
    }

    @Override public void onSurfaceDestroyed(SurfaceHolder holder) {
      if (vd != null) vd.setSurface(null);
      super.onSurfaceDestroyed(holder);
    }

    @Override public void onVisibilityChanged(boolean visible) {
      if (web == null) return;
      if (visible) { web.onResume(); js("window.tlVis&&tlVis(1)"); pushOffset(); }
      else { js("window.tlVis&&tlVis(0)"); web.onPause(); }
    }

    @Override public void onOffsetsChanged(float xOff, float yOff, float xStep, float yStep, int xPx, int yPx) {
      if (isPreview()) return;
      off = xOff;
      pushOffset();
    }

    @Override public void onTouchEvent(MotionEvent e) { if (gd != null) gd.onTouchEvent(e); }

    long lastTap, lastSurprise;
    // most launchers also forward taps as commands; two quick ones = double tap
    @Override public android.os.Bundle onCommand(String action, int x, int y, int z, android.os.Bundle extras, boolean result) {
      if ("android.wallpaper.tap".equals(action)) {
        long now = System.currentTimeMillis();
        if (now - lastTap < 400) { surprise(); lastTap = 0; } else lastTap = now;
      }
      return null;
    }

    void surprise() {
      long now = System.currentTimeMillis();
      if (now - lastSurprise < 600) return;
      lastSurprise = now;
      js("window.tlSurprise&&tlSurprise()");
    }

    @Override public void onSharedPreferenceChanged(SharedPreferences p, String key) { if (web != null) loadPage(); }

    @Override public void onDestroy() {
      ENGINES.remove(this);
      Prefs.get(TideWallpaper.this).unregisterOnSharedPreferenceChangeListener(this);
      try { if (pres != null) pres.dismiss(); } catch (Throwable ignored) {}
      if (web != null) { web.destroy(); web = null; }
      if (vd != null) { vd.release(); vd = null; }
      super.onDestroy();
    }

    void setupWeb() {
      WebSettings s = web.getSettings();
      s.setJavaScriptEnabled(true);
      s.setDomStorageEnabled(true);
      s.setMediaPlaybackRequiresUserGesture(true);
      web.setBackgroundColor(0xFF05070F);
      web.setVerticalScrollBarEnabled(false);
      web.setHorizontalScrollBarEnabled(false);
      web.setWebViewClient(new WebViewClient() {
        @Override public void onPageFinished(WebView v, String url) {
          ready = true;
          pushOffset();
          if (!isVisible()) js("window.tlVis&&tlVis(0)");
        }
      });
    }

    void loadPage() {
      ready = false;
      SharedPreferences p = Prefs.get(TideWallpaper.this);
      String q = query(p);
      if (p.getBoolean(Prefs.ONLINE, false)) { web.loadUrl(BASE + q); return; }
      String html = readAsset("index.html");
      if (html == null) { web.loadUrl(BASE + q); return; }
      // feed the query straight into the sim, independent of how the base URL is reported
      html = html.replace("new URLSearchParams(location.search)", "new URLSearchParams(\"" + q + "\")");
      web.loadDataWithBaseURL(BASE, html, "text/html", "utf-8", null);
    }

    void pushOffset() {
      if (!ready) return;
      float o = isPreview() ? 0.5f : off;
      js("window.wallOffset&&wallOffset(" + String.format(Locale.US, "%.4f", o) + ")");
    }

    void cmd(String c) {
      String safe = c.toLowerCase(Locale.US).replaceAll("[^a-z ]", "");
      js("window.tlCmd&&tlCmd('" + safe + "')");
    }

    void js(String s) { if (web != null) web.evaluateJavascript(s, null); }
  }

  String readAsset(String name) {
    try (InputStream in = getAssets().open(name)) {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      byte[] b = new byte[65536];
      int n;
      while ((n = in.read(b)) > 0) out.write(b, 0, n);
      return out.toString("UTF-8");
    } catch (Exception e) {
      Log.e(TAG, "asset read failed", e);
      return null;
    }
  }
}
