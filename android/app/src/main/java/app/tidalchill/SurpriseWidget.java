package app.tidalchill;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

public class SurpriseWidget extends AppWidgetProvider {
  @Override public void onUpdate(Context c, AppWidgetManager m, int[] widgetIds) {
    RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_surprise);
    v.setOnClickPendingIntent(R.id.w_surprise, EventsWidget.pi(c, "surprise", 100));
    m.updateAppWidget(widgetIds, v);
  }
}
