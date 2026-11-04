(function () {
  'use strict';

  var S = window.MonetkaStore;
  var CATS = S.CATEGORIES;
  var fmt = S.fmt;

  var today = new Date();
  var monthKey = S.toKey(today).slice(0, 7);
  var entries = S.load();
  var limits = S.loadLimits();
  var goals = S.loadGoals();

  var $ = function (id) { return document.getElementById(id); };

  function digits(input) {
    input.value = input.value.split('').filter(function (ch) { return '0123456789'.includes(ch); }).join('').slice(0, 7);
  }

  var toast = $('toast');
  var toastTimer;
  var toastRun = null;

  function showToast(text, label, run) {
    clearTimeout(toastTimer);
    $('toast-text').textContent = text;
    $('toast-action').textContent = label || '';
    $('toast-action').hidden = !label;
    toastRun = run || null;
    toast.hidden = false;
    toastTimer = setTimeout(hideToast, 7000);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    toast.hidden = true;
    toastRun = null;
  }

  $('toast-action').addEventListener('click', function () {
    if (toastRun) toastRun();
    hideToast();
  });

  function spentThisMonth() {
    var spent = {};
    entries.forEach(function (e) {
      if (e.amt < 0 && e.date.slice(0, 7) === monthKey) spent[e.cat] = (spent[e.cat] || 0) - e.amt;
    });
    return spent;
  }

  function renderLimits() {
    var spent = spentThisMonth();
    var list = $('limits');
    list.textContent = '';
    $('limits-month').textContent = S.MONTHS[today.getMonth()].toLowerCase();

    S.ORDER.exp.forEach(function (id) {
      var row = $('tpl-limit').content.firstElementChild.cloneNode(true);
      var v = spent[id] || 0;
      var limit = limits[id];
      var over = limit && v > limit;

      row.id = 'limit-' + id;
      row.querySelector('.swatch').classList.add('cat--' + id);
      row.querySelector('.limits__cat').textContent = CATS[id].name;

      var meter = row.querySelector('.meter');
      var note = row.querySelector('.limits__note');
      if (limit) {
        var fill = meter.querySelector('.meter__fill');
        fill.style.width = Math.min(100, Math.round(v / limit * 100)) + '%';
        fill.classList.toggle('meter__fill--over', over);
        note.textContent = over
          ? 'Превышен на ' + fmt(v - limit) + ' ₽ (лимит ' + fmt(limit) + ' ₽)'
          : fmt(v) + ' из ' + fmt(limit) + ' ₽';
        note.classList.toggle('limits__note--over', over);
      } else {
        meter.hidden = true;
        note.textContent = 'Лимит не задан, потрачено ' + fmt(v) + ' ₽';
      }

      var input = row.querySelector('.limits__input');
      var label = row.querySelector('.limits__label');
      input.id = 'limit-input-' + id;
      label.htmlFor = input.id;
      label.textContent = 'Лимит на месяц для категории «' + CATS[id].name + '», ₽';
      input.value = limit || '';
      input.addEventListener('input', function () { digits(input); });

      row.querySelector('.limits__form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var n = parseInt(input.value, 10);
        if (n) {
          limits[id] = n;
          showToast('Лимит сохранён: ' + CATS[id].name + ', ' + fmt(n) + ' ₽');
        } else {
          delete limits[id];
          showToast('Лимит для категории «' + CATS[id].name + '» убран.');
        }
        S.saveLimits(limits);
        renderLimits();
        $('limit-input-' + id).focus();
      });

      list.appendChild(row);
    });
  }

  function commitGoals(next) {
    goals = next;
    S.saveGoals(goals);
    renderGoals();
  }

  function renderGoals() {
    var box = $('goals');
    box.textContent = '';
    goals.forEach(function (g) {
      var card = $('tpl-goal').content.firstElementChild.cloneNode(true);
      var done = g.saved >= g.target;
      card.querySelector('.goal__name').textContent = g.name;
      card.querySelector('.goal__sum').textContent = fmt(g.saved) + ' из ' + fmt(g.target) + ' ₽';
      card.querySelector('.meter__fill').style.width = Math.min(100, Math.round(g.saved / g.target * 100)) + '%';
      card.querySelector('.goal__rest').textContent = done
        ? 'Цель достигнута'
        : 'Осталось ' + fmt(g.target - g.saved) + ' ₽, это ' + Math.round(g.saved / g.target * 100) + '% пути';

      var del = card.querySelector('.goal__delete');
      del.setAttribute('aria-label', 'Удалить цель: ' + g.name);
      del.addEventListener('click', function () {
        var idx = goals.indexOf(g);
        commitGoals(goals.filter(function (x) { return x !== g; }));
        showToast('Цель удалена.', 'Вернуть', function () {
          var back = goals.slice();
          back.splice(idx, 0, g);
          commitGoals(back);
        });
      });

      var input = card.querySelector('.goal__input');
      var label = card.querySelector('.goal__label');
      input.id = 'goal-input-' + g.id;
      label.htmlFor = input.id;
      label.textContent = 'Пополнить цель «' + g.name + '», ₽';
      input.addEventListener('input', function () { digits(input); });
      card.querySelector('.goal__form').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var n = parseInt(input.value, 10);
        if (!n) {
          input.focus();
          return;
        }
        g.saved += n;
        commitGoals(goals);
        showToast('Цель «' + g.name + '» пополнена на ' + fmt(n) + ' ₽', 'Отменить', function () {
          g.saved -= n;
          commitGoals(goals);
        });
      });

      box.appendChild(card);
    });
  }

  var nameInput = $('goal-name');
  var targetInput = $('goal-target');

  function setFieldError(input, errId, text) {
    $(errId).textContent = text;
    input.classList.toggle('input--error', !!text);
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  targetInput.addEventListener('input', function () {
    digits(targetInput);
    setFieldError(targetInput, 'goal-target-err', '');
  });
  nameInput.addEventListener('input', function () {
    setFieldError(nameInput, 'goal-name-err', '');
  });

  $('goal-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var name = nameInput.value.trim();
    var target = parseInt(targetInput.value, 10);
    setFieldError(nameInput, 'goal-name-err', name ? '' : 'Введи название');
    setFieldError(targetInput, 'goal-target-err', target ? '' : 'Введи сумму больше нуля');
    if (!name || !target) {
      (name ? targetInput : nameInput).focus();
      return;
    }
    commitGoals(goals.concat({ id: 'g' + Date.now(), name: name, target: target, saved: 0 }));
    nameInput.value = '';
    targetInput.value = '';
    showToast('Цель добавлена: ' + name);
  });

  renderLimits();
  renderGoals();

  var hash = location.hash;
  var target = hash.slice(0, 7) === '#limit-' ? $('limit-input-' + hash.slice(7)) : null;
  if (target) {
    // При переходе по якорю браузер сам сбрасывает фокус, поэтому ставим его после загрузки
    window.addEventListener('load', function () {
      setTimeout(function () { target.focus(); }, 0);
    });
  }
})();
