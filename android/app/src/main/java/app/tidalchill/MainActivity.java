package app.tidalchill;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;

/** Settings, one-tap "set as wallpaper", and an in-app event pad. */
public class MainActivity extends Activity {
  static final int BG = 0xFF0B1424, PANEL = 0xFF13213A, INK = 0xFFE8EEFC, DIM = 0xFF8AA0C8, ACC = 0xFFFFB347;
  static final String[][] EV = {{"surprise", "🎲 Surprise"}, {"storm", "⛈ Storm"}, {"hurricane", "🌀 Hurricane"},
      {"tsunami", "🌊 Tsunami"}, {"volcano", "🌋 Volcano"}, {"nuke", "☢ Nuke"}, {"alien", "🛸 Aliens"},
      {"meteor", "☄ Meteor"}, {"blackhole", "⚫ Black hole"}, {"party", "🎉 Party"}, {"glitch", "👾 Glitch"},
      {"calm", "☀ Calm"}, {"newsea", "🏝 New sea"}};

  SharedPreferences p;
  EditText topic, chaos, fps;
  CheckBox toasts, online;
  SeekBar pan;
  float dp;

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    p = Prefs.get(this);
    dp = getResources().getDisplayMetrics().density;
    getWindow().setStatusBarColor(BG);
    getWindow().setNavigationBarColor(BG);

    LinearLayout col = new LinearLayout(this);
    col.setOrientation(LinearLayout.VERTICAL);
    int pad = px(18);
    col.setPadding(pad, px(28), pad, px(28));

    TextView title = text("TIDAL CHILL", 24, INK);
    title.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
    col.addView(title);
    col.addView(text("Pixel beach live wallpaper. Swipe your home screen and the beach scrolls with you.", 13, DIM));

    Button set = button("Set as wallpaper", ACC);
    set.setOnClickListener(v -> setWallpaper());
    col.addView(set, lp(px(16)));

    col.addView(header("Events"));
    GridLayout g = new GridLayout(this);
    g.setColumnCount(2);
    for (String[] e : EV) {
      Button bt = button(e[1], INK);
      bt.setOnClickListener(v -> {
        if (!TideWallpaper.send(e[0])) Toast.makeText(this, "Set Tidal Chill as your wallpaper first", Toast.LENGTH_SHORT).show();
        else Toast.makeText(this, e[1] + " sent. Go look!", Toast.LENGTH_SHORT).show();
      });
      GridLayout.LayoutParams gl = new GridLayout.LayoutParams(GridLayout.spec(GridLayout.UNDEFINED), GridLayout.spec(GridLayout.UNDEFINED, 1f));
      gl.width = 0;
      gl.setMargins(px(3), px(3), px(3), px(3));
      g.addView(bt, gl);
    }
    col.addView(g);
    col.addView(text("Tip: long-press your home screen > Widgets > Tidal Chill for the event pad and a 1x1 surprise button. Double-tap the wallpaper for a surprise.", 12, DIM), lp(px(8)));

    col.addView(header("Settings"));
    col.addView(label("Random event every N minutes (0 = off)"));
    chaos = num(p.getInt(Prefs.CHAOS, 6));
    col.addView(chaos);
    col.addView(label("Frame rate cap (10-60, lower saves battery)"));
    fps = num(p.getInt(Prefs.FPS, 30));
    col.addView(fps);
    col.addView(label("How far the beach scrolls across your pages"));
    pan = new SeekBar(this);
    pan.setMax(150);
    pan.setProgress(p.getInt(Prefs.PAN, 50));
    col.addView(pan);
    toasts = check("Show event captions", p.getBoolean(Prefs.TOASTS, true));
    col.addView(toasts);
    online = check("Load live version from the web (gets sim updates without a new APK)", p.getBoolean(Prefs.ONLINE, false));
    col.addView(online);
    col.addView(label("Remote topic (for remote.html / PC / HTTP Shortcuts)"));
    topic = new EditText(this);
    topic.setText(p.getString(Prefs.TOPIC, Prefs.DEF_TOPIC));
    topic.setSingleLine(true);
    style(topic);
    col.addView(topic);

    Button save = button("Save settings", ACC);
    save.setOnClickListener(v -> { save(); Toast.makeText(this, "Saved. Wallpaper reloading.", Toast.LENGTH_SHORT).show(); });
    col.addView(save, lp(px(14)));

    ScrollView sv = new ScrollView(this);
    sv.setBackgroundColor(BG);
    sv.setFillViewport(true);
    sv.addView(col);
    setContentView(sv);
  }

  void save() {
    p.edit()
        .putInt(Prefs.CHAOS, clamp(parse(chaos, 6), 0, 600))
        .putInt(Prefs.FPS, clamp(parse(fps, 30), 10, 60))
        .putInt(Prefs.PAN, pan.getProgress())
        .putBoolean(Prefs.TOASTS, toasts.isChecked())
        .putBoolean(Prefs.ONLINE, online.isChecked())
        .putString(Prefs.TOPIC, topic.getText().toString().trim())
        .apply();
  }

  void setWallpaper() {
    try {
      Intent i = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
      i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, new ComponentName(this, TideWallpaper.class));
      startActivity(i);
    } catch (Exception e) {
      try { startActivity(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)); }
      catch (Exception e2) { Toast.makeText(this, "Open Settings > Wallpaper and pick Tidal Chill", Toast.LENGTH_LONG).show(); }
    }
  }

  int parse(EditText e, int d) { try { return Integer.parseInt(e.getText().toString().trim()); } catch (Exception x) { return d; } }
  static int clamp(int v, int a, int b) { return Math.max(a, Math.min(b, v)); }
  int px(int d) { return Math.round(d * dp); }
  LinearLayout.LayoutParams lp(int top) {
    LinearLayout.LayoutParams l = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    l.topMargin = top;
    return l;
  }
  TextView text(String s, int sp, int color) {
    TextView t = new TextView(this);
    t.setText(s); t.setTextSize(sp); t.setTextColor(color); t.setTypeface(Typeface.MONOSPACE);
    t.setPadding(0, px(4), 0, px(4));
    return t;
  }
  TextView header(String s) { TextView t = text(s.toUpperCase(), 15, ACC); t.setPadding(0, px(22), 0, px(6)); return t; }
  TextView label(String s) { TextView t = text(s, 12, DIM); t.setPadding(0, px(10), 0, 0); return t; }
  Button button(String s, int color) {
    Button bt = new Button(this);
    bt.setText(s); bt.setAllCaps(false); bt.setTextColor(color); bt.setTypeface(Typeface.MONOSPACE);
    bt.setBackgroundColor(PANEL);
    bt.setGravity(Gravity.CENTER);
    return bt;
  }
  EditText num(int v) {
    EditText e = new EditText(this);
    e.setInputType(InputType.TYPE_CLASS_NUMBER);
    e.setText(String.valueOf(v));
    style(e);
    return e;
  }
  void style(EditText e) { e.setTextColor(INK); e.setTypeface(Typeface.MONOSPACE); e.setBackgroundColor(PANEL); e.setPadding(px(10), px(10), px(10), px(10)); }
  CheckBox check(String s, boolean on) {
    CheckBox c = new CheckBox(this);
    c.setText(s); c.setChecked(on); c.setTextColor(INK); c.setTypeface(Typeface.MONOSPACE);
    c.setPadding(0, px(10), 0, px(4));
    return c;
  }
  @Override protected void onPause() { super.onPause(); }
}
