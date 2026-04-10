/**
 * GEOFENCE FEATURE
 * Create zones and get alerts when users enter/exit
 */

let geofences = [];
let geofenceCircles = [];
let isDrawingGeofence = false;

/**
 * Start drawing a geofence
 */
function startDrawingGeofence() {
    isDrawingGeofence = true;
    document.body.style.cursor = 'crosshair';
    
    addActivityItem('Click on map to set geofence center', 'info');
    
    map.once('click', (e) => {
        const { lat, lng } = e.latlng;
        
        // Prompt for radius
        const radiusInput = prompt('Enter geofence radius in meters:', '500');
        const radius = parseInt(radiusInput);
        
        if (!radius || radius <= 0) {
            document.body.style.cursor = 'default';
            isDrawingGeofence = false;
            return;
        }
        
        // Prompt for name
        const name = prompt('Enter geofence name:', 'Zone 1') || 'Zone 1';
        
        createGeofence(lat, lng, radius, name);
        
        document.body.style.cursor = 'default';
        isDrawingGeofence = false;
    });
}

/**
 * Create a geofence
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radius - Radius in meters
 * @param {string} name - Geofence name
 */
function createGeofence(lat, lon, radius, name) {
    const geofence = {
        id: Date.now(),
        lat,
        lon,
        radius,
        name,
        usersInside: new Set()
    };
    
    geofences.push(geofence);
    
    // Draw circle on map
    const circle = L.circle([lat, lon], {
        color: '#ff4444',
        fillColor: '#ff4444',
        fillOpacity: 0.2,
        radius: radius,
        weight: 2
    }).addTo(map);
    
    // Add popup
    circle.bindPopup(`
        <strong>${name}</strong><br>
        Radius: ${radius}m<br>
        <button onclick="removeGeofence(${geofence.id})" class="btn-remove-geofence">Remove</button>
    `);
    
    geofenceCircles.push({ id: geofence.id, circle });
    
    // Broadcast to room
    socket.emit('create-geofence', {
        lat,
        lon,
        radius,
        name,
        id: geofence.id
    });
    
    addActivityItem(`Geofence created: ${name}`, 'success');
}

/**
 * Remove a geofence
 * @param {number} geofenceId - Geofence ID
 */
function removeGeofence(geofenceId) {
    // Remove from array
    const index = geofences.findIndex(g => g.id === geofenceId);
    if (index !== -1) {
        const geofence = geofences[index];
        geofences.splice(index, 1);
        
        addActivityItem(`Geofence removed: ${geofence.name}`, 'info');
    }
    
    // Remove circle from map
    const circleObj = geofenceCircles.find(c => c.id === geofenceId);
    if (circleObj) {
        map.removeLayer(circleObj.circle);
        geofenceCircles = geofenceCircles.filter(c => c.id !== geofenceId);
    }
    
    // Broadcast removal
    socket.emit('remove-geofence', geofenceId);
}

/**
 * Check if user is inside any geofence
 * @param {string} userId - User ID
 * @param {number} lat - User latitude
 * @param {number} lon - User longitude
 * @param {string} username - User name
 */
function checkGeofences(userId, lat, lon, username) {
    geofences.forEach(geofence => {
        const distance = calculateDistance(lat, lon, geofence.lat, geofence.lon) * 1000; // convert to meters
        const isInside = distance <= geofence.radius;
        const wasInside = geofence.usersInside.has(userId);
        
        if (isInside && !wasInside) {
            // User entered geofence
            geofence.usersInside.add(userId);
            
            if (userId === socket.id) {
                addActivityItem(`You entered ${geofence.name}`, 'warning');
                showNotification(`Entered ${geofence.name}`, 'warning');
            } else {
                addActivityItem(`${username} entered ${geofence.name}`, 'info');
            }
        } else if (!isInside && wasInside) {
            // User exited geofence
            geofence.usersInside.delete(userId);
            
            if (userId === socket.id) {
                addActivityItem(`You left ${geofence.name}`, 'info');
                showNotification(`Left ${geofence.name}`, 'info');
            } else {
                addActivityItem(`${username} left ${geofence.name}`, 'info');
            }
        }
    });
}

/**
 * Show browser notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
function showNotification(message, type) {
    // Check if browser supports notifications
    if (!('Notification' in window)) return;
    
    // Request permission if needed
    if (Notification.permission === 'granted') {
        new Notification('Real-Time Tracker', {
            body: message,
            icon: '/favicon.ico'
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Real-Time Tracker', {
                    body: message,
                    icon: '/favicon.ico'
                });
            }
        });
    }
}

/**
 * Handle geofence created by another user
 */
socket.on('geofence-created', (data) => {
    const { lat, lon, radius, name, id } = data;
    
    const geofence = {
        id,
        lat,
        lon,
        radius,
        name,
        usersInside: new Set()
    };
    
    geofences.push(geofence);
    
    // Draw circle
    const circle = L.circle([lat, lon], {
        color: '#ff4444',
        fillColor: '#ff4444',
        fillOpacity: 0.2,
        radius: radius,
        weight: 2
    }).addTo(map);
    
    circle.bindPopup(`<strong>${name}</strong><br>Radius: ${radius}m`);
    
    geofenceCircles.push({ id, circle });
});

/**
 * Handle geofence removed by another user
 */
socket.on('geofence-removed', (geofenceId) => {
    // Remove from array
    const index = geofences.findIndex(g => g.id === geofenceId);
    if (index !== -1) {
        geofences.splice(index, 1);
    }
    
    // Remove circle
    const circleObj = geofenceCircles.find(c => c.id === geofenceId);
    if (circleObj) {
        map.removeLayer(circleObj.circle);
        geofenceCircles = geofenceCircles.filter(c => c.id !== geofenceId);
    }
});

/**
 * Clear user from all geofences when they disconnect
 * @param {string} userId - User ID
 */
function clearUserFromGeofences(userId) {
    geofences.forEach(geofence => {
        geofence.usersInside.delete(userId);
    });
}
