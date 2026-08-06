# -*- coding: utf-8 -*-
"""sitemap.xml 자동 생성기.
사용법: 아래 DOMAIN 을 실제 도메인으로 바꾼 뒤  `py gen_sitemap.py` 실행.
프로젝트 폴더 안의 모든 .html 을 찾아 sitemap.xml 을 다시 만든다."""
import os, subprocess, datetime

DOMAIN = "https://healthyharu.co.kr"   # ← 실제 도메인으로 교체
ROOT = os.path.dirname(os.path.abspath(__file__))
TODAY = datetime.date.today().isoformat()

def git_lastmod_map():
    """각 파일의 '마지막 커밋 날짜(YYYY-MM-DD)'를 git 로그 한 번으로 수집.
    아직 커밋 안 된 새 글(오늘 자동 발행분)은 목록에 없으므로 오늘 날짜로 처리한다.
    git 이 없거나 저장소가 아니면 전부 오늘 날짜로 폴백한다."""
    m = {}
    try:
        out = subprocess.run(
            ["git", "-C", ROOT, "log", "--name-only", "--format=%x00%cs", "--no-renames"],
            capture_output=True, text=True, encoding="utf-8", timeout=60,
        ).stdout
    except Exception:
        return m
    date = None
    for line in out.splitlines():
        if line.startswith("\x00"):
            date = line[1:].strip()
        elif line.strip() and date:
            m.setdefault(line.strip(), date)  # 최신 커밋부터 나오므로 첫 등장이 마지막 수정일
    return m

LASTMOD = git_lastmod_map()

# 사이트맵에 들어가면 안 되는 폴더(빌드 산출물·의존성·저장소 내부 등)
SKIP_DIRS = {".git", ".github", ".claude", "node_modules", "dist", "deliverables", "scripts", "content", "docs"}

def canon(rel):
    """Cloudflare 정적 자산 규칙(auto-trailing-slash)에 맞는 정식 URL.
    index.html -> /  |  dir/index.html -> /dir/  |  foo.html -> /foo"""
    if rel == "index.html":
        return DOMAIN + "/"
    if rel.endswith("/index.html"):
        return DOMAIN + "/" + rel[: -len("index.html")]
    return DOMAIN + "/" + rel[: -len(".html")]

def rank(rel):
    if rel == "index.html": return ("weekly", "1.0")
    if rel.startswith("tools/"): return ("monthly", "0.9")
    if rel.endswith("/index.html"): return ("weekly", "0.7")
    if rel in ("about.html", "contact.html"): return ("yearly", "0.4")
    if rel in ("privacy.html", "terms.html", "disclaimer.html"): return ("yearly", "0.3")
    if rel in ("404.html", "search.html"): return None  # 색인 제외
    return ("monthly", "0.6")

urls = []
for dp, dirs, fs in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]
    for f in fs:
        if f.endswith(".html"):
            urls.append(os.path.relpath(os.path.join(dp, f), ROOT).replace("\\", "/"))

def sortkey(r):
    if r == "index.html": return (0, r)
    if r.startswith("tools/"): return (1, r)
    return (2, r)
urls.sort(key=sortkey)

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
count = 0
for rel in urls:
    r = rank(rel)
    if r is None:
        continue
    cf, pr = r
    lastmod = LASTMOD.get(rel, TODAY)
    lines.append("  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq><priority>%s</priority></url>" % (canon(rel), lastmod, cf, pr))
    count += 1
lines.append("</urlset>")

open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("sitemap.xml written with %d URLs (domain: %s)" % (count, DOMAIN))
