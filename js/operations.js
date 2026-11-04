(function () {
  'use strict';

  var S = window.MonetkaStore;
  var CATS = S.CATEGORIES;
  var fmt = S.fmt;

  var today = new Date();
  var todayKey = S.toKey(today);
  var state = {
    entries: S.load(),
    month: new Date(today.getFullYear(), today.getMonth(), 1),
    type: 'exp',
    cat: 'cafe',
    date: todayKey,
    filter: 'all',
    q: ''
  };

  var params = new URLSearchParams(location.search);

  function isDigits(str) {
    return str.length > 0 && !str.split('').some(function (ch) { return !'0123456789'.includes(ch); });
  }

  var monthParts = (params.get('month') || '').split('-');
  if (monthParts.length === 2 && monthParts[0].length === 4 && monthParts[1].length === 2 &&
      isDigits(monthParts[0]) && isDigits(monthParts[1])) {
    state.month = S.fromKey(params.get('month') + '-01');
  }
  state.q = params.get('q') || '';

  var $ = function (id) { return document.getElementById(id); };
  var form = $('op-form');
  var amountInput = $('op-amount');
  var amountErr = $('op-amount-err');
  var noteInput = $('op-note');
  var dateInput = $('op-date');
  var dateErr = $('op-date-err');
  var searchInput = $('op-search');
  var catsBox = $('op-cats');
  var daysBox = $('op-days');
  var tplCat = $('tpl-cat');
  var tplDay = $('tpl-day');
  var tplRow = $('tpl-row');

  function catClass(id) {
    return CATS[id].type === 'inc' ? 'cat--inc' : 'cat--' + id;
  }

  function signed(amt) {
    return (amt > 0 ? '+' : '−') + fmt(Math.abs(amt)) + ' ₽';
  }

  function sameDay(a, b) {
    return S.toKey(a) === S.toKey(b);
  }

  function dayLabel(key) {
    var d = S.fromKey(key);
    var dm = d.getDate() + ' ' + S.MONTHS_GEN[d.getMonth()];
    if (sameDay(d, today)) return 'Сегодня, ' + dm;
    if (sameDay(d, S.addDays(today, -1))) return 'Вчера, ' + dm;
    return dm + ', ' + S.WEEKDAYS[d.getDay()];
  }

  function shortDay(d) {
    return d.getDate() + ' ' + S.MONTHS_SHORT[d.getMonth()];
  }

  function monthKey(d) {
    return S.toKey(d).slice(0, 7);
  }

  function setPressed(buttons, isOn, onClass) {
    buttons.forEach(function (b) {
      var on = isOn(b);
      b.classList.toggle(onClass, on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  var toast = $('toast');
  var toastTimer;
  var toastRun = null;

  function showToast(text, label, run) {
    clearTimeout(toastTimer);
    $('toast-text').textContent = text;
    $('toast-action').textContent = label;
    toastRun = run;
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

  function commit(entries) {
    state.entries = entries;
    S.save(entries);
    render();
  }

  function removeEntry(entry) {
    var idx = state.entries.indexOf(entry);
    commit(state.entries.filter(function (x) { return x !== entry; }));
    showToast('Запись удалена.', 'Вернуть', function () {
      var back = state.entries.slice();
      back.splice(idx, 0, entry);
      commit(back);
    });
  }

  function renderForm() {
    setPressed(form.querySelectorAll('[data-type]'), function (b) { return b.dataset.type === state.type; }, 'segmented__btn--on');
    setPressed(form.querySelectorAll('[data-day]'), function (b) { return S.toKey(S.addDays(today, +b.dataset.day)) === state.date; }, 'chip--on');
    dateInput.value = state.date;
    $('op-submit').textContent = state.type === 'exp' ? 'Записать расход' : 'Записать доход';

    catsBox.textContent = '';
    S.ORDER[state.type].forEach(function (id) {
      var chip = tplCat.content.firstElementChild.cloneNode(true);
      var on = id === state.cat;
      chip.classList.add(catClass(id));
      chip.classList.toggle('chip--on', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      chip.querySelector('.chip__name').textContent = CATS[id].name;
      chip.addEventListener('click', function () {
        state.cat = id;
        renderForm();
      });
      catsBox.appendChild(chip);
    });
  }

  function renderSummary(monthEntries) {
    var inc = 0, exp = 0;
    monthEntries.forEach(function (e) {
      if (e.amt > 0) inc += e.amt; else exp -= e.amt;
    });
    $('sum-inc').textContent = '+' + fmt(inc) + ' ₽';
    $('sum-exp').textContent = '−' + fmt(exp) + ' ₽';
    $('sum-rest').textContent = (inc - exp < 0 ? '−' : '') + fmt(Math.abs(inc - exp)) + ' ₽';
  }

  function renderList(monthEntries) {
    var q = state.q.trim().toLowerCase();
    var visible = monthEntries.filter(function (e) {
      if (state.filter === 'exp' && e.amt > 0) return false;
      if (state.filter === 'inc' && e.amt < 0) return false;
      if (q && (e.note + ' ' + CATS[e.cat].name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    var days = [];
    visible.forEach(function (e) {
      if (days.indexOf(e.date) === -1) days.push(e.date);
    });
    days.sort().reverse();

    daysBox.textContent = '';
    days.forEach(function (key) {
      var rows = visible.filter(function (e) { return e.date === key; });
      var got = 0, spent = 0;
      rows.forEach(function (e) {
        if (e.amt > 0) got += e.amt; else spent -= e.amt;
      });
      var parts = [];
      if (got) parts.push('+' + fmt(got) + ' ₽');
      if (spent) parts.push('−' + fmt(spent) + ' ₽');

      var day = tplDay.content.firstElementChild.cloneNode(true);
      day.querySelector('.op-day__title').textContent = dayLabel(key);
      day.querySelector('.op-day__total').textContent = parts.join(' / ');
      var list = day.querySelector('.op-day__list');

      rows.forEach(function (e) {
        var c = CATS[e.cat];
        var row = tplRow.content.firstElementChild.cloneNode(true);
        row.querySelector('.swatch').classList.add(catClass(e.cat));
        row.querySelector('.op-row__title').textContent = e.note || c.name;
        row.querySelector('.op-row__sub').textContent = e.note ? c.name : (e.amt > 0 ? 'Доход' : 'Расход');
        var amount = row.querySelector('.op-row__amount');
        amount.textContent = signed(e.amt);
        amount.classList.toggle('op-row__amount--income', e.amt > 0);
        var del = row.querySelector('.icon-btn');
        del.setAttribute('aria-label', 'Удалить запись: ' + (e.note || c.name));
        del.addEventListener('click', function () { removeEntry(e); });
        list.appendChild(row);
      });
      daysBox.appendChild(day);
    });

    var monthEmpty = monthEntries.length === 0;
    $('op-empty').hidden = days.length > 0;
    $('op-empty-text').textContent = monthEmpty
      ? 'В этом месяце записей пока нет.'
      : 'Ничего не нашлось. Проверь написание или сбрось фильтры.';
    $('op-reset').hidden = monthEmpty;
  }

  function render() {
    var mk = monthKey(state.month);
    var monthEntries = state.entries.filter(function (e) { return e.date.slice(0, 7) === mk; });

    $('month-label').textContent = S.MONTHS[state.month.getMonth()] + ' ' + state.month.getFullYear();
    $('demo-note').hidden = !S.hasDemo(state.entries);
    $('month-next').disabled = state.month.getTime() >= new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    setPressed(document.querySelectorAll('[data-filter]'), function (b) { return b.dataset.filter === state.filter; }, 'segmented__btn--on');
    if (searchInput.value !== state.q) searchInput.value = state.q;

    renderSummary(monthEntries);
    renderList(monthEntries);
  }

  $('day-today').textContent = 'Сегодня, ' + shortDay(today);
  $('day-yest').textContent = 'Вчера, ' + shortDay(S.addDays(today, -1));

  form.querySelectorAll('[data-type]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (state.type === b.dataset.type) return;
      state.type = b.dataset.type;
      state.cat = state.type === 'exp' ? 'cafe' : 'stip';
      renderForm();
    });
  });

  dateInput.max = todayKey;

  function dateError(key) {
    if (!key) return 'Выбери дату';
    if (key > todayKey) return 'Нельзя записать на будущую дату';
    return '';
  }

  form.querySelectorAll('[data-day]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.date = S.toKey(S.addDays(today, +b.dataset.day));
      setDateError('');
      renderForm();
    });
  });

  dateInput.addEventListener('change', function () {
    state.date = dateInput.value;
    setDateError(dateError(state.date));
    renderForm();
  });

  function setError(text) {
    amountErr.textContent = text;
    amountInput.classList.toggle('field__input--error', !!text);
    amountInput.setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  function setDateError(text) {
    dateErr.textContent = text;
    dateInput.classList.toggle('input--error', !!text);
    dateInput.setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  amountInput.addEventListener('input', function () {
    amountInput.value = amountInput.value.split('').filter(function (ch) { return '0123456789'.includes(ch); }).join('').slice(0, 7);
    setError('');
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var n = parseInt(amountInput.value, 10);
    var dErr = dateError(state.date);
    setError(n ? '' : 'Введи сумму больше нуля');
    setDateError(dErr);
    if (!n || dErr) {
      (n ? dateInput : amountInput).focus();
      return;
    }
    var date = S.fromKey(state.date);
    var entry = {
      id: 'n' + Date.now(),
      date: state.date,
      cat: state.cat,
      note: noteInput.value.trim(),
      amt: state.type === 'exp' ? -n : n
    };
    amountInput.value = '';
    noteInput.value = '';
    state.filter = 'all';
    state.q = '';
    state.month = new Date(date.getFullYear(), date.getMonth(), 1);
    commit([entry].concat(state.entries));
    showToast(
      (state.type === 'exp' ? 'Расход записан: ' : 'Доход записан: ') + fmt(n) + ' ₽, ' + CATS[state.cat].name,
      'Отменить',
      function () {
        commit(state.entries.filter(function (x) { return x !== entry; }));
      }
    );
  });

  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.filter = b.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener('input', function () {
    state.q = searchInput.value;
    render();
  });

  $('op-reset').addEventListener('click', function () {
    state.filter = 'all';
    state.q = '';
    render();
  });

  function shiftMonth(n) {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + n, 1);
    render();
  }

  $('demo-clear').addEventListener('click', function () {
    var snapshot = S.removeDemo();
    state.entries = S.load();
    state.month = new Date(today.getFullYear(), today.getMonth(), 1);
    state.filter = 'all';
    state.q = '';
    render();
    amountInput.focus();
    showToast('Пример убран. Записывай свои траты', 'Вернуть', function () {
      S.restoreDemo(snapshot);
      state.entries = S.load();
      render();
      $('demo-clear').focus();
    });
  });

  $('month-prev').addEventListener('click', function () { shiftMonth(-1); });
  $('month-next').addEventListener('click', function () { shiftMonth(1); });

  function csvCell(v) {
    v = String(v);
    // По правилам CSV такую ячейку берут в кавычки, а кавычки внутри удваивают
    var special = v.includes('"') || v.includes(';') || v.includes('\n');
    return special ? '"' + v.split('"').join('""') + '"' : v;
  }

  $('export-csv').addEventListener('click', function () {
    var lines = [['Дата', 'Тип', 'Категория', 'Комментарий', 'Сумма']];
    state.entries.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    }).forEach(function (e) {
      lines.push([e.date, e.amt > 0 ? 'Доход' : 'Расход', CATS[e.cat].name, e.note, e.amt]);
    });
    var csv = '﻿' + lines.map(function (l) { return l.map(csvCell).join(';'); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url;
    link.download = 'monetka-operations.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });

  renderForm();
  render();
})();
