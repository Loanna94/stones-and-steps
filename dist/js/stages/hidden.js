/*
 * 스테이지 형태: 숨은 단서 찾기 (hidden)
 * 산책길 그림 속에 숨은 단서(주차된 자동차, 나무 아래 강아지, 닫힌 문, 창가의 꽃)를 찾아 누르면 그 단서와 연결된 문제가 나온다.
 * 문항의 clue 칸이 그림 속 단서 이름과 같아야 한다. 찾는 순서는 자유.
 * 찾은 물건에는 흰 알약 모양 이름표가 사물 위에 붙고, 휴대폰에서는 문제가 아래에서 올라오는 시트로 나온다.
 */
(function () {
  'use strict';
  const S = window.Stones;
  const { el, $ } = S;

  const LABEL = { car: '주차된 자동차', dog: '나무 아래 강아지', door: '닫힌 문', flower: '창가의 꽃' };
  const SHORT = { car: '자동차', dog: '강아지', door: '닫힌 문', flower: '창가의 꽃' };
  const POS = { door: [161, 317], flower: [212, 235], dog: [411, 254], car: [691, 365] };
  const RING = { door: 52, flower: 33, dog: 38, car: 96 };
  const HIT = { door: 50, flower: 36, dog: 40, car: 96 };
  // 이름표(흰 알약)의 가운데 자리: 사물 위쪽, 다른 사물과 겹치지 않게
  const TAG_AT = { door: [148, 257], flower: [212, 186], dog: [411, 204], car: [691, 312] };

  const ART = `
  <svg class="walk-art" viewBox="0 0 800 480" role="img" aria-label="집, 나무 아래 강아지, 벤치, 자동차가 있는 산책길 그림">
    <rect width="800" height="480" fill="var(--sky)"/>
    <path d="M0 210 C 120 160, 260 190, 380 172 C 520 150, 640 192, 800 160 L800 270 L0 270 Z" fill="var(--hill)"/>
    <rect y="250" width="800" height="230" fill="var(--ground)"/>
    <path d="M300 480 C 340 410, 450 370, 505 312 C 545 270, 610 250, 720 246 L 760 256 C 670 262, 610 282, 580 318 C 530 378, 450 430, 445 480 Z" fill="var(--path)"/>
    <g transform="translate(40 120)">
      <polygon points="0,95 105,18 212,95" fill="var(--roof)" stroke="var(--scene-ink)" stroke-width="4" stroke-linejoin="round"/>
      <rect x="15" y="92" width="182" height="152" fill="var(--wall)" stroke="var(--scene-ink)" stroke-width="4" stroke-linejoin="round"/>
      <rect x="30" y="112" width="46" height="40" rx="3" fill="var(--glass)" stroke="var(--scene-ink)" stroke-width="3"/>
      <path d="M53 112 V152 M30 132 H76" stroke="var(--scene-ink)" stroke-width="2.5"/>
      <path d="M31 113 H44 Q39 128 46 151 H31 Z M75 113 H62 Q67 128 60 151 H75 Z" fill="var(--curtain)" stroke="var(--scene-ink)" stroke-width="2" stroke-linejoin="round"/>
      <path d="M26 110 H80" stroke="var(--scene-ink)" stroke-width="3" stroke-linecap="round"/>
      <rect x="150" y="104" width="40" height="34" rx="3" fill="var(--glass)" stroke="var(--scene-ink)" stroke-width="3"/>
      <path d="M151 105 H160 Q157 118 162 137 H151 Z M189 105 H180 Q183 118 178 137 H189 Z" fill="var(--curtain)" stroke="var(--scene-ink)" stroke-width="2" stroke-linejoin="round"/>
      <path d="M146 102 H194" stroke="var(--scene-ink)" stroke-width="3" stroke-linecap="round"/>
      <rect x="145" y="138" width="50" height="6" rx="2" fill="var(--wood)" stroke="var(--scene-ink)" stroke-width="2.5"/>
    </g>
    <image href="assets/tree.webp" x="275" y="48" width="175" height="238"/>
    <image href="assets/grass.webp" x="20" y="352" width="150" height="55"/>
    <image href="assets/flowers.webp" x="560" y="420" width="140" height="66"/>
    <image href="assets/smallGrass.webp" x="250" y="300" width="110" height="48"/>
    <image href="assets/flowerPatch.webp" x="40" y="430" width="160" height="58"/>
    <g transform="translate(470 288)">
      <rect x="0" y="0" width="96" height="12" rx="3" fill="var(--wood)" stroke="var(--scene-ink)" stroke-width="3"/>
      <rect x="0" y="22" width="96" height="10" rx="3" fill="var(--wood)" stroke="var(--scene-ink)" stroke-width="3"/>
      <path d="M10 12 V48 M86 12 V48 M14 32 V48 M82 32 V48" stroke="var(--scene-ink)" stroke-width="3" stroke-linecap="round"/>
    </g>
    <image href="assets/me-walk.webp" x="392" y="370" width="64" height="91"/>

    <g class="clue" data-clue="door">
      <rect x="135" y="270" width="52" height="94" rx="4" fill="var(--wood-dark)" stroke="var(--scene-ink)" stroke-width="4"/>
      <path d="M152 274 V360 M169 274 V360" stroke="var(--scene-ink)" stroke-width="1.6" opacity=".45"/>
      <circle cx="178" cy="320" r="3.6" fill="var(--scene-ink)"/>
    </g>
    <g class="clue" data-clue="flower">
      <path d="M204 246 C 203 238, 204 232, 204 228 M212 246 C 212 236, 213 228, 212 222 M220 246 C 221 238, 221 233, 221 229" stroke="#5f8a4e" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M206 240 q-9 -5 -11 2 q6 4 11 -2 Z M218 238 q9 -6 11 1 q-6 5 -11 -1 Z" fill="#8db57a" stroke="var(--scene-ink)" stroke-width="1.6"/>
      <g fill="var(--bloom)" stroke="var(--scene-ink)" stroke-width="2.2"><circle cx="203" cy="225" r="8"/><circle cx="212" cy="216" r="9"/><circle cx="221" cy="226" r="8"/></g>
      <g fill="#ffffff" opacity=".7"><circle cx="200" cy="222" r="2.2"/><circle cx="209" cy="213" r="2.4"/><circle cx="218" cy="223" r="2.2"/></g>
      <path d="M197 246 H227 L222 259 H202 Z" fill="var(--pot)" stroke="var(--scene-ink)" stroke-width="2.5" stroke-linejoin="round"/>
    </g>
    <g class="clue" data-clue="dog">
      <g transform="translate(382 222)">
        <path d="M44 50 C 56 50, 58 38, 52 32" fill="none" stroke="var(--scene-ink)" stroke-width="3.2" stroke-linecap="round"/>
        <path d="M14 61 C 9 47, 12 33, 22 29 L 38 29 C 48 33, 51 47, 46 61 Z" fill="var(--dog)" stroke="var(--scene-ink)" stroke-width="3" stroke-linejoin="round"/>
        <ellipse cx="40" cy="45" rx="5" ry="6" fill="var(--dog-ear)" opacity=".75"/>
        <path d="M23 45 V60 M33 45 V60" stroke="var(--scene-ink)" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M17 61 h10 M29 61 h10" stroke="var(--scene-ink)" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="29" cy="17" rx="15" ry="13" fill="var(--dog)" stroke="var(--scene-ink)" stroke-width="3"/>
        <path d="M16 9 C 8 12, 8 24, 13 29 C 18 27, 19 18, 18 11 Z M42 9 C 50 12, 50 24, 45 29 C 40 27, 39 18, 40 11 Z" fill="var(--dog-ear)" stroke="var(--scene-ink)" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="23.5" cy="16" r="2.1" fill="var(--scene-ink)"/><circle cx="34.5" cy="16" r="2.1" fill="var(--scene-ink)"/>
        <ellipse cx="29" cy="22" rx="3" ry="2.2" fill="var(--scene-ink)"/>
        <path d="M26 25.5 q3 3 6 0" fill="none" stroke="var(--scene-ink)" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M18 31 q11 5 22 0" fill="none" stroke="var(--cal)" stroke-width="3.2" stroke-linecap="round"/>
      </g>
    </g>
    <g class="clue" data-clue="car">
      <g transform="translate(600 334)">
        <path d="M0 38 Q 4 18 30 15 L 58 0 Q 64 -4 98 -4 L 126 -2 Q 138 0 148 15 L 166 18 Q 182 22 182 38 L 182 50 L 0 50 Z" fill="var(--car)" stroke="var(--scene-ink)" stroke-width="4" stroke-linejoin="round"/>
        <path d="M40 15 L 62 4 Q 66 2 92 2 L 92 15 Z M100 2 L 122 2 Q 132 3 138 15 L 100 15 Z" fill="var(--glass)" stroke="var(--scene-ink)" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="40" cy="52" r="14" fill="#3b3b3b" stroke="var(--scene-ink)" stroke-width="3"/><circle cx="40" cy="52" r="5" fill="#d8d8d0"/>
        <circle cx="144" cy="52" r="14" fill="#3b3b3b" stroke="var(--scene-ink)" stroke-width="3"/><circle cx="144" cy="52" r="5" fill="#d8d8d0"/>
      </g>
    </g>
  </svg>`;

  const ICON = {
    car: '<svg viewBox="0 0 48 28" aria-hidden="true"><path d="M3 20 Q4 12 12 11 L18 5 Q20 4 30 4 L36 5 Q40 6 42 11 L45 12 Q47 14 47 20 L47 23 L3 23 Z" fill="var(--car)" stroke="currentColor" stroke-width="2.4"/><circle cx="13" cy="23" r="4.5" fill="#3b3b3b"/><circle cx="37" cy="23" r="4.5" fill="#3b3b3b"/></svg>',
    dog: '<svg viewBox="0 0 48 28" aria-hidden="true"><ellipse cx="24" cy="13" rx="9" ry="8" fill="var(--dog)" stroke="currentColor" stroke-width="2.2"/><path d="M16 8 q-5 3 -3 11 q4 -1 4 -8 Z M32 8 q5 3 3 11 q-4 -1 -4 -8 Z" fill="var(--dog-ear)" stroke="currentColor" stroke-width="1.8"/><circle cx="21" cy="12" r="1.4" fill="currentColor"/><circle cx="27" cy="12" r="1.4" fill="currentColor"/><ellipse cx="24" cy="16" rx="2" ry="1.4" fill="currentColor"/><path d="M17 27 q-1 -5 3 -7 h8 q4 2 3 7" fill="var(--dog)" stroke="currentColor" stroke-width="2"/></svg>',
    door: '<svg viewBox="0 0 48 28" aria-hidden="true"><rect x="15" y="1" width="18" height="26" rx="2" fill="var(--wood-dark)" stroke="currentColor" stroke-width="2.4"/><circle cx="29" cy="15" r="1.8" fill="currentColor"/></svg>',
    flower: '<svg viewBox="0 0 48 28" aria-hidden="true"><path d="M20 15 V19 M24 12 V19 M28 15 V19" stroke="#5f8a4e" stroke-width="2"/><g fill="var(--bloom)" stroke="currentColor" stroke-width="1.6"><circle cx="19" cy="11" r="4"/><circle cx="24" cy="7" r="4.5"/><circle cx="29" cy="11" r="4"/></g><path d="M16 19 H32 L30 27 H18 Z" fill="var(--pot)" stroke="currentColor" stroke-width="2"/></svg>',
  };

  S.registerStage('hidden', {
    play(api) {
      const { root, questions } = api;
      const byClue = {};
      questions.forEach(q => { byClue[q.clue] = q; });
      const mission = el('div', { class: 'mission' },
        el('p', { class: 'mission-title' }, '하루의 가슴을 뛰게 한 물건 4가지를 그림에서 찾아 눌러 보세요'),
        el('ul', { class: 'mission-list' }, questions.map(q => el('li', { 'data-clue': q.clue }, el('span', { class: 'm-icon', html: ICON[q.clue] || '' }), el('span', { class: 'm-name' }, LABEL[q.clue]), el('span', { class: 'm-check', 'aria-hidden': 'true' }, '')))));
      const count = el('span', { class: 'found-count' }, '');
      const hintBtn = el('button', { class: 'chip-btn chip-hint', type: 'button' }, '힌트 보기');
      const bar = el('div', { class: 'scene-bar' }, count, hintBtn);
      const scene = el('div', { class: 'scene scene-walk', html: ART });
      const hint = el('p', { class: 'panel-hint' }, '그림을 천천히 둘러보고, 위 목록의 물건을 찾으면 눌러 보세요. 막히면 ‘힌트 보기’를 눌러요.');
      const slot = el('div', { class: 'panel-slot' }, hint);
      const swipe = el('p', { class: 'swipe-hint' }, '그림을 옆으로 밀어 끝까지 둘러보세요 ↔');
      root.append(mission, bar, swipe, scene, slot);
      const svg = scene.querySelector('svg');

      const found = () => questions.filter(q => api.isDone(q)).length;
      const setCount = () => { count.textContent = `찾은 물건 ${found()} / ${questions.length}`; };
      const ns = 'http://www.w3.org/2000/svg';
      // 흰 바탕 알약 이름표 (SVG 안에서 글자 폭을 재서 그림)
      const pill = (key, text, cls) => {
        const [x, y] = TAG_AT[key];
        const g = document.createElementNS(ns, 'g');
        g.setAttribute('class', cls);
        const rect = document.createElementNS(ns, 'rect');
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
        t.textContent = text;
        g.append(rect, t);
        svg.append(g);
        const w = Math.ceil((t.getComputedTextLength ? t.getComputedTextLength() : text.length * 18) + 26);
        const h = 32;
        const cx = Math.min(800 - w / 2 - 4, Math.max(w / 2 + 4, x));
        t.setAttribute('x', cx); t.setAttribute('y', y + 1);
        rect.setAttribute('x', cx - w / 2); rect.setAttribute('y', y - h / 2);
        rect.setAttribute('width', w); rect.setAttribute('height', h); rect.setAttribute('rx', h / 2);
        return g;
      };
      const markFound = (g, q) => {
        g.classList.add('is-found');
        const li = mission.querySelector(`li[data-clue="${q.clue}"]`);
        if (li) { li.classList.add('is-found'); li.querySelector('.m-check').textContent = '✓'; }
        if (!g.querySelector('.ring')) {
          const [cx, cy] = POS[q.clue];
          const ring = document.createElementNS(ns, 'circle');
          ring.setAttribute('class', 'ring'); ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('r', RING[q.clue]);
          g.append(ring);
          svg.querySelectorAll(`.tag-pill[data-for="${q.clue}"]`).forEach(x => x.remove());
          const tag = pill(q.clue, `✓ ${SHORT[q.clue]}`, 'tag-pill');
          tag.dataset.for = q.clue;
        }
        g.setAttribute('aria-label', `찾은 물건: ${LABEL[q.clue]}`);
      };
      // 힌트: 다음 물건 자리에 깜빡이는 동그라미와 ‘여기!’ 알약, 화면 밖이면 그 자리로 스크롤
      let hintTimer = null;
      const clearHint = () => { svg.querySelectorAll('.hint-ring, .hint-pill').forEach(x => x.remove()); mission.querySelectorAll('li').forEach(li => li.classList.remove('is-hint')); };
      const showHint = () => {
        const g = svg.querySelector('.clue:not(.is-found)');
        if (!g) return;
        clearHint();
        mission.querySelectorAll('li').forEach(li => li.classList.toggle('is-hint', li.dataset.clue === g.dataset.clue));
        const [cx, cy] = POS[g.dataset.clue];
        const ring = document.createElementNS(ns, 'circle');
        ring.setAttribute('class', 'hint-ring'); ring.setAttribute('cx', cx); ring.setAttribute('cy', cy); ring.setAttribute('r', RING[g.dataset.clue] + 6);
        svg.append(ring);
        pill(g.dataset.clue, `여기! ${SHORT[g.dataset.clue]}`, 'hint-pill');
        const box = g.getBoundingClientRect();
        const sr = scene.getBoundingClientRect();
        if (box.left < sr.left || box.right > sr.right) scene.scrollTo({ left: scene.scrollLeft + (box.left - sr.left) - sr.width / 2 + box.width / 2, behavior: S.reduced ? 'auto' : 'smooth' });
        scene.scrollIntoView({ block: 'nearest', behavior: S.reduced ? 'auto' : 'smooth' });
        clearTimeout(hintTimer);
        hintTimer = setTimeout(clearHint, 4000);
      };
      // 휴대폰: 문제와 보기를 아래에서 올라오는 시트로 (그림은 위에 그대로 보임)
      const narrow = () => window.matchMedia('(max-width: 640px)').matches;
      let qsheet = null;
      const closeQSheet = () => { if (qsheet) { qsheet.remove(); qsheet = null; } };

      return new Promise(resolve => {
        let busy = false;
        svg.querySelectorAll('.clue').forEach(g => {
          const q = byClue[g.dataset.clue];
          if (!q) { g.remove(); return; }
          // 손가락으로 누르기 쉽게 투명한 넓은 영역을 덧붙임
          const [cx, cy] = POS[q.clue];
          const hit = document.createElementNS(ns, 'circle');
          hit.setAttribute('class', 'hit'); hit.setAttribute('cx', cx); hit.setAttribute('cy', cy); hit.setAttribute('r', HIT[q.clue]);
          g.prepend(hit);
          g.setAttribute('tabindex', '0');
          g.setAttribute('role', 'button');
          g.setAttribute('aria-label', `찾을 물건 후보: ${LABEL[q.clue]}`);
          if (api.isDone(q)) markFound(g, q);
          const open = async () => {
            if (busy || api.isDone(q)) return;
            busy = true;
            clearHint();
            svg.querySelectorAll('.clue').forEach(c => c.classList.remove('is-active'));
            g.classList.add('is-active');
            const panel = S.ui.answerPanel(q, async choice => {
              await api.submit(q, choice);
              closeQSheet();
              g.classList.remove('is-active');
              markFound(g, q);
              setCount();
              slot.replaceChildren(hint);
              busy = false;
              if (found() === questions.length) { hint.textContent = '네 가지를 모두 찾았어요.'; await S.wait(500); resolve(); }
            }, { label: `찾은 물건 · ${LABEL[q.clue]}` });
            if (q.clueWhy) panel.insertBefore(el('p', { class: 'clue-why' }, el('span', { class: 'm-icon', html: ICON[q.clue] || '' }), el('span', {}, q.clueWhy)), panel.querySelector('.prompt'));
            if (narrow()) {
              // 그림이 시트 위에 보이도록 먼저 스크롤
              const hudH = ($('.hud') ? $('.hud').getBoundingClientRect().height : 0);
              window.scrollBy({ top: scene.getBoundingClientRect().top - hudH - 6, behavior: 'auto' });
              const back = el('button', { class: 'qsheet-back', type: 'button', 'aria-label': '그림으로 돌아가기' }, '그림 다시 보기');
              qsheet = el('div', { class: 'qsheet', role: 'dialog', 'aria-label': `찾은 물건 · ${LABEL[q.clue]}` }, el('div', { class: 'qsheet-card' }, el('span', { class: 'qsheet-grip', 'aria-hidden': 'true' }), back, panel));
              back.addEventListener('click', () => { closeQSheet(); g.classList.remove('is-active'); S.ui.setKeys(null); busy = false; });
              $('#sheet-root').append(qsheet);
              requestAnimationFrame(() => qsheet && qsheet.classList.add('is-open'));
            } else {
              slot.replaceChildren(panel);
              panel.scrollIntoView({ block: 'nearest', behavior: S.reduced ? 'auto' : 'smooth' });
            }
            const first = panel.querySelector('.choice-btn, .ox-btn');
            if (first) first.focus({ preventScroll: true });
          };
          g.addEventListener('click', open);
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
        });
        hintBtn.addEventListener('click', showHint);
        setCount();
        if (found() === questions.length) resolve();
      });
    },
  });
})();
