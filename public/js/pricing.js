// Currency auto-detection via Cloudflare cdn-cgi/trace
var EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
async function detectCurrency() {
  try {
    var res = await fetch('/cdn-cgi/trace');
    var text = await res.text();
    var loc = (text.match(/loc=(\w+)/) || [])[1] || '';
    var symbol = '$', rate = 1;
    if (loc === 'GB') { symbol = '\u00A3'; rate = 0.80; }
    else if (EU.includes(loc)) { symbol = '\u20AC'; rate = 0.92; }
    else { return; }
    document.querySelectorAll('[data-usd]').forEach(function(el) {
      var usd = parseFloat(el.dataset.usd || '0');
      var converted = usd * rate;
      var formatted = converted < 1 && converted > 0
        ? symbol + converted.toFixed(3)
        : symbol + Math.round(converted);
      el.textContent = formatted;
    });
  } catch(e) {}
}
detectCurrency();
