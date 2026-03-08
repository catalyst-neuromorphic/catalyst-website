document.querySelectorAll('.code-tabs').forEach(function(group) {
  var buttons = group.querySelectorAll('.tab-btn');
  var contents = group.querySelectorAll('.tab-content');

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var lang = btn.dataset.lang;
      buttons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      contents.forEach(function(c) {
        c.classList.toggle('hidden', c.dataset.lang !== lang);
      });
    });
  });
});
