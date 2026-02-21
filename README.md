📡 Real-Time Location Synchronization System
A real-time multi-user location sharing platform where users inside the same room can view each other’s movement instantly on an interactive map.
Built using WebSockets to maintain a persistent connection and keep all clients synchronized.

✨ Features
👥 Join shared rooms for live tracking
⚡ Instant updates via WebSockets
🔄 Automatic user join/leave handling
🗺️ Live map visualization with dynamic markers
🚀 Optimized update frequency for performance
📈 Designed for horizontal scaling (Redis ready)

🛠️ Tech Stack
Layer	                    Technology
Backend	           Node.js, Express.js, Socket.IO
Frontend	         HTML, CSS, JavaScript
Map	               Leaflet.js

⚙️ How It Works
-User connects and joins a room
-Browser sends periodic geolocation updates
-Server broadcasts updates only to that room
-Clients update markers in real time
This ensures all connected users share the same live state.

🚀 Getting Started
1. Clone repository
git clone https://github.com/yourusername/yourrepo.git
cd yourrepo
2. Install dependencies
npm install
3. Run server
npm start

Open in browser:
http://localhost:8000
