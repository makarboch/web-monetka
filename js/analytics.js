(function () {
  'use strict';

  var S = window.MonetkaStore;
  var CATS = S.CATEGORIES;
  var fmt = S.fmt;

  var today = new Date();
  var thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  var entries = S.load();
  var limits = S.loadLimits();
  var state = { month: thisMonth, period: 'month' };

  var $ = function (id) { return document.getElementById(id); };

  var ICONS = {
    warning: { label: 'Превышение', paths: '<path d="M14 4 L26 24 H2 Z"></path><path d="M14 11 V17"></path><path d="M14 20 V21"></path>' },
    attention: { label: 'Внимание', paths: '<circle cx="14" cy="14" r="11"></circle><path d="M14 8 V15"></path><path d="M14 19 V20"></path>' },
    good: { label: 'Хорошо', paths: '<path d="M4 15 L11 22 L24 6"></path>' },
    tip: { label: 'Совет', paths: '<path d="M3 14 H25"></path><path d="M14 3 V25"></path>' }
  };
  var ICON_CLASS = { warning: 'insights__icon--warning', attention: 'insights__icon--info', good: 'insights__icon--good', tip: 'insights__icon--info' };

  var ONE_OFF_MIN = 3000;
  var ONE_OFF_CATS = ['home'];

  var FORECAST_FROM_DAY = 7;

  var SPENT_ON = {
    food: 'на продукты', cafe: 'на кафе', home: 'на жильё и связь', fun: 'на развлечения',
    trans: 'на транспорт', study: 'на учёбу', subs: 'на подписки', other: 'из категории «Другое»'
  };

  function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }

  // Нулевой день следующего месяца — это последний день текущего
  function daysIn(month) {
    return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  }

  function isCurrent(month) {
    return month.getTime() === thisMonth.getTime();
  }

  function daysPassed(month) {
    return isCurrent(month) ? today.getDate() : daysIn(month);
  }

  function totals(from, count, maxDay) {
    var t = { inc: 0, exp: 0, cats: {}, count: 0 };
    var keys = [];
    for (var i = 0; i < count; i++) keys.push(S.toKey(addMonths(from, i)).slice(0, 7));
    entries.forEach(function (e) {
      if (keys.indexOf(e.date.slice(0, 7)) === -1) return;
      if (maxDay && +e.date.slice(8) > maxDay) return;
      t.count++;
      if (e.amt > 0) {
        t.inc += e.amt;
      } else {
        t.exp -= e.amt;
        t.cats[e.cat] = (t.cats[e.cat] || 0) - e.amt;
      }
    });
    return t;
  }

  function pct(part, whole) {
    return whole ? Math.round(part / whole * 100) : 0;
  }

  function compare(now, before, monthPrep) {
    if (now === before) return 'столько же, сколько в ' + monthPrep;
    return 'на ' + fmt(Math.abs(now - before)) + ' ₽ ' + (now > before ? 'больше' : 'меньше') + ', чем в ' + monthPrep;
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function opsLink(cat, month) {
    return 'operations.html?month=' + S.toKey(month).slice(0, 7) + '&q=' + encodeURIComponent(CATS[cat].name);
  }

  function setText(id, text) {
    $(id).textContent = text;
  }

  function renderRibbon(rows, total, label) {
    var ribbon = $('ribbon');
    ribbon.textContent = '';
    rows.forEach(function (r) {
      if (!r.v) return;
      var share = r.v / total * 100;
      var seg = document.createElement('div');
      seg.className = 'ribbon__segment cat--' + r.id;
      seg.style.width = share.toFixed(2) + '%';
      if (share >= 5) {
        var span = document.createElement('span');
        span.className = 'ribbon__share' + (share < 12 ? ' ribbon__share--small' : '');
        span.textContent = Math.round(share) + '%';
        seg.appendChild(span);
      }
      ribbon.appendChild(seg);
    });
    ribbon.setAttribute('aria-label', label + rows.filter(function (r) { return r.v; }).map(function (r) {
      return CATS[r.id].name + ' ' + pct(r.v, total) + '%';
    }).join(', '));
  }

  function renderTable(rows, total, prevPrep, withCompare) {
    var body = $('cat-rows');
    body.textContent = '';
    rows.forEach(function (r) {
      var tr = $('tpl-cat-row').content.firstElementChild.cloneNode(true);
      tr.querySelector('.swatch').classList.add('cat--' + r.id);
      tr.querySelector('.cat-table__cat').textContent = CATS[r.id].name;
      tr.querySelector('.cat-table__sum').textContent = fmt(r.v) + ' ₽';
      tr.querySelector('.cat-table__share').textContent = pct(r.v, total) + '%';
      tr.querySelectorAll('[data-month-only]').forEach(function (td) { td.hidden = !withCompare; });

      if (withCompare) {
        var delta = tr.querySelector('.cat-table__delta');
        var d = r.v - r.prev;
        if (d === 0) {
          delta.textContent = 'без изменений';
          delta.classList.add('cat-table__delta--same');
        } else {
          var p = r.prev ? ' (' + (d > 0 ? '+' : '−') + pct(Math.abs(d), r.prev) + '%)' : '';
          delta.textContent = (d > 0 ? '↑ +' : '↓ −') + fmt(Math.abs(d)) + ' ₽' + p;
          delta.classList.add(d > 0 ? 'cat-table__delta--up' : 'cat-table__delta--down');
        }

        var cell = tr.querySelector('.cat-table__limit-cell');
        var limit = limits[r.id];
        if (limit) {
          var over = r.v > limit;
          var meter = document.createElement('div');
          meter.className = 'meter';
          meter.setAttribute('aria-hidden', 'true');
          var fill = document.createElement('div');
          fill.className = 'meter__fill' + (over ? ' meter__fill--over' : '');
          fill.style.width = Math.min(100, pct(r.v, limit)) + '%';
          meter.appendChild(fill);
          var note = document.createElement('span');
          note.className = 'cat-table__limit-note' + (over ? ' cat-table__limit-note--over' : '');
          note.textContent = over
            ? 'Превышен на ' + fmt(r.v - limit) + ' ₽ (лимит ' + fmt(limit) + ' ₽)'
            : fmt(r.v) + ' из ' + fmt(limit) + ' ₽';
          cell.appendChild(meter);
          cell.appendChild(note);
        } else {
          var a = document.createElement('a');
          a.className = 'link-action cat-table__set-limit';
          a.href = 'budgets.html#limit-' + r.id;
          a.textContent = 'Задать лимит';
          cell.appendChild(a);
        }
      }
      body.appendChild(tr);
    });
  }

  function addTip(list, kind, strong, rest, link) {
    var li = $('tpl-tip').content.firstElementChild.cloneNode(true);
    var icon = li.querySelector('.insights__icon');
    icon.classList.add(ICON_CLASS[kind]);
    icon.setAttribute('aria-label', ICONS[kind].label);
    icon.innerHTML = ICONS[kind].paths;
    li.querySelector('strong').textContent = strong;
    if (rest) li.querySelector('.insights__text').appendChild(document.createTextNode(' ' + rest));
    var a = li.querySelector('.insights__link');
    if (link) {
      a.href = link.href;
      a.textContent = link.text;
    } else {
      a.remove();
    }
    list.appendChild(li);
  }

  function renderTips(rows, now, prev, month, prevPrep, prevFull) {
    var list = $('tips-list');
    list.textContent = '';

    rows.forEach(function (r) {
      var limit = limits[r.id];
      if (!limit || r.v <= limit) return;
      addTip(list, 'warning',
        CATS[r.id].name + ': лимит ' + fmt(limit) + ' ₽ превышен на ' + fmt(r.v - limit) + ' ₽.',
        r.prev ? 'В ' + prevPrep + ' на это ушло ' + fmt(r.prev) + ' ₽.' : '',
        { href: opsLink(r.id, month), text: 'Показать траты ' + SPENT_ON[r.id] });
    });

    if (isCurrent(month)) {
      var near = rows.filter(function (r) {
        return limits[r.id] && r.v <= limits[r.id] && r.v >= limits[r.id] * 0.9;
      })[0];
      if (near) {
        var left = daysIn(month) - today.getDate();
        var head = CATS[near.id].name + ': ' + fmt(near.v) + ' из ' + fmt(limits[near.id]) + ' ₽';
        addTip(list, 'attention',
          left ? head + ',' : head + '.',
          left ? 'а до конца месяца ещё ' + left + ' ' + plural(left, 'день', 'дня', 'дней') + '.' : '',
          { href: 'budgets.html#limit-' + near.id, text: 'Изменить лимит' });
      }
    }

    var best = null;
    rows.forEach(function (r) {
      if (r.prev - r.v > 0 && (!best || r.prev - r.v > best.prev - best.v)) best = r;
    });
    if (best) {
      addTip(list, 'good',
        CATS[best.id].name + ': на ' + fmt(best.prev - best.v) + ' ₽ меньше, чем в ' + prevPrep + '.',
        now.exp < prev.exp ? (isCurrent(month) ? 'Именно поэтому месяц пока идёт дешевле.' : 'Именно поэтому месяц вышел дешевле.') : '', null);
    }

    var subs = now.cats.subs || 0;
    if (isCurrent(month)) subs = Math.max(subs, prevFull.cats.subs || 0);
    if (subs) {
      addTip(list, 'tip',
        'Подписки: ' + fmt(subs) + ' ₽ в месяц, это ' + fmt(subs * 12) + ' ₽ в год.',
        'Проверь, всеми ли ты пользуешься.',
        { href: opsLink('subs', month), text: 'Открыть подписки' });
    }

    $('tips').hidden = list.children.length === 0;
  }

  function renderForecast(now, prev, month) {
    var show = isCurrent(month) && now.exp > 0;
    $('forecast').hidden = !show;
    if (!show) return;

    var days = daysIn(month), passed = today.getDate();
    var early = passed < FORECAST_FROM_DAY;
    $('fc-value').hidden = early;
    $('fc-meters').hidden = early;
    if (early) {
      setText('fc-label', 'Прогноз появится ' + FORECAST_FROM_DAY + ' ' + S.MONTHS_GEN[month.getMonth()]
        + ': за ' + passed + ' ' + plural(passed, 'день', 'дня', 'дней') + ' трат слишком мало, чтобы судить о целом месяце.');
      $('fc-note').hidden = true;
      $('fc-text').hidden = true;
      return;
    }

    var prevMonth = addMonths(month, -1);
    var prevPrep = S.MONTHS_PREP[prevMonth.getMonth()];
    var mk = S.toKey(month).slice(0, 7);
    var oneOff = 0;
    entries.forEach(function (e) {
      if (e.amt < 0 && e.date.slice(0, 7) === mk && (-e.amt >= ONE_OFF_MIN || ONE_OFF_CATS.indexOf(e.cat) !== -1)) {
        oneOff -= e.amt;
      }
    });
    // Обычные траты растягиваем в том же темпе на весь месяц, а разовые
    // (от 3 000 ₽ и жильё) прибавляем один раз, иначе прогноз сильно завышен
    var forecast = Math.round(((now.exp - oneOff) / passed * days + oneOff) / 100) * 100;
    setText('fc-note', oneOff ? 'Разовые траты на ' + fmt(oneOff) + ' ₽ учтены один раз.' : '');
    $('fc-note').hidden = !oneOff;

    setText('fc-label', 'К ' + days + ' ' + S.MONTHS_GEN[month.getMonth()] + ' расходы составят около');
    setText('fc-value', fmt(forecast) + ' ₽');
    setText('fc-days', passed + ' из ' + days);
    $('fc-days-bar').style.width = pct(passed, days) + '%';

    if (prev.exp) {
      var spent = pct(now.exp, prev.exp);
      setText('fc-text', forecast < prev.exp
        ? 'Это всё ещё меньше, чем в ' + prevPrep + ' (' + fmt(prev.exp) + ' ₽ за весь месяц), если не будет крупных покупок.'
        : 'Это больше, чем в ' + prevPrep + ' (' + fmt(prev.exp) + ' ₽ за весь месяц).');
      setText('fc-spent-label', 'Потрачено от ' + S.MONTHS_ADJ[prevMonth.getMonth()] + ' суммы');
      setText('fc-spent', spent + '%');
      $('fc-spent-bar').style.width = Math.min(100, spent) + '%';
    }
    $('fc-text').hidden = !prev.exp;
    $('fc-spent-row').hidden = !prev.exp;
  }

  function renderChart(lastMonth) {
    var chart = $('chart');
    chart.textContent = '';
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var m = addMonths(lastMonth, -i);
      var t = totals(m, 1);
      months.push({ name: S.MONTHS[m.getMonth()], inc: t.inc, exp: t.exp, last: i === 0 });
    }
    var max = Math.max.apply(null, months.map(function (m) { return Math.max(m.inc, m.exp); })) || 1;

    months.forEach(function (m) {
      var col = $('tpl-month').content.firstElementChild.cloneNode(true);
      col.querySelector('.chart__bar--inc').style.height = Math.round(m.inc / max * 230) + 'px';
      col.querySelector('.chart__bar--exp').style.height = Math.round(m.exp / max * 230) + 'px';
      var name = col.querySelector('.chart__name');
      name.textContent = m.name;
      name.classList.toggle('chart__name--current', m.last);
      var values = col.querySelector('.chart__values');
      values.appendChild(document.createTextNode('+' + fmt(m.inc)));
      values.appendChild(document.createElement('br'));
      values.appendChild(document.createTextNode('−' + fmt(m.exp)));
      chart.appendChild(col);
    });
    chart.setAttribute('aria-label', 'Доходы и расходы по месяцам: ' + months.map(function (m) {
      return m.name + ' доход ' + fmt(m.inc) + ', расход ' + fmt(m.exp);
    }).join('; '));
  }

  function render() {
    var month = state.month;
    var half = state.period === 'half';
    var from = half ? addMonths(month, -5) : month;
    var now = totals(from, half ? 6 : 1);
    var prevMonth = addMonths(month, -1);
    var prevFull = totals(prevMonth, 1);
    var sameDays = !half && isCurrent(month);
    var sameTo = Math.min(today.getDate(), daysIn(prevMonth));
    var prev = sameDays ? totals(prevMonth, 1, sameTo) : prevFull;
    var prevPrep = S.MONTHS_PREP[prevMonth.getMonth()] + (sameDays ? ' за те же дни' : '');
    var monthPrep = S.MONTHS_PREP[month.getMonth()];
    var rest = now.inc - now.exp;

    setText('month-label', S.MONTHS[month.getMonth()] + ' ' + month.getFullYear());
    $('month-next').disabled = isCurrent(month);
    document.querySelectorAll('[data-period]').forEach(function (b) {
      var on = b.dataset.period === state.period;
      b.classList.toggle('segmented__btn--on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    var periodText = half
      ? 'с ' + S.MONTHS_GEN[from.getMonth()] + ' по ' + S.MONTHS[month.getMonth()].toLowerCase()
      : 'в ' + monthPrep;
    var periodCap = periodText.charAt(0).toUpperCase() + periodText.slice(1);

    $('report').hidden = now.count === 0;
    $('lead-note').hidden = now.count === 0;
    if (now.count === 0) {
      setText('lead', periodCap + ' записей нет.');
      renderChart(month);
      return;
    }

    var lead = periodCap + ' ты потратил ' + fmt(now.exp) + ' ₽';
    if (!half && prev.exp) {
      lead += now.exp === prev.exp
        ? ' — столько же, сколько в ' + prevPrep
        : ' — на ' + fmt(Math.abs(now.exp - prev.exp)) + ' ₽ ' + (now.exp < prev.exp ? 'меньше' : 'больше') + ', чем в ' + prevPrep;
    }
    lead += '.';
    if (now.inc && rest >= 0) lead += ' Отложено ' + fmt(rest) + ' ₽, это ' + pct(rest, now.inc) + '% дохода.';
    if (rest < 0) lead += ' Расходы больше доходов на ' + fmt(-rest) + ' ₽.';
    setText('lead', lead);

    var lastDay = daysPassed(month);
    setText('lead-note', half
      ? 'Данные с 1 ' + S.MONTHS_GEN[from.getMonth()] + ' по ' + lastDay + ' ' + S.MONTHS_GEN[month.getMonth()] + '.'
      : 'Данные с 1 по ' + lastDay + ' ' + S.MONTHS_GEN[month.getMonth()] + '.');

    var days = 0;
    for (var i = 0; i < (half ? 6 : 1); i++) days += daysPassed(addMonths(from, i));
    setText('kpi-inc', '+' + fmt(now.inc) + ' ₽');
    setText('kpi-exp', '−' + fmt(now.exp) + ' ₽');
    setText('kpi-rest', (rest < 0 ? '−' : '') + fmt(Math.abs(rest)) + ' ₽');
    setText('kpi-day', fmt(now.exp / days) + ' ₽');
    setText('kpi-inc-note', !half && prev.inc ? compare(now.inc, prev.inc, prevPrep) : '');
    setText('kpi-exp-note', !half && prev.exp ? compare(now.exp, prev.exp, prevPrep) : '');
    setText('kpi-rest-note', now.inc && rest >= 0 ? pct(rest, now.inc) + '% дохода, советуют от 10 до 20%' : '');
    setText('kpi-day-note', half
      ? 'в среднем за месяц ' + fmt(now.exp / 6) + ' ₽'
      : prev.exp ? 'в ' + prevPrep + ' было ' + fmt(prev.exp / (sameDays ? sameTo : daysIn(prevMonth))) + ' ₽' : '');

    var rows = S.ORDER.exp.map(function (id) {
      return { id: id, v: now.cats[id] || 0, prev: half ? 0 : (prev.cats[id] || 0) };
    }).filter(function (r) {
      return r.v || r.prev;
    }).sort(function (a, b) {
      return b.v - a.v;
    });

    renderRibbon(rows, now.exp, half ? 'Доли расходов ' + periodText + ': ' : 'Доли расходов за ' + S.MONTHS[month.getMonth()].toLowerCase() + ': ');
    setText('cat-caption', half
      ? 'Расходы ' + periodText + ' по категориям'
      : 'Расходы ' + S.MONTHS_GEN[month.getMonth()] + ' по категориям');
    setText('cmp-head', sameDays
      ? 'К ' + (sameTo > 1 ? '1–' : '') + sameTo + ' ' + S.MONTHS_GEN[prevMonth.getMonth()]
      : 'К ' + S.MONTHS_DAT[prevMonth.getMonth()]);
    document.querySelectorAll('[data-month-only]').forEach(function (el) { el.hidden = half; });
    renderTable(rows, now.exp, prevPrep, !half);

    if (!half) {
      renderTips(rows, now, prev, month, prevPrep, prevFull);
      renderForecast(now, prevFull, month);
    }
    renderChart(month);
  }

  $('month-prev').addEventListener('click', function () {
    state.month = addMonths(state.month, -1);
    render();
  });

  $('month-next').addEventListener('click', function () {
    if (isCurrent(state.month)) return;
    state.month = addMonths(state.month, 1);
    render();
  });

  document.querySelectorAll('[data-period]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.period = b.dataset.period;
      render();
    });
  });

  render();
})();
