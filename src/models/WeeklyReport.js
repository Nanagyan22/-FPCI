const mongoose = require('mongoose');

const weeklyReportSchema = new mongoose.Schema({
  reportId: { type: String, unique: true, required: true },
  weeklyDate: { type: Date, required: true },
  weekNumber: { type: Number },
  year: { type: Number },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  branchName: { type: String, required: true },
  daysOfService: [{ type: String, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] }],
  attendance: {
    totalMembership: { type: Number, default: 0 },
    male: { type: Number, default: 0 },
    female: { type: Number, default: 0 },
    children: { type: Number, default: 0 },
    visitors: { type: Number, default: 0 }
  },
  finance: {
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
  preparedBy: { type: String, required: true, trim: true },
  preparedBySignature: { type: String },
  residentPastor: { type: String, required: true, trim: true },
  residentPastorSignature: { type: String },
  status: { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  officeNotes: { type: String },
  submittedViaLink: { type: Boolean, default: false },
  ipAddress: { type: String }
}, { timestamps: true });

weeklyReportSchema.pre('save', function(next) {
  if (this.weeklyDate) {
    const d = new Date(this.weeklyDate);
    this.year = d.getFullYear();
    const start = new Date(d.getFullYear(), 0, 1);
    this.weekNumber = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  }
  const f = this.finance;
  const customF = (f.customFields || []).reduce((s, cf) => s + (cf.amount || 0), 0);
  this.finance.total = (f.tithes||0)+(f.offerings||0)+(f.membershipDues||0)+
    (f.projectOffering||0)+(f.childrenService||0)+(f.seeds||0)+
    (f.pledges||0)+(f.revivalPrograms||0)+(f.bank||0)+(f.otherFunds||0)+customF;
  next();
});

module.exports = mongoose.model('WeeklyReport', weeklyReportSchema);
