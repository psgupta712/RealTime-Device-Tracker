/**
 * BATTERY STATUS FEATURE
 * Shows current battery level and connection status
 */

// Store battery levels
const userBatteryLevels = {};
const userConnectionStatus = {};

/**
 * Initialize battery monitoring
 */
async function initBatteryMonitoring() {
    if ('getBattery' in navigator) {
        try {
            const battery = await navigator.getBattery();
            
            // Send initial battery level
            updateBatteryLevel(battery.level, battery.charging);
            
            // Listen for battery changes
            battery.addEventListener('levelchange', () => {
                updateBatteryLevel(battery.level, battery.charging);
            });
            
            battery.addEventListener('chargingchange', () => {
                updateBatteryLevel(battery.level, battery.charging);
            });
            
        } catch (error) {
            console.log('Battery API not available');
        }
    }
}

/**
 * Update battery level
 * @param {number} level - Battery level (0-1)
 * @param {boolean} charging - Is charging
 */
function updateBatteryLevel(level, charging) {
    const batteryPercent = Math.round(level * 100);
    
    // Store locally
    userBatteryLevels[socket.id] = {
        level: batteryPercent,
        charging: charging
    };
    
    // Send to server
    socket.emit('update-battery', {
        level: batteryPercent,
        charging: charging
    });
}

/**
 * Get battery display for user
 * @param {string} userId - User ID
 * @returns {string} HTML for battery display
 */
function getBatteryDisplay(userId) {
    const battery = userBatteryLevels[userId];
    if (!battery) return '';
    
    const level = battery.level;
    const charging = battery.charging;
    
    let icon = '🔋';
    let color = '#27ae60'; // Green
    
    if (charging) {
        icon = '⚡';
        color = '#f39c12'; // Orange
    } else if (level < 20) {
        icon = '🪫';
        color = '#e74c3c'; // Red
    } else if (level < 50) {
        color = '#f39c12'; // Orange
    }
    
    return `<span class="battery-status" style="color: ${color};" title="Battery: ${level}%">${icon} ${level}%</span>`;
}

/**
 * Get connection status display
 * @param {string} userId - User ID
 * @returns {string} HTML for connection status
 */
function getConnectionDisplay(userId) {
    const status = userConnectionStatus[userId];
    if (!status) return '<span class="connection-status">🟢 Online</span>';
    
    const now = Date.now();
    const lastSeen = now - status.lastUpdate;
    
    if (lastSeen < 5000) {
        return '<span class="connection-status" style="color: #27ae60;">🟢 Online</span>';
    } else if (lastSeen < 30000) {
        return '<span class="connection-status" style="color: #f39c12;">🟡 Slow</span>';
    } else {
        const seconds = Math.floor(lastSeen / 1000);
        return `<span class="connection-status" style="color: #95a5a6;">⚪ ${seconds}s ago</span>`;
    }
}

/**
 * Update connection status
 * @param {string} userId - User ID
 */
function updateConnectionStatus(userId) {
    userConnectionStatus[userId] = {
        lastUpdate: Date.now()
    };
}

/**
 * Handle battery update from other users
 */
socket.on('user-battery-updated', (data) => {
    const { userId, level, charging } = data;
    
    userBatteryLevels[userId] = {
        level,
        charging
    };
    
    // Refresh user list
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
});

/**
 * Monitor connection status periodically
 */
setInterval(() => {
    // Send ping
    socket.emit('ping');
    
    // Refresh user list to update connection statuses
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
}, 5000);

/**
 * Clean up battery data when user disconnects
 * @param {string} userId - User ID
 */
function cleanupBatteryData(userId) {
    delete userBatteryLevels[userId];
    delete userConnectionStatus[userId];
}
