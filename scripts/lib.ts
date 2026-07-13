/**
 * lib.ts — 콘텐츠 운영 자동화 공통 유틸 + 콘텐츠 모델 정의.
 * 모든 스크립트는 Node(ESM) + tsx 로 실행된다. 런타임 의존성 없음.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const p = (...s: string[]) => join(ROOT, ...s);

export type RiskLevel = "A" | "B" | "C";
export type ReviewStatus =
  | "초안"            // draft
  | "편집검토"        // editorial review done
  | "의료검수대기"    // awaiting medical review
  | "의료검수완료";   // medical review complete

export interface Claim {
  id: string;
  text: string;
  source: string; // must exist in content/sources.json
}

/** 건강 글 콘텐츠 모델(=frontmatter). HTML 글은 content/meta/<slug>.json 로, 초안은 content/drafts/<slug>.json 로 보관. */
export interface ContentMeta {
  title: string;
  slug: string;
  description: string;
  cluster: string;      // 상위 허브(예: symptoms/knee, conditions/heart)
  intent: string;       // 검색 의도(informational 등)
  riskLevel: RiskLevel; // A/B/C
  datePublished: string;
  dateModified: string;
  reviewedAt: string;   // 의료/편집 검토일 (없으면 "")
  reviewDue: string;    // 다음 재검토 예정일
  author: string;       // people.json authors[].id
  reviewer: string;     // people.json reviewers[].id ("" = 미검수)
  reviewStatus: ReviewStatus;
  sources: string[];    // 참조한 source ID 목록
  claims: Claim[];      // 의료적 주장 + 근거
  aiAssisted: boolean;
  contentStatus: "draft" | "in-review" | "published" | "archived";
  bodyHash?: string;    // 본문 해시(검토일-무변경 위조 방지)
  body?: string;        // 초안 마크다운 본문(초안 파일에만)
}

export const loadJson = <T,>(rel: string): T => JSON.parse(readFileSync(p(rel), "utf8"));
export const saveJson = (rel: string, data: unknown) => {
  const full = p(rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf8");
};

export const sourceIds = (): Set<string> =>
  new Set(loadJson<any>("content/sources.json").sources.map((s: any) => s.id));
export const authorIds = (): Set<string> =>
  new Set(loadJson<any>("content/people.json").authors.map((a: any) => a.id));
export const reviewerIds = (): Set<string> =>
  new Set(loadJson<any>("content/people.json").reviewers.map((r: any) => r.id));

export const bodyHash = (body: string): string =>
  createHash("sha256").update(body.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16);

export const listDrafts = (): string[] => {
  const dir = p("content/drafts");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => join("content/drafts", f));
};

/* ---------- 의료 주장 패턴(근거 필요) ---------- */
export const CLAIM_REQUIRED: { key: string; re: RegExp }[] = [
  { key: "수치·단위",   re: /\d[\d.,]*\s*(mg|mcg|µg|g|ml|IU|%|퍼센트|mmHg|mg\/dL|kcal|배|일|주|개월|시간)/ },
  { key: "비율",        re: /\d+\s*명?\s*중\s*\d+|\d+\s*명당|\d+\s*분의\s*\d+/ },
  { key: "질환위험",    re: /위험(이|을|성|도|률)|발생률|사망률|재발률/ },
  { key: "효능",        re: /효능|효과가 (있|없)|치료 효과|증상을 (없애|줄여)/ },
  { key: "부작용",      re: /부작용/ },
  { key: "복용량",      re: /(하루|1일|1회|한 번에|매일)\s*\d|복용량|권장량|\d+\s*(mg|정|알|캡슐|포)/ },
  { key: "상호작용",    re: /상호작용|병용|함께 (먹으면|복용하면)/ },
  { key: "응급기준",    re: /즉시\s*(병원|119)|응급실|골든타임|분\s*이내/ },
  { key: "검사수치",    re: /정상\s*(범위|수치)|기준(치|은|을)|이상이면|이하이면|당화혈색소|공복\s*혈당|혈압이\s*\d/ },
];

/* ---------- 빌드 실패시키는 금지 표현 ---------- */
export const FORBIDDEN: { key: string; re: RegExp; why: string }[] = [
  { key: "복용중단지시", re: /(약|복용)[^.\n]{0,12}(중단하세요|중단하십시오|끊으세요|끊으십시오|중지하세요)/, why: "복용 중단 직접 지시(‘임의로 중단하지 마세요, 의사·약사와 상담’ 형태로 바꿀 것)" },
  { key: "복용시작지시", re: /복용하세요|복용하십시오|복용을\s*시작하세요|약을?\s*(드세요|드십시오)/, why: "복용 시작 직접 지시(‘의사·약사와 상담하세요’로 바꿀 것)" },
  { key: "확정진단",     re: /확진|진단(입니다|합니다|됩니다|해\s*드립니다)|(당신|귀하|환자분)(은|는|이|가)?\s*[가-힣]{0,8}(입니다|이십니다)/, why: "확정 진단·독자 대상 단정 표현(‘~일 수 있습니다’로 바꿀 것)" },
  { key: "치료제표현",   re: /(영양제|보충제|건강기능식품)[^.\n]{0,15}(치료제|치료합니다|낫게\s*(합|해))|완치|특효/, why: "영양제를 치료제로 표현 / 완치·특효 과장" },
];

export interface Finding { level: "error" | "warn"; rule: string; file: string; detail: string; }
