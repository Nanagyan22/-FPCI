// ============================================================
// FPCI FORMS JS - Mobile-Friendly Signatures + Calc + Pastors
// ============================================================

// ---- SIGNATURE PAD ----
var signaturePads = {};

function initSignaturePad(canvasId, dataId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Make canvas fill its container width
  function resizeCanvas() {
    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width || 380;
    canvas.height = 90;
    drawBaseline(canvas);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  var ctx = canvas.getContext('2d');
  var drawing = false;
  var lastX = 0, lastY = 0;

  function drawBaseline(c) {
    var cx = c.getContext('2d');
    cx.strokeStyle = '#e8d5c4';
    cx.lineWidth = 1;
    cx.beginPath();
    cx.moveTo(10, c.height - 12);
    cx.lineTo(c.width - 10, c.height - 12);
    cx.stroke();
  }

  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var client = e.touches ? e.touches[0] : e;
    return {
      x: (client.clientX - rect.left) * scaleX,
      y: (client.clientY - rect.top) * scaleY
    };
  }

  ctx.strokeStyle = '#1a0a03';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    var p = getPos(e);
    lastX = p.x; lastY = p.y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
    saveSignature(canvasId, dataId);
  }

  function endDraw(e) {
    drawing = false;
  }

  canvas.addEventListener('mousedown', startDraw, { passive: false });
  canvas.addEventListener('mousemove', draw, { passive: false });
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw, { passive: false });

  signaturePads[canvasId] = canvas;
}

function saveSignature(canvasId, dataId) {
  var canvas = document.getElementById(canvasId);
  var input  = document.getElementById(dataId);
  if (canvas && input) input.value = canvas.toDataURL('image/png');
}

function clearSig(canvasId, dataId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#e8d5c4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, canvas.height - 12);
  ctx.lineTo(canvas.width - 10, canvas.height - 12);
  ctx.stroke();
  var input = document.getElementById(dataId);
  if (input) input.value = '';
}

// ---- FINANCIAL CALCULATIONS ----
function fmt(n) {
  return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumByClass(cls) {
  var total = 0;
  document.querySelectorAll('.' + cls).forEach(function(inp) {
    total += parseFloat(inp.value) || 0;
  });
  return total;
}

function calcWeeklyTotal() {
  var total = sumByClass('w-finance');
  var el = document.getElementById('weeklyTotal');
  if (el) el.textContent = fmt(total);
}

function calcMonthlyTotals() {
  var income  = sumByClass('m-income');
  var expense = sumByClass('m-expense');
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

// ---- CUSTOM FIELD BUILDER ----
function addCustomField(containerId, labelName, amountName, calcClass) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var row = document.createElement('div');
  row.className = 'custom-field-row';

  var labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.name = labelName;
  labelInput.className = 'form-control';
  labelInput.placeholder = 'e.g. Harvest Offering';
  labelInput.required = true;

  var amtWrapper = document.createElement('div');
  amtWrapper.className = 'input-group';
  amtWrapper.style.margin = '0';

  var prefix = document.createElement('span');
  prefix.className = 'input-prefix';
  prefix.style.padding = '8px 9px';
  prefix.style.fontSize = '11px';
  prefix.textContent = 'GH¢';

  var amtInput = document.createElement('input');
  amtInput.type = 'number';
  amtInput.name = amountName;
  amtInput.className = 'form-control financial ' + calcClass;
  amtInput.min = '0';
  amtInput.step = '0.01';
  amtInput.placeholder = '0.00';
  amtInput.addEventListener('input', function() {
    if (calcClass === 'w-finance') calcWeeklyTotal();
    else calcMonthlyTotals();
  });

  var removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-field-btn';
  removeBtn.innerHTML = '<i class="fas fa-times"></i>';
  removeBtn.addEventListener('click', function() {
    container.removeChild(row);
    if (calcClass === 'w-finance') calcWeeklyTotal();
    else calcMonthlyTotals();
  });

  amtWrapper.appendChild(prefix);
  amtWrapper.appendChild(amtInput);
  row.appendChild(labelInput);
  row.appendChild(amtWrapper);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

// ---- LOAD PASTORS FOR BRANCH ----
function loadPastors(branchId, formType) {
  if (!branchId) return;
  var selectId = formType === 'weekly' ? 'weeklyPastorSelect' : 'monthlyPastorSelect';
  var select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Loading...</option>';

  fetch('/api/branches/' + branchId + '/pastors')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      select.innerHTML = '<option value="">-- Select Pastor --</option>';
      if (data.pastors && data.pastors.length > 0) {
        data.pastors.forEach(function(p) {
          var name = (p.title||'Pastor') + ' ' + p.firstName + ' ' + p.lastName;
          var opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        });
      } else {
        var opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '(No pastors in this branch — type name below)';
        opt.disabled = true;
        select.appendChild(opt);
        // Allow free text by changing to input
      }
    })
    .catch(function() {
      select.innerHTML = '<option value="">Error loading pastors</option>';
    });
}

// ---- RESET FORM ----
function resetFormFields(formId) {
  if (!confirm('Reset all fields?')) return;
  var form = document.getElementById(formId);
  if (form) form.reset();

  ['weeklyCustomFinance','monthlyCustomIncome','monthlyCustomExpense'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = '';
  });

  ['weeklyPreparedSig','weeklyPastorSig','monthlyPreparedSig','monthlyPastorSig'].forEach(function(id) {
    clearSig(id, id + 'Data');
  });

  calcWeeklyTotal();
  calcMonthlyTotals();
}

// ---- TAB SWITCHING ----
function switchFormTab(tab) {
  var wEl = document.getElementById('tab-weekly');
  var mEl = document.getElementById('tab-monthly');
  var wBtn = document.getElementById('btnWeekly');
  var mBtn = document.getElementById('btnMonthly');

  if (tab === 'monthly') {
    if (wEl) wEl.style.display = 'none';
    if (mEl) mEl.style.display = 'block';
    if (wBtn) wBtn.classList.remove('active');
    if (mBtn) mBtn.classList.add('active');
  } else {
    if (mEl) mEl.style.display = 'none';
    if (wEl) wEl.style.display = 'block';
    if (mBtn) mBtn.classList.remove('active');
    if (wBtn) wBtn.classList.add('active');
  }
  window.scrollTo(0, 0);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', function() {
  // Init signature pads
  ['weeklyPreparedSig','weeklyPastorSig','monthlyPreparedSig','monthlyPastorSig'].forEach(function(id) {
    initSignaturePad(id, id + 'Data');
  });

  // Attach calc to existing fields
  document.addEventListener('input', function(e) {
    if (e.target.classList.contains('w-finance'))  calcWeeklyTotal();
    if (e.target.classList.contains('m-income') || e.target.classList.contains('m-expense')) calcMonthlyTotals();
  });

  // Submit spinners
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

  // Set active tab from URL
  var urlParams = new URLSearchParams(window.location.search);
  var tab = urlParams.get('tab') || 'weekly';
  if (typeof switchFormTab === 'function') switchFormTab(tab);
});
