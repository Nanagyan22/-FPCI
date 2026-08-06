// ============================================================
// FPCI FORMS JS - Signatures + Auto-Calc + Pastor Loading
// ============================================================

// ---- SIGNATURE PADS ----
function initSignaturePad(canvasId, dataId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var drawing = false;
  var lastX = 0, lastY = 0;

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var client = e.touches ? e.touches[0] : e;
    return {
      x: (client.clientX - rect.left) * (canvas.width / rect.width),
      y: (client.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  // Draw baseline
  ctx.strokeStyle = '#e8d5c4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, canvas.height - 15);
  ctx.lineTo(canvas.width - 10, canvas.height - 15);
  ctx.stroke();
  ctx.strokeStyle = '#1a0a03';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  canvas.addEventListener('mousedown', function(e) { drawing = true; var p = getPos(e); lastX = p.x; lastY = p.y; });
  canvas.addEventListener('mousemove', function(e) {
    if (!drawing) return;
    var p = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y;
    saveSig(canvasId, dataId);
  });
  canvas.addEventListener('mouseup', function() { drawing = false; });
  canvas.addEventListener('mouseleave', function() { drawing = false; });
  canvas.addEventListener('touchstart', function(e) { e.preventDefault(); drawing = true; var p = getPos(e); lastX = p.x; lastY = p.y; }, { passive: false });
  canvas.addEventListener('touchmove', function(e) {
    if (!drawing) return; e.preventDefault();
    var p = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke();
    lastX = p.x; lastY = p.y;
    saveSig(canvasId, dataId);
  }, { passive: false });
  canvas.addEventListener('touchend', function() { drawing = false; });
}

function saveSig(canvasId, dataId) {
  var c = document.getElementById(canvasId);
  var inp = document.getElementById(dataId);
  if (c && inp) inp.value = c.toDataURL('image/png');
}

function clearSig(canvasId, dataId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#e8d5c4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, canvas.height - 15);
  ctx.lineTo(canvas.width - 10, canvas.height - 15);
  ctx.stroke();
  var inp = document.getElementById(dataId);
  if (inp) inp.value = '';
}

// ---- CALCULATIONS ----
function sumInputs(selector) {
  var total = 0;
  document.querySelectorAll(selector).forEach(function(inp) {
    total += parseFloat(inp.value) || 0;
  });
  return total;
}

function fmt(n) {
  return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function calcWeeklyTotal() {
  var total = sumInputs('.w-finance');
  var el = document.getElementById('weeklyTotal');
  if (el) el.textContent = fmt(total);
}

function calcMonthlyTotals() {
  var income = sumInputs('.m-income');
  var expense = sumInputs('.m-expense');
  var surplus = income - expense;

  var iEl = document.getElementById('monthlyIncomeTotal');
  var eEl = document.getElementById('monthlyExpenseTotal');
  var sEl = document.getElementById('incomeOverExp');

  if (iEl) iEl.textContent = fmt(income);
  if (eEl) eEl.textContent = fmt(expense);
  if (sEl) {
    sEl.textContent = 'GH¢ ' + fmt(Math.abs(surplus));
    sEl.style.color = surplus >= 0 ? '#4ade80' : '#f87171';
  }
}

// ---- LOAD PASTORS ----
function loadPastors(branchId, formType) {
  if (!branchId) return;
  var selectId = formType === 'weekly' ? 'weeklyPastorSelect' : 'monthlyPastorSelect';
  var select = document.getElementById(selectId);
  if (!select) return;

  fetch('/api/branches/' + branchId + '/pastors')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var current = select.value;
      select.innerHTML = '<option value="">-- Select Pastor --</option>';
      if (data.pastors && data.pastors.length > 0) {
        data.pastors.forEach(function(p) {
          var name = (p.title || 'Pastor') + ' ' + p.firstName + ' ' + p.lastName;
          var opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          if (current === name) opt.selected = true;
          select.appendChild(opt);
        });
      } else {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '(No pastors assigned to this branch yet)';
        opt.disabled = true;
        select.appendChild(opt);
      }
    })
    .catch(function(err) { console.warn('Pastor load error:', err); });
}

// ---- RESET FORM ----
function resetFormFields(formId) {
  if (!confirm('Reset all fields? This cannot be undone.')) return;
  var form = document.getElementById(formId);
  if (form) form.reset();

  // Clear custom fields
  ['weeklyCustomFinance','monthlyCustomIncome','monthlyCustomExpense'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  // Clear signatures
  ['weeklyPreparedSig','weeklyPastorSig','monthlyPreparedSig','monthlyPastorSig'].forEach(function(id) {
    clearSig(id, id + 'Data');
  });

  // Reset totals
  ['weeklyTotal','monthlyIncomeTotal','monthlyExpenseTotal'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '0.00';
  });
  var sEl = document.getElementById('incomeOverExp');
  if (sEl) { sEl.textContent = 'GH¢ 0.00'; sEl.style.color = '#4ade80'; }
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
  // Init signature pads
  ['weeklyPreparedSig','weeklyPastorSig','monthlyPreparedSig','monthlyPastorSig'].forEach(function(id) {
    initSignaturePad(id, id + 'Data');
  });

  // Attach calc listeners
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('w-finance')) calcWeeklyTotal();
    if (e.target.classList.contains('m-income') || e.target.classList.contains('m-expense')) calcMonthlyTotals();
  });

  // Submit button loading state
  ['weeklyForm','monthlyForm'].forEach(function(fId) {
    var form = document.getElementById(fId);
    if (!form) return;
    form.addEventListener('submit', function() {
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      }
    });
  });
});
