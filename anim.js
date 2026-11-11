/* Minikurser: diskrete animationer.
   Elementer får klassen .vis og glider ind, når de kommer til syne.
   Uden JavaScript, eller ved "reducer bevægelse", vises alt som normalt. */
(function () {
  var html = document.documentElement;
  var reduceret = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceret || !('IntersectionObserver' in window)) {
    html.classList.remove('anim');
    return;
  }
  html.classList.add('anim');

  // Grupper, hvor børnene kommer ind et ad gangen
  var grupper = [
    ['.sektion-top', 90],
    ['.kort-raekke', 110],
    ['.trin', 90],
    ['.om-tekst', 80],
    ['.kontakt .wrap', 100],
    ['.faq', 70]
  ];

  var elementer = [];
  grupper.forEach(function (g) {
    document.querySelectorAll(g[0]).forEach(function (gruppe) {
      Array.prototype.forEach.call(gruppe.children, function (barn, i) {
        if (barn.classList.contains('vis')) return;
        barn.classList.add('vis');
        barn.style.setProperty('--d', (i * g[1] / 1000) + 's');
        elementer.push(barn);
      });
    });
  });

  // Enkeltelementer
  document.querySelectorAll('.portraet, #fagomraader .wrap > .lead').forEach(function (el) {
    if (el.classList.contains('vis')) return;
    el.classList.add('vis');
    elementer.push(el);
  });

  var observer = new IntersectionObserver(function (poster) {
    poster.forEach(function (post) {
      if (post.isIntersecting) {
        post.target.classList.add('synlig');
        observer.unobserve(post.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  elementer.forEach(function (el) { observer.observe(el); });

  // Skygge under menuen, når man har scrollet
  var top = document.querySelector('.top');
  if (top) {
    var opdater = function () { top.classList.toggle('rullet', window.scrollY > 8); };
    window.addEventListener('scroll', opdater, { passive: true });
    opdater();
  }
})();
