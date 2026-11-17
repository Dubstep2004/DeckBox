package io.github.dubstep2004.deckbox

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import org.json.JSONObject

/**
 * Updates the app itself from the computer, over USB or Wi-Fi: the agent hands over the APK it already checked against
 * the release's SHA256SUMS (GET /api/update/apk), and Android's own installer asks once to confirm. Android only
 * accepts an APK signed with the same key, so nothing else can be installed this way.
 *
 * Progress goes to the panel as {"stage": "download" | "install" | "done" | "error", "pct": 0..100, "error": "…"}.
 */
class AppUpdater(private val context: Context, private val link: AgentLink, private val report: (String) -> Unit) {

    @Volatile private var busy = false

    fun start() {
        if (busy) return
        busy = true
        Thread({
            try { run() } catch (e: Exception) { send("error", error = e.message ?: e.javaClass.simpleName) } finally { busy = false }
        }, "app-update").apply { isDaemon = true; start() }
    }

    private fun run() {
        send("download", 0)
        val reply = link.download("/api/update/apk") ?: return send("error", error = "компьютер недоступен")
        if (reply.code != 200) {
            reply.body.close()
            return send("error", error = if (reply.code == 404) "в релизе нет приложения" else "ошибка ${reply.code} при скачивании")
        }
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = installer.createSession(params)
        installer.openSession(id).use { session ->
            var last = -1
            reply.body.use { input ->
                session.openWrite("DeckBox.apk", 0, -1).use { out ->
                    val buf = ByteArray(64 * 1024)
                    var total = 0L
                    val size = if (reply.length > 0) reply.length else 30L * 1024 * 1024
                    while (true) {
                        val n = input.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        total += n
                        val pct = (total * 100 / size).toInt().coerceAtMost(99)
                        if (pct >= last + 5) { last = pct; send("download", pct) }
                    }
                    session.fsync(out)
                }
            }
            send("install", 100)
            context.getSharedPreferences("deckbox-update", Context.MODE_PRIVATE).edit().putLong("started", System.currentTimeMillis()).apply()
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            val intent = PendingIntent.getBroadcast(context, id, Intent(context, InstallResult::class.java), flags)
            session.commit(intent.intentSender)
        }
    }

    private fun send(stage: String, pct: Int = 0, error: String? = null) {
        val j = JSONObject().put("stage", stage).put("pct", pct)
        if (error != null) j.put("error", error)
        report(j.toString())
    }

    /** Android's answer to the install session: a confirmation to show, or the result. */
    class InstallResult : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
                PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                    @Suppress("DEPRECATION")
                    val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT) ?: return
                    confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    context.startActivity(confirm)
                }
                PackageInstaller.STATUS_SUCCESS -> {} // the app restarts with the new version
                else -> {
                    val msg = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "установка отменена"
                    MainActivity.reportUpdate(JSONObject().put("stage", "error").put("error", msg).toString())
                }
            }
        }
    }

    /** The app was just replaced by its new version: open the panel again (only after an update from the card). */
    class Replaced : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val prefs = context.getSharedPreferences("deckbox-update", Context.MODE_PRIVATE)
            if (System.currentTimeMillis() - prefs.getLong("started", 0) > 30 * 60_000L) return
            prefs.edit().remove("started").apply()
            val open = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try { context.startActivity(open) } catch (_: Exception) { }
        }
    }
}
