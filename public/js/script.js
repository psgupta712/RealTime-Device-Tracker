const socket = io();

let lastEmitTime = 0;
const EMIT_INTERVAL = 2000; // 2 seconds

if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const now = Date.now();

            if (now - lastEmitTime >= EMIT_INTERVAL) {
                socket.emit("send-location", { latitude, longitude });
                lastEmitTime = now;
            }
        },
        (error) => {
            console.error("Geolocation error:", error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
} else {
    console.error("Geolocation not supported");
}

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

    socket.on("receive-location", (data) => {
        const { id, latitude, longitude } = data;

        if (markers[id]) {
            markers[id].setLatLng([latitude, longitude]);
        } else {
            markers[id] = L.marker([latitude, longitude]).addTo(map);
        }

        if (id === socket.id) {
            map.setView([latitude, longitude], 16);
        }
    });

    socket.on("user-disconnected", (id) => {
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    });

    socket.on("disconnect", () => {
        console.warn("Socket disconnected");
    });
}
