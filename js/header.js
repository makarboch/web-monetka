'use strict';

let header = document.querySelector('.header');
let toggle = document.querySelector('.header__toggle');
let isOpen = false;

if (toggle) {
  toggle.addEventListener('click', function () {
    isOpen = !isOpen;

    if (isOpen) {
      header.setAttribute('class', 'header header--open');
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      header.setAttribute('class', 'header');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}
