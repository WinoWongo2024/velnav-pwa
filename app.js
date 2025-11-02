// Global variables
let map = null; // Initialize map as null
let userMarker;
let routingControl = null;
const DEFAULT_LAT = 54.0084; // ÖestVèl Centrè (Harrogate)
const DEFAULT_LON = -1.5422;

// Get the status message element
const statusElement = document.createElement('p');
statusElement.id = 'status-message';
const header = document.querySelector('header');
if (header) {
    header.parentNode.insertBefore(statusElement, header.nextSibling);
} else {
    document.body.insertBefore(statusElement, document.getElementById('map'));
}


// 1. Map Initialization (Delayed until Location is resolved)
function initMap(lat, lon) {
    if (map) {
        map.setView([lat, lon], 13);
        map.invalidateSize(); 
        return;
    }
    
    statusElement.textContent = 'Map tiles loading...';
    
    // 🌟 New Guarantee: Map initialized only AFTER location is known 🌟
    map = L.map('map').setView([lat, lon], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    userMarker = L.marker([lat, lon], {title: "Your Location"}).addTo(map)
        .bindPopup("Your Current Position").openPopup();
        
    statusElement.textContent = `Map centered on: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    
    // 🌟 Use whenReady/setTimeout for guaranteed redraw 🌟
    map.whenReady(function() {
        setTimeout(function() {
            if (map) {
                map.invalidateSize({pan: false}); 
                console.log("Map size successfully invalidated after initialization.");
            }
        }, 100); 
    });
}

// 2. Aggressive Location Request
function getLocation() {
    if (!navigator.geolocation) {
        statusElement.textContent = 'Error: Geolocation not supported. Defaulting to ÖestVèl Centrè.';
        initMap(DEFAULT_LAT, DEFAULT_LON);
        return;
    }

    statusElement.textContent = 'Requesting location permission...';

    const options = {
        enableHighAccuracy: true,
        timeout: 7000, // Increased timeout to 7 seconds
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        // SUCCESS: Position Found
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            // 🌟 Initialize Map Here! 🌟
            initMap(lat, lon); 
            
            userMarker.setLatLng([lat, lon]);
            statusElement.textContent = `Location found! You are at: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            map.setView([lat, lon], 16);
        },
        // ERROR: Position Failed
        (error) => {
            if (error.code === error.PERMISSION_DENIED) {
                const message = `🔴 **Permission Denied!** To use navigation, you must allow location access. Check iOS Settings for Safari Location Services.`;
                statusElement.innerHTML = message.replace(/\n/g, '<br>'); 
                alert(message.replace(/<br>/g, '\n'));
                
            } else if (error.code === error.TIMEOUT) {
                statusElement.textContent = 'Location timed out. Trying again...';
                getLocation(); // Recursive call
                return; // Stop execution here to prevent map init below
            } else {
                statusElement.textContent = 'Location unavailable. Defaulting to ÖestVèl Centrè.';
            }
            // 🌟 Initialize Map Here on Failure! 🌟
            initMap(DEFAULT_LAT, DEFAULT_LON); 
        },
        options
    );
}

// 3. Handle Routing (Same logic, but ensures map redraw)
document.getElementById('get-directions').addEventListener('click', () => {
    // Ensure map exists before continuing
    if (!map) {
        alert("Map is not yet initialized. Please wait a moment.");
        return;
    }
    
    const destinationInput = document.getElementById('destination').value.trim();
    if (!destinationInput) {
        alert("Please enter a destination.");
        return;
    }

    const currentLatLng = userMarker ? userMarker.getLatLng() : null;
    if (!currentLatLng || (currentLatLng.lat === DEFAULT_LAT && currentLatLng.lng === DEFAULT_LON)) {
        alert("Cannot get directions. Please allow location access first (click 'Get Directions' to re-attempt).");
        getLocation(); 
        return;
    }

    // Force map redraw on interaction as a final safety check
    map.invalidateSize(); 

    // Remove previous route
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    
    statusElement.textContent = `Calculating route to: ${destinationInput}...`;

    // Routing logic (unchanged)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationInput)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const destLat = parseFloat(data[0].lat);
                const destLon = parseFloat(data[0].lon);
                
                routingControl = L.Routing.control({
                    waypoints: [
                        L.Routing.waypoint(currentLatLng, 'Your Location'),
                        L.Routing.waypoint(L.latLng(destLat, destLon), destinationInput)
                    ],
                    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
                    routeWhileDragging: false,
                    show: true,
                    fitSelectedRoutes: 'smart'
                }).addTo(map);
                
                statusElement.textContent = 'Route calculated! See instructions on the left.';
            } else {
                statusElement.textContent = `Could not find coordinates for: ${destinationInput}.`;
            }
        })
        .catch(error => {
            console.error("Geocoding or Routing Error:", error);
            statusElement.textContent = "An error occurred during routing.";
        });
});

// 🌟 Start the location process (This is the only function call on page load) 🌟
getLocation();
