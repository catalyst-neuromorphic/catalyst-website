(function() {
  /* ═══ REVEAL ANIMATIONS ═══ */
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });
  document.querySelectorAll('.reveal, .stagger-children').forEach(function(el) {
    observer.observe(el);
  });

  /* ═══ GLOW BUTTONS ═══ */
  document.querySelectorAll('.glow-btn').forEach(function(btn) {
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
        currentX = targetX; velocity = 0;
        spot.style.left = (currentX - halfSpot) + 'px';
        if (!isHovering) { spot.style.opacity = '0'; btn.classList.remove('glow-on'); }
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
      isHovering = true; stiffness = 10000; damping = 500;
      var r = btn.getBoundingClientRect();
      targetX = e.clientX - r.left; currentX = targetX; velocity = 0;
      spot.style.left = (currentX - halfSpot) + 'px';
      spot.style.opacity = '1'; spot.style.transition = '';
      btn.classList.add('glow-on');
    });
    btn.addEventListener('mousemove', function(e) {
      stiffness = 10000; damping = 500;
      targetX = e.clientX - btn.getBoundingClientRect().left;
      startSpring();
    });
    btn.addEventListener('mouseleave', function() {
      isHovering = false; stiffness = 120; damping = 18;
      targetX = btn.offsetWidth / 2;
      spot.style.transition = 'opacity 0.5s 0.3s'; spot.style.opacity = '0';
      btn.classList.remove('glow-on'); startSpring();
      setTimeout(function() { spot.style.transition = ''; }, 900);
    });
  });
})();

// Currency auto-detection via Cloudflare cdn-cgi/trace
(function() {
  var EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
  fetch('/cdn-cgi/trace').then(function(r){return r.text()}).then(function(text) {
    var loc = (text.match(/loc=(\w+)/) || [])[1] || '';
    var symbol = '$', rate = 1;
    if (loc === 'GB') { symbol = '\u00A3'; rate = 0.80; }
    else if (EU.indexOf(loc) >= 0) { symbol = '\u20AC'; rate = 0.92; }
    else { return; }
    document.querySelectorAll('[data-usd]').forEach(function(el) {
      var usd = parseFloat(el.dataset.usd || '0');
      var converted = usd * rate;
      el.textContent = converted < 1 && converted > 0
        ? symbol + converted.toFixed(3)
        : symbol + Math.round(converted);
    });
  }).catch(function(){});
})();
