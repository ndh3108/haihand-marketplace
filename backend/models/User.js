const mongoose = require('mongoose');
const { AddressBookSchema, AddressSnapshotSchema } = require('./schemas/Address');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true }, 
    email: { type: String, required: true, unique: true }, 
    password: { type: String, required: true }, 
    phone: { type: String, default: '' }, 
    address: { type: String, default: '' }, // legacy free-text, kept in sync with default address
    addresses: { type: [AddressBookSchema], default: [] },
    role: { type: String, default: 'Khách hàng' }, 
    avatar: { type: String, default: '' },
    avatarFrame: { type: String, default: 'none' },
    profileTitle: { type: String, default: 'Người Mới' },
    bio: { type: String, default: '' },
    cccd: { type: String, default: '' },
    taxId: { type: String, default: '' },
    gender: { type: String, default: '' },
    dob: { type: String, default: '' },
    username: { type: String, sparse: true },
    isVerified: { type: Boolean, default: false },

    // B2C Multi-Vendor Seller Fields
    isSeller: { type: Boolean, default: false },
    sellerStatus: { 
        type: String, 
        enum: ['none', 'pending', 'approved', 'rejected'], 
        default: 'none' 
    },
    sellerAppliedAt: { type: Date },
    sellerApprovedAt: { type: Date },
    sellerRejectionReason: { type: String, default: '' },
    shopInfo: {
        shopName: { type: String, default: '' },
        description: { type: String, default: '' },
        address: { type: String, default: '' },
        avatar: { type: String, default: '' },
        banner: { type: String, default: '' },
        phone: { type: String, default: '' },
        taxCode: { type: String, default: '' },
        pickupAddress: { type: AddressSnapshotSchema, default: undefined } // shipping origin
    },

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    status: { type: String, enum: ['active', 'locked'], default: 'active' },
    lockReason: { type: String, default: '' },
    lockedUntil: { type: Date, default: null },
    isBanned: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
    }],
    walletBalance: { type: Number, default: 0 },
    pendingBalance: { type: Number, default: 0 },
    isWalletActive: { type: Boolean, default: false },
    walletPhone: { type: String, default: '' },
    walletPin: { type: String, default: '' },
    walletRegisteredAt: { type: Date },
    firebaseUid: { type: String, default: '', sparse: true },
    lastActive: { type: Date, default: Date.now },
    bankInfo: {
        name: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        accountName: { type: String, default: '' }
    }
}, {
    timestamps: true
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;