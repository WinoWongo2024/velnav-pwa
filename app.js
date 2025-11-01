// Global variables
let map;
let userMarker;
let routingControl = null;

// 1. Initialize the map
function initMap(lat, lon) {
    // If map is already initialized, just set the view
    if (map) {
        map.setView([lat, lon], 13);
        return;
    }
    
    // Create the map instance
    map = L.map('map').setView([lat, lon], 13);

    // Add the OpenStreetMap tiles (the actual map image)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add a marker for the user's location
    userMarker = L.marker([lat, lon]).addTo(map)
        .bindPopup("Your Location (Queen Jess's Position)").openPopup();
}

// 2. Get User Location (Geolocation API)
function getLocation() {
    if (navigator.geolocation) {
        // Options for high accuracy
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Initialize/Update Map
                initMap(lat, lon);
                
                // Update marker if map was already running
                if (userMarker) {
                    userMarker.setLatLng([lat, lon]);
                }
            },
            (error) => {
                // If location fails, default to Harrogate/ÖestVèl Centrè (54.0084° N, 1.5422° W)
                console.warn(`Geolocation error: ${error.message}. Defaulting to Harrogate.`);
                const defaultLat = 54.0084;
                const defaultLon = -1.5422;
                initMap(defaultLat, defaultLon);
                alert("Could not get your exact location. Map centered on ÖestVèl Centrè.");
            },
            options
        );
    } else {
        alert("Geolocation is not supported by your browser. Cannot track your position.");
    }
}

// 3. Handle Routing
document.getElementById('get-directions').addEventListener('click', () => {
    const destinationInput = document.getElementById('destination').value.trim();
    if (!destinationInput) {
        alert("Please enter a destination.");
        return;
    }

    // Check if we have a current location marker
    if (!userMarker) {
        alert("Cannot get directions until your current location is found.");
        return;
    }
    
    const startLatLon = userMarker.getLatLng();

    // 4. Remove previous route if it exists
    if (routingControl) {
        map.removeControl(routingControl);
    }

    // 5. Use a Geocoding service to turn the address/text into coordinates
    // For this example, we will use Nominatim (OSM's geocoder)
    // NOTE: For a high-traffic app, you would need a key for a dedicated service like Mapbox or Esri.
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationInput)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const destLat = parseFloat(data[0].lat);
                const destLon = parseFloat(data[0].lon);
                
                const destinationWaypoint = L.latLng(destLat, destLon);

                // 6. Create the routing control (Leaflet Routing Machine)
                routingControl = L.Routing.control({
                    waypoints: [
                        L.Routing.waypoint(startLatLon, 'Your Location'),
                        L.Routing.waypoint(destinationWaypoint, destinationInput)
                    ],
                    // Use the default OSRM service for routing (free/public)
                    router: L.Routing.osrmv1({
                        serviceUrl: 'https://router.project-osrm.org/route/v1'
                    }),
                    routeWhileDragging: false,
                    show: true, // Show the directions panel
                    fitSelectedRoutes: 'smart'
                }).addTo(map);

            } else {
                alert(`Could not find coordinates for: ${destinationInput}`);
            }
        })
        .catch(error => {
            console.error("Geocoding or Routing Error:", error);
            alert("An error occurred during routing.");
        });
});

// Start the location process when the app loads
getLocation();
