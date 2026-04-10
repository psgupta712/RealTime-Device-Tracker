/**
 * ACTIVITY FEED FEATURE
 * Shows real-time activity updates
 */

const MAX_ACTIVITY_ITEMS = 50; // Keep last 50 activities
const activityItems = [];

/**
 * Add activity item to feed
 * @param {string} message - Activity message
 * @param {string} type - Activity type (info, warning, success, error)
 */
function addActivityItem(message, type = 'info') {
    const timestamp = new Date();
    
    const activity = {
        message,
        type,
        timestamp,
        id: Date.now()
    };
    
    // Add to array
    activityItems.unshift(activity);
    
    // Keep only recent items
    if (activityItems.length > MAX_ACTIVITY_ITEMS) {
        activityItems.pop();
    }
    
    // Update display
    updateActivityFeed();
}

/**
 * Update activity feed display
 */
function updateActivityFeed() {
    const feedContainer = document.getElementById('activityFeed');
    if (!feedContainer) return;
    
    // Show only last 10 items
    const recentItems = activityItems.slice(0, 10);
    
    if (recentItems.length === 0) {
        feedContainer.innerHTML = '<div class="activity-empty">No recent activity</div>';
        return;
    }
    
    const html = recentItems.map(item => {
        const timeStr = formatActivityTime(item.timestamp);
        const iconClass = getActivityIcon(item.type);
        
        return `
            <div class="activity-item activity-${item.type}">
                <span class="activity-icon">${iconClass}</span>
                <div class="activity-content">
                    <div class="activity-message">${item.message}</div>
                    <div class="activity-time">${timeStr}</div>
                </div>
            </div>
        `;
    }).join('');
    
    feedContainer.innerHTML = html;
}

/**
 * Format activity timestamp
 * @param {Date} timestamp - Timestamp
 * @returns {string} Formatted time string
 */
function formatActivityTime(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) {
        return 'Just now';
    } else if (minutes < 60) {
        return `${minutes}m ago`;
    } else if (hours < 24) {
        return `${hours}h ago`;
    } else {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

/**
 * Get icon for activity type
 * @param {string} type - Activity type
 * @returns {string} Icon emoji
 */
function getActivityIcon(type) {
    const icons = {
        info: 'ℹ️',
        warning: '⚠️',
        success: '✅',
        error: '❌',
        user: '👤',
        location: '📍',
        message: '💬'
    };
    return icons[type] || icons.info;
}

/**
 * Toggle activity feed visibility
 */
function toggleActivityFeed() {
    const panel = document.getElementById('activityPanel');
    if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'block' : 'none';
    }
}

/**
 * Clear all activity items
 */
function clearActivityFeed() {
    activityItems.length = 0;
    updateActivityFeed();
}

// Listen for user joined event
socket.on('user-joined-room', (data) => {
    addActivityItem(`${data.username} joined the room`, 'user');
});

// Listen for user left event
socket.on('user-left-room', (data) => {
    addActivityItem(`${data.username} left the room`, 'user');
});

// Auto-update timestamps every 30 seconds
setInterval(() => {
    updateActivityFeed();
}, 30000);
