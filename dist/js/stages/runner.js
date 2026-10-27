/*
 * 스테이지 형태: O/X 갈림길 달리기 (runner)
 * 하루가 숲길을 달리다가 두 갈래 길의 나무 표지판 앞에서 멈춘다(시간 제한 없음).
 * 표지판 기둥에 왼쪽(O 맞아요)·오른쪽(X 아니에요) 화살표 판이 달려 있고, 고른 길로 하루가 달려간다.
 * 맞히면 그 반응의 이름이 적힌 ‘반응 카드’를 모은다.
 */
(function () {
  'use strict';
  const S = window.Stones;
  const { el } = S;

  const ROAD = `<svg class="road" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
    <path d="M150 300 L178 170 L120 40 L150 40 L200 150 L250 40 L280 40 L222 170 L250 300 Z" fill="var(--path)" />
    <path d="M150 300 L178 170 L120 40 M250 300 L222 170 L280 40 M150 40 L200 150 L250 40" fill="none" stroke="var(--path-edge)" stroke-width="2.5" stroke-linejoin="round"/>
    <path class="dash" d="M200 296 L200 176" fill="none" stroke="var(--path-edge)" stroke-width="3" stroke-dasharray="10 14"/>
  </svg>`;

  S.registerStage('runner', {
    async play(api) {
      const { root, questions } = api;
      const kicker = el('p', { class: 'eyebrow' }, '');
      const text = el('p', { class: 'prompt' }, '');
      const btnO = el('button', { class: 'arrow-sign arrow-o', type: 'button', disabled: true, 'aria-label': 'O 길, 맞아요' }, el('b', {}, 'O'), el('span', {}, '맞아요'));
      const btnX = el('button', { class: 'arrow-sign arrow-x', type: 'button', disabled: true, 'aria-label': 'X 길, 아니에요' }, el('span', {}, '아니에요'), el('b', {}, 'X'));
      const post = el('div', { class: 'signpost', hidden: true },
        el('div', { class: 'sign-plank' }, el('span', { class: 'nail n1' }), el('span', { class: 'nail n2' }), kicker, text),
        el('span', { class: 'sign-pole', 'aria-hidden': 'true' }),
        el('div', { class: 'sign-arrows' }, btnO, btnX));
      const me = el('img', { class: 'runner-me', src: S.ui.asset('me-pack'), alt: '하루' });
      const cards = el('div', { class: 'card-tray', 'aria-label': '모은 반응 카드' });
      const scene = el('div', { class: 'scene scene-runner' },
        el('div', { class: 'road-wrap', html: ROAD }),
        el('img', { class: 'deco deco-tree-l', src: S.ui.asset('tree'), alt: '' }),
        el('img', { class: 'deco deco-tree-r', src: S.ui.asset('fruitTree'), alt: '' }),
        el('img', { class: 'deco deco-grass-l', src: S.ui.asset('grass'), alt: '' }),
        el('img', { class: 'deco deco-grass-r', src: S.ui.asset('smallGrass'), alt: '' }),
        me, post, cards);
      root.append(scene);

      const addCard = q => {
        const a = S.state.answers[q.id];
        cards.append(el('span', { class: 'mini-card' + (a && a.correct ? '' : ' is-learned'), title: q.card }, q.card));
      };
      questions.filter(q => api.isDone(q)).forEach(addCard);

      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        if (api.isDone(q)) continue;
        me.className = 'runner-me';
        post.hidden = true;
        scene.classList.add('is-running');
        await S.wait(1300);
        scene.classList.remove('is-running');
        kicker.textContent = `갈림길 ${qi + 1} / ${questions.length}`;
        text.textContent = q.prompt;
        post.hidden = false;
        btnO.disabled = false; btnX.disabled = false;
        btnO.focus({ preventScroll: true });
        const choice = await new Promise(res => {
          const pick = v => { S.ui.setKeys(null); btnO.onclick = null; btnX.onclick = null; res(v); };
          btnO.onclick = () => pick(true);
          btnX.onclick = () => pick(false);
          S.ui.setKeys(e => {
            const k = e.key.toLowerCase();
            if (k === 'o' || e.key === 'ArrowLeft') { e.preventDefault(); pick(true); }
            if (k === 'x' || e.key === 'ArrowRight') { e.preventDefault(); pick(false); }
          });
        });
        btnO.disabled = true; btnX.disabled = true;
        (choice ? btnO : btnX).classList.add('is-picked');
        me.classList.add(choice ? 'go-o' : 'go-x');
        await S.wait(600);
        const correct = S.isCorrect(q, choice);
        if (!correct) me.classList.add('is-down');
        await api.submit(q, choice);
        me.classList.remove('is-down');
        btnO.classList.remove('is-picked'); btnX.classList.remove('is-picked');
        addCard(q);
      }
      // 숲 끝: 표지판은 내리고 하루는 숲 밖으로
      post.hidden = true;
      me.className = 'runner-me is-out';
      scene.classList.add('is-arrived');
      await S.wait(600);
    },
  });
})();
