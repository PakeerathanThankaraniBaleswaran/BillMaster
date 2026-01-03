import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: false, // Made optional to support OAuth users
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
      validate: {
        validator: function(value) {
          // If OAuth user, password can be empty
          if (this.isOAuthUser || this.oAuthProvider) {
            return true
          }
          // For regular users, password is required and must be at least 6 chars
          return value && value.length >= 6
        },
        message: 'Password must be at least 6 characters for non-OAuth users'
      }
    },
    isOAuthUser: {
      type: Boolean,
      default: false,
    },
    oAuthProvider: {
      type: String,
      enum: ['google', 'github', null],
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
)

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Skip password hashing for OAuth users or if password is not modified
  if (this.isOAuthUser || !this.isModified('password') || !this.password) {
    return next()
  }

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject()
  delete user.password
  return user
}

const User = mongoose.model('User', userSchema)

export default User

