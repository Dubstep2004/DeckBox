namespace DeckBox.Agent;

/// <summary>
/// Explains why a phone that still talks to the agent (over Wi-Fi) is missing from adb, from the phone's own view of
/// its USB link (sent with its battery report). The usual cause is a cable or port that carries power but no data.
/// </summary>
public static class UsbDoctor
{
    /// <summary>A report older than this says nothing about the link any more.</summary>
    public const long FreshMs = 2 * 60_000;

    /// <summary>A sentence for the settings page and the log, or null when there is nothing to explain.</summary>
    public static string? Diagnose(PhoneBatteryReport? r, bool adbSeesPhone, long now)
    {
        if (adbSeesPhone || r is null || now - r.At > FreshMs) return null;
        if (r.Usb is null) return null; // an older app that does not report its USB link
        var usb = r.Usb.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        var connected = usb.Contains("connected");
        if (connected && usb.Contains("adb"))
            return "Телефон подключён по USB с включённой отладкой, но adb его не видит. "
                + "Попробуйте другой USB-порт (прямо в компьютере, не через хаб) или перезапустите adb (adb kill-server).";
        if (connected)
            return "Телефон подключён по USB, но отладка по USB выключена. Включите её в настройках телефона «Для разработчиков».";
        if (r.Plugged)
            return "Телефон заряжается, но данных по USB нет: кабель или порт только заряжает. "
                + "Попробуйте другой кабель или порт; пока панель работает по Wi-Fi.";
        return null;
    }
}
