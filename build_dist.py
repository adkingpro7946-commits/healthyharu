# -*- coding: utf-8 -*-
"""배포용 dist 폴더 생성 — 웹에 올릴 정적 파일만 추려 복사.
개발용(.git, scripts, content, docs, *.py, package.json 등)은 제외.
출력: 바탕화면\healthyharu-dist  (이 폴더를 Cloudflare에 드래그)"""
import os, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
# 배포용 폴더는 저장소 안 ./dist (로컬·CI 공통, 포터블)
DIST = os.path.join(ROOT, "dist")

# 복사할 폴더(정적 자산)
COPY_DIRS = ["css", "js", "assets", "data", "symptoms", "supplements", "conditions", "guides", "tools", "columns"]
# 복사할 루트 파일
COPY_FILES = ["sitemap.xml", "robots.txt", "ads.txt", "feed.xml", "_redirects"]

if os.path.exists(DIST):
    shutil.rmtree(DIST)
os.makedirs(DIST)

count = 0
# 1) 루트의 모든 .html
for f in os.listdir(ROOT):
    if f.endswith(".html"):
        shutil.copy2(os.path.join(ROOT, f), os.path.join(DIST, f)); count += 1
# 2) 지정 루트 파일
for f in COPY_FILES:
    src = os.path.join(ROOT, f)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(DIST, f)); count += 1
# 3) 지정 폴더 통째로
for d in COPY_DIRS:
    src = os.path.join(ROOT, d)
    if os.path.isdir(src):
        dst = os.path.join(DIST, d)
        shutil.copytree(src, dst)
        for _, _, fs in os.walk(dst):
            count += len(fs)

print("dist 생성 완료: %s" % DIST)
print("총 파일 수: %d개 (1000개 미만이어야 정상)" % count)
