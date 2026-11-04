(function () {
  'use strict';

  var form = document.getElementById('demo-form');
  if (!form) return;

  var CATEGORIES = [
    { id: 'food', name: 'Продукты', v: 9480 },
    { id: 'cafe', name: 'Кафе и доставка', v: 7160 },
    { id: 'home', name: 'Жильё и связь', v: 4050 },
    { id: 'fun', name: 'Развлечения', v: 3120 },
    { id: 'trans', name: 'Транспорт', v: 2900 },
    { id: 'other', name: 'Другое', v: 1700 },
    { id: 'study', name: 'Учёба', v: 1650 },
    { id: 'subs', name: 'Подписки', v: 1180 }
  ];

  var amountInput = document.getElementById('demo-amount');
  var msg = document.getElementById('demo-msg');
  var chips = form.querySelectorAll('.chip');
  var ribbon = document.getElementById('ribbon');
  var totalEl = document.getElementById('ribbon-total');
  var legend = document.getElementById('ribbon-legend');

  var currentCat = 'cafe';

  function fmt(n) {
    return Math.round(n).toLocaleString('ru-RU');
  }

  function find(id) {
    return CATEGORIES.filter(function (c) { return c.id === id; })[0];
  }

  function fitLabels() {
    var total = CATEGORIES.reduce(function (s, c) { return s + c.v; }, 0);
    // Ширина ленты без её полей (3 + 3 px) и зазоров по 3 px между отрезками;
    // подпись прячем, если она шире отрезка без его полей (12 + 12 px) и запаса 8 px
    var width = ribbon.clientWidth - 6 - 3 * (CATEGORIES.length - 1);

    CATEGORIES.forEach(function (c) {
      var seg = ribbon.querySelector('[data-cat="' + c.id + '"]');
      seg.classList.remove('ribbon__segment--compact');
      var room = width * c.v / total - 24 - 8;
      var name = seg.querySelector('.ribbon__name');
      var sum = seg.querySelector('.ribbon__sum');
      seg.classList.toggle('ribbon__segment--compact', name.offsetWidth > room || sum.offsetWidth > room);
    });
  }

  function renderRibbon() {
    var total = CATEGORIES.reduce(function (s, c) { return s + c.v; }, 0);

    CATEGORIES.forEach(function (c) {
      var pct = c.v / total * 100;
      var seg = ribbon.querySelector('[data-cat="' + c.id + '"]');
      seg.style.width = pct.toFixed(2) + '%';
      seg.querySelector('.ribbon__sum').textContent = fmt(c.v) + ' ₽';
      legend.querySelector('[data-cat="' + c.id + '"] .num').textContent = c.name + ', ' + Math.round(pct) + '%';
    });

    fitLabels();
    totalEl.textContent = fmt(total);
    ribbon.setAttribute('aria-label', 'Расходы за октябрь по категориям: ' +
      CATEGORIES.map(function (c) { return c.name + ' ' + fmt(c.v) + ' ₽'; }).join(', '));
  }

  function showMessage(text, isError) {
    msg.textContent = text;
    msg.classList.toggle('demo__msg--error', isError);
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      currentCat = chip.dataset.cat;
      chips.forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('chip--on', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  amountInput.addEventListener('input', function () {
    amountInput.value = amountInput.value.split('').filter(function (ch) { return '0123456789'.includes(ch); }).join('').slice(0, 7);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = parseInt(amountInput.value, 10);
    if (!n) {
      showMessage('Введи сумму больше нуля.', true);
      amountInput.focus();
      return;
    }
    var cat = find(currentCat);
    cat.v += n;
    renderRibbon();
    showMessage('Записано: ' + fmt(n) + ' ₽, ' + cat.name + '. Посмотри на ленту ниже.', false);
  });

  renderRibbon();
  window.addEventListener('resize', fitLabels);
})();
