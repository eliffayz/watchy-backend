const db = require('../config/db');

/**
 * Send push notifications via Expo Push Notification API
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body/message
 * @param {Object} [options.data] - Custom data payload
 * @param {string} [options.userId] - Target single user (optional)
 * @param {string} [options.audience] - 'All Users', 'PRO Users', 'Free Users' (optional)
 */
async function sendPushNotification({ title, body, data = {}, userId = null, audience = 'All Users' }) {
  try {
    let tokens = [];

    if (userId) {
      const res = await db.query('SELECT token FROM push_tokens WHERE user_id = $1', [userId]);
      tokens = res.rows.map(r => r.token);
    } else {
      let query = 'SELECT pt.token FROM push_tokens pt';
      const joins = [];
      const wheres = [];
      const params = [];

      if (audience === 'PRO Users') {
        joins.push('JOIN users u ON pt.user_id = u.id');
        joins.push("JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.expires_at > NOW()");
      } else if (audience === 'Free Users') {
        joins.push('LEFT JOIN users u ON pt.user_id = u.id');
        joins.push("LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.expires_at > NOW()");
        wheres.push('s.id IS NULL');
      }

      if (joins.length > 0) query += ' ' + joins.join(' ');
      if (wheres.length > 0) query += ' WHERE ' + wheres.join(' AND ');

      const res = await db.query(query, params);
      tokens = res.rows.map(r => r.token);
    }

    // Filter valid Expo push tokens
    const validTokens = tokens.filter(t => typeof t === 'string' && (t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')));

    console.log(`[PushService] Sending push to ${validTokens.length} devices for: "${title}"`);

    if (validTokens.length === 0) {
      console.log('[PushService] No valid push tokens found to send.');
      return { success: true, count: 0 };
    }

    // Split tokens into chunks of 100 for Expo Push API
    const chunks = [];
    const chunkSize = 100;
    for (let i = 0; i < validTokens.length; i += chunkSize) {
      chunks.push(validTokens.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const messages = chunk.map(to => ({
        to,
        sound: 'default',
        title,
        body,
        data,
        badge: 1,
        color: '#F5C518',
        priority: 'high',
        channelId: 'default',
      }));

      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        const resData = await response.json().catch(() => ({}));
        console.log('[PushService] Expo Push API response status:', response.status, resData);
      } catch (err) {
        console.error('[PushService] Chunk send error:', err.message);
      }
    }

    return { success: true, count: validTokens.length };
  } catch (error) {
    console.error('[PushService] Error in sendPushNotification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
};
