package io.github.dubstep2004.deckbox

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import org.json.JSONObject

/**
 * Updates the app itself. The new APK comes from the computer (GET /api/update/apk, over USB or Wi-Fi; the agent already
 * checked it against the release's SHA256SUMS) or, when the computer is off or far away, straight from the DeckBox
 * release on GitHub (checked here against SHA256SUMS). A download cut off half-way goes on from where it stopped, and
 * the whole file is checked before Android's own installer gets it. Android only accepts an APK signed with the same
 * key; from Android 12 an app that installed itself before updates without a tap.
 *
 * Progress goes to the panel as {"stage": "download" | "verify" | "install" | "error", "pct": 0..100, "error": "…"}.
 */
class AppUpdater(private val context: Context, private val link: AgentLink, private val report: (String) -> Unit) {

    @Volatile private var busy = false
    private val dir get() = java.io.File(context.cacheDir, "update").apply { mkdirs() }
    private val prefs get() = context.getSharedPreferences("deckbox-update", Context.MODE_PRIVATE)

    /** From the computer (the default). */
    fun start() = go { fromAgent() }

    /** From the GitHub release: only github.com/Dubstep2004/DeckBox/releases/download/… links are taken. */
    fun startFromGitHub(apkUrl: String, sumsUrl: String) {
        if (!releaseLink(apkUrl) || !releaseLink(sumsUrl)) return send("error", error = "неверная ссылка на выпуск")
        go { fromGitHub(apkUrl, sumsUrl) }
    }

    /** True when Android 12+ lets the app update itself without a tap (it installed itself before). */
    fun silent(): Boolean = Build.VERSION.SDK_INT >= 31 && try {
        @Suppress("NewApi")
        context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName == context.packageName
    } catch (_: Exception) { false }

    private fun go(block: () -> Unit) {
        if (busy) return
        busy = true
        Thread({
            try { block() } catch (e: Exception) { send("error", error = e.message ?: e.javaClass.simpleName) } finally { busy = false }
        }, "app-update").apply { isDaemon = true; start() }
    }

    private fun fromAgent() {
        send("download", 0)
        val part = java.io.File(dir, "agent.apk.part")
        var from = if (part.exists()) part.length() else 0L
        var reply = link.download("/api/update/apk?from=$from") ?: return send("error", error = "компьютер недоступен")
        var sha = reply.header("X-Apk-Sha256")
        // a part of another version is not continued
        if (from > 0 && sha != prefs.getString("agent-sha", null)) {
            reply.body.close(); part.delete(); from = 0
            reply = link.download("/api/update/apk?from=0") ?: return send("error", error = "компьютер недоступен")
            sha = reply.header("X-Apk-Sha256")
        }
        if (reply.code != 200) {
            reply.body.close()
            return send("error", error = if (reply.code == 404) "в релизе нет приложения" else "ошибка ${reply.code} при скачивании")
        }
        prefs.edit().putString("agent-sha", sha).apply()
        val total = reply.header("X-Apk-Length")?.toLongOrNull() ?: (if (reply.length > 0) from + reply.length else -1L)
        save(reply.body, part, from, total)
        finish(part, sha)
    }

    private fun fromGitHub(apkUrl: String, sumsUrl: String) {
        send("download", 0)
        val name = apkUrl.substringAfterLast('/')
        val sums = String(open(sumsUrl, 0).second.use { it.readBytes() })
        val sha = sums.lineSequence().map { it.trim().split(Regex("\\s+\\*?")) }
            .firstOrNull { it.size >= 2 && it[1] == name }?.get(0)?.lowercase()
            ?: return send("error", error = "в SHA256SUMS нет $name")
        val part = java.io.File(dir, "$name.part")
        var from = if (part.exists()) part.length() else 0L
        var (code, body, total) = open(apkUrl, from)
        if (from > 0 && code != 206) { body.close(); part.delete(); from = 0; val r = open(apkUrl, 0); code = r.first; body = r.second; total = r.third }
        if (code !in 200..299) { body.close(); return send("error", error = "GitHub ответил $code") }
        save(body, part, from, if (total > 0) from + total else -1L)
        finish(part, sha)
    }

    /** GET with an optional Range; github.com answers with a redirect to its file host, which is followed. */
    private fun open(url: String, from: Long): Triple<Int, java.io.InputStream, Long> {
        val c = java.net.URL(url).openConnection() as javax.net.ssl.HttpsURLConnection
        c.connectTimeout = 15_000; c.readTimeout = 60_000
        c.setRequestProperty("User-Agent", "DeckBox-App")
        if (from > 0) c.setRequestProperty("Range", "bytes=$from-")
        val code = c.responseCode
        val body = (if (code >= 400) c.errorStream else c.inputStream) ?: java.io.ByteArrayInputStream(ByteArray(0))
        return Triple(code, body, c.getHeaderField("Content-Length")?.toLongOrNull() ?: -1L)
    }

    private fun releaseLink(url: String): Boolean = try {
        val u = java.net.URL(url)
        u.protocol == "https" && u.host == "github.com" && u.path.startsWith("/Dubstep2004/DeckBox/releases/download/") && !u.path.contains("..")
    } catch (_: Exception) { false }

    /** Appends the body to the part file (from = what it already has) and reports the progress. */
    private fun save(input: java.io.InputStream, part: java.io.File, from: Long, total: Long) {
        var last = -1
        var have = from
        val size = if (total > 0) total else 30L * 1024 * 1024
        input.use { src ->
            java.io.FileOutputStream(part, from > 0).use { out ->
                val buf = ByteArray(64 * 1024)
                while (true) {
                    val n = src.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n)
                    have += n
                    val pct = (have * 100 / size).toInt().coerceAtMost(99)
                    if (pct >= last + 5) { last = pct; send("download", pct) }
                }
            }
        }
        if (total > 0 && have < total) throw java.io.IOException("связь оборвалась на ${have * 100 / total}% — нажмите «Повторить», скачивание продолжится")
    }

    /** Checks the whole file and hands it to Android's installer. */
    private fun finish(part: java.io.File, sha: String?) {
        send("verify", 100)
        if (sha != null) {
            val md = java.security.MessageDigest.getInstance("SHA-256")
            part.inputStream().use { s -> val b = ByteArray(64 * 1024); while (true) { val n = s.read(b); if (n < 0) break; md.update(b, 0, n) } }
            val got = md.digest().joinToString("") { "%02x".format(it) }
            if (!got.equals(sha, ignoreCase = true)) { part.delete(); throw java.io.IOException("файл повреждён при скачивании, скачайте ещё раз") }
        }
        val installer = context.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(context.packageName)
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = installer.createSession(params)
        try {
            installer.openSession(id).use { session ->
                part.inputStream().use { input ->
                    session.openWrite("DeckBox.apk", 0, part.length()).use { out -> input.copyTo(out, 64 * 1024); session.fsync(out) }
                }
                send("install", 100)
                prefs.edit().putLong("started", System.currentTimeMillis()).apply()
                val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                val intent = PendingIntent.getBroadcast(context, id, Intent(context, InstallResult::class.java), flags)
                session.commit(intent.intentSender)
            }
            part.delete()
        } catch (e: Exception) {
            try { installer.abandonSession(id) } catch (_: Exception) { }
            throw e
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
            if (intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
            val prefs = context.getSharedPreferences("deckbox-update", Context.MODE_PRIVATE)
            if (System.currentTimeMillis() - prefs.getLong("started", 0) > 30 * 60_000L) return
            prefs.edit().remove("started").apply()
            val open = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try { context.startActivity(open) } catch (_: Exception) { }
        }
    }
}
