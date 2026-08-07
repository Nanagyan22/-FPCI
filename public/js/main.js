// ============================================================
// FPCI MAIN JS - Sidebar + Alerts + Animations
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

  // ---- SIDEBAR TOGGLE (Mobile) ----
  var sidebar = document.getElementById('sidebar');
  var toggleBtn = document.getElementById('sidebarToggle');
  var overlay = document.getElementById('sidebarOverlay');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', function () {
      if (sidebar) sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  // Close sidebar when nav link clicked on mobile
  if (sidebar) {
    sidebar.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth < 992) {
          sidebar.classList.remove('open');
          if (overlay) overlay.classList.remove('open');
        }
      });
    });
  }

  // ---- AUTO-DISMISS ALERTS ----
  document.querySelectorAll('.alert').forEach(function (alert) {
    setTimeout(function () {
      alert.style.transition = 'all 0.4s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-8px)';
      setTimeout(function () { if (alert.parentNode) alert.remove(); }, 400);
    }, 5000);
  });

  // ---- ANIMATE KPI NUMBERS ----
  document.querySelectorAll('.kpi-value').forEach(function (el) {
    var text = el.textContent.trim();
    var numMatch = text.match(/[\d,]+(\.\d+)?/);
    if (!numMatch) return;
    var numStr = numMatch[0].replace(/,/g, '');
    var num = parseFloat(numStr);
    if (isNaN(num) || num === 0) return;
    var prefix = text.substring(0, text.indexOf(numMatch[0]));
    var suffix = text.substring(text.indexOf(numMatch[0]) + numMatch[0].length);
    var start = 0;
    var duration = 1000;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var val = Math.floor(progress * num);
      el.textContent = prefix + val.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = text;
    }
    requestAnimationFrame(step);
  });

  // ---- ANIMATE PROGRESS BARS ----
  document.querySelectorAll('.progress-fill').forEach(function (bar) {
    var width = bar.style.width;
    bar.style.width = '0%';
    setTimeout(function () { bar.style.width = width; }, 200);
  });

});
