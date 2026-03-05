import { STORE_LOCATION, MAX_DISTANCE_KM } from "./config.js";

let userLat, userLng, calculatedDistance;

function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, (e) => alert("GPS Error: " + e.message));
    } else {
        alert("GPS not supported");
    }
}

function showPosition(position) {
    userLat = position.coords.latitude;
    userLng = position.coords.longitude;
    
    // Verify Google Maps loaded
    if(typeof google === 'undefined') {
        document.getElementById("statusMsg").innerText = "Error: Google Maps API Key missing.";
        return;
    }

    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15, center: { lat: userLat, lng: userLng }
    });
    new google.maps.Marker({ position: { lat: userLat, lng: userLng }, map: map });

    calculatedDistance = getDistanceFromLatLonInKm(STORE_LOCATION.lat, STORE_LOCATION.lng, userLat, userLng);
    const status = document.getElementById("statusMsg");
    const btn = document.getElementById("confirmBtn");

    if (calculatedDistance <= MAX_DISTANCE_KM) {
        status.innerHTML = `✅ ${calculatedDistance.toFixed(2)} KM (Delivering)`;
        status.style.color = "green";
        btn.disabled = false;
        btn.style.background = "#2ecc71";
    } else {
        status.innerHTML = `❌ ${calculatedDistance.toFixed(2)} KM (Too far)`;
        status.style.color = "red";
        btn.disabled = true;
    }
}

// Haversine Formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; 
    var dLat = (lat2-lat1) * (Math.PI/180);
    var dLon = (lon2-lon1) * (Math.PI/180); 
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

window.saveLocation = () => {
    const address = document.getElementById("fullAddress").value;
    if(!address) return alert("Enter House No!");
    const deliveryData = { lat: userLat, lng: userLng, distance: calculatedDistance, fullAddress: address };
    localStorage.setItem("deliveryData", JSON.stringify(deliveryData));
    window.location.href = "payment.html";
};

window.onload = initMap;