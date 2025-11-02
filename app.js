// Global variables
let map = null; 
let userMarker;
let routingControl = null;
const DEFAULT_LAT = 54.0084; // ÖestVèl Centrè (Harrogate)
const DEFAULT_LON = -1.5422;

// Get the status message element
const statusElement = document.createElement('p');
statusElement.id = 'status-message';
const header = document.querySelector('header');
if (header) {
    // Insert status message after the header
    header.parentNode.insertBefore(statusElement, header.nextSibling);
} else {
    document.body.insertBefore(statusElement, document.getElementById('map'));
}

// 🌟 NEW: Loading Bar Control Function 🌟
function updateLoadingStatus(percent, text) {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    const body = document.body;

    if (!loadingBar || !loadingText) return; // Safety check

    if (percent >= 100) {
        // Complete loading
        loadingBar.style.width = '100%';
        loadingText.textContent = 'Loading Complete!';
        
        // Use a short delay before sliding the bar away
        setTimeout(() => {
            body.classList.add('loaded'); // Trigger CSS to slide the bar off-screen
        }, 300); 

    } else {
        // Update progress
        body.classList.remove('loaded');
        loadingBar.style.width = `${percent}%`;
        loadingText.textContent = `${text} (${percent}%)`;
    }
}

// 1. Map Initialization (Delayed until Location is resolved)
function initMap(lat, lon) {
    if (map) {
        map.setView([lat, lon], 13);
        map.invalidateSize(); 
        updateLoadingStatus(100, 'Ready');
        return;
    }
    
    statusElement.textContent = 'Map tiles loading...';
    updateLoadingStatus(60, 'Initializing Leaflet');

    // Initialize Map Here! (Without the tile layer initially)
    map = L.map('map', {
        maxBoundsViscosity: 1.0, 
        inertia: false 
    }).setView([lat, lon], 13);
    
    // --- CRITICAL FIXES ---
    // 1. Invalidate size immediately after creation
    map.invalidateSize(true); 
    
    // 2. Delay the tile load to guarantee the DOM is settled
    setTimeout(function() {
        // Add the OpenStreetMap tiles now
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        updateLoadingStatus(80, 'Loading Map Tiles');

        // 3. One final redraw guarantee after tiles are added
        map.invalidateSize(true);
        statusElement.textContent = `Map centered on: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        
        userMarker = L.marker([lat, lon], {title: "Your Location"}).addTo(map)
            .bindPopup("Your Current Position").openPopup();
        
        updateLoadingStatus(100, 'Navigator Ready');
        
    }, 500); // 500ms delay to give the browser time to settle
}

// 2. Aggressive Location Request
function getLocation() {
    if (!navigator.geolocation) {
        statusElement.textContent = 'Error: Geolocation not supported. Defaulting to ÖestVèl Centrè.';
        updateLoadingStatus(100, 'Geolocation failed. Map loaded.');
        initMap(DEFAULT_LAT, DEFAULT_LON);
        return;
    }

    statusElement.textContent = 'Requesting location permission...';
    updateLoadingStatus(10, 'Awaiting Location Permission'); // 10%

    const options = {
        enableHighAccuracy: true,
        timeout: 7000, 
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        // SUCCESS: Position Found
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            updateLoadingStatus(40, 'Location Found. Initializing Map');
            initMap(lat, lon); 
            
            // Marker update happens inside initMap's timeout
            map.setView([lat, lon], 16);
        },
        // ERROR: Position Failed
        (error) => {
            console.error("Geolocation Error:", error);

            if (error.code === error.PERMISSION_DENIED) {
                const message = `🔴 **Permission Denied!** To use navigation, you must allow location access. Check iOS Settings for Safari Location Services.`;
                statusElement.innerHTML = message.replace(/\n/g, '<br>'); 
                alert(message.replace(/<br>/g, '\n'));
                
            } else if (error.code === error.TIMEOUT) {
                statusElement.textContent = 'Location timed out. Trying again...';
                getLocation(); // Recursive call
                return; 
            } else {
                statusElement.textContent = 'Location unavailable. Defaulting to ÖestVèl Centrè.';
            }
            // Initialize Map on Failure
            updateLoadingStatus(100, 'Map Initialized (Default Location)');
            initMap(DEFAULT_LAT, DEFAULT_LON); 
        },
        options
    );
}

// 3. Handle Routing
document.getElementById('get-directions').addEventListener('click', () => {
    
    // Check if the map object exists AND if the userMarker was successfully placed
    // Check if the userMarker is null or the marker is at the default location
    if (!map || !userMarker || (userMarker.getLatLng().lat === DEFAULT_LAT && userMarker.getLatLng().lng === DEFAULT_LON)) {
        alert("Cannot get directions. Please allow location access first. Navigator will re-attempt to find your location.");
        getLocation(); 
        return;
    }
    
    const destinationInput = document.getElementById('destination').value.trim();
    if (!destinationInput) {
        alert("Please enter a destination.");
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

    const currentLatLng = userMarker.getLatLng();

    // Routing logic
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

// 🌟 Start the location process 🌟
getLocation();
