// Global variables
const DEFAULT_LAT = 54.0084; // ÖestVèl Centrè (Harrogate)
const DEFAULT_LON = -1.5422;

// Track the user's last known location
let userLat = DEFAULT_LAT;
let userLon = DEFAULT_LON;

// Get DOM elements
const statusElement = document.createElement('p');
statusElement.id = 'status-message';
document.querySelector('header').parentNode.insertBefore(statusElement, document.querySelector('header').nextSibling);
const mapIframe = document.getElementById('map-iframe');


// 🌟 Loading Bar Control Function (Unchanged) 🌟
function updateLoadingStatus(percent, text) {
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');
    const body = document.body;

    if (!loadingBar || !loadingText) return;

    if (percent >= 100) {
        loadingBar.style.width = '100%';
        loadingText.textContent = 'Loading Complete!';
        setTimeout(() => {
            body.classList.add('loaded');
        }, 300); 
    } else {
        body.classList.remove('loaded');
        loadingBar.style.width = `${percent}%`;
        loadingText.textContent = `${text} (${percent}%)`;
    }
}

// 1. Map Initialization (Simply loads the iframe)
function loadMapFrame(lat, lon, destination = "") {
    let mapUrl;
    
    if (destination) {
        // Embed URL for directions (uses public Google Maps URL structure)
        const origin = `${lat},${lon}`;
        mapUrl = `https://maps.google.com/maps?q=from+${origin}+to+${encodeURIComponent(destination)}&output=embed`;
        statusElement.textContent = `Route loaded for: ${destination}`;
        updateLoadingStatus(100, 'Route Loaded');
    } else {
        // Embed URL for centering on location
        const center = `${lat},${lon}`;
        mapUrl = `https://maps.google.com/maps?q=${center}&z=13&output=embed`;
        statusElement.textContent = `Map centered on: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        updateLoadingStatus(100, 'Map Loaded');
    }

    mapIframe.src = mapUrl;
}

// 2. Aggressive Location Request (Saves location, then loads map)
function getLocation() {
    if (!navigator.geolocation) {
        statusElement.textContent = 'Geolocation not supported. Defaulting to ÖestVèl Centrè.';
        updateLoadingStatus(100, 'Geolocation failed. Map loaded.');
        loadMapFrame(DEFAULT_LAT, DEFAULT_LON);
        return;
    }

    statusElement.textContent = 'Requesting location permission...';
    updateLoadingStatus(10, 'Awaiting Location Permission');

    const options = {
        enableHighAccuracy: true,
        timeout: 7000, 
        maximumAge: 0
    };
    
    navigator.geolocation.getCurrentPosition(
        // SUCCESS: Position Found
        (position) => {
            userLat = position.coords.latitude;
            userLon = position.coords.longitude;
            
            updateLoadingStatus(40, 'Location Found. Loading Map');
            loadMapFrame(userLat, userLon); // Load map centered on current location
        },
        // ERROR: Position Failed
        (error) => {
            if (error.code === error.PERMISSION_DENIED) {
                const message = `🔴 **Permission Denied!** To use navigation, you must allow location access. Check iOS Settings for Safari Location Services.`;
                statusElement.innerHTML = message.replace(/\n/g, '<br>'); 
                alert(message.replace(/<br>/g, '\n'));
            } else {
                statusElement.textContent = 'Location unavailable. Defaulting to ÖestVèl Centrè.';
            }
            updateLoadingStatus(100, 'Map Initialized (Default Location)');
            loadMapFrame(DEFAULT_LAT, DEFAULT_LON); 
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

    statusElement.textContent = `Calculating route to: ${destinationInput}...`;
    updateLoadingStatus(70, 'Calculating Route');

    // Use the last known (or default) location and the destination address
    loadMapFrame(userLat, userLon, destinationInput);
});


// 🌟 Start the location process 🌟
getLocation();
