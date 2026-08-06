const mongoose = require('mongoose');

const monthlyReportSchema = new mongoose.Schema({
  reportId: { type: String, unique: true, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  monthName: { type: String },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  branchName: { type: String, required: true },
  membership: {
    male: { type: Number, default: 0, min: 0 },
    female: { type: Number, default: 0, min: 0 },
    children: { type: Number, default: 0, min: 0 },
    visitors: { type: Number, default: 0, min: 0 },
    soulsAdded: { type: Number, default: 0, min: 0 }
  },
  income: {
    tithes: { type: Number, default: 0 },
    offerings: { type: Number, default: 0 },
    membershipDues: { type: Number, default: 0 },
    projectOffering: { type: Number, default: 0 },
    childrenService: { type: Number, default: 0 },
    seeds: { type: Number, default: 0 },
    pledges: { type: Number, default: 0 },
    revivalPrograms: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    otherFunds: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    customFields: [{ label: String, amount: { type: Number, default: 0 } }]
  },
  expenditure: {
    lightChurchPremises: { type: Number, default: 0 },
    pastorsAllowance: { type: Number, default: 0 },
    otherExpenses: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    customFields: [{ label: String, amount: { type: Number, default: 0 } }]
  },
  incomeOverExpenditure: { type: Number, default: 0 },
  preparedBy: { type: String, required: true, trim: true },
  preparedBySignature: { type: String },
  residentPastor: { type: String, required: true, trim: true },
  residentPastorSignature: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  officeNotes: { type: String, trim: true },
  submittedViaLink: { type: Boolean, default: false },
  ipAddress: { type: String }
}, { timestamps: true });

monthlyReportSchema.pre('save', function(next) {
  const months = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  this.monthName = months[this.month - 1];

  const inc = this.income;
  const customInc = (inc.customFields || []).reduce((s, f) => s + (f.amount || 0), 0);
  this.income.total = (inc.tithes||0)+(inc.offerings||0)+(inc.membershipDues||0)+
    (inc.projectOffering||0)+(inc.childrenService||0)+(inc.seeds||0)+
    (inc.pledges||0)+(inc.revivalPrograms||0)+(inc.bank||0)+(inc.otherFunds||0)+customInc;

  const exp = this.expenditure;
  const customExp = (exp.customFields || []).reduce((s, f) => s + (f.amount || 0), 0);
  this.expenditure.total = (exp.lightChurchPremises||0)+(exp.pastorsAllowance||0)+(exp.otherExpenses||0)+customExp;

  this.incomeOverExpenditure = this.income.total - this.expenditure.total;
  next();
});

module.exports = mongoose.model('MonthlyReport', monthlyReportSchema);
