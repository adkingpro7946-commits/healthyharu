# -*- coding: utf-8 -*-
"""sitemap.xml 자동 생성기.
사용법: 아래 DOMAIN 을 실제 도메인으로 바꾼 뒤  `py gen_sitemap.py` 실행.
프로젝트 폴더 안의 모든 .html 을 찾아 sitemap.xml 을 다시 만든다."""
import os

DOMAIN = "https://healthyharu.co.kr"   # ← 실제 도메인으로 교체
ROOT = os.path.dirname(os.path.abspath(__file__))

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
    lines.append("  <url><loc>%s</loc><changefreq>%s</changefreq><priority>%s</priority></url>" % (canon(rel), cf, pr))
    count += 1
lines.append("</urlset>")

open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
print("sitemap.xml written with %d URLs (domain: %s)" % (count, DOMAIN))
