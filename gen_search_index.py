# -*- coding: utf-8 -*-
"""검색 인덱스 생성기.  `py gen_search_index.py` 실행 →  data/search-index.json 갱신.
글을 추가/삭제한 뒤 다시 실행하면 검색에 반영된다."""
import os, re, json

ROOT = os.path.dirname(os.path.abspath(__file__))
CATS = {
    "symptoms": "증상정보", "supplements": "영양제백과",
    "conditions": "만성질환관리", "guides": "건강생활", "tools": "건강도구",
}

def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s).replace("&amp;", "&").strip()

def field(txt, pat):
    m = re.search(pat, txt, re.S)
    return strip_tags(m.group(1)) if m else ""

items = []
for folder, label in CATS.items():
    d = os.path.join(ROOT, folder)
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if not f.endswith(".html"):
            continue
        if folder != "tools" and f == "index.html":
            continue  # 목록 페이지는 제외(도구는 포함)
        txt = open(os.path.join(d, f), encoding="utf-8").read()
        title = field(txt, r"<h1[^>]*>(.*?)</h1>")
        if not title:
            t = field(txt, r"<title>(.*?)</title>")
            title = t.split("|")[0].split("—")[0].strip()
        desc = field(txt, r'<meta name="description" content="(.*?)"')
        tags = " ".join(re.findall(r'<span class="tag">(.*?)</span>', txt))
        items.append({
            "t": title,
            "u": folder + "/" + f,
            "c": label,
            "d": desc,
            "k": tags,
        })

# 카테고리 목록 페이지도 검색 대상에 포함
for folder, label in [("symptoms","증상정보 전체"),("supplements","영양제백과 전체"),
                      ("conditions","만성질환관리 전체"),("guides","건강생활 전체")]:
    items.append({"t": label, "u": folder + "/index.html", "c": "목록", "d": label + " 보기", "k": ""})

out = os.path.join(ROOT, "data", "search-index.json")
json.dump(items, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("search-index.json written with %d entries" % len(items))
