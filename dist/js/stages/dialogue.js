/*
 * 스테이지 형태: 친구와 대화하기 (dialogue)
 * 힘들어하는 상대의 말풍선(say)이 나오고, 내가 할 말을 고른다.
 * 맞히면 상대의 표정이 조금씩 편안해진다(주저앉음 → 돌에 기대 앉음 → 편안한 얼굴).
 *
 * 퀴즈 여정(A안): 고른 답으로 채점하고 다음 말로 넘어간다.
 * 동행 여정(B안): stage.retry가 true면, 상대가 움츠러든 뒤 다시 고를 수 있다(점수 없음).
 *
 * 문항 칸: say, options / replies(O·X), replyTemplate, good, bad 또는 bads[i], why[i](보기별 해설)
 * 스테이지 칸: who(상대 이름), opener(첫 말), endLine(마지막 말), feedback{good,bad}, retry
 */
(function () {
  'use strict';
  const S = window.Stones;
  const { el } = S;

  const MOODS = [
    { img: 'me-sit', label: '많이 힘들어 보여요' },
    { img: 'friend-stone', label: '조금 기대어 쉬고 있어요' },
    { img: 'friend-calm', label: '마음이 한결 편안해 보여요' },
  ];

  S.registerStage('dialogue', {
    async play(api) {
      const { root, questions, stage } = api;
      const who = stage.who || '친구';
      // 표정은 두 장을 겹쳐 두고 천천히 바꿈(갑자기 바뀌는 느낌 줄이기)
      const imgs = [el('img', { class: 'friend-img is-on is-me-sit', src: S.ui.asset('me-sit'), alt: '' }), el('img', { class: 'friend-img', alt: '' })];
      let front = 0;
      let moodNow = 'me-sit';
      const friendImg = { classList: { add: c => imgs[front].classList.add(c), remove: c => imgs[front].classList.remove(c) } };
      const mood = el('p', { class: 'friend-mood' }, '');
      const log = el('div', { class: 'talk-log', role: 'log', 'aria-live': 'polite' });
      // 대화가 길어지면 최신 말풍선이 보이게 자동으로 내려감. 위로 올려 읽는 중이면 ‘새 말풍선 ↓’ 버튼만 띄움
      const newBtn = el('button', { class: 'talk-new', type: 'button', hidden: true }, '새 말풍선 ↓');
      let stick = true;
      const nearBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 40;
      const toBottom = smooth => { log.scrollTo({ top: log.scrollHeight, behavior: smooth && !S.reduced ? 'smooth' : 'auto' }); newBtn.hidden = true; stick = true; };
      log.addEventListener('scroll', () => { stick = nearBottom(); if (stick) newBtn.hidden = true; }, { passive: true });
      newBtn.addEventListener('click', () => toBottom(true));
      const replies = el('div', { class: 'reply-list' });
      const scene = el('div', { class: 'scene scene-talk' },
        el('div', { class: 'talk-friend' },
          el('img', { class: 'deco deco-tree-l', src: S.ui.asset('tree'), alt: '' }),
          el('img', { class: 'deco deco-grass', src: S.ui.asset('flowerPatch'), alt: '' }),
          imgs[0], imgs[1], mood),
        el('div', { class: 'talk-log-wrap' }, log, newBtn));
      const replyHead = el('p', { class: 'eyebrow' }, '내가 할 말 고르기');
      root.append(scene, el('div', { class: 'reply-wrap' }, replyHead, replies));

      const goodCount = () => questions.filter(q => S.state.answers[q.id] && (S.state.answers[q.id].correct || stage.retry)).length;
      const setMood = final => {
        const g = goodCount();
        const m = final ? MOODS[2] : MOODS[g >= 3 ? 2 : g >= 1 ? 1 : 0];
        mood.replaceChildren(el('span', { class: 'fm-who' }, `${S.josa(who, '은', '는')} 지금`), ' ', el('b', {}, m.label));
        if (m.img === moodNow) return;
        moodNow = m.img;
        const back = 1 - front;
        imgs[back].src = S.ui.asset(m.img);
        imgs[back].className = 'friend-img is-' + m.img;
        requestAnimationFrame(() => { imgs[back].classList.add('is-on'); imgs[front].classList.remove('is-on'); front = back; });
      };
      const say = async (side, text) => {
        const b = el('p', { class: `bubble bubble-${side}` }, text);
        const follow = stick || nearBottom();
        log.append(b);
        const all = log.querySelectorAll('.bubble');
        all.forEach((x, i) => x.classList.toggle('is-old', i < all.length - 2));
        if (follow) toBottom(true); else newBtn.hidden = false;
        await S.wait(side === 'friend' ? 420 : 260);
        return b;
      };
      const ask = (q, opts, exclude) => new Promise(res => {
        replies.replaceChildren(...opts.filter(o => !exclude.has(String(o[0]))).map(([v, mark, text]) =>
          el('button', { class: 'reply-btn', type: 'button', 'data-choice': String(v) }, el('span', { class: 'reply-mark', 'aria-hidden': 'true' }, mark), el('span', {}, text))));
        replyHead.textContent = q.type === 'ox' ? '내가 할 말 고르기 · O 맞아 / X 아니야' : (exclude.size ? '다시 골라 보기' : '내가 할 말 고르기');
        const first = replies.querySelector('button');
        if (first) first.focus({ preventScroll: true });
        const pick = v => { S.ui.setKeys(null); res(v); };
        replies.querySelectorAll('.reply-btn').forEach(b => b.addEventListener('click', () => pick(q.type === 'ox' ? b.dataset.choice === 'true' : Number(b.dataset.choice))));
        S.ui.setKeys(e => {
          const k = e.key.toLowerCase();
          if (q.type === 'ox' && (k === 'o' || e.key === 'ArrowLeft')) { e.preventDefault(); pick(true); }
          if (q.type === 'ox' && (k === 'x' || e.key === 'ArrowRight')) { e.preventDefault(); pick(false); }
          const n = parseInt(e.key, 10);
          if (q.type !== 'ox' && n >= 1 && n <= q.options.length && !exclude.has(String(n - 1))) { e.preventDefault(); pick(n - 1); }
        });
      });

      setMood(false);
      if (!questions.some(q => api.isDone(q))) await say('friend', stage.opener || '…');

      for (const q of questions) {
        if (api.isDone(q)) continue;
        await say('friend', q.say || q.prompt);
        const opts = q.type === 'ox'
          ? [[true, 'O', (q.replies && q.replies.o) || '맞아.'], [false, 'X', (q.replies && q.replies.x) || '아니야.']]
          : q.options.map((o, i) => [i, S.circled(i), o]);
        const tried = new Set();
        for (;;) {
          const choice = await ask(q, opts, tried);
          replies.querySelectorAll('button').forEach(b => { b.disabled = true; });
          const text = q.type === 'ox'
            ? opts.find(o => o[0] === choice)[2]
            : (q.replyTemplate ? q.replyTemplate.replace('{opt}', q.options[choice]) : q.options[choice]);
          await say('me', text);
          replies.replaceChildren();
          const correct = S.isCorrect(q, choice);
          const back = correct ? (q.good || '…고마워.') : ((q.bads && q.bads[choice]) || q.bad || '…그런가.');
          await say('friend', back);
          if (!correct && stage.retry) friendImg.classList.add('is-shrink');
          await api.submit(q, choice, { feedback: stage.feedback, retry: stage.retry && !correct });
          friendImg.classList.remove('is-shrink');
          if (correct || !stage.retry) break;
          tried.add(String(choice));
        }
        setMood(false);
      }
      setMood(true);
      replyHead.textContent = '대화를 마쳤어요';
      await say('friend', stage.endLine || '들어줘서 고마워. 다음엔 내가 들어줄게.');
      await S.wait(600);
    },
  });
})();
