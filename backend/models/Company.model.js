import mongoose from 'mongoose'

const companySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One company per user
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot be more than 100 characters'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot be more than 500 characters'],
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State/Province is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    phoneNo: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    administrativeRegion: {
      type: String,
      required: [true, 'Administrative region is required'],
      trim: true,
    },
    taxIdentificationNo: {
      type: String,
      required: [true, 'Tax identification number is required'],
      trim: true,
      unique: true,
    },
    companyLogo: {
      type: String, // Base64 encoded image or URL
      default: null,
    },
    enableManufacturing: {
      type: Boolean,
      default: false,
    },
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
)

const Company = mongoose.model('Company', companySchema)

export default Company