// 1. Initialize the map
var map = L.map('map').setView([51.505, -0.09], 13);

// 2. Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 3. Add the routing control
L.Routing.control({
    waypoints: [
        L.latLng(51.5, -0.09), // Starting coordinate
        L.latLng(51.51, -0.1)  // Destination coordinate
    ],
    routeWhileDragging: true // Allows users to drag the markers to update the route
}).addTo(map);