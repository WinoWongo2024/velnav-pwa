// Global variables
let map;
let userMarker;
let routingControl = null;
const DEFAULT_LAT = 54.0084; // ÖestVèl Centrè (Harrogate)
const DEFAULT_LON = -1.5422;

// Get the status message element (dynamically inserted for placement)
const statusElement = document.createElement('p');
statusElement.id = 'status-message';
document.body.insertBefore(statusElement, document.getElementById('map'));

// 1. Initialize the map
function initMap(lat, lon) {
    if (map) {
        map.setView([lat, lon], 13);
        return;
    }
    
    statusElement.textContent = 'Map loading...';
    
    // Create the map instance
    map = L.map('map').setView([lat, lon], 13);

    // Add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add a marker for the initial location
    userMarker = L.marker([lat, lon], {title: "Your Location"}).addTo(map)
        .bindPopup("Searching for your current position...").openPopup();
        
    statusElement.textContent = 'Map ready. Attempting to get precise location...';
}

// 2. Aggressive Location Request with iOS Guidance
function getLocation() {
    if (!navigator.geolocation) {
        statusElement.textContent = 'Error: Geolocation is not supported by this device.';
        initMap(DEFAULT_LAT, DEFAULT_LON);
        return;
    }

    statusElement.textContent = 'Requesting location permission...';

    // Options for high accuracy and short timeout to trigger a quick response
    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        // SUCCESS: Position Found
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            initMap(lat, lon);
            userMarker.setLatLng([lat, lon]).bindPopup("Your Current Location").openPopup();
            
            statusElement.textContent = `Location found! You are at: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            map.setView([lat, lon], 16); // Zoom in on the user
        },
        // ERROR: Position Failed
        (error) => {
            console.error("Geolocation Error:", error);

            if (error.code === error.PERMISSION_DENIED) {
                // User denied permission (Error Code 1) - Crucial iOS instruction
                const message = `🔴 **Permission Denied!**\n\nTo use navigation, you must allow location access.\n\n` + 
                                `**If you are on an iPhone:**\n` +
                                `1. Make sure the app is **Added to your Home Screen**.\n` +
                                `2. Go to **Settings** -> **Privacy & Security** -> **Location Services** -> **Safari Websites** and ensure it's set to **'While Using the App'**.`;
                
                // Display instructions clearly on screen and via alert
                statusElement.innerHTML = message.replace(/\n/g, '<br>'); 
                alert(message.replace(/<br>/g, '\n'));
                
                // Initialize map with default location if not already done
                initMap(DEFAULT_LAT, DEFAULT_LON);
                
            } else if (error.code === error.TIMEOUT) {
                // Request timed out (Error Code 3) - Try again aggressively
                statusElement.textContent = 'Location timed out. Trying again...';
                getLocation(); // Recursive call to try again
                
            } else {
                // Other errors (e.g., POSITION_UNAVAILABLE - Error Code 2)
                statusElement.textContent = 'Location unavailable. Check your device settings and internet connection.';
                initMap(DEFAULT_LAT, DEFAULT_LON);
            }
        },
        options
    );
}

// 3. Handle Routing
document.getElementById('get-directions').addEventListener('click', () => {
    const destinationInput = document.getElementById('destination').value.trim();
    if (!destinationInput) {
        alert("Please enter a destination.");
        return;
    }

    const currentLatLng = userMarker ? userMarker.getLatLng() : null;

    if (!currentLatLng || (currentLatLng.lat === DEFAULT_LAT && currentLatLng.lng === DEFAULT_LON)) {
        alert("Cannot get directions. Please allow location access first (click 'Get Directions' to re-attempt).");
        getLocation(); // Re-trigger location attempt
        return;
    }

    // Remove previous route if it exists
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    statusElement.textContent = `Calculating route to: ${destinationInput}...`;

    // Use Nominatim (OSM's Geocoder) to convert address to coordinates
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationInput)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const destLat = parseFloat(data[0].lat);
                const destLon = parseFloat(data[0].lon);
                
                const destinationWaypoint = L.latLng(destLat, destLon);

                // Create the routing control (Leaflet Routing Machine with OSRM)
                routingControl = L.Routing.control({
                    waypoints: [
                        L.Routing.waypoint(currentLatLng, 'Your Location'),
                        L.Routing.waypoint(destinationWaypoint, destinationInput)
                    ],
                    router: L.Routing.osrmv1({
                        serviceUrl: 'https://router.project-osrm.org/route/v1'
                    }),
                    routeWhileDragging: false,
                    show: true, // Show the directions panel
                    fitSelectedRoutes: 'smart'
                }).addTo(map);
                
                statusElement.textContent = 'Route calculated! See instructions on the left.';

            } else {
                statusElement.textContent = `Could not find coordinates for: ${destinationInput}. Please try a different address.`;
            }
        })
        .catch(error => {
            console.error("Geocoding or Routing Error:", error);
            statusElement.textContent = "An error occurred during routing. Check console for details.";
        });
});

// Start the location process when the app loads
getLocation();
