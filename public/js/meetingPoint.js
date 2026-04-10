/**
 * MEETING POINT FEATURE
 * Allows users to set a meeting point and see distances to it
 */

let meetingPoint = null;
let meetingPointMarker = null;

/**
 * Set a meeting point on the map
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} name - Meeting point name (optional)
 */
function setMeetingPoint(lat, lon, name = 'Meeting Point') {
    // Remove existing meeting point if any
    if (meetingPointMarker) {
        map.removeLayer(meetingPointMarker);
    }
    
    // Store meeting point
    meetingPoint = { lat, lon, name };
    
    // Create custom icon for meeting point
    const meetingIcon = L.divIcon({
        className: 'meeting-point-marker',
        html: `
            <div class="meeting-point-icon">
                <div class="meeting-point-pulse"></div>
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="#ff4444" stroke="white" stroke-width="3"/>
                    <text x="20" y="26" text-anchor="middle" fill="white" font-size="20" font-weight="bold">📍</text>
                </svg>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    // Add marker to map
    meetingPointMarker = L.marker([lat, lon], { icon: meetingIcon })
        .bindPopup(`<strong>${name}</strong><br><button onclick="removeMeetingPoint()" class="btn-remove-meeting">Remove</button>`)
        .addTo(map);
    
    // Broadcast to all users in room
    socket.emit('set-meeting-point', {
        lat,
        lon,
        name
    });
    
    // Show notification
    addActivityItem(`Meeting point set: ${name}`);
    
    // Refresh user list to show distances
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
}

/**
 * Remove the meeting point
 */
function removeMeetingPoint() {
    if (meetingPointMarker) {
        map.removeLayer(meetingPointMarker);
        meetingPointMarker = null;
    }
    
    meetingPoint = null;
    
    // Broadcast removal to all users
    socket.emit('remove-meeting-point');
    
    // Show notification
    addActivityItem('Meeting point removed');
    
    // Refresh user list
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
}

/**
 * Get distance to meeting point
 * @param {number} lat - User latitude
 * @param {number} lon - User longitude
 * @returns {string|null} Formatted distance or null
 */
function getDistanceToMeetingPoint(lat, lon) {
    if (!meetingPoint) return null;
    
    const distance = calculateDistance(lat, lon, meetingPoint.lat, meetingPoint.lon);
    return formatDistance(distance);
}

/**
 * Handle meeting point set by another user
 */
socket.on('meeting-point-set', (data) => {
    const { lat, lon, name } = data;
    
    // Remove existing marker if any
    if (meetingPointMarker) {
        map.removeLayer(meetingPointMarker);
    }
    
    // Store meeting point
    meetingPoint = { lat, lon, name };
    
    // Create marker
    const meetingIcon = L.divIcon({
        className: 'meeting-point-marker',
        html: `
            <div class="meeting-point-icon">
                <div class="meeting-point-pulse"></div>
                <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="18" fill="#ff4444" stroke="white" stroke-width="3"/>
                    <text x="20" y="26" text-anchor="middle" fill="white" font-size="20" font-weight="bold">📍</text>
                </svg>
            </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    
    meetingPointMarker = L.marker([lat, lon], { icon: meetingIcon })
        .bindPopup(`<strong>${name}</strong>`)
        .addTo(map);
    
    // Refresh user list
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
});

/**
 * Handle meeting point removal by another user
 */
socket.on('meeting-point-removed', () => {
    if (meetingPointMarker) {
        map.removeLayer(meetingPointMarker);
        meetingPointMarker = null;
    }
    meetingPoint = null;
    
    // Refresh user list
    if (typeof refreshUserList === 'function') {
        refreshUserList();
    }
});

/**
 * Enable click-to-set meeting point mode
 */
function enableMeetingPointMode() {
    document.body.style.cursor = 'crosshair';
    
    // One-time click handler
    map.once('click', (e) => {
        const { lat, lng } = e.latlng;
        
        // Prompt for name
        const name = prompt('Enter meeting point name:', 'Meeting Point') || 'Meeting Point';
        
        setMeetingPoint(lat, lng, name);
        
        document.body.style.cursor = 'default';
    });
    
    // Show instruction
    addActivityItem('Click on map to set meeting point');
}
