    // Count-up animation
    const counters = document.querySelectorAll('.stat-counter');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (el.dataset.counted) return;
          el.dataset.counted = 'true';
          const target = parseInt(el.dataset.target);
          const suffix = el.dataset.suffix || '';
          const isDecimal = el.dataset.decimal === 'true';
          const duration = 1500;
          const start = performance.now();
          const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * eased);
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
    counters.forEach(c => counterObserver.observe(c));

    // Animated bars
    const bars = document.querySelectorAll('.anim-bar');
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          setTimeout(() => {
            bar.style.transition = 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)';
            bar.style.width = bar.dataset.width;
          }, 200);
        }
      });
    }, { threshold: 0.2 });
    bars.forEach(b => barObserver.observe(b));

    // Glow buttons — exact homepage code (Huly-style internal spotlight with spring physics)
    document.querySelectorAll('.r-btn').forEach(function(btn) {
      btn.classList.add('glow-btn');

      var spot = document.createElement('div');
      spot.className = 'glow-spot';
      spot.innerHTML = '<div class="glow-spot-circle"></div><div class="glow-spot-wide"></div>';
      btn.insertBefore(spot, btn.firstChild);

      var targetX = 0;
      var currentX = 0;
      var velocity = 0;
      var stiffness = 10000;
      var damping = 500;
      var isHovering = false;
      var animFrame = null;
      var halfSpot = 100;

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
