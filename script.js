const apiKey =
  "mpUBLXDbRvr6QAxwIMOp3xssUgC76u61q43hL_YiCMeeqjJI1QZEXlbBUQdQe-WxGFXVQniQiLLdveIiIfLAWgEmsNXK4zpbpMCntX9-KtwV79uyW65Nq3VU6TUtZ3Yx"; // Business Yelp API Key
const GEMINI_API_KEY = "AIzaSyDem0RVsOck3g19ay5ODZ7OEBJo29MaJhw";

// Update the map initialization function
async function initMap() {
  // Initialize the map
  const { Map } = await google.maps.importLibrary("maps");
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 34.0575, lng: -117.8211 },
    zoom: 12,
    gestureHandling: "greedy",
    streetViewControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  });

  // Add event listeners after map is initialized
  document.getElementById("search-button").addEventListener("click", () => {
    handleSearch();
  });

  document.getElementById("search-bar").addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  })

  document.getElementById("location-button").addEventListener("click", () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          map.setCenter(coords);
          map.setZoom(12);
          getZipCode(coords.lat, coords.lng);

          const allergies = getSelectedAllergies();
          const preferences = getSelectedPreferences();
          const term = preferences || "restaurants";
          searchYelp(
            term,
            `${coords.lat},${coords.lng}`,
            map,
            allergies,
            preferences,
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

function handleSearch() {
  const searchQuery = document.getElementById("search-bar").value.trim();
  const zipCode =
    document.getElementById("zip-code").value || "34.0575,-117.8211";
  const allergies = getSelectedAllergies();
  const preferences = getSelectedPreferences();

  const term = searchQuery || preferences || "restaurants";
  searchYelp(term, zipCode, map, allergies, preferences);

  map.setZoom(12);
  map.setCenter(getLocationByZip(zipCode));
}

// Function to get ZIP code using Google Maps Geocoding API
function getZipCode(lat, lng) {
  const geocoder = new google.maps.Geocoder();
  const latLng = new google.maps.LatLng(lat, lng);

  geocoder.geocode({ location: latLng }, (results, status) => {
    if (status === google.maps.GeocoderStatus.OK) {
      if (results[0]) {
        // Find the ZIP code in the address components
        const addressComponents = results[0].address_components;
        const zipCodeComponent = addressComponents.find((component) =>
          component.types.includes("postal_code"),
        );

        // Update the ZIP Code field if a ZIP code is found
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

function getSelectedAllergies() {
  const allergies = [];
  if (document.getElementById("peanut-free").checked)
    allergies.push("peanut-free restaurants");
  if (document.getElementById("tree-nut-free").checked)
    allergies.push("tree nut-free restaurants");
  if (document.getElementById("seafood-free").checked)
    allergies.push("seafood-free restaurants");
  if (document.getElementById("dairy-free").checked)
    allergies.push("dairy-free restaurants");
  if (document.getElementById("gluten-free").checked)
    allergies.push("gluten-free restaurants");
  if (document.getElementById("soy-free").checked)
    allergies.push("soy-free restaurants");
  if (document.getElementById("fish-free").checked)
    allergies.push("fish-free restaurants");
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
  return preferences.join(", ");
}

// Search Yelp API
function searchYelp(term, location, map, allergies, preferences) {
  const categories = [allergies, preferences].filter(Boolean).join(",");

  const url = `https://api.yelp.com/v3/businesses/search?term=${term}&location=${location}&categories=${categories}`;

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

  // Clear previous markers from the map
  map.markers.forEach((marker) => marker.setMap(null));
  map.markers = []; // Reset markers array

  // Create Places service instance
  const placesService = new google.maps.places.PlacesService(map);

  // Loop through businesses to add markers and list items
  businesses.forEach((business, index) => {
    // Add restaurant item to list
    const listItem = document.createElement("div");
    listItem.className = "restaurant-item";
    listItem.setAttribute("data-index", index);

    // Initially create the basic content
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

    // Create marker for each business
    const marker = new google.maps.Marker({
      position: {
        lat: business.coordinates.latitude,
        lng: business.coordinates.longitude,
      },
      map: map,
      title: business.name,
    });

    // Create info window content
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

    // Open info window when the marker is clicked and change font color of corresponding item
    marker.addListener("click", () => {
      if (map.infoWindow) map.infoWindow.close();
      infoWindow.open(map, marker);
      map.infoWindow = infoWindow;
      highlightListItem(index);
    });

    // Store marker in map.markers array
    map.markers.push(marker);
  });
}

// Update your script loading at the bottom of your HTML
document.addEventListener("DOMContentLoaded", function () {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB-VjpNM72mRTsjoyr4t_u5gqENatzFL48&libraries=places&callback=initMap`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
});

// Helper function to format phone numbers
function formatPhoneNumber(phone) {
  if (!phone) return "";
  const cleaned = ("" + phone).replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return "(" + match[1] + ") " + match[2] + "-" + match[3];
  }
  return phone;
}

// Helper function to try getting additional details from Places API
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
  map.setCenter(marker.getPosition());
  google.maps.event.trigger(marker, "click"); // Simulate click to open info window
  highlightListItem(index);
  const mapSection = document.getElementById("map");
  if (mapSection) {
    mapSection.scrollIntoView({ behavior: "smooth", block: "center"});
  }
}

// Function to highlight a list item based on the index
function highlightListItem(index) {
  // Remove highlight from any previously highlighted item
  document.querySelectorAll(".restaurant-item h3").forEach((item) => {
    item.style.color = ""; // Reset color
  });

  // Set the font color of the clicked item to black
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

// Display business details using Yelp data
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
      // Construct Google Maps directions URL with city and state
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
// Load the Google Maps script
// const script = document.createElement('script');
// script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB-VjpNM72mRTsjoyr4t_u5gqENatzFL48&callback=initMap`;
// script.async = true;
// script.defer = true;
// document.head.appendChild(script);

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
                        CUISINE_TYPE: [single word or hyphenated cuisine type]
                        EXPLANATION: [2-3 sentences explaining why]
                        
                        For example:
                        CUISINE_TYPE: Thai
                        EXPLANATION: Thai cuisine offers a perfect balance of sweet, sour, and spicy flavors. The variety of curries, noodles, and fresh ingredients would satisfy your craving for something flavorful and exciting.`,
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

// Initialize AI search functionality
function initAISearch() {
  const aiSearchButton = document.getElementById("ai-search-button");
  const aiSearchBar = document.getElementById("ai-search-bar");
  const aiResponse = document.getElementById("ai-response");
  const aiResponseContent = document.querySelector(".ai-response-content");
  const useRecommendationButton = document.getElementById("use-recommendation");

  aiSearchButton.addEventListener("click", async () => {
    const prompt = aiSearchBar.value.trim();
    if (!prompt) return;

    // Show loading state
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
    const cuisineMatch = recommendation.match(/CUISINE_TYPE:\s*(\S+)/);
    if (cuisineMatch && cuisineMatch[1]) {
      const cuisineType = cuisineMatch[1].toLowerCase();
      const searchBar = document.getElementById("search-bar");
      searchBar.value = cuisineType;
      document.getElementById("search-button").click();

      // Also check the corresponding preference checkbox if it exists
      const preferenceCheckbox = document.getElementById(cuisineType);
      if (preferenceCheckbox) {
        preferenceCheckbox.checked = true;
      }
    }
  });
}

// Update your script loading at the bottom of your HTML
document.addEventListener("DOMContentLoaded", function () {
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB-VjpNM72mRTsjoyr4t_u5gqENatzFL48&libraries=places&callback=initMap`;
  script.async = true;
  script.defer = true;
  initAISearch();
  document.head.appendChild(script);
});
