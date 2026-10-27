/*
 * 하루의 여정 — 화면 흐름
 * 시작 → 프롤로그 → 출발 전, 지금 내 생각(10문장) → [장소 안내 → 플레이 → 도착 장면 → 단서 획득] × 5
 *      → 마지막 장면(글자 조각 맞추기: 이해의 시작) → 나의 결과
 */
(function () {
  'use strict';
  const S = window.Stones;
  const CFG = window.STONES_CONFIG;
  const STORY = window.STONES_STORY;
  const { el, $ } = S;
  const SCREENS = ['start', 'prologue', 'pre', 'intro', 'play', 'clear', 'finale', 'result', 'review', 'rested'];
  const HERO = STORY.hero;
  let runId = 0;

  const show = name => {
    SCREENS.forEach(s => { $(`#screen-${s}`).hidden = s !== name; });
    document.body.dataset.screen = name;
    $('#hud-progress-wrap').hidden = !['intro', 'play', 'clear', 'finale', 'result', 'review'].includes(name);
    $('#btn-rest').hidden = !['prologue', 'pre', 'intro', 'play', 'clear'].includes(name);
    if (name !== 'play') S.ui.setKeys(null);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const applyPace = () => {
    const slow = !!(S.state && S.state.slow);
    S.pace = slow ? 1.7 : 1;
    document.documentElement.style.setProperty('--pace', String(S.pace));
    $('#slow-badge').hidden = !slow;
  };
  const clickOnce = btn => new Promise(res => btn.addEventListener('click', res, { once: true }));
  // replaceChildren은 null을 글자 ‘null’로 넣으므로, 빈 칸을 걸러서 채움
  const fill = (node, ...kids) => node.replaceChildren(...kids.flat().filter(k => k !== null && k !== undefined && k !== false));
  const stageGot = st => (S.state.order[st.key] || []).filter(id => S.state.answers[id] && S.state.answers[id].correct).length;
  const stageQs = st => (S.state.order[st.key] || []).map(S.qById).filter(Boolean);

  /* ---------- 시작 화면 ---------- */
  const resumable = saved => saved && !saved.finished && saved.v === CFG.version
    && (Object.keys(saved.answers || {}).length > 0 || saved.stageIdx > 0);
  const initStart = () => {
    const saved = S.store.get();
    const btn = $('#btn-resume');
    btn.hidden = !resumable(saved);
    if (!btn.hidden) btn.textContent = `이어하기 (장소 ${Math.min(saved.stageIdx + 1, 5)} / 5 · ${Object.keys(saved.answers).length}문제 풀었어요)`;
    $('#demo-panel').hidden = !/(^|[?&#])demo\b/.test(location.search + location.hash);
    $('#slow-badge').hidden = true;
    show('start');
  };

  /* ---------- 프롤로그 ---------- */
  const MAP_ART = () => el('div', { class: 'p-map' },
    el('p', { class: 'p-map-title' }, `${HERO}의 지도`),
    el('ol', {}, S.journey().stages.map(st => el('li', {}, st.place))),
    el('p', { class: 'p-map-q' }, '?'),
    el('p', { class: 'p-map-back' }, '“다섯 곳에서 글자 조각을 모으면, 네가 찾는 것을 알게 될 거야.”'));
  const prologue = () => new Promise(resolve => {
    const beats = STORY.prologue;
    let i = 0;
    const dots = $('#story-dots');
    dots.replaceChildren(...beats.map(() => el('i', {})));
    const render = () => {
      const b = beats[i];
      $('#story-kicker').textContent = `프롤로그 · ${i + 1} / ${beats.length}`;
      $('#story-text').textContent = b.text;
      $('#story-art').replaceChildren(b.map ? MAP_ART() : el('img', { src: S.ui.asset(b.img), alt: '' }));
      $('#story-art').className = 'story-art' + (b.map ? ' is-map' : '');
      dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('is-on', k <= i));
      $('#story-next').textContent = i === beats.length - 1 ? '지금 내 생각 적기 →' : '다음 →';
      $('#story-next').focus({ preventScroll: true });
    };
    $('#story-next').onclick = () => { if (i < beats.length - 1) { i++; render(); } else resolve(); };
    $('#story-skip').onclick = () => resolve();
    show('prologue');
    render();
  });

  /* ---------- 출발 전, 지금 내 생각 ---------- */
  const PRE_OPTS = [[true, 'O 그렇다'], [false, 'X 아니다'], ['unknown', '모르겠어요']];
  const precheck = () => new Promise(resolve => {
    const ids = CFG.precheck || [];
    const picks = {};
    const go = $('#pre-go');
    const status = $('#pre-status');
    const placeOf = id => S.journey().stages.find(st => (window.STONES_QUESTIONS[st.key].main || []).some(q => q.id === id));
    const upd = () => {
      const n = Object.keys(picks).length;
      go.disabled = n < ids.length;
      status.textContent = n < ids.length ? `${n} / ${ids.length} 답했어요` : '모두 답했어요. 이제 출발해요!';
    };
    $('#pre-list').replaceChildren(...ids.map((id, i) => {
      const q = S.qById(id);
      const name = `pre-${id}`;
      const st = placeOf(id);
      return el('li', { class: 'pre-item' },
        el('p', {}, el('span', { class: 'pre-num' }, `${i + 1}`), el('span', {}, q.prompt, st ? el('small', { class: 'pre-place' }, ` · ${st.place}`) : null)),
        el('div', { class: 'seg-row is-three', role: 'radiogroup', 'aria-label': `${i + 1}번 문장에 대한 내 생각` },
          PRE_OPTS.map(([v, label], k) => el('label', { class: 'seg' },
            el('input', { type: 'radio', name, id: `${name}-${k}`, value: String(v), onchange: () => { picks[id] = v; upd(); } }),
            el('span', {}, label)))));
    }));
    upd();
    show('pre');
    const done = pre => { S.state.pre = pre; S.save(); S.track('precheck', { skipped: pre === 'skipped' }); resolve(); };
    go.onclick = () => done({ ...picks });
    $('#pre-skip').onclick = () => done('skipped');
  });

  /* ---------- 장소 안내 ---------- */
  const intro = async (stage, k) => {
    const j = S.journey();
    const go = el('button', { class: 'btn btn-primary', type: 'button' }, '이 장소 둘러보기 →');
    fill($('#intro-card'), 
      el('p', { class: 'eyebrow' }, `${j.unit} ${k + 1} / ${j.stages.length} · ${stage.place}`),
      el('h2', { class: 'display' }, stage.title),
      el('span', { class: 'lens-chip' }, stage.lens),
      el('div', { class: 'intro-story' }, stage.story.map(t => el('p', {}, t))),
      el('dl', { class: 'intro-meta' },
        el('div', {}, el('dt', {}, '게임 방법'), el('dd', {}, el('b', {}, stage.form), ' · ', stage.how)),
        el('div', {}, el('dt', {}, '찾을 단서'), el('dd', {}, stage.goal))),
      el('div', { class: 'actions' }, go));
    const fig = $('#intro-preview');
    const img = el('img', { src: `assets/preview-s${k + 1}.webp`, alt: `${stage.form} 플레이 화면 미리보기` });
    img.onerror = () => { img.remove(); fig.classList.add('is-empty'); };
    fig.classList.remove('is-empty');
    fig.replaceChildren(img, el('figcaption', {}, `이 장소에서는 ‘${stage.form}’을 해요`));
    show('intro');
    go.focus({ preventScroll: true });
    await clickOnce(go);
  };

  /* ---------- 단서 획득 (장소 완료) ---------- */
  const CLEAR_EXTRAS = {
    sign: () => el('div', { class: 'extra extra-sign' },
      el('p', { class: 'eyebrow' }, '안개가 걷힌 표지판 · 세 개의 렌즈'),
      el('div', { class: 'eee' },
        el('div', {}, el('b', {}, '사건'), el('span', {}, '무슨 일이 있었나'), el('small', {}, '→ 개울')),
        el('div', {}, el('b', {}, '경험'), el('span', {}, '그 일을 어떻게 겪었나'), el('small', {}, '→ 산책길')),
        el('div', {}, el('b', {}, '영향'), el('span', {}, '그 뒤에 무엇이 남았나'), el('small', {}, '→ 숲길'))),
      el('p', { class: 'fb-source' }, 'SAMHSA (2014, 2023)')),
    hundred: () => {
      const grid = el('div', { class: 'hundred', role: 'img', 'aria-label': '100명 가운데 약 70명' });
      for (let i = 0; i < 100; i++) grid.append(el('i', { class: i < 70 ? 'is-on' : '' }));
      return el('div', { class: 'extra extra-hundred' },
        el('p', { class: 'eyebrow' }, '100명이 같은 길을 걷는다면'),
        grid,
        el('p', {}, el('strong', {}, '약 70명'), '은 살면서 한 번 이상 큰 사건을 만나요.'),
        el('p', { class: 'fb-source' }, '24개국 성인 68,894명 · Kessler et al. (2017)'));
    },
    cards: qs => el('div', { class: 'extra extra-cards' },
      el('p', { class: 'eyebrow' }, '모은 반응 카드'),
      el('div', { class: 'card-grid' }, qs.map(q => el('div', { class: 'r-card' }, el('strong', {}, q.card || q.concept)))),
      el('p', {}, '반응은 대부분 자연스럽고 시간이 지나며 줄어요. 오래 이어지면 도움을 구하면 돼요.')),
    clues: () => el('div', { class: 'extra extra-clues' },
      el('div', { class: 'two' },
        el('figure', {}, el('img', { src: S.ui.asset('me-walk'), alt: '' }), el('figcaption', {}, '평온한 사람')),
        el('figure', {}, el('img', { src: S.ui.asset('me-sit'), alt: '' }), el('figcaption', {}, '얼어붙는 사람'))),
      el('p', {}, '같은 길, 같은 물건도 사람마다 다르게 느껴져요. 이것이 ‘경험’의 렌즈예요.')),
    friend: () => el('div', { class: 'extra extra-friend' },
      el('img', { src: S.ui.asset('friend-calm'), alt: `편안한 얼굴의 ${STORY.friend}` }),
      el('p', { class: 'quote' }, '“들어줘서 고마워, 하루야.”'),
      el('p', {}, '캐묻지 않고, 재촉하지 않고, 원하는 도움을 먼저 묻는 것. 그게 곁에 있는 사람이 할 수 있는 일이에요.')),
  };
  const TIER = got => (got === 4
    ? { key: 'high', title: '단서가 또렷해요', msg: '이 장소의 문제를 모두 맞혔어요. 한 걸음 더 알아볼까요?' }
    : got >= 2
      ? { key: 'mid', title: '단서를 찾았어요', msg: '아래 틀린 문제만 한 번 더 보면 단서가 또렷해져요.' }
      : { key: 'low', title: '단서가 아직 흐릿해요', msg: '괜찮아요. 틀린 문제와 이 장소의 핵심을 함께 정리해 볼게요.' });

  const clear = async (stage, k) => {
    const j = S.journey();
    const last = k === j.stages.length - 1;
    const qs = stageQs(stage);
    const got = stageGot(stage);
    const tier = TIER(got);
    const wrong = qs.filter(q => S.state.answers[q.id] && !S.state.answers[q.id].correct);
    // 이 장소의 문제: 틀린 문제는 카드로 펼치고, 맞힌 문제는 한 줄로 접어 둠
    const qBlock = el('section', { class: 'qc-block' },
      el('h3', { class: 'qc-title' }, wrong.length ? `다시 보면 좋은 문제 ${wrong.length}개` : '이 장소의 문제를 모두 맞혔어요'),
      el('ol', { class: 'qc-list' }, qs.map(q => S.ui.qCard(q))));
    let tierBody = null;
    if (tier.key === 'high') {
      tierBody = el('div', { class: 'tier-box is-high' }, el('p', { class: 'eyebrow' }, '한 걸음 더'), el('p', {}, stage.tiers.deeper.text), el('p', { class: 'fb-source' }, stage.tiers.deeper.source));
    } else if (tier.key === 'low') {
      tierBody = el('div', { class: 'tier-box is-low' }, el('p', { class: 'eyebrow' }, '이 장소의 핵심 세 가지'), el('ul', { class: 'key-list' }, stage.tiers.keypoints.map(t => el('li', {}, t))));
    }
    const next = el('button', { class: 'btn btn-primary', type: 'button' }, last ? '글자 조각 맞춰 보기 →' : '다음 장소로 →');
    const rest = el('button', { class: 'btn btn-ghost', type: 'button' }, '오늘은 여기까지');
    fill($('#clear-card'), 
      el('div', { class: 'clue-head' },
        el('span', { class: 'clue-tile', 'aria-label': `글자 조각 ${stage.clue.syl}` }, stage.clue.syl),
        el('div', {},
          el('p', { class: 'eyebrow' }, `${j.unit} ${k + 1} · ${stage.place} · ${stage.lens}`),
          el('h2', { class: 'display' }, `${stage.clue.ordinal} 단서를 찾았어요`),
          el('p', { class: 'clue-text' }, stage.clue.text))),
      el('div', { class: 'tier-row' },
        el('p', { class: 'clear-score' }, '이 장소 ', el('strong', {}, `${got * CFG.pointsPerCorrect}`), ` / ${qs.length * CFG.pointsPerCorrect}점`),
        el('p', { class: 'tier-title' }, el('b', {}, tier.title), ' · ', tier.msg)),
      qBlock,
      tierBody,
      CLEAR_EXTRAS[stage.clear] ? CLEAR_EXTRAS[stage.clear](qs) : null,
      el('p', { class: 'score-note' }, '점수는 이 장소의 단서를 얼마나 또렷하게 읽었는지를 보여 줘요. 점수가 낮아도 글자 조각은 받을 수 있고, 다음 장소에 불이익은 없어요. 틀린 문제는 결과 화면에서 다시 풀어 칭호를 올릴 수 있어요.'),
      el('div', { class: 'actions' }, next, rest));
    show('clear');
    requestAnimationFrame(() => $('#clear-card .clue-tile').classList.add('is-in'));
    next.focus({ preventScroll: true });
    const which = await Promise.race([clickOnce(next).then(() => 'next'), clickOnce(rest).then(() => 'rest')]);
    if (which === 'rest') { restNow(); return false; }
    return true;
  };

  /* ---------- 플레이 ---------- */
  const runStage = async (k, my) => {
    const stage = S.journey().stages[k];
    const qs = S.questionsFor(stage);
    S.save();
    const partial = qs.some(q => S.state.answers[q.id]);
    if (!partial) await intro(stage, k);
    if (my !== runId) return false;
    show('play');
    $('#play-kicker').textContent = `${S.journey().unit} ${k + 1} · ${stage.place} · ${stage.form}`;
    $('#play-title').textContent = stage.title;
    $('#play-lens').textContent = stage.lens;
    const root = $('#stage-root');
    root.replaceChildren();
    root.dataset.type = stage.type;
    $('#arrive-slot').replaceChildren();
    S.ui.trail.update();
    S.ui.hud.update();
    const api = {
      root, stage, questions: qs,
      isDone: q => !!S.state.answers[q.id],
      submit: async (q, choice, opts = {}) => {
        const correct = S.record(q, choice);
        S.ui.trail.mood(correct ? 'walk' : 'sit');
        S.ui.hud.update();
        await S.ui.feedback(q, choice, correct, opts);
        S.ui.trail.step();
        S.ui.hud.update();
        return correct;
      },
    };
    S.track('stage_start', { stage: stage.key });
    await S.stageTypes[stage.type].play(api);
    if (my !== runId) return false;
    S.ui.setKeys(null);
    // 도착 장면: 마지막 선택의 결과가 화면에 남아 있는 채로, 직접 눌러야 넘어감
    await S.ui.narrate($('#arrive-slot'), { label: `${stage.place} · 도착`, text: stage.arrive, button: '단서 확인하기 →' });
    $('#arrive-slot').replaceChildren();
    if (my !== runId) return false;
    S.track('stage_end', { stage: stage.key, correct: stageGot(stage) });
    S.state.stageIdx = k + 1;
    S.save();
    S.ui.hud.update();
    return clear(stage, k);
  };

  const runFrom = async (i, my) => {
    const stages = S.journey().stages;
    for (let k = i; k < stages.length; k++) {
      S.state.stageIdx = k;
      S.save();
      S.ui.hud.update();
      const go = await runStage(k, my);
      if (my !== runId || !go) return;
    }
    S.state.finished = true;
    S.state.stageIdx = stages.length;
    S.save();
    S.track('finish', { score: S.state.score });
    finale();
  };

  const begin = async ({ fresh } = {}) => {
    const my = ++runId;
    if (fresh) {
      S.demo = false;
      S.state = S.newState(CFG.defaultJourney);
      S.state.slow = $('#opt-slow').checked;
      S.save();
      S.track('start', { slow: S.state.slow });
    }
    applyPace();
    S.ui.hud.build();
    S.ui.trail.build();
    if (fresh) {
      await prologue();
      if (my !== runId) return;
      if ((CFG.precheck || []).length && S.state.pre === null) await precheck();
    }
    if (my !== runId) return;
    await runFrom(S.state.stageIdx, my);
  };

  /* ---------- 마지막 장면: 글자 조각 맞추기 ---------- */
  // 마지막 메시지 머리말은 쉼표 뒤에서 줄을 나눠 어느 화면에서도 같은 모양으로
  const msgHead = text => el('p', { class: 'f-msg-head' }, text.split(/(?<=,)\s+/).map(t => el('span', {}, t)));
  const finale = () => {
    const j = S.journey();
    const F = STORY.finale;
    const got = j.stages.map(st => st.clue.syl);
    const tiles = el('div', { class: 'f-tiles', 'aria-live': 'polite' }, got.map(s => el('span', { class: 'clue-tile is-in' }, s)));
    const reveal = el('div', { class: 'f-reveal', hidden: true });
    const btn = el('button', { class: 'btn btn-primary btn-lg', type: 'button' }, '글자 조각 맞춰 보기');
    fill($('#finale-card'), 
      el('p', { class: 'eyebrow' }, '마지막 장면 · 하루가 찾던 것'),
      el('h2', { class: 'display' }, '다섯 개의 글자 조각'),
      el('p', {}, `${HERO}의 가방에 글자 조각 다섯 개가 모였어요. 모은 순서대로 놓으면 뜻이 없어 보여요. 순서를 바꿔 볼까요?`),
      tiles,
      el('div', { class: 'actions f-go' }, btn),
      reveal);
    show('finale');
    S.ui.hud.update();
    btn.focus({ preventScroll: true });
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      // 조각을 하나씩 제자리로
      const spans = [...tiles.children];
      const before = spans.map(s => s.getBoundingClientRect());
      const order = F.word.map(w => spans.find(s => s.textContent === w && !s.dataset.used && (s.dataset.used = '1')));
      tiles.replaceChildren(...order);
      tiles.classList.add('is-word');
      order.forEach(s => {
        const from = before[spans.indexOf(s)];
        const to = s.getBoundingClientRect();
        s.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
        s.style.transition = 'none';
      });
      requestAnimationFrame(() => requestAnimationFrame(() => order.forEach((s, i) => {
        s.style.transition = `transform ${0.6 * S.pace}s cubic-bezier(.3,.7,.3,1) ${i * 0.08}s`;
        s.style.transform = '';
      })));
      await S.wait(1100);
      tiles.classList.add('is-solved');
      $('#finale-card .f-go').remove();
      const comicBtn = el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => openComic() }, '하루의 이야기, 만화로 보기');
      const resBtn = el('button', { class: 'btn btn-primary', type: 'button', onclick: () => showResult() }, '나의 여정 결과 보기 →');
      const byWord = F.word.map(w => j.stages.find(st => st.clue.syl === w)).filter(Boolean);
      fill(reveal, 
        el('p', { class: 'f-name' }, F.name),
        el('p', { class: 'f-lead' }, F.lead),
        el('section', { class: 'f-message', 'aria-label': '마지막 메시지' },
          msgHead(F.message),
          el('p', { class: 'f-msg-body' }, F.messageBody)),
        el('section', { class: 'f-box' }, el('h3', {}, F.piecesTitle),
          el('ol', { class: 'f-pieces' }, byWord.map(st => el('li', {},
            el('span', { class: 'clue-tile is-in is-sm' }, st.clue.syl),
            el('div', {}, el('b', {}, st.place), el('span', {}, st.clue.text)))))),
        el('div', { class: 'actions' }, resBtn, comicBtn));
      reveal.hidden = false;
      S.track('finale', {});
      { const hudH = $('.hud') ? $('.hud').getBoundingClientRect().height : 0;
        window.scrollBy({ top: tiles.getBoundingClientRect().top - hudH - 12, behavior: S.reduced ? 'auto' : 'smooth' }); }
      resBtn.focus({ preventScroll: true });
    }, { once: true });
  };

  /* ---------- 결과 ---------- */
  // 점수: 처음 점수(첫 선택, 연구용 사전·사후 비교에 쓰는 값)와 복습 보너스를 따로 기록
  const REVIEW_POINTS = 3;
  const reviewState = () => (S.state.review = S.state.review || { bonus: 0, done: {}, rounds: 0 });
  const totalScore = () => Math.min(100, S.state.score + ((S.state.review && S.state.review.bonus) || 0));
  const allQs = () => S.journey().stages.flatMap(st => stageQs(st).map(q => ({ q, st })));
  const wrongFirst = () => allQs().filter(({ q }) => S.state.answers[q.id] && !S.state.answers[q.id].correct);
  const reviewable = () => wrongFirst().filter(({ q }) => !(S.state.review && S.state.review.done[q.id]));
  const titlesAsc = () => [...CFG.titles].sort((a, b) => a.min - b.min);
  const rangeOf = (t, i, T) => (i === T.length - 1 ? `${t.min}점` : `${t.min}~${T[i + 1].min - CFG.pointsPerCorrect}점`);
  const shortName = name => name.replace(/^트라우마\s*/, '');

  // 칭호 지도: 네 칭호를 막대 하나로, 내 점수 위치와 다음 칭호까지 남은 점수
  const titleMap = total => {
    const T = titlesAsc();
    const cut = T.map((t, i) => (i === 0 ? 0 : t.min - CFG.pointsPerCorrect / 2));
    const cur = S.titleFor(total);
    const bar = el('div', { class: 'tm-bar', 'aria-hidden': 'true' },
      T.map((t, i) => el('span', { class: 'tm-seg' + (t === cur ? ' is-current' : ''), style: { left: `${cut[i]}%`, width: `${(i === T.length - 1 ? 100 : cut[i + 1]) - cut[i]}%` } })));
    const x = Math.max(0, Math.min(100, total));
    const marker = el('span', { class: 'tm-me' + (x < 10 ? ' is-left' : x > 90 ? ' is-right' : ''), style: { left: `${x}%` } }, `나 ${total}점`);
    const labels = el('ol', { class: 'tm-labels' }, T.map((t, i) => el('li', { class: (t === cur ? 'is-current' : '') + (i === T.length - 1 ? ' is-last' : ''), style: { left: `${cut[i]}%` } },
      el('b', {}, el('span', { class: 'tm-long' }, shortName(t.name)), el('span', { class: 'tm-short' }, shortName(t.name).replace(/^(새싹|이해|지식)\s/, ''))),
      el('small', {}, rangeOf(t, i, T)))));
    const next = T.find(t => t.min > total);
    const left = reviewable().length;
    let msg;
    if (!next) msg = el('p', { class: 'tm-msg is-top' }, '가장 높은 칭호예요! 곁의 사람에게 오늘 알게 된 것을 하나 들려줘 보세요.');
    else if (left) {
      const gap = next.min - total;
      const can = left * REVIEW_POINTS;
      msg = el('p', { class: 'tm-msg' }, '다음 칭호 ', el('b', {}, shortName(next.name)), '까지 ', el('strong', {}, `${gap}점`), '! ',
        can >= gap ? '틀린 문제를 다시 풀면 칭호를 올릴 수 있어요.' : `틀린 문제를 다시 풀면 최대 ${can}점을 더 얻을 수 있어요.`);
    } else msg = el('p', { class: 'tm-msg' }, '다음 칭호 ', el('b', {}, shortName(next.name)), `까지 ${next.min - total}점. 처음부터 다시 걸으며 도전해 볼 수 있어요.`);
    const go = left ? el('button', { class: 'btn btn-primary tm-go', type: 'button', onclick: () => review() }, `틀린 문제 다시 풀고 칭호 올리기 ↑`, el('small', {}, ` ${left}문제 · 1개당 +${REVIEW_POINTS}점`)) : null;
    return el('section', { class: 'title-map', 'aria-label': `칭호 지도. 지금 ${total}점, ${cur.name}` },
      el('p', { class: 'tm-head' }, '칭호 지도 · 나는 지금 여기!'),
      el('div', { class: 'tm-track' }, marker, bar, labels),
      msg, go);
  };

  const showResult = () => {
    const j = S.journey();
    const first = S.state.score;
    const bonus = (S.state.review && S.state.review.bonus) || 0;
    const score = totalScore();
    const title = S.titleFor(score);
    const wrong = wrongFirst();

    const head = el('div', { class: 'result-head' },
      el('img', { class: 'result-me', src: S.ui.asset('me-pack'), alt: `가방을 메고 걸어가는 ${HERO}` }),
      el('div', {},
        el('p', { class: 'eyebrow' }, `${HERO}의 여정 완주 · 찾은 것: ${STORY.finale.name}`),
        el('p', { class: 'result-score' }, el('strong', {}, String(score)), el('span', {}, ' / 100'), el('span', { class: 'result-title-inline' }, title.name)),
        bonus ? el('p', { class: 'result-split' }, `처음 점수 ${first}점 + 복습 ${bonus}점`) : null,
        el('p', { class: 'result-msg' }, title.message)));

    // 단서 노트
    const per = j.stages.map(st => ({ st, got: stageGot(st) }));
    const minGot = Math.min(...per.map(p => p.got));
    const weakest = minGot < 4 ? per.filter(p => p.got === minGot) : [];
    const notebook = el('section', { class: 'result-block' },
      el('h3', {}, `${HERO}의 단서 노트`),
      el('ol', { class: 'notebook' }, per.map(p => ({ ...p, weak: weakest.includes(p) })).map(({ st, got, weak }) => el('li', { class: weak ? 'is-weak' : '' },
        el('span', { class: 'clue-tile is-in is-sm' }, st.clue.syl),
        el('div', {},
          el('p', { class: 'nb-head' }, el('b', {}, st.place), el('span', {}, ` · ${st.lens}`), el('span', { class: 'nb-score' }, `${got * CFG.pointsPerCorrect} / 20`)),
          el('p', { class: 'nb-text' }, st.clue.text))))),
      el('p', { class: 'muted' }, !weakest.length ? '다섯 곳 모두에서 단서를 또렷하게 찾았어요.'
        : weakest.length === per.length ? '다섯 곳의 점수가 모두 같아요. 위 ‘다시 보면 좋은 문제’부터 보면 돼요.'
        : `점수가 가장 낮았던 곳: ${weakest.map(p => p.st.place).join(', ')}. 위 ‘다시 보면 좋은 문제’에서 이 장소의 문제부터 다시 보면 좋아요.`));

    // 처음 생각과 지금
    let preBlock = null;
    let changed = 0, kept = 0, confused = 0;
    if (S.state.pre && typeof S.state.pre === 'object') {
      const rows = Object.entries(S.state.pre).map(([id, v]) => {
        const q = S.qById(id);
        const a = S.state.answers[id];
        const before = v === 'unknown' ? 'unknown' : (v === q.answer ? 'right' : 'wrong');
        const after = a && a.correct;
        let cls, status;
        if (after && before === 'right') { cls = 'is-kept'; status = '처음부터 알고 있었어요'; kept++; }
        else if (after && before === 'unknown') { cls = 'is-changed'; status = '새로 알게 됐어요'; changed++; }
        else if (after) { cls = 'is-changed'; status = '생각이 바뀌었어요'; changed++; }
        else if (before === 'right') { cls = 'is-review'; status = '처음엔 맞았는데, 게임에서 헷갈렸어요'; confused++; }
        else { cls = 'is-review'; status = '아직 헷갈려요'; confused++; }
        const label = x => (x === 'unknown' ? '모르겠어요' : x ? 'O' : 'X');
        return el('li', { class: cls },
          el('p', { class: 'pc-q' }, q.prompt),
          el('p', { class: 'pc-row' },
            el('span', {}, '처음 ', el('b', { class: v === 'unknown' ? 'is-unknown' : '' }, label(v))),
            el('span', { 'aria-hidden': 'true' }, '→'),
            el('span', {}, '게임에서 ', el('b', {}, a ? label(a.choice) : '–')),
            el('span', {}, '정답 ', el('b', { class: 'pc-answer' }, label(q.answer))),
            el('span', { class: 'pc-status' }, status)),
          !after ? el('p', { class: 'pc-explain' }, q.explain) : null);
      });
      preBlock = el('section', { class: 'result-block' },
        el('h3', {}, '처음 생각과 지금'),
        el('div', { class: 'pc-summary' },
          el('span', { class: 'is-changed' }, el('b', {}, String(changed)), '개 바뀌었거나 새로 알게 됐어요'),
          el('span', { class: 'is-kept' }, el('b', {}, String(kept)), '개 처음부터 알고 있었어요'),
          el('span', { class: 'is-review' }, el('b', {}, String(confused)), '개 아직 헷갈려요')),
        el('ul', { class: 'pre-compare' }, rows));
    }

    // 다시 보면 좋은 문제: 단서 화면과 같은 카드. 점수대에 따라 함께 보여 줄 내용이 달라짐
    const cards = wrong.length ? el('ol', { class: 'qc-list' }, wrong.map(({ q, st }) => S.ui.qCard(q, { place: st.place }))) : null;
    const cardsWrap = !cards ? null : wrong.length > 6
      ? el('details', { class: 'qc-details' }, el('summary', {}, `틀린 문제 ${wrong.length}개 펼쳐 보기`), cards)
      : cards;
    let review;
    if (first >= 90) {
      review = el('section', { class: 'result-block' },
        el('h3', {}, '한 걸음 더 알아보기'),
        el('p', { class: 'muted' }, '거의 모든 단서를 또렷하게 찾았어요. 장소마다 한 걸음 더 들어간 이야기예요.'),
        el('ul', { class: 'review-list' }, j.stages.map(st => el('li', {}, el('strong', {}, st.place), el('span', {}, st.tiers.deeper.text), el('small', { class: 'fb-source' }, st.tiers.deeper.source)))),
        wrong.length ? el('h4', { class: 'qc-sub' }, `다시 보면 좋은 문제 ${wrong.length}개`) : null,
        cardsWrap);
    } else if (first >= 50) {
      review = el('section', { class: 'result-block' },
        el('h3', {}, `다시 보면 좋은 문제 ${wrong.length}개`),
        el('p', { class: 'muted' }, '틀린 문제의 정답과 해설이에요. 이것만 다시 보면 단서가 또렷해져요.'),
        cardsWrap,
        el('div', { class: 'lens-recap' }, el('p', { class: 'eyebrow' }, '세 개의 렌즈 다시 보기'),
          el('ul', {}, j.stages.slice(1, 4).map(st => el('li', {}, el('b', {}, st.lens.split('·')[1].trim()), ' ', st.clue.text)))));
    } else {
      review = el('section', { class: 'result-block' },
        el('h3', {}, '여정의 핵심 다섯 가지'),
        el('p', { class: 'muted' }, '처음이라 헷갈리는 게 당연해요. 다섯 장소의 핵심부터 차근차근 읽어 봐요.'),
        el('ol', { class: 'key-five' }, j.stages.map(st => el('li', {}, el('b', {}, st.place), el('span', {}, st.clue.text)))),
        wrong.length ? el('h4', { class: 'qc-sub' }, `다시 보면 좋은 문제 ${wrong.length}개`) : null,
        cardsWrap);
    }

    // 이제 이렇게 말할 수 있어요 (구체적인 말의 변화)
    const say = CFG.sayNow.filter(x => S.state.answers[x.id] && S.state.answers[x.id].correct);
    const sayList = (say.length ? say : CFG.sayNow).slice(0, 4);
    const preLine = S.state.pre && typeof S.state.pre === 'object'
      ? `출발 전 생각 열 개 중 ${changed}개가 바뀌었거나 새로 알게 됐어요. ‘트라우마’라는 말을 더 정확하게 쓴다는 건, 이런 변화예요.`
      : '‘트라우마’라는 말을 더 정확하게 쓴다는 건, 이런 변화예요.';
    const sayBlock = el('section', { class: 'result-block say-now' },
      el('h3', {}, say.length ? '이제 이렇게 말할 수 있어요' : '이렇게 말해 볼 수 있어요'),
      el('p', { class: 'muted' }, preLine),
      el('ul', {}, sayList.map(x => el('li', {}, el('p', { class: 'sn-before' }, x.before), el('p', { class: 'sn-after' }, x.after)))));

    const again = el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { S.store.clear(); begin({ fresh: true }); } }, '처음부터 다시 걷기');
    const comic = el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => openComic() }, '원작 만화 보기');
    const home = el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { S.store.clear(); initStart(); } }, '처음 화면으로');

    fill($('#result-card'), 
      head,
      titleMap(score),
      el('p', { class: 'result-note' }, '점수는 오늘 게임에서의 지식 이해도예요. 마음 건강 상태나 회복 정도와는 관계없어요.'),
      sayBlock,
      review,
      preBlock,
      notebook,
      S.ui.helpCard(),
      el('section', { class: 'f-message is-closing', 'aria-label': '마지막 메시지' },
        msgHead(STORY.finale.message),
        el('p', { class: 'f-msg-body' }, STORY.finale.messageBody)),
      el('div', { class: 'actions' }, again, comic, home));
    S.ui.hud.update();
    show('result');
  };

  /* ---------- 복습 길: 틀린 문제 다시 풀고 칭호 올리기 ----------
   * 틀린 문제만 모아 짧은 카드 뒤집기로 다시 출제. ‘먼저 읽기’ 한 줄을 읽고 카드를 뒤집어 풀어요.
   * 정답 1개당 +3점(처음 정답 5점보다 낮게), 또 틀려도 감점 없이 해설을 보고 넘어가요.
   * 처음 점수(S.state.score)는 그대로 두고 복습 점수는 S.state.review.bonus에 따로 기록해요.
   */
  const review = async () => {
    const my = ++runId;
    const R = reviewState();
    R.rounds++;
    const items = reviewable();
    const startTotal = totalScore();
    const startTitle = S.titleFor(startTotal);
    let right = 0;
    S.track('review_start', { first: S.state.score, bonus: R.bonus, items: items.length });
    show('review');
    for (let i = 0; i < items.length; i++) {
      if (my !== runId) return;
      const { q, st } = items[i];
      const flip = el('button', { class: 'btn btn-primary', type: 'button' }, '읽었어요, 카드 뒤집기 ↻');
      const front = el('div', { class: 'rv-face rv-front' },
        el('p', { class: 'rv-read-label' }, '먼저 읽기'),
        el('p', { class: 'rv-read' }, q.study || q.explain),
        el('p', { class: 'rv-from' }, `원래 장소 · ${st.place} · 문제 ${S.ui.qNumber(q)}`),
        el('div', { class: 'actions' }, flip));
      const back = el('div', { class: 'rv-face rv-back' });
      const card = el('div', { class: 'rv-card' }, front, back);
      const result = el('div', { class: 'rv-result', 'aria-live': 'polite' });
      $('#review-card').replaceChildren(
        el('div', { class: 'rv-top' },
          el('p', { class: 'eyebrow' }, `복습 길 · ${i + 1} / ${items.length}`),
          el('p', { class: 'rv-score' }, '지금 ', el('b', {}, `${totalScore()}점`), ` · ${S.titleFor(totalScore()).name}`)),
        el('div', { class: 'rv-dots', 'aria-hidden': 'true' }, items.map((_, k) => el('i', { class: k < i ? 'is-done' : k === i ? 'is-on' : '' }))),
        card, result);
      window.scrollTo({ top: 0, behavior: 'auto' });
      flip.focus({ preventScroll: true });
      await clickOnce(flip);
      if (my !== runId) return;
      const choice = await new Promise(res => {
        const panel = S.ui.answerPanel(q, res, { label: '카드 뒷면 · 문제' });
        back.replaceChildren(panel);
        card.classList.add('is-flipped');
        setTimeout(() => { front.hidden = true; }, S.reduced ? 0 : 460 * S.pace);
        const firstBtn = panel.querySelector('button');
        setTimeout(() => firstBtn && firstBtn.focus({ preventScroll: true }), S.reduced ? 0 : 420);
      });
      S.ui.setKeys(null);
      const ok = S.isCorrect(q, choice);
      if (ok) { R.done[q.id] = true; R.bonus += REVIEW_POINTS; right++; }
      S.save();
      S.ui.hud.update();
      S.track('review_answer', { id: q.id, correct: ok });
      const next = el('button', { class: 'btn btn-primary', type: 'button' }, i === items.length - 1 ? '복습 마치기 →' : '다음 카드 →');
      result.replaceChildren(el('div', { class: 'rv-fb ' + (ok ? 'is-good' : 'is-bad') },
        el('img', { src: S.ui.asset(ok ? 'me-pack' : 'me-oops'), alt: '' }),
        el('div', {},
          el('p', { class: 'rv-verdict' }, ok ? '맞아요!' : '괜찮아요, 감점은 없어요', ok ? el('span', { class: 'fb-points' }, `+${REVIEW_POINTS}점`) : null),
          !ok ? el('p', { class: 'rv-answer' }, '정답 ', el('b', {}, S.answerLabel(q))) : null,
          el('p', { class: 'rv-explain' }, q.explain),
          el('div', { class: 'actions' }, next))));
      result.scrollIntoView({ block: 'nearest', behavior: S.reduced ? 'auto' : 'smooth' });
      next.focus({ preventScroll: true });
      await clickOnce(next);
    }
    if (my !== runId) return;
    // 마무리: 칭호가 올랐는지
    const endTotal = totalScore();
    const endTitle = S.titleFor(endTotal);
    const up = endTitle !== startTitle;
    const left = reviewable().length;
    S.track('review_done', { first: S.state.score, bonus: R.bonus, right, items: items.length, title: endTitle.name });
    const toResult = el('button', { class: 'btn btn-primary', type: 'button', onclick: () => showResult() }, '결과 화면으로 →');
    const againBtn = left ? el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => review() }, `남은 ${left}문제 다시 풀기`) : null;
    $('#review-card').replaceChildren(el('div', { class: 'rv-end' + (up ? ' is-up' : '') },
      up ? el('p', { class: 'rv-up-arrow', 'aria-hidden': 'true' }, '↑') : null,
      el('h2', { class: 'display' }, up ? '칭호가 올랐어요!' : '복습을 마쳤어요'),
      up ? el('p', { class: 'rv-titles' }, shortName(startTitle.name), ' → ', el('b', {}, shortName(endTitle.name))) : el('p', { class: 'rv-titles' }, `${items.length}문제 중 ${right}문제를 맞혔어요`),
      el('p', { class: 'rv-total' }, `${startTotal} → `, el('strong', {}, `${endTotal}점`)),
      el('p', { class: 'muted' }, `복습 정답 1개당 +${REVIEW_POINTS}점. 처음 점수 ${S.state.score}점도 함께 기록해 둬요.`),
      el('div', { class: 'actions' }, toResult, againBtn)));
    window.scrollTo({ top: 0, behavior: 'auto' });
    toResult.focus({ preventScroll: true });
  };

  /* ---------- 원작 만화 ---------- */
  let comicPage = 0;
  const renderComic = () => {
    const n = String(comicPage + 1).padStart(2, '0');
    $('#comic-img').src = CFG.comicPath.replace('{n}', n);
    $('#comic-img').alt = CFG.comicCaptions[comicPage];
    $('#comic-cap').textContent = `${comicPage + 1}. ${CFG.comicCaptions[comicPage]}`;
    $('#comic-page').textContent = `${comicPage + 1} / ${CFG.comicCaptions.length}`;
    $('#comic-prev').disabled = comicPage === 0;
    const last = comicPage === CFG.comicCaptions.length - 1;
    $('#comic-next').textContent = last ? '닫기' : '다음 →';
    $('#comic-foot').hidden = !last;
  };
  const openComic = () => {
    comicPage = 0;
    $('#comic-lead').textContent = STORY.finale.comicLead;
    $('#comic-game').href = CFG.campaignUrl;
    renderComic();
    S.ui.openDialog('#dlg-comic');
  };

  /* ---------- 쉬어가기 ---------- */
  const restNow = () => {
    runId++;
    S.save();
    S.track('rest', { answered: S.answeredCount(), stage: S.state.stageIdx });
    S.ui.closeDialog('#dlg-rest');
    document.querySelectorAll('.sheet').forEach(s => s.remove());
    $('#rested-help').replaceChildren(S.ui.helpCard());
    show('rested');
  };

  /* ---------- 시연 모드 (#demo): 포스터 촬영·부스 시연용, 기록·저장 안 함 ---------- */
  const demoJump = target => {
    S.state = S.newState(CFG.defaultJourney);
    S.demo = true;
    const j = S.journey();
    const upto = (target === 'result' || target === 'finale') ? j.stages.length : (target === 'prologue' ? 0 : target);
    const misses = ['q4', 'q12', 'q15'];
    j.stages.forEach((st, k) => {
      const qs = S.questionsFor(st);
      if (k >= upto) return;
      qs.forEach(q => {
        const miss = (target === 'result' || target === 'finale') && misses.includes(q.id);
        const choice = miss ? (q.type === 'ox' ? !q.answer : (q.answer + 1) % q.options.length) : q.answer;
        S.state.answers[q.id] = { choice, correct: !miss };
        if (!miss) S.state.score += CFG.pointsPerCorrect;
      });
    });
    S.state.pre = { q2: true, q3: false, q6: 'unknown', q7: true, q10: true, q12: true, q13: 'unknown', q15: true, q18: false, q20: false };
    const my = ++runId;
    applyPace();
    S.ui.hud.build();
    S.ui.trail.build();
    if (target === 'prologue') { S.state.pre = null; prologue().then(() => precheck()).then(() => runFrom(0, my)); return; }
    if (target === 'result' || target === 'finale') {
      S.state.finished = true; S.state.stageIdx = j.stages.length;
      if (target === 'finale') finale(); else showResult();
      return;
    }
    runFrom(target, my);
  };

  /* ---------- 연결 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    S.ui.buildHelp();
    $('#btn-start').addEventListener('click', () => { S.store.clear(); begin({ fresh: true }); });
    $('#btn-resume').addEventListener('click', () => {
      const saved = S.store.get();
      if (!resumable(saved)) { initStart(); return; }
      S.demo = false;
      S.state = saved;
      S.state.data = S.state.data || {};
      S.track('resume', { answered: Object.keys(saved.answers).length, stage: saved.stageIdx });
      if (S.state.pre === null) S.state.pre = 'skipped';
      begin({ fresh: false });
    });
    $('#btn-help').addEventListener('click', () => S.ui.openDialog('#dlg-help'));
    document.querySelectorAll('[data-open-help]').forEach(b => b.addEventListener('click', () => S.ui.openDialog('#dlg-help')));
    document.querySelectorAll('[data-open-comic]').forEach(b => b.addEventListener('click', openComic));
    $('#comic-prev').addEventListener('click', () => { if (comicPage > 0) { comicPage--; renderComic(); } });
    $('#comic-next').addEventListener('click', () => { if (comicPage < CFG.comicCaptions.length - 1) { comicPage++; renderComic(); } else S.ui.closeDialog('#dlg-comic'); });
    $('#btn-rest').addEventListener('click', () => S.ui.openDialog('#dlg-rest'));
    $('#rest-continue').addEventListener('click', () => S.ui.closeDialog('#dlg-rest'));
    $('#rest-stop').addEventListener('click', restNow);
    $('#rested-home').addEventListener('click', initStart);
    $('#rest-help').addEventListener('click', () => { S.ui.closeDialog('#dlg-rest'); S.ui.openDialog('#dlg-help'); });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
    document.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.demo;
      demoJump(['prologue', 'finale', 'result'].includes(t) ? t : Number(t));
    }));
    initStart();
    window.addEventListener('hashchange', () => { if (document.body.dataset.screen === 'start') initStart(); });
  });

  // 시험·자동 점검용 (화면 동작에는 영향 없음)
  S.app = { begin, showResult, initStart, demoJump, finale, review };
})();
