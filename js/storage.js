(function () {
  'use strict';

  var KEY = 'monetka:entries-v3';

  var CATEGORIES = {
    food: { name: 'Продукты', type: 'exp' },
    cafe: { name: 'Кафе и доставка', type: 'exp' },
    home: { name: 'Жильё и связь', type: 'exp' },
    fun: { name: 'Развлечения', type: 'exp' },
    trans: { name: 'Транспорт', type: 'exp' },
    study: { name: 'Учёба', type: 'exp' },
    subs: { name: 'Подписки', type: 'exp' },
    other: { name: 'Другое', type: 'exp' },
    stip: { name: 'Стипендия', type: 'inc' },
    job: { name: 'Подработка', type: 'inc' },
    salary: { name: 'Зарплата', type: 'inc' },
    gift: { name: 'Подарки', type: 'inc' },
    incOther: { name: 'Другое', type: 'inc' }
  };

  var ORDER = {
    exp: ['food', 'cafe', 'home', 'fun', 'trans', 'study', 'subs', 'other'],
    inc: ['stip', 'job', 'salary', 'gift', 'incOther']
  };

  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_SHORT = ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
  var MONTHS_PREP = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];
  var MONTHS_DAT = ['январю', 'февралю', 'марту', 'апрелю', 'маю', 'июню', 'июлю', 'августу', 'сентябрю', 'октябрю', 'ноябрю', 'декабрю'];
  var MONTHS_ADJ = ['январской', 'февральской', 'мартовской', 'апрельской', 'майской', 'июньской', 'июльской', 'августовской', 'сентябрьской', 'октябрьской', 'ноябрьской', 'декабрьской'];
  var WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function toKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function fromKey(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('ru-RU');
  }

  var VISIBLE = [
    [0, 'cafe', 'Обед в столовой', -290],
    [0, 'trans', 'Пополнение транспортной карты', -850],
    [-1, 'food', 'Продукты на неделю', -2340],
    [-1, 'subs', 'Музыкальный сервис', -199],
    [-1, 'job', 'Оплата за макет лендинга', 3000],
    [-2, 'fun', 'Кино с друзьями', -450],
    [-2, 'study', 'Тетради и маркеры', -310],
    [-4, 'stip', '', 3400],
    [-4, 'home', 'Мобильная связь', -550]
  ];

  var EXP_NOW = { food: 9480, cafe: 7160, home: 4050, fun: 3120, trans: 2900, other: 1700, study: 1650, subs: 1180 };
  var EXP_PREV = { food: 9900, cafe: 5300, home: 4050, fun: 5600, trans: 3200, other: 1700, study: 2410, subs: 1180 };

  var INC_TOTALS = [38000, 37200, 36500, 41000, 34000, 30000];
  var EXP_TOTALS = [31240, 33340, 35100, 36200, 29900, 27800];

  var FILLER_NOTES = {
    food: ['Продукты на неделю', 'Овощи и фрукты', 'Молоко, хлеб, яйца', 'Продукты к выходным'],
    cafe: ['Доставка пиццы', 'Кофе навынос', 'Обед в кафе', 'Доставка роллов', 'Кофе с собой'],
    home: ['Общежитие', 'Домашний интернет'],
    fun: ['Боулинг', 'Концерт', 'Настольная игра'],
    trans: ['Такси', 'Пополнение транспортной карты'],
    study: ['Учебник по матанализу', 'Печать курсовой'],
    subs: ['Облачное хранилище', 'Онлайн-кинотеатр'],
    other: ['Подарок другу', 'Стрижка', 'Аптека'],
    stip: [''],
    job: ['Оплата за баннеры'],
    incOther: ['Помощь от родителей']
  };

  function expTargets(k) {
    if (k === 0) return EXP_NOW;
    if (k === 1) return EXP_PREV;
    var res = {}, sum = 0, scale = EXP_TOTALS[k] / EXP_TOTALS[1];
    ORDER.exp.forEach(function (id) {
      res[id] = Math.round(EXP_PREV[id] * scale / 10) * 10;
      sum += res[id];
    });
    res.food += EXP_TOTALS[k] - sum;
    return res;
  }

  function incTargets(k) {
    return { stip: 3400, incOther: 19000, job: INC_TOTALS[k] - 22400 };
  }

  function makeDemo(today) {
    var entries = [], id = 0;

    function add(date, cat, note, amt) {
      entries.push({ id: 'd' + (++id), date: toKey(date), cat: cat, note: note, amt: amt });
    }

    VISIBLE.forEach(function (v) {
      add(addDays(today, v[0]), v[1], v[2], v[3]);
    });

    var fillers = [];
    // k = -1 — текущий месяц, 0 — прошлый, 1 — позапрошлый и т. д.
    // Полные месяцы примера лежат в прошлом, а в текущем — только траты
    // за прошедшие дни, чтобы прогноз в «Аналитике» был правдоподобным
    for (var k = -1; k < INC_TOTALS.length; k++) {
      var first = new Date(today.getFullYear(), today.getMonth() - k - 1, 1);
      var monthKey = toKey(first).slice(0, 7);
      var daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      var lastDay = daysInMonth;
      var targets = {}, t, id2;

      if (k === -1) {
        fillers.push({ date: first, cat: 'incOther', note: 'Помощь от родителей', amt: 19000 });
        fillers.push({ date: new Date(first.getFullYear(), first.getMonth(), Math.min(15, today.getDate())), cat: 'job', note: 'Оплата за баннеры', amt: 12600 });
        lastDay = today.getDate() - 5;
        if (lastDay < 1) continue;
        var share = today.getDate() / daysInMonth;
        for (id2 in EXP_NOW) targets[id2] = -Math.round(EXP_NOW[id2] * share / 10) * 10;
      } else {
        t = expTargets(k);
        for (id2 in t) targets[id2] = -t[id2];
        t = incTargets(k);
        for (id2 in t) targets[id2] = t[id2];
      }

      // Из нужного итога вычитаем записи, которые уже есть в этом месяце,
      // а остаток делим на несколько записей по разным дням
      entries.forEach(function (e) {
        if (e.date.slice(0, 7) === monthKey && targets[e.cat] !== undefined) targets[e.cat] -= e.amt;
      });

      Object.keys(targets).forEach(function (cat, ci) {
        var rest = targets[cat];
        if (!rest || (k === -1 && rest > 0)) return;
        var notes = FILLER_NOTES[cat];
        var n = Math.abs(rest) < notes.length * 100 ? 1 : notes.length;
        var part = Math.round(rest / n / 10) * 10;
        for (var i = 0; i < n; i++) {
          var amt = i === n - 1 ? rest - part * (n - 1) : part;
          var day = 1 + (ci * 5 + i * Math.ceil(lastDay / n)) % lastDay;
          fillers.push({ date: new Date(first.getFullYear(), first.getMonth(), day), cat: cat, note: notes[i], amt: amt });
        }
      });
    }

    fillers.sort(function (a, b) { return b.date - a.date; });
    fillers.forEach(function (f) { add(f.date, f.cat, f.note, f.amt); });
    return entries;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
    }
    var demo = makeDemo(new Date());
    save(demo);
    return demo;
  }

  function save(entries) {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries));
    } catch (e) {
    }
  }

  var LIMITS_KEY = 'monetka:limits';
  var DEMO_LIMITS = { food: 10000, cafe: 6000, fun: 4000, trans: 3000, subs: 1200 };

  function loadLimits() {
    try {
      var raw = localStorage.getItem(LIMITS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
    }
    var copy = {};
    Object.keys(DEMO_LIMITS).forEach(function (cat) { copy[cat] = DEMO_LIMITS[cat]; });
    return copy;
  }

  function saveLimits(limits) {
    try {
      localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
    } catch (e) {
    }
  }

  var GOALS_KEY = 'monetka:goals';
  var DEMO_GOALS = [
    { id: 'g1', name: 'Финансовая подушка', target: 30000, saved: 12400 },
    { id: 'g2', name: 'Новый ноутбук', target: 70000, saved: 21000 }
  ];

  function loadGoals() {
    try {
      var raw = localStorage.getItem(GOALS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
    }
    return DEMO_GOALS.map(function (g) { return { id: g.id, name: g.name, target: g.target, saved: g.saved }; });
  }

  function saveGoals(goals) {
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    } catch (e) {
    }
  }

  var DEMO_GOAL_IDS = DEMO_GOALS.map(function (g) { return g.id; });

  function isDemoEntry(e) {
    return String(e.id).slice(0, 1) === 'd';
  }

  function hasDemo(entries) {
    return entries.some(isDemoEntry);
  }

  function readRaw(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeRaw(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
    }
  }

  function removeDemo() {
    var snapshot = { entries: load(), limits: readRaw(LIMITS_KEY), goals: readRaw(GOALS_KEY) };

    save(snapshot.entries.filter(function (e) { return !isDemoEntry(e); }));

    var limits = loadLimits();
    Object.keys(DEMO_LIMITS).forEach(function (cat) {
      // Лимит, который пользователь поменял сам, не трогаем
      if (limits[cat] === DEMO_LIMITS[cat]) delete limits[cat];
    });
    saveLimits(limits);

    saveGoals(loadGoals().filter(function (g) { return DEMO_GOAL_IDS.indexOf(g.id) === -1; }));
    return snapshot;
  }

  function restoreDemo(snapshot) {
    save(snapshot.entries);
    writeRaw(LIMITS_KEY, snapshot.limits);
    writeRaw(GOALS_KEY, snapshot.goals);
  }

  window.MonetkaStore = {
    hasDemo: hasDemo,
    removeDemo: removeDemo,
    restoreDemo: restoreDemo,
    loadGoals: loadGoals,
    saveGoals: saveGoals,
    CATEGORIES: CATEGORIES,
    ORDER: ORDER,
    MONTHS: MONTHS,
    MONTHS_GEN: MONTHS_GEN,
    MONTHS_SHORT: MONTHS_SHORT,
    MONTHS_PREP: MONTHS_PREP,
    MONTHS_DAT: MONTHS_DAT,
    MONTHS_ADJ: MONTHS_ADJ,
    WEEKDAYS: WEEKDAYS,
    loadLimits: loadLimits,
    saveLimits: saveLimits,
    toKey: toKey,
    fromKey: fromKey,
    addDays: addDays,
    fmt: fmt,
    load: load,
    save: save
  };
})();
