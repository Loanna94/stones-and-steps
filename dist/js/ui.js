/*
 * 돌멩이가 있어도 — 공통 화면 요소
 * 답 고르기 패널, 정답·해설 카드(캐릭터 반응), 나의 걸음(트레일), 상단 진행 표시, 쉬어가기·도움받을 곳
 */
(function () {
  'use strict';
  const S = window.Stones;
  const CFG = window.STONES_CONFIG;
  const { el, $ } = S;
  const ui = (S.ui = {});
  const ASSET = name => `assets/${name}.webp`;
  ui.asset = ASSET;

  /* ---------- 키보드 단축키 (한 번에 하나의 패널만) ---------- */
  let keyHandler = null;
  ui.setKeys = fn => { keyHandler = fn; };
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector('dialog[open]') || document.querySelector('.sheet')) return;
    if (keyHandler) keyHandler(e);
  });

  ui.live = msg => { const n = $('#live'); if (n) { n.textContent = ''; setTimeout(() => { n.textContent = msg; }, 30); } };

  /* ---------- 답 고르기 패널 ----------
   * O/X는 두 버튼, 선다형은 번호 버튼. 키보드: O·X 또는 ←·→, 숫자 1~4
   */
  ui.answerPanel = (q, onPick, opts = {}) => {
    let picked = false;
    const pick = choice => {
      if (picked) return;
      picked = true;
      ui.setKeys(null);
      panel.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const btn = panel.querySelector(`[data-choice="${String(choice)}"]`);
      if (btn) btn.classList.add('is-picked');
      onPick(choice);
    };
    const body = q.type === 'ox'
      ? el('div', { class: 'ox-row' },
        el('button', { class: 'ox-btn ox-o', 'data-choice': 'true', onclick: () => pick(true), 'aria-label': 'O, 맞아요' }, el('span', { class: 'ox-mark', 'aria-hidden': 'true' }, 'O'), el('span', {}, '맞아요')),
        el('button', { class: 'ox-btn ox-x', 'data-choice': 'false', onclick: () => pick(false), 'aria-label': 'X, 아니에요' }, el('span', { class: 'ox-mark', 'aria-hidden': 'true' }, 'X'), el('span', {}, '아니에요')))
      : el('div', { class: 'choice-list' }, q.options.map((o, i) =>
        el('button', { class: 'choice-btn', 'data-choice': String(i), onclick: () => pick(i) },
          el('span', { class: 'choice-num', 'aria-hidden': 'true' }, S.circled(i)), el('span', {}, o))));
    const panel = el('div', { class: 'answer-panel' + (opts.compact ? ' is-compact' : '') },
      opts.label ? el('p', { class: 'eyebrow' }, opts.label) : null,
      el('p', { class: 'prompt', id: `prompt-${q.id}` }, q.prompt),
      body);
    ui.setKeys(e => {
      const k = e.key.toLowerCase();
      if (q.type === 'ox') {
        if (k === 'o' || e.key === 'ArrowLeft') { e.preventDefault(); pick(true); }
        if (k === 'x' || e.key === 'ArrowRight') { e.preventDefault(); pick(false); }
      } else {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= q.options.length) { e.preventDefault(); pick(n - 1); }
      }
    });
    // 피드백 카드가 숨긴 패널이 가려지지 않게, 다른 곳에서 미리 데이터 지정
    panel.dataset.qid = q.id;
    return panel;
  };

  /* ---------- 정답·해설 카드 ----------
   * 정답: “맞아요! +5점” · 캐릭터가 한 걸음 나아가며 웃음
   * 오답: 캐릭터가 털썩 앉아 머리를 긁적임(좌절이 아니라 ‘헷갈렸다, 다시 알아보자’) → 해설을 읽고 ‘다시 일어나기’를 누르면 일어나 다시 걸음
   * 맞혔든 틀렸든 정답과 해설을 항상 보여줌
   */
  ui.feedback = (q, choice, correct, opts = {}) => new Promise(resolve => {
    const scoring = S.journey().scoring;
    const explain = (q.why && q.why[choice]) || q.explain;
    const hero = (window.STONES_STORY && window.STONES_STORY.hero) || '';
    // 하루의 모습: 두 장을 겹쳐 두고 부드럽게 바꿈(갑자기 바뀌는 느낌 줄이기)
    const imgA = el('img', { class: 'fb-me is-on', src: ASSET(correct ? 'me-pack' : 'me-oops'), alt: correct ? `웃으며 걷는 ${hero}` : `털썩 앉아 머리를 긁적이는 ${hero}` });
    const imgB = el('img', { class: 'fb-me', src: ASSET('me-pack'), alt: '' });
    const figure = q.illustration === 'two-reactions'
      ? el('div', { class: 'fb-figure is-two' },
        el('figure', {}, el('img', { src: ASSET('me-walk'), alt: '' }), el('figcaption', {}, '평온한 사람')),
        el('figure', {}, el('img', { src: ASSET('me-sit'), alt: '' }), el('figcaption', {}, '얼어붙는 사람')))
      : el('div', { class: 'fb-figure ' + (correct ? 'is-good' : 'is-bad') }, imgA, correct ? null : imgB, correct ? el('span', { class: 'fb-spark', 'aria-hidden': 'true' }, '✦') : null);
    const verdict = correct
      ? el('p', { class: 'fb-verdict is-good' }, '맞아요!', scoring ? el('span', { class: 'fb-points' }, `+${CFG.pointsPerCorrect}점`) : null)
      : el('p', { class: 'fb-verdict is-bad' }, '어라? 헷갈렸어요. 같이 알아봐요');
    const cardTitle = q.card ? el('p', { class: 'fb-card' }, el('span', { class: 'eyebrow' }, '반응 카드'), el('strong', {}, q.card)) : null;
    const mine = !correct ? el('p', { class: 'fb-mine' }, '내가 고른 답: ', S.choiceLabel(q, choice)) : null;
    const btn = el('button', { class: 'btn btn-primary fb-next', type: 'button' }, correct ? '다음 걸음 →' : '해설 읽고 다시 일어나기');
    const sheet = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': `fb-${q.id}` },
      el('div', { class: 'sheet-card ' + (correct ? 'is-good' : 'is-bad') },
        figure,
        el('div', { class: 'fb-body' },
          verdict,
          cardTitle,
          el('p', { class: 'fb-answer', id: `fb-${q.id}` }, '정답 ', el('strong', {}, S.answerLabel(q))),
          mine,
          el('p', { class: 'fb-explain' }, explain),
          q.note ? el('p', { class: 'fb-note' }, q.note) : null,
          q.source ? el('p', { class: 'fb-source' }, '출처 · ', q.source) : null,
          btn)));
    $('#sheet-root').append(sheet);
    ui.live(correct ? `맞아요. ${explain}` : `정답은 ${S.answerLabel(q)}. ${explain}`);
    requestAnimationFrame(() => { sheet.classList.add('is-open'); btn.focus({ preventScroll: true }); });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      if (!correct) {
        imgA.classList.remove('is-on');
        imgB.classList.add('is-on', 'is-rise');
        imgB.alt = `다시 일어난 ${hero}`;
        ui.trail.mood('walk');
        await S.wait(700);
      }
      sheet.classList.remove('is-open');
      sheet.classList.add('is-closing');
      await S.wait(200);
      sheet.remove();
      resolve(correct);
    });
  });

  /* ---------- 문제 카드 (단서 화면 · 결과 화면 공통) ----------
   * 틀린 문제: 문제 번호, 문제 문장, 정답(초록), 내 답(회색), 해설 한 줄
   * 맞힌 문제: ✓ 개념 이름 한 줄로 접어 둠
   */
  ui.qNumber = q => {
    const ids = S.journey().stages.flatMap(st => S.state.order[st.key] || []);
    const i = ids.indexOf(q.id);
    return i >= 0 ? i + 1 : null;
  };
  ui.qCard = (q, opts = {}) => {
    const a = S.state.answers[q.id];
    const n = ui.qNumber(q);
    const fixed = S.state.review && S.state.review.done && S.state.review.done[q.id];
    if (a && a.correct && !opts.expand) {
      return el('li', { class: 'qc qc-ok' },
        el('span', { class: 'qc-mark', 'aria-hidden': 'true' }, '✓'),
        el('span', { class: 'qc-concept' }, q.concept),
        n ? el('span', { class: 'qc-n' }, `문제 ${n}`) : null);
    }
    return el('li', { class: 'qc qc-card' + (fixed ? ' is-fixed' : '') },
      el('p', { class: 'qc-head' }, el('span', {}, n ? `문제 ${n}` : '문제'), opts.place ? el('span', { class: 'qc-place' }, opts.place) : null,
        fixed ? el('span', { class: 'qc-fixed' }, '✓ 복습에서 맞혔어요') : null),
      el('p', { class: 'qc-q' }, q.prompt),
      el('p', { class: 'qc-chips' },
        el('span', { class: 'qc-right' }, '정답 ', el('b', {}, S.answerLabel(q))),
        a ? el('span', { class: 'qc-mine' }, '내 답 ', S.choiceLabel(q, a.choice)) : null),
      el('p', { class: 'qc-why' }, q.explain));
  };

  /* ---------- 나의 걸음 (화면 아래 길) ---------- */
  ui.trail = {
    build() {
      const total = S.totalSteps();
      const per = S.perGate();
      const track = $('#trail-track');
      track.innerHTML = '';
      for (let i = 0; i < total; i++) {
        track.append(el('span', { class: 'trail-stone' + (i % per === per - 1 && i < total - 1 ? ' is-gate' : ''), style: { left: `${((i + 1) / (total + 1)) * 100}%` } }));
      }
      this.me = el('img', { class: 'trail-me', src: ASSET('me-pack'), alt: '' });
      track.append(this.me);
      this.update();
    },
    update() {
      if (!this.me) return;
      const total = S.totalSteps();
      const n = S.doneSteps();
      this.me.style.left = `${(n / (total + 1)) * 100}%`;
      document.querySelectorAll('.trail-stone').forEach((s, i) => s.classList.toggle('is-passed', i < n));
      const label = $('#trail-label');
      const hero = (window.STONES_STORY && window.STONES_STORY.hero) || '나';
      if (label) label.textContent = `${hero}의 걸음 ${n} / ${total}`;
    },
    // 하루의 모습은 바꾸지 않고(가방 멘 하루), 주저앉음은 살짝 내려앉는 움직임으로만 표현
    mood(m) { if (this.me) this.me.classList.toggle('is-down', m === 'sit'); },
    step() {
      this.mood('walk');
      if (!this.me) return;
      this.me.classList.remove('is-stepping');
      void this.me.offsetWidth;
      this.me.classList.add('is-stepping');
      this.update();
    },
  };

  /* ---------- 상단 진행 표시 + 글자 조각 ---------- */
  ui.hud = {
    build() {
      const j = S.journey();
      const wrap = $('#hud-progress');
      wrap.innerHTML = '';
      j.stages.forEach((st, i) => {
        const seg = el('span', { class: 'hud-seg', 'data-i': i, title: `${i + 1}. ${st.place} · ${st.title}` });
        for (let k = 0; k < S.perGate(); k++) seg.append(el('i', {}));
        wrap.append(seg);
      });
      const tiles = $('#hud-tiles');
      if (tiles) tiles.replaceChildren(...j.stages.map((st, i) => el('span', { class: 'tile', 'data-i': i, title: `${i + 1}번째 장소의 글자 조각` }, '?')));
      $('#hud-score').hidden = !j.scoring;
      this.update();
    },
    update() {
      if (!S.state) return;
      const j = S.journey();
      const ids = j.stages.map(st => S.state.order[st.key] || []);
      document.querySelectorAll('.hud-seg').forEach((seg, i) => {
        seg.classList.toggle('is-current', i === S.state.stageIdx && !S.state.finished);
        seg.classList.toggle('is-done', i < S.state.stageIdx || S.state.finished);
        seg.querySelectorAll('i').forEach((pip, k) => {
          const a = S.state.answers[ids[i][k]];
          pip.className = a ? (a.correct ? 'is-good' : 'is-bad') : '';
        });
      });
      document.querySelectorAll('#hud-tiles .tile').forEach((t, i) => {
        const got = i < S.state.stageIdx || S.state.finished;
        t.textContent = got ? j.stages[i].clue.syl : '?';
        t.classList.toggle('is-got', got);
      });
      $('#score-num').textContent = Math.min(100, S.state.score + ((S.state.review && S.state.review.bonus) || 0));
      const n = Math.min(S.state.stageIdx + 1, j.stages.length);
      $('#hud-stage').textContent = S.state.finished ? '완주' : `${j.unit} ${n} / ${j.stages.length}`;
    },
  };

  /* ---------- 도움받을 곳 ---------- */
  ui.buildHelp = () => {
    const list = $('#help-list');
    list.innerHTML = '';
    CFG.help.forEach(h => {
      const contact = h.url
        ? el('a', { href: h.url, target: '_blank', rel: 'noopener' }, h.contact, ' ↗')
        : el('a', { href: `tel:${h.tel}` }, h.contact);
      list.append(el('li', {}, el('span', { class: 'help-name' }, h.name), el('span', { class: 'help-contact' }, contact), el('span', { class: 'help-note' }, h.note)));
    });
    $('#help-emergency').textContent = CFG.emergency;
  };
  ui.helpCard = () => el('div', { class: 'help-card' },
    el('p', { class: 'eyebrow' }, '도움받을 곳'),
    el('ul', { class: 'help-list' }, CFG.help.map(h => el('li', {},
      el('span', { class: 'help-name' }, h.name),
      el('span', { class: 'help-contact' }, h.url ? el('a', { href: h.url, target: '_blank', rel: 'noopener' }, h.contact, ' ↗') : el('a', { href: `tel:${h.tel}` }, h.contact)),
      el('span', { class: 'help-note' }, h.note)))),
    el('p', { class: 'help-emergency' }, CFG.emergency));

  /* ---------- 동행 여정용 선택 패널 ----------
   * ui.choicePanel(slot, { label, prompt, note, options: [{ value, label, sub, img, disabled }] }) → Promise(value)
   * 맞고 틀림이 없는 선택(이야기를 고르는 선택)에 씁니다. 키보드: 숫자 1~n */
  ui.choicePanel = (slot, { label, prompt, note, options, layout }) => new Promise(resolve => {
    const pick = v => {
      ui.setKeys(null);
      panel.querySelectorAll('button').forEach(b => { b.disabled = true; });
      const btn = panel.querySelector(`[data-v="${String(v)}"]`);
      if (btn) btn.classList.add('is-picked');
      setTimeout(() => resolve(v), S.reduced ? 0 : 160);
    };
    const live = options.filter(o => !o.disabled);
    const panel = el('div', { class: 'answer-panel journey-panel' + (layout ? ` is-${layout}` : '') },
      label ? el('p', { class: 'eyebrow' }, label) : null,
      prompt ? el('p', { class: 'prompt' }, prompt) : null,
      el('div', { class: 'choice-list' + (layout === 'grid' ? ' is-grid' : '') }, options.map((o, i) =>
        el('button', { class: 'choice-btn' + (o.img ? ' has-img' : ''), type: 'button', 'data-v': String(o.value), disabled: o.disabled || null, onclick: () => pick(o.value) },
          o.img ? el('img', { src: ASSET(o.img), alt: '' }) : el('span', { class: 'choice-num', 'aria-hidden': 'true' }, S.circled(i)),
          el('span', { class: 'choice-text' }, el('span', {}, o.label), o.sub ? el('small', {}, o.sub) : null)))),
      note ? el('p', { class: 'panel-note' }, note) : null);
    slot.replaceChildren(panel);
    ui.setKeys(e => {
      const n = parseInt(e.key, 10);
      const o = options[n - 1];
      if (o && !o.disabled) { e.preventDefault(); pick(o.value); }
    });
    const first = panel.querySelector('button:not([disabled])');
    if (first) first.focus({ preventScroll: true });
    if (!live.length) resolve(null);
  });

  /* 이야기 한 줄 + 버튼 하나 */
  ui.narrate = (slot, { label, text, button, quote }) => new Promise(resolve => {
    const btn = el('button', { class: 'btn btn-primary', type: 'button' }, button || '계속');
    slot.replaceChildren(el('div', { class: 'answer-panel journey-panel narrate' },
      label ? el('p', { class: 'eyebrow' }, label) : null,
      quote ? el('p', { class: 'narrate-quote' }, quote) : null,
      el('p', { class: 'prompt' }, text),
      el('div', { class: 'actions' }, btn)));
    ui.live(text);
    btn.focus({ preventScroll: true });
    btn.addEventListener('click', () => { btn.disabled = true; resolve(); }, { once: true });
  });

  ui.openDialog = id => { const d = $(id); if (d && !d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } } };
  ui.closeDialog = id => { const d = $(id); if (d && d.open) d.close(); };
})();
