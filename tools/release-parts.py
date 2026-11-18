#!/usr/bin/env python3
"""Which parts of DeckBox a release changes, so the updaters download only those:  python3 tools/release-parts.py 1.7.0

Prints PARTS-<version>.json for the release:  {"version": "1.7.0", "agent": "1.6.0", "app": "1.7.0"}
"agent" / "app" = the newest version whose computer program / phone app (with the panel) changed. A computer on 1.6.0
needs nothing from 1.7.0 above; a phone on 1.6.0 gets the app. The previous release's PARTS file carries the versions
over (gh release download); without it the previous version counts for both.

Version-only edits (<Version>, versionCode, versionName) are not changes. The panel files (android/.../www) belong to the
app: the agent embeds them only for the layout editor's preview, which may lag one update behind.
"""
import json, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENT = ('agent/DeckBox.Agent/', 'installer/')
APP = ('android/',)
VERSION_LINE = re.compile(r'^[+-]\s*(<Version>[^<]*</Version>|versionCode\s*=\s*\d+|versionName\s*=\s*"[^"]*")\s*$')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout


def vkey(v):
    return tuple(int(x) for x in re.findall(r'\d+', v)[:3])


def previous_tag(version):
    tags = [t.strip() for t in git('tag', '-l', 'v*').splitlines() if re.fullmatch(r'v\d+\.\d+\.\d+', t.strip())]
    older = [t for t in tags if vkey(t[1:]) < vkey(version)]
    return max(older, key=lambda t: vkey(t[1:])) if older else None


def changed(prev, prefixes):
    """True when a file under the prefixes changed since prev, apart from version-only lines."""
    for f in git('diff', '--name-only', prev, 'HEAD', '--', *prefixes).splitlines():
        if f.endswith(('DeckBox.Agent.csproj', 'build.gradle.kts')):
            lines = [l for l in git('diff', '-U0', prev, 'HEAD', '--', f).splitlines()
                     if l[:1] in '+-' and not l.startswith(('+++', '---'))]
            if all(VERSION_LINE.match(l) for l in lines):
                continue
        return True
    return False


def previous_parts(tag):
    """The previous release's PARTS file, or that release's version for both parts."""
    with tempfile.TemporaryDirectory() as d:
        r = subprocess.run(['gh', 'release', 'download', tag, '-p', 'PARTS-*.json', '-D', d], cwd=ROOT, capture_output=True, text=True)
        files = list(Path(d).glob('PARTS-*.json'))
        if r.returncode == 0 and files:
            try:
                p = json.loads(files[0].read_text(encoding='utf-8'))
                if re.fullmatch(r'\d+\.\d+\.\d+', p.get('agent', '')) and re.fullmatch(r'\d+\.\d+\.\d+', p.get('app', '')):
                    return p
            except (ValueError, AttributeError):
                pass
    v = tag[1:]
    return {'agent': v, 'app': v}


def parts(version, prev=None, prev_parts=None):
    prev = prev if prev is not None else previous_tag(version)
    if not prev:
        return {'version': version, 'agent': version, 'app': version}
    pp = prev_parts or previous_parts(prev)
    return {'version': version,
            'agent': version if changed(prev, AGENT) else pp['agent'],
            'app': version if changed(prev, APP) else pp['app']}


if __name__ == '__main__':
    print(json.dumps(parts(sys.argv[1]), ensure_ascii=False))
