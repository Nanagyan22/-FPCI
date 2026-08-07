const express  = require('express');
const router   = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const MonthlyReport = require('../models/MonthlyReport');
const WeeklyReport  = require('../models/WeeklyReport');
const Branch        = require('../models/Branch');
const moment        = require('moment');
const ExcelJS       = require('exceljs');
const PDFDocument   = require('pdfkit');

// ── helpers ──────────────────────────────────────────────
function buildFilter(query) {
  const { type='monthly', branch='', year='', month='', status='' } = query;
  const filter = {};
  if (branch) filter.branch = branch;
  if (year)   filter.year   = parseInt(year);
  if (month)  filter.month  = parseInt(month);
  if (status) filter.status = status;
  return filter;
}

// ── MAIN LIST ────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { type='monthly', page=1 } = req.query;
    const limit = 20;
    const skip  = (parseInt(page)-1) * limit;
    const filter = buildFilter(req.query);

    let reports, total;
    if (type === 'weekly') {
      reports = await WeeklyReport.find(filter).populate('branch','name code').sort({ weeklyDate:-1 }).skip(skip).limit(limit);
      total   = await WeeklyReport.countDocuments(filter);
    } else {
      reports = await MonthlyReport.find(filter).populate('branch','name code').sort({ year:-1, month:-1 }).skip(skip).limit(limit);
      total   = await MonthlyReport.countDocuments(filter);
    }

    const branches = await Branch.find({ isActive:true }).sort('name');
    const years = [];
    for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);

    res.render('reports/index', {
      title:'Reports Data - FPCI', reports, type, branches, years,
      filters: { branch: req.query.branch||'', year: req.query.year||'', month: req.query.month||'', status: req.query.status||'' },
      pagination: { current:parseInt(page), total:Math.ceil(total/limit)||1, totalRecords:total },
      moment,
      success_msg: req.flash('success_msg'),
      error_msg:   req.flash('error_msg')
    });
  } catch (error) {
    console.error('Reports error:', error);
    req.flash('error_msg','Error loading reports: '+error.message);
    res.redirect('/dashboard');
  }
});

// ── VIEW SINGLE ──────────────────────────────────────────
router.get('/view/:type/:id', requireAuth, async (req, res) => {
  try {
    let report;
    if (req.params.type==='weekly') {
      report = await WeeklyReport.findById(req.params.id).populate('branch');
    } else {
      report = await MonthlyReport.findById(req.params.id).populate('branch');
    }
    if (!report) { req.flash('error_msg','Report not found'); return res.redirect('/reports'); }
    res.render('reports/view', {
      title:`Report ${report.reportId} - FPCI`, report, type:req.params.type, moment,
      success_msg: req.flash('success_msg'), error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg','Error loading report');
    res.redirect('/reports');
  }
});

// ── STATUS UPDATE ────────────────────────────────────────
router.put('/:type/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, officeNotes } = req.body;
    const Model = req.params.type==='weekly' ? WeeklyReport : MonthlyReport;
    await Model.findByIdAndUpdate(req.params.id, { status, officeNotes });
    req.flash('success_msg',`Report ${status}`);
    res.redirect(`/reports/view/${req.params.type}/${req.params.id}`);
  } catch (error) {
    req.flash('error_msg','Error updating report');
    res.redirect('/reports');
  }
});

// ── EXCEL EXPORT ─────────────────────────────────────────
router.get('/export/excel', requireAuth, async (req, res) => {
  try {
    const { type='monthly' } = req.query;
    const filter = buildFilter(req.query);

    let reports;
    if (type === 'weekly') {
      reports = await WeeklyReport.find(filter).populate('branch','name').sort({ weeklyDate:-1 });
    } else {
      reports = await MonthlyReport.find(filter).populate('branch','name').sort({ year:-1, month:-1 });
    }

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'FPCI Church Management';
    workbook.created  = new Date();

    const sheet = workbook.addWorksheet(type === 'monthly' ? 'Monthly Reports' : 'Weekly Reports');

    // Header style
    const headerFill   = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFAB2A0A' } };
    const headerFont   = { bold:true, color:{ argb:'FFFFFFFF' }, size:11 };
    const headerAlign  = { vertical:'middle', horizontal:'center', wrapText:true };
    const borderStyle  = { style:'thin', color:{ argb:'FFDDDDDD' } };
    const allBorders   = { top:borderStyle, left:borderStyle, bottom:borderStyle, right:borderStyle };

    if (type === 'monthly') {
      sheet.columns = [
        { header:'Report ID',        key:'reportId',      width:22 },
        { header:'Month',            key:'month',         width:12 },
        { header:'Year',             key:'year',          width:8  },
        { header:'Branch',           key:'branch',        width:22 },
        { header:'Male',             key:'male',          width:8  },
        { header:'Female',           key:'female',        width:8  },
        { header:'Children',         key:'children',      width:10 },
        { header:'Visitors',         key:'visitors',      width:10 },
        { header:'Souls Added',      key:'souls',         width:12 },
        { header:'Tithes (GH¢)',     key:'tithes',        width:14 },
        { header:'Offerings (GH¢)',  key:'offerings',     width:16 },
        { header:'Mbr Dues (GH¢)',   key:'memberDues',    width:14 },
        { header:'Project (GH¢)',    key:'project',       width:14 },
        { header:'Children Svc',     key:'childSvc',      width:13 },
        { header:'Seeds (GH¢)',      key:'seeds',         width:12 },
        { header:'Pledges (GH¢)',    key:'pledges',       width:13 },
        { header:'Revival (GH¢)',    key:'revival',       width:13 },
        { header:'Bank (GH¢)',       key:'bank',          width:12 },
        { header:'Other Inc (GH¢)',  key:'otherInc',      width:14 },
        { header:'Total Income',     key:'totalIncome',   width:14 },
        { header:'Light/Premises',   key:'light',         width:14 },
        { header:'Pastor Allow.',    key:'pastorAllow',   width:14 },
        { header:'Other Exp (GH¢)',  key:'otherExp',      width:14 },
        { header:'Total Expenditure',key:'totalExp',      width:18 },
        { header:'Net Surplus',      key:'netSurplus',    width:14 },
        { header:'Prepared By',      key:'preparedBy',    width:18 },
        { header:'Pastor',           key:'pastor',        width:20 },
        { header:'Status',           key:'status',        width:10 },
        { header:'Submitted',        key:'submitted',     width:14 },
      ];

      reports.forEach(r => {
        sheet.addRow({
          reportId:    r.reportId,
          month:       r.monthName,
          year:        r.year,
          branch:      r.branchName,
          male:        r.membership.male,
          female:      r.membership.female,
          children:    r.membership.children,
          visitors:    r.membership.visitors,
          souls:       r.membership.soulsAdded,
          tithes:      r.income.tithes,
          offerings:   r.income.offerings,
          memberDues:  r.income.membershipDues,
          project:     r.income.projectOffering,
          childSvc:    r.income.childrenService,
          seeds:       r.income.seeds,
          pledges:     r.income.pledges,
          revival:     r.income.revivalPrograms,
          bank:        r.income.bank,
          otherInc:    r.income.otherFunds,
          totalIncome: r.income.total,
          light:       r.expenditure.lightChurchPremises,
          pastorAllow: r.expenditure.pastorsAllowance,
          otherExp:    r.expenditure.otherExpenses,
          totalExp:    r.expenditure.total,
          netSurplus:  r.incomeOverExpenditure,
          preparedBy:  r.preparedBy,
          pastor:      r.residentPastor,
          status:      r.status,
          submitted:   moment(r.createdAt).format('DD MMM YYYY'),
        });
      });
    } else {
      sheet.columns = [
        { header:'Report ID',       key:'reportId',    width:22 },
        { header:'Week Date',       key:'date',        width:14 },
        { header:'Branch',          key:'branch',      width:22 },
        { header:'Days of Service', key:'days',        width:20 },
        { header:'Total Members',   key:'totalMembers',width:14 },
        { header:'Male',            key:'male',        width:8  },
        { header:'Female',          key:'female',      width:8  },
        { header:'Children',        key:'children',    width:10 },
        { header:'Visitors',        key:'visitors',    width:10 },
        { header:'Tithes (GH¢)',    key:'tithes',      width:14 },
        { header:'Offerings (GH¢)', key:'offerings',   width:16 },
        { header:'Mbr Dues',        key:'memberDues',  width:12 },
        { header:'Project',         key:'project',     width:12 },
        { header:'Children Svc',    key:'childSvc',    width:13 },
        { header:'Seeds',           key:'seeds',       width:12 },
        { header:'Pledges',         key:'pledges',     width:12 },
        { header:'Revival',         key:'revival',     width:12 },
        { header:'Bank',            key:'bank',        width:12 },
        { header:'Other Funds',     key:'otherFunds',  width:13 },
        { header:'Total Income',    key:'totalIncome', width:14 },
        { header:'Prepared By',     key:'preparedBy',  width:18 },
        { header:'Pastor',          key:'pastor',      width:20 },
        { header:'Status',          key:'status',      width:10 },
        { header:'Submitted',       key:'submitted',   width:14 },
      ];

      reports.forEach(r => {
        sheet.addRow({
          reportId:    r.reportId,
          date:        moment(r.weeklyDate).format('DD MMM YYYY'),
          branch:      r.branchName,
          days:        r.daysOfService.join(', '),
          totalMembers:r.attendance.totalMembership,
          male:        r.attendance.male,
          female:      r.attendance.female,
          children:    r.attendance.children,
          visitors:    r.attendance.visitors,
          tithes:      r.finance.tithes,
          offerings:   r.finance.offerings,
          memberDues:  r.finance.membershipDues,
          project:     r.finance.projectOffering,
          childSvc:    r.finance.childrenService,
          seeds:       r.finance.seeds,
          pledges:     r.finance.pledges,
          revival:     r.finance.revivalPrograms,
          bank:        r.finance.bank,
          otherFunds:  r.finance.otherFunds,
          totalIncome: r.finance.total,
          preparedBy:  r.preparedBy,
          pastor:      r.residentPastor,
          status:      r.status,
          submitted:   moment(r.createdAt).format('DD MMM YYYY'),
        });
      });
    }

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell(cell => {
      cell.fill      = headerFill;
      cell.font      = headerFont;
      cell.alignment = headerAlign;
      cell.border    = allBorders;
    });

    // Style data rows
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      row.eachCell(cell => {
        cell.border = allBorders;
        cell.alignment = { vertical:'middle', wrapText:false };
      });
      if (rowNum % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF8F5' } };
        });
      }
    });

    // Add totals row for income/expenditure columns (monthly)
    if (type === 'monthly' && reports.length > 0) {
      const totalRow = sheet.addRow({
        reportId: 'TOTALS',
        totalIncome: reports.reduce((s,r)=>s+r.income.total,0),
        totalExp:    reports.reduce((s,r)=>s+r.expenditure.total,0),
        netSurplus:  reports.reduce((s,r)=>s+r.incomeOverExpenditure,0),
        souls:       reports.reduce((s,r)=>s+r.membership.soulsAdded,0),
      });
      totalRow.font = { bold:true, size:11 };
      totalRow.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFD700' } };
    }

    const filename = `FPCI_${type}_reports_${moment().format('YYYY-MM-DD')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    req.flash('error_msg','Excel export failed: '+error.message);
    res.redirect('/reports');
  }
});

// ── PDF EXPORT ────────────────────────────────────────────
router.get('/export/pdf', requireAuth, async (req, res) => {
  try {
    const { type='monthly' } = req.query;
    const filter = buildFilter(req.query);

    let reports;
    if (type === 'weekly') {
      reports = await WeeklyReport.find(filter).populate('branch','name').sort({ weeklyDate:-1 }).limit(200);
    } else {
      reports = await MonthlyReport.find(filter).populate('branch','name').sort({ year:-1, month:-1 }).limit(200);
    }

    const doc = new PDFDocument({ margin:30, size:'A4', layout:'landscape' });
    const filename = `FPCI_${type}_reports_${moment().format('YYYY-MM-DD')}.pdf`;

    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
    doc.pipe(res);

    // Title
    doc.fontSize(16).fillColor('#ab2a0a')
       .text(`FPCI Church Management — ${type === 'monthly' ? 'Monthly' : 'Weekly'} Reports`, { align:'center' });
    doc.fontSize(10).fillColor('#666')
       .text(`Generated: ${moment().format('DD MMM YYYY HH:mm')} | Records: ${reports.length}`, { align:'center' });
    doc.moveDown(0.5);

    // Draw a simple table
    const startX = 30;
    let y = doc.y;
    const rowH = 18;

    if (type === 'monthly') {
      const cols = [
        { label:'Report ID',   w:90,  key: r => r.reportId },
        { label:'Month/Year',  w:65,  key: r => `${r.monthName} ${r.year}` },
        { label:'Branch',      w:90,  key: r => r.branchName },
        { label:'Attendance',  w:55,  key: r => r.membership.male+r.membership.female+r.membership.children },
        { label:'Souls',       w:40,  key: r => r.membership.soulsAdded },
        { label:'Income(GH¢)', w:80,  key: r => r.income.total.toLocaleString() },
        { label:'Expend(GH¢)', w:80,  key: r => r.expenditure.total.toLocaleString() },
        { label:'Surplus',     w:75,  key: r => (r.incomeOverExpenditure>=0?'+':'')+r.incomeOverExpenditure.toLocaleString() },
        { label:'Status',      w:50,  key: r => r.status },
      ];
      drawPDFTable(doc, reports, cols, startX, y, rowH);
    } else {
      const cols = [
        { label:'Report ID',   w:100, key: r => r.reportId },
        { label:'Week Date',   w:70,  key: r => moment(r.weeklyDate).format('DD MMM YYYY') },
        { label:'Branch',      w:90,  key: r => r.branchName },
        { label:'Members',     w:55,  key: r => r.attendance.totalMembership },
        { label:'Income(GH¢)', w:80,  key: r => r.finance.total.toLocaleString() },
        { label:'Tithes',      w:70,  key: r => r.finance.tithes.toLocaleString() },
        { label:'Offerings',   w:70,  key: r => r.finance.offerings.toLocaleString() },
        { label:'Status',      w:50,  key: r => r.status },
      ];
      drawPDFTable(doc, reports, cols, startX, y, rowH);
    }

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    req.flash('error_msg','PDF export failed: '+error.message);
    res.redirect('/reports');
  }
});

function drawPDFTable(doc, rows, cols, startX, startY, rowH) {
  const totalW = cols.reduce((s,c)=>s+c.w,0);
  let y = startY;

  // Header
  doc.rect(startX, y, totalW, rowH).fill('#ab2a0a');
  let x = startX;
  cols.forEach(col => {
    doc.fontSize(7).fillColor('#ffffff')
       .text(col.label, x+2, y+5, { width:col.w-4, ellipsis:true });
    x += col.w;
  });
  y += rowH;

  // Rows
  rows.forEach((row, i) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 30;
    }
    const fill = i % 2 === 0 ? '#ffffff' : '#fff8f5';
    doc.rect(startX, y, totalW, rowH).fill(fill);

    x = startX;
    cols.forEach(col => {
      const val = String(col.key(row) || '');
      doc.fontSize(7).fillColor('#222222')
         .text(val, x+2, y+5, { width:col.w-4, ellipsis:true });
      x += col.w;
    });

    // Border
    doc.rect(startX, y, totalW, rowH).stroke('#dddddd');
    y += rowH;
  });
}

module.exports = router;
