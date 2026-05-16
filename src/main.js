// import 'bootstrap/dist/css/bootstrap.min.css';
// import 'bootstrap/dist/js/bootstrap.bundle.min.js';
// import '../scss/styles.scss';
// import * as bootstrap from 'bootstrap';


// Beginning of Claude suggestions for AI popup feature (smart search)
// 
let locations = []; // Store locations data globally

// Load locations when page loads
async function loadLocations() {
  try {
    const response = await fetch("/api/locations");
    locations = await response.json();
    console.log("Loaded locations:", locations);
  } catch (error) {
    console.error("Error loading locations:", error);
    // Fallback to empty array if locations can't be loaded
    locations = [];
  }
}

// Initialize locations on page load
loadLocations();

document.getElementById("search-btn").addEventListener("click", handleSearch);

// Also allow Enter key to trigger search
document.getElementById("search-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});
// End of Claude Block for AI popup


async function handleSearch() {
    console.log("button clicked");
    const query = document.getElementById('search-input').value;
    console.log("query:", query);
    const data = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, locations }),
    }).then((r) => r.json());
    console.log("response:", data);
    document.getElementById('responseText').textContent = data.response;
}