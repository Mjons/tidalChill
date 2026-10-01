package app.tidalchill;

import android.content.Context;
import android.content.SharedPreferences;

final class Prefs {
  static final String TOPIC = "topic", CHAOS = "chaos", FPS = "fps", PAN = "pan", TOASTS = "toasts", ONLINE = "online";
  static final String DEF_TOPIC = "tidalchill-3e26af51d72a";
  static SharedPreferences get(Context c) { return c.getSharedPreferences("tide", Context.MODE_PRIVATE); }
  private Prefs() {}
}
