package io.github.dubstep2004.deckbox

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * «Есть обновление»: a quiet notification while a new version waits, so launchers draw a dot (a badge) on the DeckBox
 * icon. It goes away once the app is up to date. Nothing else is ever notified.
 */
object UpdateBadge {
    private const val CHANNEL = "updates"
    private const val ID = 4201

    fun show(context: Context, version: String) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Обновления DeckBox", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Точка на значке, когда вышла новая версия"
                setShowBadge(true)
            })
        }
        val open = PendingIntent.getActivity(context, 0, Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0))
        @Suppress("DEPRECATION")
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL) else Notification.Builder(context)
        b.setSmallIcon(R.drawable.ic_tile)
            .setContentTitle("Вышел DeckBox $version")
            .setContentText("Откройте панель и нажмите «Обновить»")
            .setContentIntent(open)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
        if (Build.VERSION.SDK_INT >= 26) b.setNumber(1)
        try { nm.notify(ID, b.build()) } catch (_: SecurityException) { } // notifications turned off: no badge then
    }

    fun clear(context: Context) {
        (context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager)?.cancel(ID)
    }
}
