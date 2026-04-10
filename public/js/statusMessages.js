/**
 * STATUS MESSAGES FEATURE
 * Quick one-click status updates
 */

// Store user statuses
const userStatuses = {};

// Predefined status messages
const STATUS_OPTIONS = [
    { id: 'on-way', text: 'On my way', icon: '🚗', color: '#4a90e2' },
    { id: 'almost-there', text: 'Almost there', icon: '⏱️', color: '#f39c12' },
    { id: 'arrived', text: 'Arrived', icon: '✅', color: '#27ae60' },
    { id: 'running-late', text: 'Running late', icon: '⚠️', color: '#e74c3c' },
    { id: 'waiting', text: 'Waiting', icon: '⏸️', color: '#9b59b6' },
    { id: 'need-help', text: 'Need help', icon: '🆘', color: '#e74c3c' }
];

/**
 * Set user status
 * @param {string} statusId - Status ID from STATUS_OPTIONS
 */
function setMyStatus(statusId) {
    const status = STATUS_OPTIONS.find(s => s.id === statusId);
    if (!status) return;
    
    // Store locally
    userStatuses[socket.id] = status;
    
    // Broadcast to room
    socket.emit('set-status', {
        statusId: statusId,
        text: status.text,
        icon: status.icon,
        color: status.color
    });
    
    // Show in activity feed
    addActivityItem(`You: ${status.icon} ${status.text}`);
    
    // Refresh user list
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
    
    // Hide status dropdown
    toggleStatusDropdown();
}

/**
 * Clear user status
 */
function clearMyStatus() {
    delete userStatuses[socket.id];
    
    // Broadcast to room
    socket.emit('clear-status');
    
    // Refresh user list
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
}

/**
 * Get user's current status
 * @param {string} userId - User ID
 * @returns {object|null} Status object or null
 */
function getUserStatus(userId) {
    return userStatuses[userId] || null;
}

/**
 * Handle status update from other users
 */
socket.on('user-status-updated', (data) => {
    const { userId, statusId, text, icon, color, username } = data;
    
    if (statusId) {
        userStatuses[userId] = { id: statusId, text, icon, color };
        
        // Show in activity feed
        addActivityItem(`${username}: ${icon} ${text}`);
    } else {
        // Status cleared
        delete userStatuses[userId];
    }
    
    // Refresh user list
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
});

/**
 * Toggle status dropdown
 */
function toggleStatusDropdown() {
    const dropdown = document.getElementById('statusDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Render status dropdown menu
 * @returns {string} HTML for status dropdown
 */
function renderStatusDropdown() {
    const currentStatus = userStatuses[socket.id];
    
    let html = '<div class="status-dropdown" id="statusDropdown" style="display: none;">';
    
    STATUS_OPTIONS.forEach(status => {
        html += `
            <div class="status-option" onclick="setMyStatus('${status.id}')">
                <span class="status-icon">${status.icon}</span>
                <span class="status-text">${status.text}</span>
            </div>
        `;
    });
    
    if (currentStatus) {
        html += `
            <div class="status-option status-clear" onclick="clearMyStatus()">
                <span class="status-icon">❌</span>
                <span class="status-text">Clear Status</span>
            </div>
        `;
    }
    
    html += '</div>';
    
    return html;
}

/**
 * Get status display for user list
 * @param {string} userId - User ID
 * @returns {string} HTML for status display
 */
function getStatusDisplay(userId) {
    const status = userStatuses[userId];
    if (!status) return '';
    
    return `<span class="user-status" style="color: ${status.color};">${status.icon} ${status.text}</span>`;
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('statusDropdown');
    const statusBtn = document.getElementById('myStatusBtn');
    
    if (dropdown && statusBtn && 
        !dropdown.contains(e.target) && 
        !statusBtn.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});
