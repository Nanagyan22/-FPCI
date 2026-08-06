const mongoose = require('mongoose');

const pastorSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  title: {
    type: String,
    enum: ['Pastor', 'Reverend', 'Bishop', 'Apostle', 'Prophet', 'Evangelist', 'Deacon', 'Elder'],
    default: 'Pastor'
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  branches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],
  isPrimaryPastor: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  bio: {
    type: String,
    trim: true
  },
  photo: {
    type: String
  }
}, {
  timestamps: true
});

pastorSchema.virtual('fullName').get(function() {
  return `${this.title} ${this.firstName} ${this.lastName}`;
});

pastorSchema.set('toJSON', { virtuals: true });
pastorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Pastor', pastorSchema);
