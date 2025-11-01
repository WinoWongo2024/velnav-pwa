document.getElementById('destination-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const destination = document.getElementById('destination').value;
    const statusElement = document.getElementById('location-status');
    statusElement.textContent = 'Getting your location...';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Success callback: We have the user's location
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                statusElement.textContent = `You are at: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;

                // 🌟 Key step: Create the deep link URL 🌟
                // This URL format is widely supported by Google Maps, which often acts as a fallback/default
                // The 'saddr' (start address) is the coordinates, and 'daddr' (destination address) is the user's text input.
                const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lon}&destination=${encodeURIComponent(destination)}&travelmode=driving`;

                // Open the link, which triggers the native map app
                window.open(mapUrl, '_system');
                
                statusElement.textContent = 'Directions opened in your map app!';
            },
            (error) => {
                // Error callback
                statusElement.textContent = 'Error: Location access denied or unavailable.';
                console.error("Geolocation Error:", error);
                
                // Fallback: Just search for the destination without the starting point
                const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
                alert('Could not get your location. Opening map to search for destination only.');
                window.open(searchUrl, '_system');
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        // Geolocation is not supported
        statusElement.textContent = 'Geolocation is not supported by this browser.';
        alert('Geolocation is not supported. Cannot get directions.');
    }
});
