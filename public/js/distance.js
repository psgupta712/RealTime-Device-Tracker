/**
 * DISTANCE & ETA CALCULATOR
 * Handles all distance calculations and estimated time of arrival
 */

// Store user speeds for ETA calculation
const userSpeeds = {};
const userPreviousLocations = {};
const userLastUpdateTime = {};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - First point latitude
 * @param {number} lon1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lon2 - Second point longitude
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    
    // Convert degrees to radians
    const toRad = (degree) => degree * Math.PI / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    const distance = R * c; // Distance in km
    
    return distance;
}

/**
 * Format distance for display
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string
 */
function formatDistance(km) {
    if (km < 1) {
        // Less than 1 km, show in meters
        return Math.round(km * 1000) + ' m';
    } else if (km < 10) {
        // Less than 10 km, show 1 decimal
        return km.toFixed(1) + ' km';
    } else {
        // 10 km or more, show whole number
        return Math.round(km) + ' km';
    }
}

/**
 * Calculate user's current speed
 * @param {string} userId - User ID
 * @param {number} lat - Current latitude
 * @param {number} lon - Current longitude
 * @returns {number} Speed in km/h
 */
function calculateSpeed(userId, lat, lon) {
    const now = Date.now();
    
    // Check if we have previous location
    if (!userPreviousLocations[userId] || !userLastUpdateTime[userId]) {
        // First location, no speed yet
        userPreviousLocations[userId] = { lat, lon };
        userLastUpdateTime[userId] = now;
        userSpeeds[userId] = 0;
        return 0;
    }
    
    const prev = userPreviousLocations[userId];
    const timeDiff = (now - userLastUpdateTime[userId]) / 1000; // seconds
    
    // Calculate distance moved
    const distanceMoved = calculateDistance(prev.lat, prev.lon, lat, lon);
    
    // Calculate speed (km/h)
    const speed = (distanceMoved / timeDiff) * 3600; // convert to km/h
    
    // Update stored values
    userPreviousLocations[userId] = { lat, lon };
    userLastUpdateTime[userId] = now;
    userSpeeds[userId] = speed;
    
    return speed;
}

/**
 * Get user's current speed
 * @param {string} userId - User ID
 * @returns {number} Speed in km/h
 */
function getUserSpeed(userId) {
    return userSpeeds[userId] || 0;
}

/**
 * Calculate ETA to destination
 * @param {number} distance - Distance in km
 * @param {number} speed - Speed in km/h
 * @returns {string} Formatted ETA string
 */
function calculateETA(distance, speed) {
    // If not moving or very slow speed
    if (speed < 1) {
        return 'Not moving';
    }
    
    // Calculate time in hours
    const timeInHours = distance / speed;
    
    // Convert to minutes
    const totalMinutes = Math.round(timeInHours * 60);
    
    if (totalMinutes < 1) {
        return 'Arriving now';
    } else if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    } else {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (minutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${minutes}m`;
    }
}

/**
 * Get movement status based on speed
 * @param {number} speed - Speed in km/h
 * @returns {string} Status text
 */
function getMovementStatus(speed) {
    if (speed < 1) return 'Stationary';
    if (speed < 5) return 'Walking';
    if (speed < 20) return 'Cycling';
    return 'Driving';
}

/**
 * Clean up data when user disconnects
 * @param {string} userId - User ID
 */
function cleanupUserData(userId) {
    delete userSpeeds[userId];
    delete userPreviousLocations[userId];
    delete userLastUpdateTime[userId];
}
