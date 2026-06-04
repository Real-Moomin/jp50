const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dataFile = path.join(root, "data.js");
const appFile = path.join(root, "app.js");
const htmlFile = path.join(root, "index.html");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(dataFile, "utf8"), context, { filename: dataFile });

const pages = context.window.HUMANITIES_READING_PAGES;
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(Array.isArray(pages), "data.js must expose HUMANITIES_READING_PAGES");
check(pages.length === 50, `expected 50 pages, got ${pages.length}`);

const answerCounts = {
  mismatch: [0, 0, 0, 0, 0],
  blank: [0, 0, 0, 0, 0],
  vocab: [0, 0, 0, 0, 0]
};

const advancedTerms = [
  "前提", "制度", "文脈", "判断", "関係", "条件", "構造", "概念", "射程", "規範",
  "責任", "抽象", "読解", "価値", "効用", "危うさ", "留保", "基準", "不均衡",
  "配列", "経験", "社会", "自然", "説明", "現実", "対象", "中心", "周辺"
];

function collectVisibleStrings(page) {
  const strings = [page.title, ...page.passage, page.focusWord];
  ["mismatch", "blank", "vocab"].forEach((key) => {
    const question = page.questions[key];
    strings.push(question.sentence || "");
    strings.push(question.explanation || "");
    strings.push(...question.choices);
  });
  return strings;
}

function sentenceCount(paragraph) {
  return (paragraph.match(/。/g) || []).length;
}

function countOccurrences(text, token) {
  return text.split(token).length - 1;
}

const banned = ["?ф", "?볝", "�"];
const serialized = JSON.stringify(pages);
banned.forEach((token) => check(!serialized.includes(token), `banned or broken token found: ${token}`));

const titles = new Set();
const movements = new Map();

pages.forEach((page, index) => {
  const label = `page ${index + 1}`;
  check(page.id === `page-${String(index + 1).padStart(3, "0")}`, `${label}: id mismatch`);
  check(!titles.has(page.title), `${label}: duplicate title`);
  titles.add(page.title);
  check(Array.isArray(page.passage), `${label}: passage must be an array`);
  check(page.passage.length >= 4 && page.passage.length <= 5, `${label}: passage must have 4-5 paragraphs`);
  page.passage.forEach((paragraph, paragraphIndex) => {
    const count = sentenceCount(paragraph);
    check(count >= 4 && count <= 5, `${label}: paragraph ${paragraphIndex + 1} must have 4-5 sentences, got ${count}`);
    check(paragraph.length >= 105, `${label}: paragraph ${paragraphIndex + 1} is too short`);
  });
  check(page.passage.join("").includes(page.focusWord), `${label}: focusWord is absent from passage`);
  check(countOccurrences(page.passage.join(""), "（　　）") === 1, `${label}: passage must contain exactly one blank`);

  const visibleText = collectVisibleStrings(page).join("\n");
  check(!/[A-Za-z]/.test(visibleText), `${label}: visible text contains English letters`);
  check(!/[가-힣]/.test(visibleText), `${label}: visible text contains Korean`);
  const advancedHitCount = advancedTerms.reduce((sum, term) => sum + countOccurrences(visibleText, term), 0);
  check(advancedHitCount >= 18, `${label}: advanced vocabulary density too low (${advancedHitCount})`);

  movements.set(page.movement, (movements.get(page.movement) || 0) + 1);

  ["mismatch", "blank", "vocab"].forEach((key) => {
    const question = page.questions[key];
    check(question, `${label}: missing ${key} question`);
    check(question.choices.length === 5, `${label}: ${key} must have 5 choices`);
    check(Number.isInteger(question.answer) && question.answer >= 1 && question.answer <= 5, `${label}: ${key} answer invalid`);
    answerCounts[key][question.answer - 1] += 1;
  });
  page.questions.blank.choices.forEach((choice, choiceIndex) => {
    check(choice.endsWith("。"), `${label}: blank choice ${choiceIndex + 1} must be a full sentence`);
    check(sentenceCount(choice) === 1, `${label}: blank choice ${choiceIndex + 1} must be exactly one sentence`);
    check(choice.length >= 35, `${label}: blank choice ${choiceIndex + 1} is too short for sentence insertion`);
  });
});

movements.forEach((count, movement) => {
  check(count <= 3, `movement repeated too often (${count}): ${movement}`);
});

Object.entries(answerCounts).forEach(([key, counts]) => {
  counts.forEach((count, index) => {
    check(count >= 9 && count <= 11, `${key}: answer ${index + 1} count should be balanced, got ${count}`);
  });
});

const html = fs.readFileSync(htmlFile, "utf8");
const app = fs.readFileSync(appFile, "utf8");
check(html.includes('<meta charset="UTF-8"'), "index.html must declare UTF-8");
check(app.includes("humanities-japanese-ebook-last-page-v1"), "app.js must persist the last page");
check(app.includes("localStorage"), "app.js must use localStorage");
check(!app.includes("source-note"), "app.js should not render source note");
check(!app.includes("eyebrow"), "app.js should not render eyebrow metadata");

if (failures.length) {
  console.error("Validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Validation passed.");
console.log(`Pages: ${pages.length}`);
console.log("Answer distribution:", answerCounts);
