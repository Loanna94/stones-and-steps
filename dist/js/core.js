/*
 * 돌멩이가 있어도 — 핵심 엔진
 * 상태, 저장(이어하기), 문항 고르기, 채점, 기록 훅, 스테이지 등록
 */
(function () {
  'use strict';
  const S = (window.Stones = window.Stones || {});
  const CFG = window.STONES_CONFIG;

  /* ---------- 스테이지 형태 등록 ----------
   * 새 게임 형태는 js/stages/에 파일을 만들고 Stones.registerStage('이름', { play(api) {...} })로 등록합니다.
   * play(api)는 그 스테이지의 문항을 모두 마치면 끝나는 Promise를 돌려줘야 합니다.
   */
  S.stageTypes = {};
  S.registerStage = (type, impl) => { S.stageTypes[type] = impl; };

  /* ---------- 작은 도구 ---------- */
  S.pace = 1;
  S.reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  S.wait = ms => new Promise(r => setTimeout(r, S.reduced ? Math.min(ms, 120) : ms * S.pace));
  S.shuffle = (arr, seed) => {
    const a = arr.slice();
    let s = seed || Math.floor(Math.random() * 1e9);
    const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  S.el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    kids.flat().forEach(c => { if (c !== null && c !== undefined && c !== false) n.append(c.nodeType ? c : document.createTextNode(c)); });
    return n;
  };
  S.$ = (sel, root = document) => root.querySelector(sel);
  S.circled = i => '①②③④⑤⑥'[i] || String(i + 1);
  /* 받침에 따라 조사 고르기: S.josa('산책', '을', '를') → '산책을' */
  S.josa = (word, withBatchim, without) => {
    const c = word.charCodeAt(word.length - 1) - 0xac00;
    const has = c >= 0 && c <= 11171 && c % 28 !== 0;
    return word + (has ? withBatchim : without);
  };

  /* ---------- 저장 (이 기기 브라우저에만, 실패해도 게임은 그대로 진행) ---------- */
  const KEY = 'haru-journey:v2.2';
  S.store = {
    get() { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } },
  };

  /* ---------- 상태 ---------- */
  S.newState = journey => ({
    v: CFG.version, journey: journey || CFG.defaultJourney,
    stageIdx: 0, answers: {}, score: 0, pre: null, order: {}, data: {},
    seed: Math.floor(Math.random() * 1e9), slow: false, startedAt: Date.now(), finished: false,
  });
  S.state = null;
  S.save = () => { if (S.state && !S.demo) S.store.set(S.state); };
  S.journey = () => window.STONES_JOURNEYS[S.state.journey];
  S.isQuiz = () => S.journey().mode !== 'journey';

  /* ---------- 문항 ---------- */
  const BANK = window.STONES_QUESTIONS;
  S.allQuestions = () => Object.values(BANK).flatMap(b => [...(b.main || []), ...(b.reserve || [])]);
  S.qById = id => S.allQuestions().find(q => q.id === id);
  S.questionsFor = stage => {
    if (!BANK[stage.key]) return [];
    const saved = S.state.order[stage.key];
    if (saved) return saved.map(S.qById).filter(Boolean);
    const bank = BANK[stage.key] || { main: [] };
    let list = bank.main.slice(0, CFG.perStage);
    if (CFG.randomize) {
      list = S.shuffle([...bank.main, ...(bank.reserve || [])], S.state.seed + stage.key.length * 97).slice(0, CFG.perStage);
    }
    S.state.order[stage.key] = list.map(q => q.id);
    return list;
  };
  S.isCorrect = (q, choice) => choice === q.answer;
  S.answerLabel = q => (q.type === 'ox' ? (q.answer ? 'O (맞아요)' : 'X (아니에요)') : `${S.circled(q.answer)} ${q.options[q.answer]}`);
  S.choiceLabel = (q, choice) => (q.type === 'ox' ? (choice ? 'O' : 'X') : `${S.circled(choice)} ${q.options[choice]}`);

  /* 답을 기록하고 이번 선택의 정답 여부를 돌려줍니다. 기록과 점수는 첫 선택만 남깁니다(다시 고르기 허용 여정 대비). */
  S.record = (q, choice) => {
    const correct = S.isCorrect(q, choice);
    if (S.state.answers[q.id]) return correct;
    S.state.answers[q.id] = { choice, correct, at: Date.now() };
    if (correct && S.journey().scoring) S.state.score += CFG.pointsPerCorrect;
    S.save();
    S.track('answer', { qid: q.id, correct });
    return correct;
  };
  S.answeredCount = () => Object.keys(S.state.answers).length;
  S.totalQuestions = () => S.journey().stages.length * CFG.perStage;
  /* 진행 단위: 퀴즈 여정은 문항, 동행 여정은 장면 */
  S.totalSteps = () => (S.isQuiz() ? S.totalQuestions() : S.journey().stages.length);
  S.doneSteps = () => (S.isQuiz() ? S.answeredCount() : Math.min(S.state.stageIdx, S.journey().stages.length));
  S.perGate = () => (S.isQuiz() ? CFG.perStage : 1);
  /* 여정별 자유 데이터(동행 여정의 선택 등). 저장도 함께 */
  S.setData = (k, v) => { S.state.data = S.state.data || {}; S.state.data[k] = v; S.save(); };
  S.getData = k => (S.state.data || {})[k];

  /* ---------- 기록 훅 ----------
   * 게임 안의 일을 'stones:track' 이벤트로 알립니다. 기본은 아무 데도 보내지 않습니다.
   * config.js의 logEndpoint를 채우면(IRB 승인 뒤) 익명 기록을 그 주소로 보냅니다.
   * 보내는 내용: 이벤트 종류, 문항 id, 정답 여부, 시각. 이름·연락처·자유 응답은 없습니다.
   */
  S.track = (type, data = {}) => {
    const detail = { type, t: Date.now(), journey: S.state && S.state.journey, v: CFG.version, ...data };
    try { window.dispatchEvent(new CustomEvent('stones:track', { detail })); } catch (e) { /* 무시 */ }
    if (CFG.logEndpoint && !S.demo && navigator.sendBeacon) {
      try { navigator.sendBeacon(CFG.logEndpoint, JSON.stringify({ ...detail, session: S.state && S.state.seed })); } catch (e) { /* 무시 */ }
    }
  };

  S.titleFor = score => CFG.titles.find(t => score >= t.min) || CFG.titles[CFG.titles.length - 1];
})();
