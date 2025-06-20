const OPENWEATHER_API_KEY = "d38fbf146ca1ece59539858de00b1e49"; // Replace with your key

let map, marker, infowindow;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 5.3302, lng: 103.1408 }, // Default: Terengganu
    zoom: 10,
  });

  infowindow = new google.maps.InfoWindow();

  map.addListener("click", function(e) {
    placeMarker(e.latLng);
    fetchWeather(e.latLng.lat(), e.latLng.lng());
  });

  // Search box
  const input = document.getElementById("mapSearch");
  const searchBox = new google.maps.places.SearchBox(input);

  searchBox.addListener("places_changed", function() {
    const places = searchBox.getPlaces();
    if (places.length === 0) return;
    const place = places[0];
    map.setCenter(place.geometry.location);
    placeMarker(place.geometry.location);
    fetchWeather(place.geometry.location.lat(), place.geometry.location.lng());
  });
}

function placeMarker(location) {
  if (marker) marker.setMap(null);
  marker = new google.maps.Marker({
    position: location,
    map: map,
  });
}

function fetchWeather(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`)
    .then(res => res.json())
    .then(data => {
      const content = `
        <div class="weather-popup">
          <strong>${data.name}</strong><br>
          ${data.weather[0].main}, ${Math.round(data.main.temp)}°C<br>
          Humidity: ${data.main.humidity}%<br>
          Wind: ${data.wind.speed} m/s
        </div>
      `;
      infowindow.setContent(content);
      infowindow.open(map, marker);
    });
}

window.onload = initMap;