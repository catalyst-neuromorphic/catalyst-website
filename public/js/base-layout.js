// Reveal animations — replaces old IntersectionObserver
function initReveals() {
  // Single reveals
  gsap.utils.toArray('.reveal').forEach(function(el) {
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        },
      }
    );
  });

  // Staggered reveals — children of .reveal-stagger
  gsap.utils.toArray('.reveal-stagger').forEach(function(parent) {
    var children = parent.children;
    gsap.fromTo(children,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: parent,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  });
}

// Count-up animation for stat numbers
function initCountUp() {
  gsap.utils.toArray('[data-count]').forEach(function(el) {
    var target = parseInt(el.dataset.count || '0', 10);
    var suffix = el.dataset.countSuffix || '';
    var prefix = el.dataset.countPrefix || '';
    var obj = { val: 0 };

    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      onUpdate: function() {
        el.textContent = prefix + Math.round(obj.val).toLocaleString() + suffix;
      },
    });
  });
}

// Initialize all
gsap.registerPlugin(ScrollTrigger);
initReveals();
initCountUp();
