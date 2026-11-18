using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;

namespace DeckBox.Agent;

/// <summary>System tray icon: status, settings, logs, start with Windows, quit.</summary>
public sealed class Tray : IHostedService
{
    private readonly string SettingsUrl;

    private readonly IHostApplicationLifetime _life;
    private readonly AdbReverse _adb;
    private Thread? _thread;
    private ApplicationContext? _ctx;
    private Control? _invoker;
    private NotifyIcon? _icon;

    public Tray(IHostApplicationLifetime life, AdbReverse adb, AgentEndpoint endpoint)
    {
        SettingsUrl = endpoint.SettingsUrl;
        _life = life;
        _adb = adb;
    }

    public Task StartAsync(CancellationToken ct)
    {
        _thread = new Thread(Run) { IsBackground = true, Name = "tray" };
        _thread.SetApartmentState(ApartmentState.STA);
        _thread.Start();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct)
    {
        try { _invoker?.BeginInvoke(() => { if (_icon != null) _icon.Visible = false; _ctx?.ExitThread(); }); } catch { }
        return Task.CompletedTask;
    }

    private void Run()
    {
        Application.EnableVisualStyles();
        // Invisible control used to marshal calls onto this UI thread (its handle is created here).
        var host = new Control();
        _ = host.Handle;
        _invoker = host;
        _ctx = new ApplicationContext();

        using var iconStream = AppPaths.Resource("deckbox.ico");
        var status = new ToolStripMenuItem { Enabled = false };
        var autostart = new ToolStripMenuItem("Запускать вместе с Windows");
        autostart.Click += (_, _) => { ToggleAutostart(); autostart.Checked = File.Exists(AppPaths.StartupShortcut); };

        var menu = new ContextMenuStrip();
        menu.Items.Add(new ToolStripMenuItem($"DeckBox {AppPaths.Version}") { Enabled = false });
        menu.Items.Add(status);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Настройки…", null, (_, _) => OpenUrl(SettingsUrl)) { Font = new Font(menu.Font, FontStyle.Bold) });
        // cancelled while Windows is ending the session (no adb is started then, for at most a minute): nothing to show
        menu.Items.Add("Открыть панель на телефоне", null, async (_, _) => { try { await _adb.OpenPanelAsync(); } catch (OperationCanceledException) { } });
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Открыть config.json", null, (_, _) => Open("notepad.exe", AppPaths.ConfigPath));
        menu.Items.Add("Открыть журнал", null, (_, _) => Open("notepad.exe", AppPaths.LogPath));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(autostart);
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Выход", null, (_, _) => _life.StopApplication());
        menu.Opening += (_, _) =>
        {
            status.Text = _adb.Connected ? $"Телефон подключён ({_adb.Devices})" : "Телефон не подключён";
            autostart.Checked = File.Exists(AppPaths.StartupShortcut);
        };

        _icon = new NotifyIcon
        {
            Icon = iconStream is null ? SystemIcons.Application : new Icon(iconStream, 32, 32),
            Text = "DeckBox",
            ContextMenuStrip = menu,
            Visible = true,
        };
        _icon.DoubleClick += (_, _) => OpenUrl(SettingsUrl);
        // «Вышел DeckBox 1.5.0»: a Windows notification once per new version; a click opens the settings and its card
        _icon.BalloonTipClicked += (_, _) => OpenUrl(SettingsUrl);
        UpdateService.NewRelease += (version, name) =>
        {
            if (QuietMode.Snapshot().On) return; // «Не беспокоить» keeps it quiet
            try
            {
                host.BeginInvoke(() => _icon.ShowBalloonTip(10_000, $"Вышел DeckBox {version}",
                    (string.IsNullOrWhiteSpace(name) ? "" : name + ". ") + "Нажмите, чтобы посмотреть, что нового, и обновить.", ToolTipIcon.Info));
            }
            catch { }
        };
        _adb.StateChanged += () =>
        {
            try { host.BeginInvoke(() => _icon.Text = _adb.Connected ? "DeckBox — телефон подключён" : "DeckBox — ждёт телефон"); } catch { }
        };

        Application.Run(_ctx);
        _icon.Visible = false;
        _icon.Dispose();
    }

    private static void OpenUrl(string url)
    {
        try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
    }

    private static void Open(string app, string path)
    {
        try { Process.Start(new ProcessStartInfo(app, $"\"{path}\"") { UseShellExecute = true }); } catch { }
    }

    /// <summary>Adds/removes a Startup-folder shortcut (only when the user clicks the menu item).</summary>
    private static void ToggleAutostart()
    {
        try
        {
            if (File.Exists(AppPaths.StartupShortcut)) { File.Delete(AppPaths.StartupShortcut); return; }
            var shellType = Type.GetTypeFromProgID("WScript.Shell")!;
            dynamic shell = Activator.CreateInstance(shellType)!;
            dynamic lnk = shell.CreateShortcut(AppPaths.StartupShortcut);
            lnk.TargetPath = Environment.ProcessPath;
            lnk.WorkingDirectory = Path.GetDirectoryName(Environment.ProcessPath);
            lnk.Description = "Агент DeckBox";
            lnk.Save();
        }
        catch (Exception ex)
        {
            MessageBox.Show("Не удалось изменить ярлык автозапуска: " + ex.Message, "DeckBox", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
