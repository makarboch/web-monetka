'use strict';

var quiz = document.getElementById('quiz');
var list = mix(questions);
var current = 0;
var results = [];
var locked = false;                           // ответ уже выбран
var finished = false;
var opened = null;

// маркеры ответа
var markRight = '<svg viewBox="0 0 50 50"><path d="M8,26 L20,38 L42,12" fill="none" stroke="#2e9e5b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var markWrong = '<svg viewBox="0 0 50 50"><path d="M12,12 L38,38 M38,12 L12,38" fill="none" stroke="#d64545" stroke-width="7" stroke-linecap="round"/></svg>';


function mix(arr) {
    return arr.slice().sort(function () {
        return Math.random() - 0.5;
    });
}

function showQuestion() {
    var q = list[current];

    var item = document.createElement('div');
    item.className = 'quiz__item';

    var question = document.createElement('div');
    question.className = 'question';

    var text = document.createElement('p');
    text.className = 'question__text';
    text.innerHTML = (current + 1) + '. ' + q.text;

    var marker = document.createElement('div');
    marker.className = 'question__marker';

    question.appendChild(text);
    question.appendChild(marker);

    var right = document.createElement('div');
    right.className = 'quiz__right';
    right.innerHTML = 'Правильный ответ: ' + q.answers
        .filter(function (a) { return a.correct; })
        .map(function (a) { return a.text; })
        .join(' / ');

    question.addEventListener('click', function () {
        showRight(right);
    });

    var answers = document.createElement('div');
    answers.className = 'answers';

    var mixed = mix(q.answers);
    for (var i = 0; i < mixed.length; i++) {
        answers.appendChild(createAnswer(mixed[i], answers, marker));
    }

    item.appendChild(question);
    item.appendChild(right);
    item.appendChild(answers);
    quiz.appendChild(item);

    locked = false;
}

function createAnswer(a, answers, marker) {
    var block = document.createElement('div');
    block.className = 'answer';
    block.innerHTML = '<p class="answer__text">' + a.text + '</p>';

    if (a.correct) {
        block.innerHTML += '<p class="answer__note">Правильно! ' + a.note + '</p>';
    }

    block.addEventListener('click', function () {
        choose(block, a.correct, answers, marker);
    });

    return block;
}

function choose(block, isRight, answers, marker) {
    if (locked) {
        return;
    }
    locked = true;
    results.push(isRight);

    answers.className += ' answers--locked';
    block.className += isRight ? ' answer--correct answer--explain' : ' answer--chosen';

    // через пару секунд появляется маркер и блоки уезжают
    setTimeout(function () {
        marker.innerHTML = isRight ? markRight : markWrong;
        marker.className += ' question__marker--show';
        leave(block, isRight, answers);
    }, 2000);
}

function leave(chosen, correct, answers) {
    var blocks = Array.prototype.slice.call(answers.childNodes);
    blocks.reverse();

    if (correct) {
        blocks = blocks.filter(function (b) {
            return b !== chosen;
        });
    }

    // let, а не var: у каждого setTimeout своя копия i (проблема замыканий)
    for (let i = 0; i < blocks.length; i++) {
        setTimeout(function () {
            blocks[i].className += ' answer--gone';
        }, i * 400);
    }

    var delay = blocks.length * 400 + 400;

    // потом исчезает правильный ответ
    if (correct) {
        setTimeout(function () {
            chosen.className += ' answer--hide';
        }, delay);
        delay += 800;
    }

    setTimeout(function () {
        answers.parentNode.removeChild(answers);
        next();
    }, delay + 400);
}

function next() {
    current++;
    if (current < list.length) {
        showQuestion();
    }
    else {
        finish();
    }
}

function finish() {
    finished = true;

    var count = results.filter(function (r) {
        return r;
    }).length;

    // надпись и статистика над областью с вопросами
    var end = document.createElement('div');
    end.className = 'end';
    end.innerHTML = '<p class="end__title">Вопросы закончились</p>' +
        '<p class="stats">Правильных ответов: ' + count + ' из ' + list.length + '</p>' +
        '<p class="end__hint">Нажмите на вопрос, чтобы увидеть правильный ответ</p>';
    quiz.parentNode.insertBefore(end, quiz);

    quiz.className += ' quiz--finished';
}

function showRight(right) {
    if (!finished) {
        return;
    }

    var all = document.querySelectorAll('.quiz__right');
    for (var i = 0; i < all.length; i++) {
        all[i].className = 'quiz__right';
    }

    if (opened === right) {
        opened = null;
    }
    else {
        right.className += ' quiz__right--show';
        opened = right;
    }
}

showQuestion();
