/**
 * NIGHT MODE FEATURE
 * Toggle between light and dark theme
 */

let isNightMode = false;

/**
 * Initialize night mode from localStorage
 */
function initNightMode() {
    // Check saved preference
    const savedMode = localStorage.getItem('nightMode');
    
    if (savedMode === 'true') {
        enableNightMode();
    } else if (savedMode === null) {
        // Auto-detect based on time (6 PM to 6 AM)
        const hour = new Date().getHours();
        if (hour >= 18 || hour < 6) {
            enableNightMode();
        }
    }
}

/**
 * Toggle night mode
 */
function toggleNightMode() {
    if (isNightMode) {
        disableNightMode();
    } else {
        enableNightMode();
    }
}

/**
 * Enable night mode
 */
function enableNightMode() {
    isNightMode = true;
    document.body.classList.add('night-mode');
    
    // Change map tile layer to dark version
    if (typeof map !== 'undefined') {
        // Remove existing tile layer
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        // Add dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap contributors, © CARTO',
            maxZoom: 19
        }).addTo(map);
    }
    
    // Save preference
    localStorage.setItem('nightMode', 'true');
    
    // Update button
    updateNightModeButton();
    
    addActivityItem('Night mode enabled', 'info');
}

/**
 * Disable night mode
 */
function disableNightMode() {
    isNightMode = false;
    document.body.classList.remove('night-mode');
    
    // Change map tile layer back to light version
    if (typeof map !== 'undefined') {
        // Remove existing tile layer
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });
        
        // Add light tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
    }
    
    // Save preference
    localStorage.setItem('nightMode', 'false');
    
    // Update button
    updateNightModeButton();
    
    addActivityItem('Night mode disabled', 'info');
}

/**
 * Update night mode button appearance
 */
function updateNightModeButton() {
    const btn = document.getElementById('nightModeBtn');
    if (btn) {
        if (isNightMode) {
            btn.innerHTML = '☀️';
            btn.title = 'Switch to Light Mode';
        } else {
            btn.innerHTML = '🌙';
            btn.title = 'Switch to Night Mode';
        }
    }
}

/**
 * Auto-toggle based on time (optional feature)
 */
function enableAutoNightMode() {
    setInterval(() => {
        const hour = new Date().getHours();
        const shouldBeNight = hour >= 18 || hour < 6;
        
        if (shouldBeNight && !isNightMode) {
            enableNightMode();
        } else if (!shouldBeNight && isNightMode) {
            disableNightMode();
        }
    }, 60000); // Check every minute
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initNightMode();
});
