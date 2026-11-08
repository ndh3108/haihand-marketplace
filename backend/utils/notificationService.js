const mongoose = require('mongoose');
const Notification = require('../models/Notification');

let _io = null;
let _getUserSockets = null;

/**
 * Initialize the notification service with Socket.IO and optional socket resolver
 * @param {object} io - Socket.IO server instance
 * @param {function} getUserSockets - Optional resolver for user socket IDs
 */
function init(io, getUserSockets) {
  _io = io;
  if (typeof getUserSockets === 'function') {
    _getUserSockets = getUserSockets;
  }
}

/**
 * Send real-time notification to a buyer, seller, or specific user
 */
async function sendNotification(target, title, message, type = 'SYSTEM', link = '/', extra = {}) {
  try {
    let notifData;
    if (target && typeof target === 'object' && !(target instanceof mongoose.Types.ObjectId) && !target._bsontype) {
      notifData = { ...target };
    } else {
      notifData = {
        userId: target,
        title,
        message,
        type,
        link,
        targetUrl: link,
        ...extra
      };
    }

    const uId = notifData.userId || notifData.user || notifData.shopId;
    const sId = notifData.shopId || ((notifData.recipientRole === 'seller' || notifData.targetRole === 'seller') ? uId : undefined);
    const resolvedRole = notifData.targetRole || notifData.recipientRole || (sId ? 'seller' : 'buyer');

    const notif = await Notification.create({
      ...notifData,
      userId: uId,
      user: uId,
      shopId: sId,
      targetRole: resolvedRole,
      recipientRole: resolvedRole,
      title: notifData.title || title || 'Thông báo',
      message: notifData.message || message || '',
      type: notifData.type || type || 'SYSTEM',
      link: notifData.link || notifData.targetUrl || link || '/',
      targetUrl: notifData.targetUrl || notifData.link || link || '/'
    });

    // If this is an admin-level notification, route strictly to admin_system_room and NEVER personal user rooms
    if (resolvedRole === 'admin') {
      if (_io) {
        _io.to('admin_system_room').emit('new_admin_notification', notif);
      }
      return notif;
    }

    // 1. Emit personal notifications to user-specific Socket.IO room (e.g. 'user_' + userId)
    if (_io && uId) {
      const userRoom = 'user_' + uId.toString();
      _io.to(userRoom).emit('new_notification', notif);

      // If this is a seller-specific notification and shopId differs, emit to shop room too
      if (sId && sId.toString() !== uId.toString()) {
        _io.to('user_' + sId.toString()).emit('new_notification', notif);
      }
    }

    // 2. Backward compatibility: also emit to individual socket IDs if tracked
    if (typeof _getUserSockets === 'function' && uId && _io) {
      const receiverSockets = _getUserSockets(uId.toString());
      if (receiverSockets && receiverSockets.length > 0) {
        receiverSockets.forEach(userSocket => {
          _io.to(userSocket.socketId).emit('new_notification', notif);
        });
      }
    }

    return notif;
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Send real-time notification to all connected admins in admin_system_room
 */
async function sendAdminNotification(title, message, targetUrl = '/', type = 'SYSTEM') {
  try {
    const notif = await Notification.create({
      title,
      message,
      type,
      link: targetUrl,
      targetUrl,
      targetRole: 'admin',
      recipientRole: 'admin',
      isRead: false
    });

    // Dedicated Socket.IO room for administrators only
    if (_io) {
      _io.to('admin_system_room').emit('new_admin_notification', notif);
    }

    return notif;
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

module.exports = {
  init,
  sendNotification,
  sendAdminNotification
};
