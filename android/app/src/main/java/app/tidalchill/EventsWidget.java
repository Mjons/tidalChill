package app.tidalchill;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class EventsWidget extends AppWidgetProvider {
  static final String[] CMDS = {"surprise", "storm", "hurricane", "tsunami", "volcano", "nuke",
      "alien", "meteor", "blackhole", "party", "glitch", "calm"};
  static final int[] IDS = {R.id.w_surprise, R.id.w_storm, R.id.w_hurricane, R.id.w_tsunami, R.id.w_volcano, R.id.w_nuke,
      R.id.w_alien, R.id.w_meteor, R.id.w_blackhole, R.id.w_party, R.id.w_glitch, R.id.w_calm};

  @Override public void onUpdate(Context c, AppWidgetManager m, int[] widgetIds) {
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_events);
    for (int i = 0; i < CMDS.length; i++) v.setOnClickPendingIntent(IDS[i], pi(c, CMDS[i], i));
    m.updateAppWidget(widgetIds, v);
  }

  static PendingIntent pi(Context c, String cmd, int rc) {
    Intent i = new Intent(c, CmdReceiver.class).setAction(CmdReceiver.ACTION + "." + cmd).putExtra("cmd", cmd);
    return PendingIntent.getBroadcast(c, rc, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
  }
}
