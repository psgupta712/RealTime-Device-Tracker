const socket = io();

let lastEmitTime = 0;
const EMIT_INTERVAL = 2000;
let currentUser = null;
let currentRoomId = null;
let locationWatchId = null;
let isUserRegistered = false;
let myLocation = null;
let map = null;

// Socket connection
socket.on('connect', () => {
    console.log('Connected:', socket.id);
});

socket.on('room-joined', (data) => {
    console.log('Room joined:', data);
    currentRoomId = data.roomId;
    
    document.getElementById('roomInfoBar').style.display = 'block';
    document.getElementById('controlPanel').style.display = 'flex';
    document.getElementById('currentRoomId').textContent = data.roomId;
    
    addActivityItem(`Joined room: ${data.roomId}`, 'success');
    initBatteryMonitoring();
});

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    const colorOptions = document.querySelectorAll('.color-option');
    let selectedColor = '#FF1493';

    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedColor = option.getAttribute('data-color');
        });
    });

    document.getElementById('usernameForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const roomId = document.getElementById('roomId').value.trim();
        
        if (username && roomId) {
            currentUser = { username, color: selectedColor, roomId };
            document.getElementById('usernameModal').style.display = 'none';
            
            socket.emit('join-room', { roomId, username, color: selectedColor });
            isUserRegistered = true;
            startLocationTracking();
        }
    });
    
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
        });
    });
}

function startLocationTracking() {
    if (navigator.geolocation) {
        locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                myLocation = { latitude, longitude };
                const now = Date.now();

                if (now - lastEmitTime >= EMIT_INTERVAL) {
                    socket.emit("send-location", { latitude, longitude });
                    lastEmitTime = now;
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                alert("Unable to access location. Please enable location services.");
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }
}

// Initialize map
const mapContainer = document.getElementById("map");
if (mapContainer) {
    map = L.map("map").setView([0, 0], 16);
    setTimeout(() => map.invalidateSize(), 200);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap"
    }).addTo(map);

    const markers = {};
    const userLocations = {};
    let isFirstLocation = true;
    let currentUsers = [];
    let currentRoutingControl = null;

    function createCustomIcon(color) {
        const svgIcon = `
            <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 27 15 27s15-18.716 15-27C30 6.716 23.284 0 15 0z" 
                      fill="${color}" stroke="white" stroke-width="2"/>
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

    function refreshUserList() {
        const userList = document.getElementById('userList');
        if (!userList || currentUsers.length === 0) return;
        
        const html = currentUsers.map(user => {
            const isCurrentUser = user.id === socket.id;
            let distanceText = '';
            let etaText = '';
            let routeButton = '';
            let statusDisplay = '';
            let batteryDisplay = '';
            let meetingDistText = '';
            
            if (!isCurrentUser && myLocation && userLocations[user.id]) {
                const distance = calculateDistance(
                    myLocation.latitude, myLocation.longitude,
                    userLocations[user.id].latitude, userLocations[user.id].longitude
                );
                distanceText = `<span class="user-distance">${formatDistance(distance)}</span>`;
                
                const speed = getUserSpeed(user.id);
                if (speed > 0) {
                    const eta = calculateETA(distance, speed);
                    etaText = `<span class="user-eta">→ ${eta}</span>`;
                }
                
                routeButton = `<button class="btn-route" onclick="toggleRoute('${user.id}')">Route</button>`;
            }
            
            if (meetingPoint && myLocation) {
                const distToMeeting = getDistanceToMeetingPoint(myLocation.latitude, myLocation.longitude);
                if (distToMeeting) {
                    meetingDistText = `<span class="meeting-dist">📍 ${distToMeeting}</span>`;
                }
            }
            
            statusDisplay = getStatusDisplay(user.id);
            batteryDisplay = getBatteryDisplay(user.id);
            
            return `
                <div class="user-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="user-color" style="background-color: ${user.color};"></div>
                    <div class="user-info">
                        <span class="user-name">${user.username}</span>
                        ${isCurrentUser ? '<span class="you-label">(You)</span>' : ''}
                        ${statusDisplay}
                        ${distanceText} ${etaText}
                        ${meetingDistText}
                        ${batteryDisplay}
                    </div>
                    ${routeButton}
                </div>
            `;
        }).join('');
        
        userList.innerHTML = html;
    }

    window.toggleRoute = function(userId) {
        if (currentRoutingControl) {
            map.removeControl(currentRoutingControl);
            currentRoutingControl = null;
            return;
        }
        
        if (!myLocation || !userLocations[userId]) {
            alert('Location not available.');
            return;
        }
        
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
            createMarker: function() { return null; },
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);
        
        setTimeout(() => {
            const container = document.querySelector('.leaflet-routing-container');
            if (container) container.style.display = 'none';
        }, 100);
    };

    socket.on("receive-location", (data) => {
        const { id, latitude, longitude, username, color } = data;
        userLocations[id] = { latitude, longitude };
        
        calculateSpeed(id, latitude, longitude);
        updateConnectionStatus(id);
        checkGeofences(id, latitude, longitude, username);

        if (markers[id]) {
            markers[id].setLatLng([latitude, longitude]);
            markers[id].setIcon(createCustomIcon(color));
        } else {
            markers[id] = L.marker([latitude, longitude], { icon: createCustomIcon(color) })
                .bindPopup(`<strong>${username}</strong>`)
                .addTo(map);
        }

        if (id === socket.id && isFirstLocation) {
            map.setView([latitude, longitude], 16);
            isFirstLocation = false;
        }
        
        refreshUserList();
    });

    socket.on("user-disconnected", (id) => {
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
        delete userLocations[id];
        cleanupUserData(id);
        cleanupBatteryData(id);
        clearUserFromGeofences(id);
    });

    socket.on("users-update", (users) => {
        currentUsers = users;
        document.getElementById('userCount').textContent = users.length;
        refreshUserList();
    });
}

// Toggle Users Sidebar (Mobile)
function toggleUsersSidebar() {
    const sidebar = document.getElementById('userListSidebar');
    sidebar.classList.toggle('hidden');
}

// Auto-show controls based on screen size
function updateMobileUI() {
    const isMobile = window.innerWidth <= 768;
    const controlPanel = document.getElementById('controlPanel');
    const mobileNav = document.querySelector('.mobile-nav');
    const toggleBtn = document.getElementById('toggleUsersBtn');
    const sidebar = document.getElementById('userListSidebar');
    
    if (isMobile) {
        controlPanel.style.display = 'none';
        mobileNav.style.display = 'block';
        toggleBtn.style.display = 'block';
        // Hide sidebar by default on mobile
        sidebar.classList.add('hidden');
    } else {
        controlPanel.style.display = 'flex';
        mobileNav.style.display = 'none';
        toggleBtn.style.display = 'none';
        // Show sidebar on desktop
        sidebar.classList.remove('hidden');
    }
}

// Listen for window resize
window.addEventListener('resize', updateMobileUI);

// Initialize on load
window.addEventListener('load', () => {
    updateMobileUI();
});

// Update mobile user count when users update
const originalUsersUpdate = socket._callbacks['$users-update'];
socket.on('users-update', () => {
    const userCountMobile = document.getElementById('userCountMobile');
    const userCount = document.getElementById('userCount').textContent;
    if (userCountMobile) {
        userCountMobile.textContent = userCount;
    }
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('userListSidebar');
        const toggleBtn = document.getElementById('toggleUsersBtn');
        
        if (!sidebar.contains(e.target) && 
            !toggleBtn.contains(e.target) && 
            !sidebar.classList.contains('hidden')) {
            sidebar.classList.add('hidden');
        }
    }
});
