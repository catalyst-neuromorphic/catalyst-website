// Tab switching
document.querySelectorAll('.val-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.val-tab').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.val-panel').forEach(function(p) { p.classList.add('hidden'); });
    btn.classList.add('active');
    var panel = document.getElementById('tab-' + btn.dataset.tab);
    if (panel) {
      panel.classList.remove('hidden');
      // Trigger bar animations in newly visible panel
      panel.querySelectorAll('.anim-bar').forEach(function(bar) {
        bar.style.width = bar.dataset.width;
      });
    }
  });
});

// Count-up animation
var counters = document.querySelectorAll('.stat-counter');
var counterObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      var el = entry.target;
      if (el.dataset.counted) return;
      el.dataset.counted = 'true';
      var target = parseInt(el.dataset.target);
      var suffix = el.dataset.suffix || '';
      var isDecimal = el.dataset.decimal === 'true';
      var duration = 1500;
      var start = performance.now();
      var animate = function(now) {
        var progress = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        var current = Math.round(target * eased);
        if (isDecimal) {
          el.textContent = (current / 10).toFixed(1) + suffix;
        } else {
          el.textContent = current.toLocaleString() + suffix;
        }
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  });
}, { threshold: 0.3 });
counters.forEach(function(c) { counterObserver.observe(c); });

// Animated bars
var bars = document.querySelectorAll('.anim-bar');
var barObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      var bar = entry.target;
      setTimeout(function() {
        bar.style.transition = 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
        bar.style.width = bar.dataset.width;
      }, 200);
    }
  });
}, { threshold: 0.2 });
bars.forEach(function(b) { barObserver.observe(b); });
