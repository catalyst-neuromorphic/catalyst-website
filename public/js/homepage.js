/* ── IntersectionObserver ── */
var obs = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -180px 0px' });

document.querySelectorAll('.anim, .text-anim').forEach(function(el) { obs.observe(el); });

/* ── nav scroll behavior ── */
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

/* ── cursor spotlight ── */
document.querySelectorAll('.pcard, .mcard').forEach(function(card) {
  card.addEventListener('mousemove', function(e) {
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

/* ═══════════════════════════════════════════════════════════════
   UNIFIED FOG MESH — Single WebGL canvas for entire pillar stack.
   SDF union of all 3 cards → one continuous fog field with
   organic cutouts. Fog merges between cards instead of stacking.
   ═══════════════════════════════════════════════════════════════ */
(function() {

  var VERT =
    'attribute vec2 a_pos;' +
    'varying vec2 v_uv;' +
    'void main(){' +
    '  v_uv = a_pos * 0.5 + 0.5;' +
    '  gl_Position = vec4(a_pos, 0.0, 1.0);' +
    '}';

  var FRAG =
    'precision highp float;' +
    'varying vec2 v_uv;' +
    'uniform float u_time;' +
    'uniform float u_opacity;' +
    'uniform vec2 u_resolution;' +
    'uniform vec4 u_cards[3];' +  /* (cx, cy, hw, hh) in UV space per card */

    /* Simplex 2D noise — Ashima Arts (MIT) */
    'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }' +

    'float snoise(vec2 v){' +
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,' +
    '                       -0.577350269189626, 0.024390243902439);' +
    '  vec2 i = floor(v + dot(v, C.yy));' +
    '  vec2 x0 = v - i + dot(i, C.xx);' +
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);' +
    '  vec4 x12 = x0.xyxy + C.xxzz;' +
    '  x12.xy -= i1;' +
    '  i = mod(i, 289.0);' +
    '  vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0))' +
    '                          + i.x + vec3(0.0,i1.x,1.0));' +
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),' +
    '                            dot(x12.zw,x12.zw)), 0.0);' +
    '  m = m*m; m = m*m;' +
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;' +
    '  vec3 h = abs(x) - 0.5;' +
    '  vec3 ox = floor(x + 0.5);' +
    '  vec3 a0 = x - ox;' +
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);' +
    '  vec3 g;' +
    '  g.x = a0.x * x0.x + h.x * x0.y;' +
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;' +
    '  return 130.0 * dot(m, g);' +
    '}' +

    /* FBM — 4 octaves, mid frequency for balanced fog */
    'float fbm(vec2 p){' +
    '  float v = 0.0, a = 0.52, f = 1.0;' +
    '  for(int i = 0; i < 4; i++){' +
    '    v += a * snoise(p * f);' +
    '    f *= 1.97; a *= 0.44;' +
    '  }' +
    '  return v;' +
    '}' +

    /* Rounded rect SDF */
    'float sdRoundBox(vec2 p, vec2 b, float r){' +
    '  vec2 q = abs(p) - b + r;' +
    '  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;' +
    '}' +

    /* SDF for one card (UV + aspect corrected) */
    'float cardSDF(vec2 uv, vec4 card, float aspect){' +
    '  vec2 p = uv - card.xy;' +
    '  p.x *= aspect;' +
    '  vec2 h = card.zw;' +
    '  h.x *= aspect;' +
    '  return sdRoundBox(p, h, 0.035);' +
    '}' +

    /* Smooth minimum — eliminates crease/seam lines between cards */
    'float smin(float a, float b, float k){' +
    '  float h = max(k - abs(a-b), 0.0) / k;' +
    '  return min(a,b) - h*h*k*0.25;' +
    '}' +

    'void main(){' +
    '  vec2 uv = v_uv;' +
    '  float t = u_time;' +
    '  float aspect = u_resolution.x / u_resolution.y;' +

    /* ── UNION SDF: min distance to ANY card = single continuous mesh ── */
    '  float sdf0 = cardSDF(uv, u_cards[0], aspect);' +
    '  float sdf1 = cardSDF(uv, u_cards[1], aspect);' +
    '  float sdf2 = cardSDF(uv, u_cards[2], aspect);' +
    '  float sdf = smin(sdf0, smin(sdf1, sdf2, 0.04), 0.04);' +

    /* ── AURA MASK: smooth consistent transition into card tiles ── */
    '  float auraNear = smoothstep(-0.012, 0.018, sdf);' +
    '  float auraFade = exp(-sdf * 2.4);' +   /* thicker reach */
    '  float auraMask = auraNear * auraFade;' +

    /* Soft wide edge glow */
    '  float edgeGlow = exp(-abs(sdf) * 10.0);' +

    /* ── INWARD PULL via SDF time delay ──
       sdf² gives acceleration: slow far away, fast near cards.
       Uniform at corners AND edges — no convergence artifacts. */
    '  float localTime = t + sdf * sdf * 300.0;' +

    /* ── NOISE FIELD — balanced frequencies, driven by localTime ── */
    '  vec2 st = vec2(uv.x * aspect, uv.y);' +
    '  float n1 = fbm(st * 1.8 + vec2(localTime*0.10, localTime*0.07));' +
    '  float n2 = fbm(st * 3.1 + vec2(localTime*0.06 + 5.0, localTime*0.04 + 5.0));' +
    '  float n3 = snoise(st * 4.4 + vec2(localTime*0.12, -localTime*0.08));' +

    '  float fog = n1*0.52 + n2*0.33 + n3*0.15;' +
    '  fog = (fog + 1.0) * 0.5;' +
    '  fog = fog * fog;' +

    /* Wispy detail */
    '  float wisp = snoise(st * 5.2 + vec2(localTime*0.08, -localTime*0.05));' +
    '  fog += max(wisp, 0.0) * 0.09;' +

    /* ── COMBINE: continuous fog mesh + edge accent ── */
    '  float aura = fog * auraMask * 1.25 + edgeGlow * 0.14;' +

    /* ── DISTANCE FADE — no bounding geometry, fog thins naturally from cards ── */
    '  aura *= smoothstep(0.09, 0.0, sdf);' +

    /* ── COLOR ── */
    '  vec3 deepBlue   = vec3(0.10, 0.20, 0.45);' +
    '  vec3 brightBlue = vec3(0.30, 0.55, 0.97);' +
    '  vec3 hotBlue    = vec3(0.45, 0.70, 1.00);' +
    '  float br = smoothstep(0.06, 0.30, aura);' +
    '  float pk = smoothstep(0.25, 0.55, aura);' +
    '  vec3 col = mix(deepBlue, brightBlue, br);' +
    '  col = mix(col, hotBlue, pk * 0.5);' +
    '  col += hotBlue * edgeGlow * 0.06;' +

    '  float alpha = aura * u_opacity;' +
    '  gl_FragColor = vec4(col * alpha, alpha);' +
    '}';

  /* ── WebGL setup ── */
  function initFogMesh(canvas, opacity, cardData) {
    var gl = canvas.getContext('webgl', { alpha:true, premultipliedAlpha:true, antialias:false });
    if (!gl) return;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error('Fog shader:', gl.getShaderInfoLog(s));
      return s;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      console.error('Fog link:', gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uTime = gl.getUniformLocation(prog, 'u_time');
    var uOpacity = gl.getUniformLocation(prog, 'u_opacity');
    var uRes = gl.getUniformLocation(prog, 'u_resolution');
    gl.uniform1f(uOpacity, opacity);

    /* Set card positions */
    for (var i = 0; i < 3; i++) {
      var loc = gl.getUniformLocation(prog, 'u_cards[' + i + ']');
      if (loc && cardData[i]) {
        gl.uniform4f(loc, cardData[i][0], cardData[i][1], cardData[i][2], cardData[i][3]);
      }
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var t0 = performance.now();
    (function frame() {
      var t = (performance.now() - t0) / 1000;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0,0,0,0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    })();
  }

  /* ═══ PILLAR STACK — single fog mesh with 3 card cutouts ═══ */
  var stack = document.querySelector('.pillar-stack');
  if (stack) {
    var pcards = stack.querySelectorAll('.pcard');
    var BLEED = 225;

    var fogC = document.createElement('canvas');
    fogC.style.cssText = 'position:absolute;pointer-events:none;z-index:1;';
    stack.appendChild(fogC);

    function layout() {
      var sw = stack.offsetWidth;
      var sh = stack.offsetHeight;
      var cw = sw + BLEED * 2;
      var ch = sh + BLEED * 2;
      fogC.style.top  = -BLEED + 'px';
      fogC.style.left = -BLEED + 'px';
      fogC.style.width  = cw + 'px';
      fogC.style.height = ch + 'px';
      var dpr = Math.min(window.devicePixelRatio, 2);
      fogC.width  = Math.round(cw * dpr * 0.65);
      fogC.height = Math.round(ch * dpr * 0.65);

      /* Compute card centres + half-sizes in UV space (0→1) */
      var cards = [];
      pcards.forEach(function(card) {
        var cx = (card.offsetLeft + card.offsetWidth  / 2 + BLEED) / cw;
        var cy = (card.offsetTop  + card.offsetHeight / 2 + BLEED) / ch;
        var hw = (card.offsetWidth  / 2) / cw;
        var hh = (card.offsetHeight / 2) / ch;
        cards.push([cx, cy, hw, hh]);
      });
      return cards;
    }
    var cardData = layout();
    window.addEventListener('resize', function() { cardData = layout(); });

    initFogMesh(fogC, 1.0, cardData);
  }

  /* ═══ MARQUEE — WebGL fog for scrolling card rows ═══ */

  var MFRAG =
    'precision highp float;' +
    'varying vec2 v_uv;' +
    'uniform float u_time;' +
    'uniform float u_opacity;' +
    'uniform vec2 u_resolution;' +
    'uniform float u_phase1;' +
    'uniform float u_phase2;' +
    'uniform float u_cellUV;' +
    'uniform float u_cardHW;' +
    'uniform float u_cardHH;' +
    'uniform float u_row1Y;' +
    'uniform float u_row2Y;' +
    'uniform vec4 u_hFade;' +

    /* Simplex 2D noise — Ashima Arts (MIT) */
    'vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }' +

    'float snoise(vec2 v){' +
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,' +
    '                       -0.577350269189626, 0.024390243902439);' +
    '  vec2 i = floor(v + dot(v, C.yy));' +
    '  vec2 x0 = v - i + dot(i, C.xx);' +
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);' +
    '  vec4 x12 = x0.xyxy + C.xxzz;' +
    '  x12.xy -= i1;' +
    '  i = mod(i, 289.0);' +
    '  vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0))' +
    '                          + i.x + vec3(0.0,i1.x,1.0));' +
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),' +
    '                            dot(x12.zw,x12.zw)), 0.0);' +
    '  m = m*m; m = m*m;' +
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;' +
    '  vec3 h = abs(x) - 0.5;' +
    '  vec3 ox = floor(x + 0.5);' +
    '  vec3 a0 = x - ox;' +
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);' +
    '  vec3 g;' +
    '  g.x = a0.x * x0.x + h.x * x0.y;' +
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;' +
    '  return 130.0 * dot(m, g);' +
    '}' +

    'float fbm(vec2 p){' +
    '  float v = 0.0, a = 0.52, f = 1.0;' +
    '  for(int i = 0; i < 4; i++){' +
    '    v += a * snoise(p * f);' +
    '    f *= 1.97; a *= 0.44;' +
    '  }' +
    '  return v;' +
    '}' +

    'float sdRoundBox(vec2 p, vec2 b, float r){' +
    '  vec2 q = abs(p) - b + r;' +
    '  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;' +
    '}' +

    'float smin(float a, float b, float k){' +
    '  float h = max(k - abs(a-b), 0.0) / k;' +
    '  return min(a,b) - h*h*k*0.25;' +
    '}' +

    /* Repeating SDF for one row of infinite scrolling cards */
    'float rowSDF(vec2 uv, float phase, float rowY, float aspect){' +
    '  float relX = mod(uv.x - phase + u_cellUV * 0.5, u_cellUV) - u_cellUV * 0.5;' +
    '  float dy = uv.y - rowY;' +
    '  vec2 h = vec2(u_cardHW * aspect, u_cardHH);' +
    '  float r = 0.025;' +
    '  float s0 = sdRoundBox(vec2(relX * aspect, dy), h, r);' +
    '  float s1 = sdRoundBox(vec2((relX - u_cellUV) * aspect, dy), h, r);' +
    '  float s2 = sdRoundBox(vec2((relX + u_cellUV) * aspect, dy), h, r);' +
    '  return smin(s0, smin(s1, s2, 0.025), 0.025);' +
    '}' +

    'void main(){' +
    '  vec2 uv = v_uv;' +
    '  uv.y = 1.0 - uv.y;' +  /* Flip Y — WebGL framebuffer bottom is uv.y=0, but CSS top is y=0 */
    '  float t = u_time;' +
    '  float aspect = u_resolution.x / u_resolution.y;' +

    /* Union SDF of both rows */
    '  float sdf1 = rowSDF(uv, u_phase1, u_row1Y, aspect);' +
    '  float sdf2 = rowSDF(uv, u_phase2, u_row2Y, aspect);' +
    '  float sdf = smin(sdf1, sdf2, 0.05);' +

    /* Detail mask: 1 in center (show card cutouts), 0 at edges (solid fog) */
    '  float detailMask = smoothstep(u_hFade.y, u_hFade.y + 0.03, uv.x)' +
    '                   * smoothstep(u_hFade.z, u_hFade.z - 0.03, uv.x);' +
    '  sdf = mix(max(sdf, 0.015), sdf, detailMask);' +

    /* Aura mask */
    '  float auraNear = smoothstep(-0.012, 0.018, sdf);' +
    '  float auraFade = exp(-sdf * 2.4);' +
    '  float auraMask = auraNear * auraFade;' +
    '  float edgeGlow = exp(-abs(sdf) * 10.0);' +

    /* Inward pull via SDF time delay */
    '  float localTime = t + sdf * sdf * 300.0;' +

    /* Noise field */
    '  vec2 st = vec2(uv.x * aspect, uv.y);' +
    '  float n1 = fbm(st * 1.8 + vec2(localTime*0.10, localTime*0.07));' +
    '  float n2 = fbm(st * 3.1 + vec2(localTime*0.06 + 5.0, localTime*0.04 + 5.0));' +
    '  float n3 = snoise(st * 4.4 + vec2(localTime*0.12, -localTime*0.08));' +
    '  float fog = n1*0.52 + n2*0.33 + n3*0.15;' +
    '  fog = (fog + 1.0) * 0.5;' +
    '  fog = fog * fog;' +
    '  float wisp = snoise(st * 5.2 + vec2(localTime*0.08, -localTime*0.05));' +
    '  fog += max(wisp, 0.0) * 0.09;' +

    /* Combine */
    '  float aura = fog * auraMask * 1.25 + edgeGlow * 0.14;' +
    '  aura *= smoothstep(0.09, 0.0, sdf);' +

    /* Outer fade — fog to nothing at marquee-wrap edges */
    '  float hMask = smoothstep(u_hFade.x, u_hFade.y, uv.x)' +
    '              * smoothstep(u_hFade.w, u_hFade.z, uv.x);' +
    '  aura *= hMask;' +

    /* Color */
    '  vec3 deepBlue   = vec3(0.10, 0.20, 0.45);' +
    '  vec3 brightBlue = vec3(0.30, 0.55, 0.97);' +
    '  vec3 hotBlue    = vec3(0.45, 0.70, 1.00);' +
    '  float br = smoothstep(0.06, 0.30, aura);' +
    '  float pk = smoothstep(0.25, 0.55, aura);' +
    '  vec3 col = mix(deepBlue, brightBlue, br);' +
    '  col = mix(col, hotBlue, pk * 0.5);' +
    '  col += hotBlue * edgeGlow * 0.06;' +

    '  float alpha = aura * u_opacity;' +
    '  gl_FragColor = vec4(col * alpha, alpha);' +
    '}';

  function initMarqueeFog(canvas, wraps, track1, track2) {
    var gl = canvas.getContext('webgl', { alpha:true, premultipliedAlpha:true, antialias:false });
    if (!gl) return;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error('Marquee fog shader:', gl.getShaderInfoLog(s));
      return s;
    }

    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, MFRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      console.error('Marquee fog link:', gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uTime    = gl.getUniformLocation(prog, 'u_time');
    var uOpacity = gl.getUniformLocation(prog, 'u_opacity');
    var uRes     = gl.getUniformLocation(prog, 'u_resolution');
    var uPhase1  = gl.getUniformLocation(prog, 'u_phase1');
    var uPhase2  = gl.getUniformLocation(prog, 'u_phase2');
    var uCellUV  = gl.getUniformLocation(prog, 'u_cellUV');
    var uCardHW  = gl.getUniformLocation(prog, 'u_cardHW');
    var uCardHH  = gl.getUniformLocation(prog, 'u_cardHH');
    var uRow1Y   = gl.getUniformLocation(prog, 'u_row1Y');
    var uRow2Y   = gl.getUniformLocation(prog, 'u_row2Y');
    var uHFade   = gl.getUniformLocation(prog, 'u_hFade');

    gl.uniform1f(uOpacity, 0.9);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var GAP_PX = 14;
    var t0 = performance.now();

    (function frame() {
      var t = (performance.now() - t0) / 1000;

      var cr = canvas.getBoundingClientRect();
      var cW = cr.width, cH = cr.height;
      if (cW < 1 || cH < 1) { requestAnimationFrame(frame); return; }

      /* Read actual card positions from DOM — always accurate */
      var c1 = track1.querySelector('.mcard');
      var c2 = track2.querySelector('.mcard');
      var r1 = c1.getBoundingClientRect();
      var r2 = c2.getBoundingClientRect();

      var cardW = r1.width, cardH = r1.height;
      var cellPx = cardW + GAP_PX;

      /* UV-space card dimensions */
      var cardHW = (cardW / 2) / cW;
      var cardHH = (cardH / 2) / cH;
      var cellUV = cellPx / cW;

      /* Phase: first card center X relative to canvas, mod cell period */
      var cx1 = r1.left + cardW / 2 - cr.left;
      var phase1 = (((cx1 % cellPx) + cellPx) % cellPx) / cW;

      var cx2 = r2.left + cardW / 2 - cr.left;
      var phase2 = (((cx2 % cellPx) + cellPx) % cellPx) / cW;

      /* Row center Y in UV (0=top, 1=bottom) — from actual card position */
      var row1CY = (r1.top + cardH / 2 - cr.top) / cH;
      var row2CY = (r2.top + cardH / 2 - cr.top) / cH;

      /* Horizontal fade — extends past wrap edges so fog covers card entry/exit zones */
      var wr = wraps[0].getBoundingClientRect();
      var wL = (wr.left - cr.left) / cW;
      var wR = (wr.right - cr.left) / cW;
      var bleedUV = 100 / cW;
      var hFL0 = wL - bleedUV;
      var hFL1 = wL;
      var hFR1 = wR;
      var hFR0 = wR + bleedUV;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uPhase1, phase1);
      gl.uniform1f(uPhase2, phase2);
      gl.uniform1f(uCellUV, cellUV);
      gl.uniform1f(uCardHW, cardHW);
      gl.uniform1f(uCardHH, cardHH);
      gl.uniform1f(uRow1Y, row1CY);
      gl.uniform1f(uRow2Y, row2CY);
      gl.uniform4f(uHFade, hFL0, hFL1, hFR1, hFR0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    })();
  }

  /* ═══ MARQUEE SETUP ═══ */
  var appS = document.querySelector('.app-section');
  if (appS) {
    var mWraps = appS.querySelectorAll('.marquee-wrap');
    var mTrack1 = document.getElementById('row1');
    var mTrack2 = document.getElementById('row2');
    if (mWraps.length >= 2 && mTrack1 && mTrack2) {
      var MBLEED = 200;

      var mFogC = document.createElement('canvas');
      mFogC.style.cssText = 'position:absolute;pointer-events:none;z-index:0;';
      appS.insertBefore(mFogC, mWraps[0]);

      function mLayout() {
        var w1 = mWraps[0], w2 = mWraps[1];
        var topY = w1.offsetTop - MBLEED;
        var botY = w2.offsetTop + w2.offsetHeight + MBLEED;
        var sW = appS.offsetWidth;
        var cW = sW + MBLEED * 2;
        var cH = botY - topY;

        mFogC.style.top  = topY + 'px';
        mFogC.style.left = -MBLEED + 'px';
        mFogC.style.width  = cW + 'px';
        mFogC.style.height = cH + 'px';
        var dpr = Math.min(window.devicePixelRatio, 2);
        mFogC.width  = Math.round(cW * dpr * 0.5);
        mFogC.height = Math.round(cH * dpr * 0.5);
      }

      mLayout();
      window.addEventListener('resize', mLayout);

      initMarqueeFog(mFogC, mWraps, mTrack1, mTrack2);
    }
  }

  /* ═══ GLOW BUTTONS — Huly-style internal spotlight with spring physics ═══ */
  document.querySelectorAll('.hero-ctas a, .btn').forEach(function(btn) {
    btn.classList.add('glow-btn');

    /* Inject internal spotlight */
    var spot = document.createElement('div');
    spot.className = 'glow-spot';
    spot.innerHTML = '<div class="glow-spot-circle"></div><div class="glow-spot-wide"></div>';
    btn.insertBefore(spot, btn.firstChild);

    /* Spring physics (matching Huly: snappy follow, bouncy return) */
    var targetX = 0;
    var currentX = 0;
    var velocity = 0;
    var stiffness = 10000;
    var damping = 500;
    var isHovering = false;
    var animFrame = null;
    var halfSpot = 100; /* half of glow-spot width */

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
        return; /* stop animation */
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
      stiffness = 10000; damping = 500; /* snappy */
      var r = btn.getBoundingClientRect();
      targetX = e.clientX - r.left;
      currentX = targetX; velocity = 0; /* snap to cursor instantly on enter */
      spot.style.left = (currentX - halfSpot) + 'px';
      spot.style.opacity = '1';
      spot.style.transition = '';
      btn.classList.add('glow-on');
    });

    btn.addEventListener('mousemove', function(e) {
      stiffness = 10000; damping = 500; /* snappy */
      var r = btn.getBoundingClientRect();
      targetX = e.clientX - r.left;
      startSpring();
    });

    btn.addEventListener('mouseleave', function() {
      isHovering = false;
      stiffness = 120; damping = 18; /* slow bouncy return like Huly */
      targetX = btn.offsetWidth / 2; /* return to center */
      /* Fade out */
      spot.style.transition = 'opacity 0.5s 0.3s';
      spot.style.opacity = '0';
      btn.classList.remove('glow-on');
      startSpring();
      /* Reset transition after fade completes */
      setTimeout(function() { spot.style.transition = ''; }, 900);
    });
  });

})();
