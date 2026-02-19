const socket = io();

let lastEmitTime = 0;
const EMIT_INTERVAL = 2000; // 2 seconds
let currentUser = null;
let currentRoomId = null;
let locationWatchId = null;
let isUserRegistered = false;
let myLocation = null; // Store current user's location

// Calculate distance between two points using Haversine formula
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

// Format distance for display
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

// Socket connection handler
socket.on('connect', () => {
    console.log('Connected to server with socket ID:', socket.id);
});

socket.on('room-joined', (data) => {
    console.log('Room joined successfully:', data);
    currentRoomId = data.roomId;
    
    // Show room info bar
    document.getElementById('roomInfoBar').style.display = 'block';
    document.getElementById('currentRoomId').textContent = data.roomId;
});

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Color selection handling
    const colorOptions = document.querySelectorAll('.color-option');
    let selectedColor = '#FF1493'; // Default color

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = option.getAttribute('data-color');
        });
    });

    // Username form submission
    document.getElementById('usernameForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const roomId = document.getElementById('roomId').value.trim();
        
        if (username && roomId) {
            currentUser = {
                username: username,
                color: selectedColor,
                roomId: roomId
            };
            
            // Hide modal
            document.getElementById('usernameModal').style.display = 'none';
            
            // Join room
            socket.emit('join-room', {
                roomId: roomId,
                username: username,
                color: selectedColor
            });
            
            isUserRegistered = true;
            
            console.log('Joining room:', currentUser);
            
            // Start location tracking
            startLocationTracking();
        }
    });
    
    // Copy room link button
    document.getElementById('copyRoomBtn').addEventListener('click', () => {
        const roomLink = `${window.location.origin}/room/${currentRoomId}`;
        
        navigator.clipboard.writeText(roomLink).then(() => {
            const btn = document.getElementById('copyRoomBtn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '✓';
            btn.style.color = '#4a90e2';
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Room link: ' + roomLink);
        });
    });
}

// Start tracking user location
function startLocationTracking() {
    if (navigator.geolocation) {
        locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const now = Date.now();

                // Store my current location
                myLocation = { latitude, longitude };

                if (now - lastEmitTime >= EMIT_INTERVAL) {
                    socket.emit("send-location", { latitude, longitude });
                    lastEmitTime = now;
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Unable to access your location. Please enable location services.");
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        alert("Geolocation not supported by your browser");
    }
}

// Initialize map
const mapContainer = document.getElementById("map");
if (!mapContainer) {
    console.error("Map container not found");
} else {
    const map = L.map("map").setView([0, 0], 16);

    setTimeout(() => {
        map.invalidateSize();
    }, 200);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    const markers = {};
    const userLocations = {}; // Store all user locations
    let isFirstLocation = true;
    let currentUsers = []; // Store current user list
    let currentRoutingControl = null; // Store active route control

    // Function to refresh user list with updated distances
    function refreshUserList() {
        const userList = document.getElementById('userList');
        if (!userList || currentUsers.length === 0) return;
        
        const html = currentUsers.map(user => {
            const isCurrentUser = user.id === socket.id;
            
            // Calculate distance if we have both locations
            let distanceText = '';
            let routeButton = '';
            
            if (!isCurrentUser && myLocation && userLocations[user.id]) {
                const distance = calculateDistance(
                    myLocation.latitude,
                    myLocation.longitude,
                    userLocations[user.id].latitude,
                    userLocations[user.id].longitude
                );
                distanceText = `<span class="user-distance">${formatDistance(distance)}</span>`;
                routeButton = `<button class="btn-route" onclick="toggleRoute('${user.id}')">Show Route</button>`;
            }
            
            return `
            <div class="user-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="user-color" style="background-color: ${user.color};"></div>
                <div class="user-info">
                    <span class="user-name">${user.username}</span>
                    ${isCurrentUser ? '<span class="you-label">(You)</span>' : distanceText}
                </div>
                ${routeButton}
            </div>
        `;
        }).join('');
        
        userList.innerHTML = html;
    }
    
    // Function to toggle route display
    window.toggleRoute = function(userId) {
        // If there's an existing route, remove it
        if (currentRoutingControl) {
            map.removeControl(currentRoutingControl);
            currentRoutingControl = null;
            return;
        }
        
        // Check if we have both locations
        if (!myLocation || !userLocations[userId]) {
            alert('Location not available yet. Please wait a moment.');
            return;
        }
        
        // Create routing control
        currentRoutingControl = L.Routing.control({
            waypoints: [
                L.latLng(myLocation.latitude, myLocation.longitude),
                L.latLng(userLocations[userId].latitude, userLocations[userId].longitude)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            lineOptions: {
                styles: [{color: '#4a90e2', opacity: 0.8, weight: 5}]
            },
            createMarker: function() { return null; }, // Don't create extra markers
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);
        
        // Hide the instructions panel (we only want the route line)
        setTimeout(() => {
            const container = document.querySelector('.leaflet-routing-container');
            if (container) {
                container.style.display = 'none';
            }
        }, 100);
    };

    // Custom icon function - using SVG for better reliability
    function createCustomIcon(color) {
        const svgIcon = `
            <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 27 15 27s15-18.716 15-27C30 6.716 23.284 0 15 0z" 
                      fill="${color}" 
                      stroke="white" 
                      stroke-width="2"/>
                <circle cx="15" cy="15" r="5" fill="white"/>
            </svg>
        `;
        
        return L.divIcon({
            className: 'custom-marker-icon',
            html: svgIcon,
            iconSize: [30, 42],
            iconAnchor: [15, 42],
            popupAnchor: [0, -42]
        });
    }

    // Receive location updates
    socket.on("receive-location", (data) => {
        const { id, latitude, longitude, username, color } = data;
        
        // Store this user's location
        userLocations[id] = { latitude, longitude };
        
        console.log('Received location:', { id, username, color });

        if (markers[id]) {
            // Update existing marker position
            markers[id].setLatLng([latitude, longitude]);
            // Update marker color if it changed
            const customIcon = createCustomIcon(color);
            markers[id].setIcon(customIcon);
        } else {
            // Create new marker
            const customIcon = createCustomIcon(color);
            markers[id] = L.marker([latitude, longitude], { icon: customIcon })
                .bindPopup(`<strong>${username}</strong>`)
                .addTo(map);
            console.log('Created marker for:', username);
        }

        if (id === socket.id && isFirstLocation) {
            map.setView([latitude, longitude], 16);
            isFirstLocation = false;
        }
        
        // Refresh user list to update distances
        refreshUserList();
    });

    // Handle user disconnection
    socket.on("user-disconnected", (id) => {
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });

    // Update user list sidebar
    socket.on("users-update", (users) => {
        console.log('Users update received:', users);
        
        const userList = document.getElementById('userList');
        const userCount = document.getElementById('userCount');
        
        if (!userList || !userCount) {
            console.error('ERROR: User list elements not found!');
            return;
        }
        
        // Store users for distance updates
        currentUsers = users;
        
        userCount.textContent = users.length;
        
        // Refresh the list with distances
        refreshUserList();
    });

    socket.on("disconnect", () => {
        console.warn("Socket disconnected");
    });
}
