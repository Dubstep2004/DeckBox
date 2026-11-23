using DeckBox.Agent;
using Xunit;

/// <summary>The GitHub widget says what is missing in plain Russian instead of the raw error of gh.</summary>
public class GitHubSetupTests
{
    [Fact]
    public void AMissingGhMeansInstallIt()
    {
        var ex = new System.ComponentModel.Win32Exception("An error occurred trying to start process 'gh' with working directory 'C:\\Users\\HP\\AppData\\Local\\Temp\\'. Не удается найти указанный файл.");
        Assert.Equal(("install", "GitHub CLI не установлен на компьютере"), GitHubSetup.Explain(ex));
    }

    [Theory]
    [InlineData("gh: To get started with GitHub CLI, please run:  gh auth login")]
    [InlineData("gh: You are not logged into any GitHub hosts. To log in, run: gh auth login")]
    [InlineData("gh: HTTP 401: Bad credentials (https://api.github.com/graphql)")]
    public void ASignedOutGhMeansSignIn(string message) =>
        Assert.Equal("login", GitHubSetup.Explain(new InvalidOperationException(message)).Setup);

    [Fact]
    public void OtherErrorsStayAsTheyAre()
    {
        var (setup, msg) = GitHubSetup.Explain(new InvalidOperationException("gh: HTTP 502"));
        Assert.Null(setup);
        Assert.Equal("gh: HTTP 502", msg);
    }

    [Fact]
    public void ThePhoneMayUseTheButtonsOverWiFi()
    {
        Assert.True(Lan.AllowedOverLan("/api/github/setup"));
        Assert.True(Lan.AllowedOverLan("/api/github/install"));
        Assert.True(Lan.AllowedOverLan("/api/github/signin"));
    }
}
