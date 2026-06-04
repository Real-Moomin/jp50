(function () {
  const pages = window.HUMANITIES_READING_PAGES || [];
  const storageKey = "humanities-japanese-ebook-last-page-v1";
  const pageView = document.getElementById("pageView");
  const prevButton = document.getElementById("prevPage");
  const nextButton = document.getElementById("nextPage");
  const pageInput = document.getElementById("pageInput");
  const pageStatus = document.getElementById("pageStatus");

  let currentIndex = getSavedIndex();

  function getSavedIndex() {
    const saved = Number(window.localStorage.getItem(storageKey));
    if (Number.isInteger(saved) && saved >= 0 && saved < pages.length) {
      return saved;
    }
    return 0;
  }

  function saveIndex() {
    window.localStorage.setItem(storageKey, String(currentIndex));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text, term) {
    const escaped = escapeHtml(text);
    if (!term) return escaped;
    const target = escapeHtml(term);
    return escaped.replaceAll(target, `<mark>${target}</mark>`);
  }

  function renderChoices(choices) {
    return `<ol class="choices">${choices.map((choice) => `<li>${escapeHtml(choice)}</li>`).join("")}</ol>`;
  }

  function renderPage() {
    const page = pages[currentIndex];
    if (!page) {
      pageView.innerHTML = "<p>ページデータがありません。</p>";
      return;
    }

    const q1 = page.questions.mismatch;
    const q2 = page.questions.blank;
    const q3 = page.questions.vocab;

    pageView.innerHTML = `
      <header class="page-head">
        <div>
          <h1>${String(currentIndex + 1).padStart(2, "0")}. ${escapeHtml(page.title)}</h1>
        </div>
        <p class="page-count">${currentIndex + 1} / ${pages.length}</p>
      </header>

      <section class="passage" aria-label="本文">
        ${page.passage.map((paragraph) => `<p>${highlight(paragraph, page.focusWord)}</p>`).join("")}
      </section>

      <section class="question-area" aria-label="問題">
        <div class="question-card">
          <h2>1. 本文の内容と一致しないものを一つ選びなさい。</h2>
          ${renderChoices(q1.choices)}
        </div>

        <div class="question-card">
          <h2>2. 本文中の空欄に入る文として最も適切なものを一つ選びなさい。</h2>
          ${renderChoices(q2.choices)}
        </div>

        <div class="question-card">
          <h2>3. 本文中の語「${escapeHtml(page.focusWord)}」の文脈上の意味として最も適切なものを一つ選びなさい。</h2>
          ${renderChoices(q3.choices)}
        </div>
      </section>

      <details>
        <summary>解答・短い検証メモ</summary>
        <div class="answers">
          <p>1: ${q1.answer}。${escapeHtml(q1.explanation)}</p>
          <p>2: ${q2.answer}。${escapeHtml(q2.explanation)}</p>
          <p>3: ${q3.answer}。${escapeHtml(q3.explanation)}</p>
        </div>
      </details>
    `;

    pageInput.value = String(currentIndex + 1);
    pageInput.max = String(pages.length);
    pageStatus.textContent = `${currentIndex + 1} / ${pages.length}`;
    prevButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === pages.length - 1;
    saveIndex();
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(index, pages.length - 1));
    renderPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  prevButton.addEventListener("click", () => goTo(currentIndex - 1));
  nextButton.addEventListener("click", () => goTo(currentIndex + 1));
  pageInput.addEventListener("change", () => {
    const pageNumber = Number(pageInput.value);
    if (!Number.isFinite(pageNumber)) {
      pageInput.value = String(currentIndex + 1);
      return;
    }
    goTo(pageNumber - 1);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") goTo(currentIndex - 1);
    if (event.key === "ArrowRight") goTo(currentIndex + 1);
  });

  renderPage();
})();
