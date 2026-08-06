const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const formLinkSchema = new mongoose.Schema({
  token: {
    type: String,
    default: () => uuidv4()
  },
  formType: {
    type: String,
    enum: ['weekly', 'monthly', 'both'],
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('FormLink', formLinkSchema);
