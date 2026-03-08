async function checkAPI() {
  var dot = document.getElementById('api-dot');
  var label = document.getElementById('api-label');
  if (!dot || !label) return;

  try {
    var res = await fetch('https://api.catalyst-neuromorphic.com/health', {
      mode: 'cors',
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-green-400';
      label.textContent = 'Operational';
      label.className = 'text-xs text-green-400/70';
    } else {
      dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400';
      label.textContent = 'Degraded';
      label.className = 'text-xs text-amber-400/70';
    }
  } catch(e) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-red-400';
    label.textContent = 'Unreachable';
    label.className = 'text-xs text-red-400/70';
  }

  var el = document.getElementById('last-checked');
  if (el) el.textContent = 'Last checked: ' + new Date().toLocaleTimeString();
}

checkAPI();
