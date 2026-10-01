package app.tidalchill;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

/** Widget taps land here and go straight to the running wallpaper. No network needed. */
public class CmdReceiver extends BroadcastReceiver {
  static final String ACTION = "app.tidalchill.CMD";

  @Override public void onReceive(Context c, Intent i) {
    String cmd = i.getStringExtra("cmd");
    if (cmd == null) return;
    if (!TideWallpaper.send(cmd)) Toast.makeText(c, "Set Tidal Chill as your wallpaper first", Toast.LENGTH_SHORT).show();
  }
}
