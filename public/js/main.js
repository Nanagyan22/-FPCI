// ============================================================
// FPCI MAIN JAVASCRIPT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

  // Sidebar toggle for mobile
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  if (sidebarToggle) {
    sidebarToggle.style.display = 'flex';
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Auto-dismiss alerts
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'all 0.4s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 400);
    }, 5000);
  });

  // Animate KPI values
  document.querySelectorAll('.kpi-value').forEach(el => {
    const text = el.textContent.trim();
    const num = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (num > 0 && !isNaN(num)) {
      let start = 0;
      const duration = 1200;
      const step = num / (duration / 16);
      const prefix = text.replace(/[\d,.]+/, '').trim().split('').filter((c,i) => i < text.indexOf(text.match(/\d/)[0])).join('');
      const timer = setInterval(() => {
        start = Math.min(start + step, num);
        el.textContent = prefix + Math.floor(start).toLocaleString();
        if (start >= num) {
          el.textContent = text;
          clearInterval(timer);
        }
      }, 16);
    }
  });

  // Animate progress bars
  document.querySelectorAll('.progress-fill').forEach(bar => {
    const width = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = width; }, 200);
  });

});

// Tab switcher
function switchTab(tab) {
  document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.remove('hidden');
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    if (btn.textContent.toLowerCase().includes(tab)) btn.classList.add('active');
  });
}

// Reset form
function resetForm(formId) {
  if (confirm('Reset all form fields?')) {
    document.getElementById(formId).reset();
    // Clear totals
    ['weeklyTotal','monthlyIncomeTotal','monthlyExpenseTotal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0.00';
    });
    // Clear signatures
    document.querySelectorAll('.signature-pad').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    document.querySelectorAll('[id$="SigData"]').forEach(inp => inp.value = '');
  }
}
