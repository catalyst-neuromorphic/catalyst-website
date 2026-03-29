/* scroll reveal */
var obs = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('.anim, .text-anim').forEach(function(el) { obs.observe(el); });

/* nav scroll */
(function() {
  var nav = document.getElementById('main-nav');
  if (!nav) return;
  var scrolled = false;
  window.addEventListener('scroll', function() {
    var s = window.scrollY > 50;
    if (s !== scrolled) {
      scrolled = s;
      nav.classList.toggle('scrolled', s);
    }
  }, { passive: true });
})();

/* glow buttons */
(function() {
  document.querySelectorAll('.hero-ctas a, .btn').forEach(function(btn) {
    btn.classList.add('glow-btn');

    var spot = document.createElement('div');
    spot.className = 'glow-spot';
    spot.innerHTML = '<div class="glow-spot-circle"></div><div class="glow-spot-wide"></div>';
    btn.insertBefore(spot, btn.firstChild);

    var targetX = 0, currentX = 0, velocity = 0;
    var stiffness = 10000, damping = 500;
    var isHovering = false, animFrame = null, halfSpot = 100;

    function springTick() {
      var force = stiffness * (targetX - currentX);
      velocity = (velocity + force * 0.00006) * (1 - damping * 0.00006);
      currentX += velocity * 0.016;

      if (Math.abs(currentX - targetX) < 0.5 && Math.abs(velocity) < 0.5) {
        currentX = targetX;
        velocity = 0;
        spot.style.left = (currentX - halfSpot) + 'px';
        if (!isHovering) {
          spot.style.opacity = '0';
          btn.classList.remove('glow-on');
        }
        return;
      }
      spot.style.left = (currentX - halfSpot) + 'px';
      animFrame = requestAnimationFrame(springTick);
    }

    function startSpring() {
      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(springTick);
    }

    btn.addEventListener('mouseenter', function(e) {
      isHovering = true;
      stiffness = 10000; damping = 500;
      var r = btn.getBoundingClientRect();
      targetX = e.clientX - r.left;
      currentX = targetX; velocity = 0;
      spot.style.left = (currentX - halfSpot) + 'px';
      spot.style.opacity = '1';
      spot.style.transition = '';
      btn.classList.add('glow-on');
    });

    btn.addEventListener('mousemove', function(e) {
      stiffness = 10000; damping = 500;
      var r = btn.getBoundingClientRect();
      targetX = e.clientX - r.left;
      startSpring();
    });

    btn.addEventListener('mouseleave', function() {
      isHovering = false;
      stiffness = 120; damping = 18;
      targetX = btn.offsetWidth / 2;
      spot.style.transition = 'opacity 0.5s 0.3s';
      spot.style.opacity = '0';
      btn.classList.remove('glow-on');
      startSpring();
      setTimeout(function() { spot.style.transition = ''; }, 900);
    });
  });
})();
