const apiKey =
  "nXETPuivZdUVyDZ-yXlaiPjCe10VqvbxdznAA1JIClEaAUaRj6k1tjcH-22erom175_GSdmL54qwDFqiVGTZsks865U9YpIP7h6rZqPI8BbhMfWUoFW9xoxGvzlRZ3Yx"; // Business Yelp API Key
const GEMINI_API_KEY = "AIzaSyDem0RVsOck3g19ay5ODZ7OEBJo29MaJhw";

// update the map initialization function
async function initMap() {
  // initialize the map
  const { Map } = await google.maps.importLibrary("maps");
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 34.0575, lng: -117.8211 },
    zoom: 13,
    gestureHandling: "greedy",
    streetViewControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  });

  createCircleMarker({ lat: 34.0575, lng: -117.8211 });

  const slider = document.getElementById("radius-slider");
  const radiusLabel = document.getElementById("radius-label");

  slider.addEventListener("input", () => {
   const radiusInMiles = slider.value;
   radiusLabel.textContent = `${radiusInMiles} miles`;

   circle.setRadius(radiusInMiles * 1609.34);

   handleSearch();
  });

  // add event listeners after map is initialized
  document.getElementById("search-button").addEventListener("click", () => {
    handleSearch();
  });

  document.getElementById("location-button").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          map.setCenter(coords);
          map.setZoom(13);
          createCircleMarker(coords);
          getZipCode(coords.lat, coords.lng);

          const allergies = getSelectedDietaryRestrictions();
          const preferences = getSelectedPreferences();
          const term = preferences || "restaurants";
          const radius = document.getElementById("radius-slider").value;
          searchYelp(
            term,
            `${coords.lat},${coords.lng}`,
            map,
            allergies,
            preferences,
            radius, 
          );
        },
        () => {
          alert("Geolocation failed or is not supported by your browser.");
        },
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  });
}

function milesToMeters(miles) {
  return Math.round(miles * 1609.34);
}

let marker; // Declare marker as a global variable to allow deletion
let circle; // Keep the existing circle declaration

function createCircleMarker(location) {
  // remove existing marker if it exists
  if (marker) {
    marker.setMap(null);
  }

  // remove existing circle if it exists
  if (circle) {
    circle.setMap(null);
  }

  // create new marker
  marker = new google.maps.Marker({
    position: location,
    map: map,
    draggable: true,
    icon: `http://maps.google.com/mapfiles/ms/icons/blue-dot.png`,
    zIndex: 100,
  });

  // Create new circle
  circle = new google.maps.Circle({
    map: map,
    radius: milesToMeters(2), // maps api uses meters: converting miles to meters
    center: location,
    fillColor: "#3996d4",
    fillOpacity: 0.25,
    strokeColor: "#1d80c2",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    clickable: false,
  });    

  circle.bindTo("center", marker, "position");

  google.maps.event.addListener(marker, 'dragend', function() {
    const newPosition = marker.getPosition();
    
    // update zip code field to searching in circle area
    document.getElementById("zip-code").value = "Current circle area";

    
    // Perform search with new location
    const radius = document.getElementById("radius-slider").value;
    const allergies = getSelectedDietaryRestrictions();
    const preferences = getSelectedPreferences();
    const searchQuery = document.getElementById("search-bar").value.trim();
    const term = searchQuery || preferences || "restaurants";

    searchYelp(
      term,
      `${newPosition.lat()},${newPosition.lng()}`,
      map,
      allergies,
      preferences,
      radius
    );
  });
}

function calculateZoomLevel(radius) {
  const zoom = Math.round(15 - Math.log(milesToMeters(radius) / Math.LN2));
  return Math.min(Math.max(zoom, 1), 21);
};

function handleSearch() {
  const searchQuery = document.getElementById("search-bar").value.trim();
  const zipCode = document.getElementById("zip-code").value || "34.0575,-117.8211";
  const allergies = getSelectedDietaryRestrictions();
  const preferences = getSelectedPreferences();
  const radius = document.getElementById("radius-slider").value;
  const radiusInMeters = milesToMeters(radius);
  const term = searchQuery || preferences || "restaurants";

  // If the zipCode looks like a numeric zip code, convert it to coordinates
  if (/^\d{5}$/.test(zipCode)) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: zipCode }, (results, status) => {
      if (status === "OK" && results[0]) {
        const location = results[0].geometry.location;
        const coords = {
          lat: location.lat(),
          lng: location.lng()
        };

       circle.setCenter(location);
        // perform Yelp search with the new coordinates
        searchYelp(
          term, 
          `${coords.lat},${coords.lng}`, 
          map, 
          allergies, 
          preferences, 
          radius
        );

        // adjust map bounds based on the circle
        const bounds = getBoundsForCircle(circle.getCenter(), radiusInMeters);
        map.fitBounds(bounds);

      } else {
        console.error("Geocoding failed:", status);
        alert("Could not find location for the entered zip code.");
      }
    });
  } else {
    // if it's already coordinates, proceed with search based on circle
      const newPosition = circle.getCenter();
      searchYelp(
      term,
      `${newPosition.lat()},${newPosition.lng()}`,
      map,
      allergies,
      preferences,
      radius
    );
    // searchYelp(term, zipCode, map, allergies, preferences, radius);
    
    const bounds = getBoundsForCircle(circle.getCenter(), radiusInMeters);
    map.fitBounds(bounds);
  }
}

document.getElementById("zip-code").addEventListener("focus", function () {
  this.select(); // Highlights all text in the input
});

document.getElementById("radius-slider").addEventListener("input", () => {
  const radiusInMiles = document.getElementById("radius-slider").value;
  const radiusLabel = document.getElementById("radius-label");
  radiusLabel.textContent = `${radiusInMiles} miles`;

  // ensure circle exists before setting radius
  if (circle) {
    // Simply update the radius without triggering a full search
    circle.setRadius(milesToMeters(radiusInMiles));
    
    // perform search with current marker location
    if (marker) {
      const currentLocation = marker.getPosition();
      searchYelp(
        document.getElementById("search-bar").value.trim() || getSelectedPreferences() || "restaurants", 
        `${currentLocation.lat()},${currentLocation.lng()}`, 
        map, 
        getSelectedDietaryRestrictions(), 
        getSelectedPreferences(), 
        radiusInMiles
      );
    }
  }
});

document.getElementById("radius-slider").addEventListener("input", () => {
  const radiusInMiles = document.getElementById("radius-slider").value;
  const radiusLabel = document.getElementById("radius-label");
  radiusLabel.textContent = `${radiusInMiles} miles`;

  if (circle) {
    circle.setRadius(milesToMeters(radiusInMiles));
    handleSearch();
  }
});

function getBoundsForCircle(center, radiusInMeters) {
  const bounds = new google.maps.LatLngBounds();

  // compute the positions of the circle boundary points (N, S, E, W)
  const northEast = google.maps.geometry.spherical.computeOffset(center, radiusInMeters, 45); // NE corner
  const southWest = google.maps.geometry.spherical.computeOffset(center, radiusInMeters, 225); // SW corner

  bounds.extend(northEast);
  bounds.extend(southWest);

  return bounds;
}

// function to get zup code using Google Maps Geocoding apu
function getZipCode(lat, lng) {
  const geocoder = new google.maps.Geocoder();
  const latLng = new google.maps.LatLng(lat, lng);

  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === google.maps.GeocoderStatus.OK) {
      if (results[0]) {
        // find the zip code in the address components
        const addressComponents = results[0].address_components;
        const zipCodeComponent = addressComponents.find((component) =>
          component.types.includes("postal_code"),
        );

        // update the zip code field if a zip code is found
        if (zipCodeComponent) {
          document.getElementById("zip-code").value =
            zipCodeComponent.long_name;
        }
      } else {
        alert("No results found for the location.");
      }
    } else {
      console.error("Geocoder failed due to:", status);
    }
  });
}

function getLocationByZip(zipcode) {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: zipcode }, (results, status) => {
        if (status === "OK" && results[0]) {
            const location = results[0].geometry.location;
            map.setCenter(location)
        } else {

        }
    });
}

const darkModeToggle = document.getElementById("dark-mode-toggle");
darkModeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});

document.addEventListener("keydown", (event) => {
  const aiSearchField = document.getElementById("ai-search-bar");

  if (event.key === "Enter" && document.activeElement !== aiSearchField) {
    handleSearch();
  }
});

function getSelectedDietaryRestrictions() {
  const allergies = [];
  if (document.getElementById("vegetarian").checked)
    allergies.push("vegetarian");
  if (document.getElementById("gluten-free").checked)
    allergies.push("gluten_free");
  if (document.getElementById("halal").checked)
    allergies.push("halal");
  if (document.getElementById("kosher").checked)
    allergies.push("kosher");
  if (document.getElementById("vegan").checked)
    allergies.push("vegan");
  // if (document.getElementById("keto").checked)
  //   allergies.push("keto");
  // if (document.getElementById("pescatarian").checked)
  //   allergies.push("pescatarian");
  return allergies.join(", ");
}

function getSelectedPreferences() {
  const preferences = [];
  if (document.getElementById("mexican").checked)
    preferences.push("mexican restaurants");
  if (document.getElementById("chinese").checked)
    preferences.push("chinese restaurants");
  if (document.getElementById("italian").checked)
    preferences.push("italian restaurants");
  if (document.getElementById("indian").checked)
    preferences.push("indian restaurants");
  if (document.getElementById("japanese").checked)
    preferences.push("japanese restaurants");
  if (document.getElementById("mediterranean").checked)
    preferences.push("mediterranean restaurants");
  if (document.getElementById("thai").checked)
    preferences.push("thai restaurants");
  if (document.getElementById("french").checked)
    preferences.push("french restaurants");
  if (document.getElementById("korean").checked)
    preferences.push("korean restaurants");
  if (document.getElementById("nordic").checked)
    preferences.push("nordic restaurants");

  return preferences.join(", ");
}

// search yelp api
function searchYelp(term, location, map, allergies, preferences, radius) {
  const categories = [allergies, preferences].filter(Boolean).join(",");
  const params = new URLSearchParams({
    term: term,
    location: location,
    preferences: preferences,
    categories: allergies,
    radius: milesToMeters(radius),    
  });
  const url = `https://api.yelp.com/v3/businesses/search?${params.toString()}`;

  fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      displayResults(data.businesses, map);
    })
    .catch((error) => console.error("Error:", error));


}

function displayResults(businesses, map) {
  const restaurantList = document.getElementById("restaurant-list");
  restaurantList.innerHTML = ""; // Clear previous results

  if (!map.markers) {
    map.markers = [];
  }

  // clear previous markers from map
  map.markers.forEach((marker) => marker.setMap(null));
  map.markers = []; // reset markers array

  // create places service instance
  const placesService = new google.maps.places.PlacesService(map);

  // loop through businesses to add markers and list items
  businesses.forEach((business, index) => {
    // add restaurant item to list
    const listItem = document.createElement("div");
    listItem.className = "restaurant-item";
    listItem.setAttribute("data-index", index);

    // initially create the basic content
    listItem.innerHTML = `
            <div class="restaurant-listing"> 
              <img class="restaurant-image"src="${business.image_url}" alt="${business.name}" >
              <div class="restuarant-details"> 
                <h3 class="restaurant-name" style="font-weight:bold;">${business.name}</h3>
                <p>${business.location.address1}, ${business.location.city}</p>
                <div class="description-placeholder">
                    <p class="restaurant-description">${business.categories.map((cat) => cat.title).join(", ")}</p>
                    <p class="rating-info">Rating: ${business.rating} ⭐ (${business.review_count} reviews)</p>
                    <p>${business.price || ""} | ${formatPhoneNumber(business.phone)}</p>
                </div>
                <div style="display:flex; align-content: center;">
                    <p class="show-on-map" onclick="showOnMap(${index})">Show on Map</p>
                    <i class="fa-solid fa-location-dot" style="padding-top: 5px;"></i>
                </div>
              </div>
            </div>
        `;

    restaurantList.appendChild(listItem);

    // create marker for each business
    const marker = new google.maps.Marker({
      position: {
        lat: business.coordinates.latitude,
        lng: business.coordinates.longitude,
      },
      map: map,
      title: business.name,
    });

    // create info window content
    const infoWindow = new google.maps.InfoWindow({
      content: `
                <div>
                    <h3 style="color: black;">${business.name}</h3>
                    <img src="${business.image_url}" alt="${business.name}" style="width:100px; display:block; margin:10px 0;">
                    <p style="color: black;">${business.location.address1}, ${business.location.city}</p>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(business.location.address1 + ", " + business.location.city)}" target="_blank" style="display:block; text-align:center; margin-top:10px; color:blue;">Get Directions</a>
                </div>
            `,
    });

    // open info window when the marker is clicked and change font color of corresponding item
    marker.addListener("click", () => {
      if (map.infoWindow) map.infoWindow.close();
      infoWindow.open(map, marker);
      map.infoWindow = infoWindow;
      highlightListItem(index);
    });

    // store marker in map.markers array
    map.markers.push(marker);
  });
}

// helper function to format phone numbers
function formatPhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = ("" + phone).replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return "(" + match[1] + ") " + match[2] + "-" + match[3];
  }
  return phone;
}

// helper function to try getting additional details from Places API
function tryGetPlacesDescription(business, placesService, listItem) {
  const request = {
    query: `${business.name} ${business.location.address1}`,
    fields: ["place_id"],
  };

  placesService.findPlaceFromQuery(request, (results, status) => {
    if (
      status === google.maps.places.PlacesServiceStatus.OK &&
      results &&
      results[0]
    ) {
      const placeId = results[0].place_id;

      placesService.getDetails(
        {
          placeId: placeId,
          fields: ["editorial_summary"],
        },
        (place, detailsStatus) => {
          if (
            detailsStatus === google.maps.places.PlacesServiceStatus.OK &&
            place.editorial_summary
          ) {
            const descriptionElement = listItem.querySelector(
              ".description-placeholder",
            );
            const existingContent = descriptionElement.innerHTML;
            descriptionElement.innerHTML = `
                                <p class="restaurant-description">${place.editorial_summary.overview}</p>
                                ${existingContent}
                            `;
          }
        },
      );
    }
  });
}

// Function to center the map on a selected marker, open info window, and highlight the item
function showOnMap(index) {
  const marker = map.markers[index];
  google.maps.event.trigger(marker, "click"); // Simulate click to open info window
  highlightListItem(index);
  const mapSection = document.getElementById("map");
  if (mapSection) {
    mapSection.scrollIntoView({ behavior: "smooth", block: "center"});
  }
}

// function to highlight a list item based on the index
function highlightListItem(index) {
  // remove highlight from any previously highlighted item
  document.querySelectorAll(".restaurant-item h3").forEach((item) => {
    item.style.color = ""; // reset color
  });

  // set the font color of the clicked item to black
  const selectedItem = document.querySelector(
    `.restaurant-item[data-index="${index}"] h3`,
  );
  if (selectedItem) {
    selectedItem.style.color = "black";
  }
}

function showRestaurantInfo(business, map, marker = null) {
  const url = `https://api.yelp.com/v3/businesses/${business.id}`;

  fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      const address = `${data.location.address1}, ${data.location.city}, ${data.location.state}`;
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

      const infoContent = `
            <h3 style="color: black;">${data.name}</h3>
            <p style="color: black;">${address}</p>
            <img src="${data.image_url}" alt="${data.name}" style="width:100px; display:block; margin:10px 0;">
            <a href="${directionsUrl}" target="_blank" style="display:block; text-align:center; margin-top:10px; color:black;">Get Directions</a>
        `;

      if (marker) {
        if (infoWindow) infoWindow.close();
        infoWindow = new google.maps.InfoWindow({ content: infoContent });
        infoWindow.open(map, marker);
      }
    })
    .catch((error) =>
      console.error("Error fetching restaurant details:", error),
    );
}

// display business details using Yelp data
function displayBusinessDetails(business, marker) {
  const url = `https://api.yelp.com/v3/businesses/${business.id}`;

  fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      // construct google maps directions url with city and state
      const address = `${data.name}, ${data.location.address1}, ${data.location.city}, ${data.location.state}`;
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

      const infoContent = `
                <h3>${data.name}</h3>
                <p>${data.location.address1}</p>
                <p>${data.location.city}</p>
                <img src="${data.image_url}" alt="${data.name}" style="width:100px; display: block; margin: 0 auto;"> 
                <a href="${directionsUrl}" target="_blank" style="display: block; text-align: center; margin-top: 10px;">Get Directions</a>  
            `;

      infoWindow = new google.maps.InfoWindow({
        content: infoContent,
      });

      infoWindow.open(map, marker);
    })
    .catch((error) => console.error("Error:", error));
}

async function getAIRecommendation(prompt) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  try {
    const response = await fetch(`${url}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a restaurant recommendation expert. Based on this request: "${prompt}", suggest a type of cuisine/restaurant. 
                        Format your response in exactly this way:
                        Cuisine Type: [single word or hyphenated cuisine type]
                        Explanation: [2-3 sentences explaining why]
                        
                        For example:
                        Cuisine type: Thai
                        Explanation: Thai cuisine offers a perfect balance of sweet, sour, and spicy flavors. The variety of curries, noodles, and fresh ingredients would satisfy your craving for something flavorful and exciting.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Error getting AI recommendation:", error);
    return "Sorry, I could not generate a recommendation at this time.";
  }
}

function clearCuisineCheckboxes() {
  // clear cuisine check boxes
  const checkboxes = document.getElementById("preferences-settings").querySelectorAll("input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });
}

// initialize ai search functionality
function initAISearch() {
  const aiSearchButton = document.getElementById("ai-search-button");
  const aiSearchBar = document.getElementById("ai-search-bar");
  const aiResponse = document.getElementById("ai-response");
  const aiResponseContent = document.querySelector(".ai-response-content");
  const useRecommendationButton = document.getElementById("use-recommendation");

  aiSearchButton.addEventListener("click", async () => {
    const prompt = aiSearchBar.value.trim();
    if (!prompt) return;

    // show loading state
    aiSearchButton.disabled = true;
    aiSearchButton.textContent = "Getting Recommendation...";
    aiResponse.classList.remove("hidden");
    aiResponseContent.textContent = "Thinking...";
    useRecommendationButton.classList.add("hidden");

    try {
      const recommendation = await getAIRecommendation(prompt);
      aiResponseContent.textContent = recommendation;
      useRecommendationButton.classList.remove("hidden");
    } catch (error) {
      aiResponseContent.textContent =
        "Sorry, there was an error getting your recommendation.";
    } finally {
      aiSearchButton.disabled = false;
      aiSearchButton.innerHTML =
        '<span class="ai-icon">🤖</span>Get AI Recommendation';
    }
  });

  useRecommendationButton.addEventListener("click", () => {
    const recommendation = aiResponseContent.textContent;
    // Extract just the cuisine type from the response
    const cuisineMatch = recommendation.match(/Cuisine Type:\s*(\S+)/);
    if (cuisineMatch && cuisineMatch[1]) {
      const cuisineType = cuisineMatch[1];
      const searchBar = document.getElementById("search-bar");
      searchBar.value = cuisineType;
      document.getElementById("search-button").click();

      clearCuisineCheckboxes();

      // also check the corresponding preference checkbox if it exists
      const preferenceCheckbox = document.getElementById(cuisineType.toLowerCase());
      if (preferenceCheckbox) {
        preferenceCheckbox.checked = true;
      }
    }
  });

  // copy and pasting block above for enter key because too lazy to abstract
  document.getElementById("ai-search-bar").addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      const prompt = aiSearchBar.value.trim();
      if (!prompt) return;

      // show loading state
      aiSearchButton.disabled = true;
      aiSearchButton.textContent = "Getting Recommendation...";
      aiResponse.classList.remove("hidden");
      aiResponseContent.textContent = "Thinking...";
      useRecommendationButton.classList.add("hidden");

      try {
        const recommendation = await getAIRecommendation(prompt);
        aiResponseContent.textContent = recommendation;
        useRecommendationButton.classList.remove("hidden");
      } catch (error) {
        aiResponseContent.textContent =
          "Sorry, there was an error getting your recommendation.";
      } finally {
        aiSearchButton.disabled = false;
        aiSearchButton.innerHTML =
          '<span class="ai-icon">🤖</span>Get AI Recommendation';
      }
    }
  });
}

// update your script loading at the bottom of your HTML
document.addEventListener("DOMContentLoaded", function () {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB-VjpNM72mRTsjoyr4t_u5gqENatzFL48&libraries=places&callback=initMap`;
  script.async = true;
  script.defer = true;
  initAISearch();
  document.head.appendChild(script);
});
