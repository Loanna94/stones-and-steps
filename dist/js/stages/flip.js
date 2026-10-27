/*
 * 스테이지 형태: 돌멩이 뒤집기 (flip)
 * 안개 낀 길의 돌멩이를 눌러 뒤집으면 문제가 나온다. 한 문제씩 풀 때마다 안개가 걷히고,
 * 길 끝 표지판의 글씨(트라우마 = 사건 · 경험 · 영향)가 또렷해진다. 푸는 순서는 자유.
 * 아직 안 뒤집은 돌: ‘?’와 짧은 주제어(topic) · 뒤집은 카드: 문제 번호와 질문 요약(gist) · 푼 카드: ✓ 또는 ↺ + 주제어
 */
(function () {
  'use strict';
  const S = window.Stones;
  const { el } = S;

  const STONE = '<svg viewBox="0 0 140 92" aria-hidden="true"><ellipse cx="70" cy="84" rx="58" ry="7" fill="var(--shadow)"/><path d="M10 80 C 9 44, 38 12, 72 12 C 106 12, 132 42, 130 80 Z" fill="var(--stone)" stroke="var(--scene-ink)" stroke-width="4" stroke-linejoin="round"/><circle cx="92" cy="40" r="3.4" fill="var(--scene-ink)"/><circle cx="50" cy="56" r="2.4" fill="var(--scene-ink)" opacity=".55"/></svg>';
  S.stoneSvg = STONE;

  S.registerStage('flip', {
    play(api) {
      const { root, questions } = api;
      const scene = el('div', { class: 'scene scene-flip' });
      const sign = el('div', { class: 'fog-sign', 'aria-hidden': 'true' },
        el('span', { class: 'sign-post' }),
        el('div', { class: 'sign-board' }, el('span', {}, '트라우마 ='), el('strong', {}, '사건 · 경험 · 영향')));
      const row = el('div', { class: 'stone-row' });
      scene.append(
        el('img', { class: 'deco deco-tree-l', src: S.ui.asset('tree'), alt: '' }),
        el('img', { class: 'deco deco-tree-r', src: S.ui.asset('tree'), alt: '' }),
        el('div', { class: 'flip-path' }),
        sign,
        el('div', { class: 'fog' }),
        row);
      const hint = el('p', { class: 'panel-hint' }, '돌멩이를 하나 눌러 보세요. 어떤 순서로 풀어도 괜찮아요.');
      const slot = el('div', { class: 'panel-slot' }, hint);
      root.append(scene, slot);

      const solved = () => questions.filter(q => api.isDone(q)).length;
      const setFog = () => {
        const k = solved() / questions.length;
        scene.style.setProperty('--fog', String(1 - k));
        scene.classList.toggle('is-clear', k === 1);
      };
      const mark = (btn, q) => {
        btn.classList.add('is-flipped', 'is-done');
        btn.classList.remove('is-active');
        const a = S.state.answers[q.id];
        const ok = a && a.correct;
        btn.querySelector('.flip-back').replaceChildren(
          el('span', { class: 'flip-ok' + (ok ? '' : ' is-retry') }, ok ? '✓' : '↺'),
          el('b', { class: 'flip-topic-done' }, q.topic || q.concept || ''),
          el('small', {}, ok ? '맞혔어요' : '해설 봤어요'));
        btn.setAttribute('aria-label', `푼 돌멩이: ${q.topic || q.concept || ''}, ${ok ? '맞혔어요' : '해설 봤어요'}`);
      };

      return new Promise(resolve => {
        let busy = false;
        questions.forEach((q, i) => {
          const btn = el('button', { class: 'flip-stone', type: 'button', 'aria-label': `돌멩이 ${i + 1} 뒤집기: ${q.topic || ''}` },
            el('span', { class: 'flip-inner' },
              el('span', { class: 'flip-front' }, el('span', { class: 'flip-svg', html: STONE }), el('span', { class: 'flip-q', 'aria-hidden': 'true' }, '?')),
              el('span', { class: 'flip-back' }, el('small', { class: 'flip-n' }, `문제 ${i + 1}`), el('b', { class: 'flip-gist' }, q.gist || ''))),
            el('span', { class: 'flip-cap', 'aria-hidden': 'true' }, q.topic || ''));
          if (api.isDone(q)) mark(btn, q);
          btn.addEventListener('click', async () => {
            if (busy || api.isDone(q)) return;
            busy = true;
            row.querySelectorAll('.flip-stone').forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-flipped', 'is-active');
            await S.wait(420);
            const panel = S.ui.answerPanel(q, async choice => {
              await api.submit(q, choice);
              mark(btn, q);
              setFog();
              slot.replaceChildren(hint);
              busy = false;
              if (solved() === questions.length) {
                hint.textContent = '안개가 모두 걷혔어요.';
                await S.wait(700);
                resolve();
              } else {
                const next = row.querySelector('.flip-stone:not(.is-done)');
                if (next) next.focus({ preventScroll: true });
              }
            }, { label: `돌멩이 ${i + 1}` });
            slot.replaceChildren(panel);
            panel.scrollIntoView({ block: 'nearest', behavior: S.reduced ? 'auto' : 'smooth' });
            const first = panel.querySelector('button');
            if (first) first.focus({ preventScroll: true });
          });
          row.append(btn);
        });
        setFog();
        if (solved() === questions.length) resolve();
      });
    },
  });
})();
