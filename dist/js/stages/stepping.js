/*
 * 스테이지 형태: 징검다리 건너기 (stepping)
 * 개울에 디딤돌이 네 줄로 놓여 있고, 아래(출발)에서 위(건너편)로 한 줄씩 건넌다.
 * 지금 건널 줄에만 답이 적힌 디딤돌이 나오고, 앞으로 건널 줄은 흐리게, 건넌 줄은 밟은 돌이 남는다.
 * 정답 돌은 버티고, 오답 돌은 가라앉으며 하루가 제자리로 돌아와 주저앉는다. 해설 뒤 정답 돌로 건넌다.
 * 네 줄을 모두 건너면 건너편에 도착하는 장면이 화면에 남는다.
 */
(function () {
  'use strict';
  const S = window.Stones;
  const { el } = S;

  S.registerStage('stepping', {
    async play(api) {
      const { root, questions } = api;
      const n = questions.length;
      const kicker = el('p', { class: 'eyebrow' }, '');
      const promptText = el('p', { class: 'prompt' }, '');
      const prompt = el('div', { class: 'scene-prompt' }, kicker, promptText);
      const rows = [];
      const rowWrap = el('div', { class: 'cross-rows' });
      for (let r = n - 1; r >= 0; r--) {
        const row = el('div', { class: 'cross-row is-future', 'data-r': r }, el('span', { class: 'row-n', 'aria-hidden': 'true' }, `${r + 1}`), el('div', { class: 'row-stones' }));
        rows[r] = row;
        rowWrap.append(row);
      }
      const banner = el('div', { class: 'cross-banner', hidden: true }, '건너편에 도착!');
      const spot = el('span', { class: 'bank-spot', 'aria-hidden': 'true' });
      const far = el('div', { class: 'cross-bank is-far' },
        el('img', { class: 'deco', src: S.ui.asset('grass'), alt: '' }),
        el('span', { class: 'bank-label' }, '건너편'),
        spot, banner,
        el('img', { class: 'deco', src: S.ui.asset('flowers'), alt: '' }));
      const near = el('div', { class: 'cross-bank is-near' }, el('img', { class: 'deco', src: S.ui.asset('smallGrass'), alt: '' }), el('span', { class: 'bank-start' }, '출발'));
      const me = el('img', { class: 'cross-me', src: S.ui.asset('me-pack'), alt: '하루' });
      const scene = el('div', { class: 'scene scene-cross' }, far, el('div', { class: 'cross-water' }, el('div', { class: 'waves' }), rowWrap), near, me);
      root.append(prompt, scene);

      const decoRow = r => { const box = rows[r].querySelector('.row-stones'); box.replaceChildren(...[0, 1, 2].map(() => el('span', { class: 'step-deco' }))); };
      for (let r = 0; r < n; r++) decoRow(r);

      // 하루를 대상 요소 위로 옮김 (장면 기준 좌표)
      const place = (target, instant = false) => {
        const sr = scene.getBoundingClientRect();
        const tr = target.getBoundingClientRect();
        const x = tr.left - sr.left + tr.width / 2;
        const y = tr.top - sr.top + tr.height * 0.62;
        if (instant) me.style.transition = 'none';
        me.style.left = `${x}px`;
        me.style.top = `${y}px`;
        if (instant) { void me.offsetWidth; me.style.transition = ''; }
      };
      const hop = async target => { me.classList.add('is-hopping'); place(target); await S.wait(520); me.classList.remove('is-hopping'); };
      let standOn = near.querySelector('.bank-start');
      requestAnimationFrame(() => place(standOn, true));
      window.addEventListener('resize', () => place(standOn, true));

      const setSolved = (r, q) => {
        const a = S.state.answers[q.id];
        const label = q.type === 'ox' ? (q.answer ? 'O' : 'X') : q.options[q.answer];
        rows[r].className = 'cross-row is-done';
        rows[r].querySelector('.row-stones').replaceChildren(el('span', { class: 'step-stone is-solid is-past' }, el('span', { class: 'step-mark' }, a && a.correct ? '✓' : '↺'), el('span', { class: 'step-text' }, label)));
        return rows[r].querySelector('.step-stone');
      };

      for (let r = 0; r < n; r++) {
        const q = questions[r];
        if (api.isDone(q)) { standOn = setSolved(r, q); requestAnimationFrame(() => place(standOn, true)); continue; }
        const left = n - r;
        kicker.textContent = `디딤돌 ${r + 1}줄 / ${n}줄 · 건너편까지 ${left}줄 남았어요`;
        promptText.textContent = q.prompt;
        rows.forEach((row, i) => { if (i > r) row.className = 'cross-row is-future'; });
        rows[r].className = 'cross-row is-active';
        const labels = q.type === 'ox' ? [['true', 'O', '맞아요'], ['false', 'X', '아니에요']] : q.options.map((o, i) => [String(i), S.circled(i), o]);
        const box = rows[r].querySelector('.row-stones');
        box.className = 'row-stones' + (labels.length > 2 ? ' is-four' : '');
        box.replaceChildren(...labels.map(([v, mark, text]) =>
          el('button', { class: 'step-stone', type: 'button', 'data-choice': v }, el('span', { class: 'step-mark', 'aria-hidden': 'true' }, mark), el('span', { class: 'step-text' }, text))));
        await S.wait(60);
        place(standOn, true);
        rows[r].scrollIntoView({ block: 'nearest', behavior: S.reduced ? 'auto' : 'smooth' });

        const choice = await new Promise(res => {
          const pick = v => { S.ui.setKeys(null); res(v); };
          box.querySelectorAll('.step-stone').forEach(b => b.addEventListener('click', () => pick(q.type === 'ox' ? b.dataset.choice === 'true' : Number(b.dataset.choice))));
          S.ui.setKeys(e => {
            const k = e.key.toLowerCase();
            if (q.type === 'ox' && (k === 'o' || e.key === 'ArrowLeft')) { e.preventDefault(); pick(true); }
            if (q.type === 'ox' && (k === 'x' || e.key === 'ArrowRight')) { e.preventDefault(); pick(false); }
            const num = parseInt(e.key, 10);
            if (q.type !== 'ox' && num >= 1 && num <= q.options.length) { e.preventDefault(); pick(num - 1); }
          });
          const first = box.querySelector('.step-stone');
          if (first) first.focus({ preventScroll: true });
        });

        box.querySelectorAll('.step-stone').forEach(b => { b.disabled = true; });
        const picked = box.querySelector(`[data-choice="${String(choice)}"]`);
        const right = box.querySelector(`[data-choice="${String(q.answer)}"]`);
        picked.classList.add('is-picked');
        await hop(picked);
        const correct = S.isCorrect(q, choice);
        if (correct) {
          picked.classList.add('is-solid');
          await S.wait(260);
        } else {
          picked.classList.add('is-sink');
          await S.wait(300);
          await hop(standOn);
          me.classList.add('is-down');
          await S.wait(200);
        }
        await api.submit(q, choice);
        if (!correct) {
          me.classList.remove('is-down');
          right.classList.add('is-solid', 'is-reveal');
          await hop(right);
          await S.wait(200);
        }
        standOn = setSolved(r, q);
        place(standOn, true);
      }
      // 건너편 도착
      kicker.textContent = `디딤돌 ${n}줄을 모두 건넜어요`;
      promptText.textContent = '하루가 개울 건너편에 도착했어요.';
      scene.classList.add('is-arrived');
      banner.hidden = false;
      await hop(spot);
      standOn = spot;
      await S.wait(500);
    },
  });
})();
