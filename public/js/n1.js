(function() {
  /* ═══ NAV SCROLL ═══ */
  var nav = document.getElementById('main-nav');
  var subNav = document.getElementById('sub-nav');
  var hero = document.querySelector('.hero');

  var heroObs = new IntersectionObserver(function(entries) {
    var isVis = entries[0].isIntersecting;
    nav.classList.toggle('scrolled', !isVis);
    subNav.classList.toggle('visible', !isVis);
  }, { threshold: 0.05 });
  if (hero) heroObs.observe(hero);

  /* ═══ SUB-NAV ACTIVE STATE ═══ */
  var sections = document.querySelectorAll('section[id]');
  var subLinks = subNav.querySelectorAll('a');
  var secObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        subLinks.forEach(function(l) {
          l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-20% 0px -60% 0px' });
  sections.forEach(function(s) { secObs.observe(s); });

  /* ═══ WALKTHROUGH SCROLL (desktop only) ═══ */
  var wt = document.querySelector('.walkthrough');
  var steps = document.querySelectorAll('.wt-step');
  var dots = document.querySelectorAll('.wt-dot');
  var chipSvg = document.querySelector('.chip-wt');
  var regions = chipSvg ? chipSvg.querySelectorAll('[data-region]') : [];

  // Map step index → which SVG regions to highlight
  var regionMap = [
    ['cores', 'mesh'],       // Step 0: Core Mesh
    ['cores'],                // Step 1: Neuron Model
    ['cores'],                // Step 2: Learning Engine
    ['sram', 'cores'],        // Step 3: Synapse Memory
    ['mesh'],                 // Step 4: Mesh Network
    ['cores', 'mesh', 'management', 'sram', 'io', 'pads'], // Step 5: Full Die
  ];

  function setActiveStep(idx) {
    steps.forEach(function(s, i) {
      s.classList.toggle('active', i === idx);
    });
    dots.forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
    // Highlight SVG regions
    var activeRegions = regionMap[idx] || [];
    var isFullDie = idx === 5;
    regions.forEach(function(r) {
      var name = r.getAttribute('data-region');
      if (isFullDie) {
        r.classList.remove('dim', 'active');
      } else if (activeRegions.indexOf(name) !== -1) {
        r.classList.add('active');
        r.classList.remove('dim');
      } else {
        r.classList.add('dim');
        r.classList.remove('active');
      }
    });
  }

  // Only run scroll-driven walkthrough on desktop
  if (window.innerWidth > 900 && wt) {
    window.addEventListener('scroll', function() {
      var rect = wt.getBoundingClientRect();
      var totalH = wt.offsetHeight - window.innerHeight;
      var progress = Math.max(0, Math.min(1, -rect.top / totalH));
      var stepIdx = Math.min(5, Math.floor(progress * 6));
      setActiveStep(stepIdx);
    });
  }

  /* ═══ REVEAL ANIMATIONS ═══ */
  var revObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });
  document.querySelectorAll('.reveal').forEach(function(el) { revObs.observe(el); });

  /* ═══ COUNT-UP ═══ */
  document.querySelectorAll('[data-count]').forEach(function(el) {
    var target = parseInt(el.dataset.count, 10);
    var started = false;
    var countObs = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !started) {
        started = true;
        var start = 0, duration = 2000, startTime = null;
        function tick(ts) {
          if (!startTime) startTime = ts;
          var p = Math.min(1, (ts - startTime) / duration);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(start + (target - start) * eased).toLocaleString();
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    countObs.observe(el);
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
