// ── Globals ──────────────────────────────────────────────────────────────────
let allLocations = [];
let currentSort = "rating";
let currentLocationId = null;
let selectedRating = 0;

const token = () => localStorage.getItem("token");
const authHeaders = () => {
  const t = token();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  setupViewToggle();
  loadLocations();
  setupSearch();
  setupSort();
  setupStars();
  setupReviewForm();
  updateGreeting();
});

// ── Load Locations ───────────────────────────────────────────────────────────
async function loadLocations() {
  try {
    const res = await fetch("/api/locations");
    allLocations = await res.json();
    renderLocations(allLocations);
    updateMapMarkers(allLocations);
  } catch (e) {
    document.getElementById("locationList").innerHTML =
      '<div class="text-center py-5 text-danger">Failed to load locations</div>';
  }
}

// ── Push location markers to the Leaflet map ────────────────────────────────
function updateMapMarkers(locs) {
  if (window._mapInstance && typeof window._mapInstance.setShadeLocations === "function") {
    window._mapInstance.setShadeLocations(locs);
  }
}

// ── Map / List view toggle ──────────────────────────────────────────────────
function setupViewToggle() {
  const btnMap = document.getElementById("btnMapView");
  const btnList = document.getElementById("btnListView");
  const mapContainer = document.getElementById("mapContainer");
  const sortBar = document.getElementById("sortBar");
  const locationList = document.getElementById("locationList");

  if (!btnMap || !btnList) return; // not on this page

  btnMap.addEventListener("click", () => {
    btnMap.classList.add("active");
    btnList.classList.remove("active");
    mapContainer.classList.remove("d-none");
    sortBar.classList.add("d-none");
    locationList.classList.add("d-none");
    // Fix map size after becoming visible
    setTimeout(() => {
      if (window._mapInstance && window._mapInstance.map) {
        window._mapInstance.map.invalidateSize();
      }
    }, 100);
  });

  btnList.addEventListener("click", () => {
    btnList.classList.add("active");
    btnMap.classList.remove("active");
    mapContainer.classList.add("d-none");
    sortBar.classList.remove("d-none");
    locationList.classList.remove("d-none");
  });
}

// ── Render Location Cards ────────────────────────────────────────────────────
function renderLocations(locs) {
  const container = document.getElementById("locationList");
  if (!locs.length) {
    container.innerHTML = '<div class="text-center py-5 text-muted">No locations found</div>';
    return;
  }

  container.innerHTML = locs.map(loc => {
    const rating = parseFloat(loc.overall_rating_avg) || 0;
    const pct = Math.round((rating / 10) * 100);
    const shadeLabel = rating >= 8 ? "Great shade" : rating >= 5 ? "Moderate" : "Limited shade";
    const shadeColor = rating >= 8 ? "var(--shade-high)" : rating >= 5 ? "var(--shade-mid)" : "var(--shade-low)";

    return `
      <div class="location-card card mb-3" data-id="${loc.location_id}" onclick="openDetail(${loc.location_id})">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h3 class="h6 mb-1">${esc(loc.location_name)}</h3>
              <span class="badge shade-badge" style="background:${shadeColor}">${rating.toFixed(1)}/10</span>
              <small class="text-muted ms-1">${shadeLabel}</small>
            </div>
            <small class="text-muted">&#x2197;</small>
          </div>
          <div class="shade-bar mt-2">
            <div class="shade-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ── Detail Modal ─────────────────────────────────────────────────────────────
async function openDetail(locationId) {
  currentLocationId = locationId;
  const loc = allLocations.find(l => l.location_id === locationId);
  if (!loc) return;

  document.getElementById("modalName").textContent = loc.location_name;
  const rating = parseFloat(loc.overall_rating_avg) || 0;
  const pct = Math.round((rating / 10) * 100);
  document.getElementById("modalShadeFill").style.width = pct + "%";
  document.getElementById("modalShadeLabel").textContent = rating.toFixed(1) + " / 10";

  // Reset favorite button
  const favBtn = document.getElementById("modalFavBtn");
  favBtn.dataset.locationId = locationId;
  favBtn.innerHTML = "&#x2606; Favorite";

  // Load reviews
  loadReviews(locationId);

  const modal = new bootstrap.Modal(document.getElementById("locationModal"));
  modal.show();
}

async function loadReviews(locationId) {
  const list = document.getElementById("modalReviewsList");
  list.innerHTML = '<small class="text-muted">Loading reviews...</small>';

  try {
    const res = await fetch("/api/reviews");
    const reviews = await res.json();
    const filtered = reviews.filter(r => r.location_id === locationId).slice(0, 5);

    if (!filtered.length) {
      list.innerHTML = '<small class="text-muted">No reviews yet. Be the first!</small>';
      return;
    }

    list.innerHTML = filtered.map(r => `
      <div class="review-item mb-2 pb-2 border-bottom small">
        <strong>${esc(r.first_name)} ${esc(r.last_name)}</strong>
        <span class="text-warning ms-1">${"★".repeat(r.overall_rating)}</span>
        ${r.review_text ? `<p class="mb-0 text-muted mt-1">${esc(r.review_text)}</p>` : ""}
      </div>
    `).join("");
  } catch (e) {
    list.innerHTML = '<small class="text-muted">Could not load reviews</small>';
  }
}

// ── Favorite Button ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("modalFavBtn").addEventListener("click", async function () {
    const t = token();
    if (!t) { alert("Please log in to save favorites"); return; }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const locationId = parseInt(this.dataset.locationId);

    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ customer_id: user.user_id, location_id: locationId }),
      });
      if (res.ok) {
        this.innerHTML = "&#x2605; Favorited";
        this.classList.add("text-warning");
      } else {
        const data = await res.json();
        alert(data.error || "Could not favorite");
      }
    } catch (e) {
      alert("Network error");
    }
  });
});

// ── Review Form ──────────────────────────────────────────────────────────────
function setupReviewForm() {
  document.getElementById("reviewLocationId").value = "";

  // Wire up the location ID when review modal opens
  document.getElementById("modalReviewBtn").addEventListener("click", () => {
    document.getElementById("reviewLocationId").value = currentLocationId;
  });

  document.getElementById("reviewForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = token();
    if (!t) { alert("Please log in to leave a review"); return; }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const overall = selectedRating;
    const shade = document.getElementById("shadeRating").value;
    const access = document.getElementById("accessRating").value;
    const noise = document.getElementById("noiseRating").value;
    const text = document.getElementById("reviewText").value.trim();
    const locationId = parseInt(document.getElementById("reviewLocationId").value);

    if (!overall) { alert("Please select an overall rating"); return; }

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          user_id: user.user_id,
          location_id: locationId,
          overall_rating: overall,
          shade_rating: shade ? parseInt(shade) : null,
          accessibility_rating: access ? parseInt(access) : null,
          noise_rating: noise ? parseInt(noise) : null,
          review_text: text || null,
        }),
      });

      if (res.ok) {
        const reviewModal = bootstrap.Modal.getInstance(document.getElementById("reviewModal"));
        reviewModal.hide();
        loadReviews(locationId);
        loadLocations(); // refresh ratings
        // Clear form
        document.getElementById("reviewForm").reset();
        resetStars();
      } else {
        alert("Failed to submit review");
      }
    } catch (e) {
      alert("Network error");
    }
  });
}

// ── Search ───────────────────────────────────────────────────────────────────
function setupSearch() {
  document.getElementById("search-btn").addEventListener("click", handleSearch);
  document.getElementById("search-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
}

async function handleSearch() {
  const query = document.getElementById("search-input").value.trim();
  const responseBox = document.getElementById("aiResponse");
  const responseText = document.getElementById("responseText");

  if (!query) return;

  responseBox.classList.add("d-none");

  try {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, locations: allLocations }),
    });
    const data = await res.json();
    responseText.textContent = data.response || "No results found";
    responseBox.classList.remove("d-none");
  } catch (e) {
    responseText.textContent = "Search failed. Try again.";
    responseBox.classList.remove("d-none");
  }
}

// Dismiss AI response
document.getElementById("dismissAi")?.addEventListener("click", () => {
  document.getElementById("aiResponse").classList.add("d-none");
});

// ── Sort ─────────────────────────────────────────────────────────────────────
function setupSort() {
  document.querySelectorAll("[data-sort]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      currentSort = el.dataset.sort;

      // Highlight active
      document.querySelectorAll("[data-sort]").forEach(s => s.classList.remove("active"));
      el.classList.add("active");

      if (currentSort === "rating") {
        allLocations.sort((a, b) => (parseFloat(b.overall_rating_avg) || 0) - (parseFloat(a.overall_rating_avg) || 0));
      } else if (currentSort === "name") {
        allLocations.sort((a, b) => a.location_name.localeCompare(b.location_name));
      } else if (currentSort === "newest") {
        allLocations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      renderLocations(allLocations);
    });
  });
}

// ── Star Rating (for review form) ────────────────────────────────────────────
function setupStars() {
  document.querySelectorAll("#starOverall .star-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = parseInt(btn.dataset.val);
      selectedRating = val;
      document.querySelectorAll("#starOverall .star-btn").forEach((b, i) => {
        b.innerHTML = i < val ? "&#x2605;" : "&#x2606;";
        if (i < val) b.classList.add("text-warning");
        else b.classList.remove("text-warning");
      });
    });
  });
}

function resetStars() {
  selectedRating = 0;
  document.querySelectorAll("#starOverall .star-btn").forEach(b => {
    b.innerHTML = "&#x2606;";
    b.classList.remove("text-warning");
  });
}

// ── Escape HTML ──────────────────────────────────────────────────────────────
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Greeting ─────────────────────────────────────────────────────────────────
function updateGreeting() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const el = document.getElementById("header-greeting");
  if (user) el.textContent = `Hi, ${user.first_name}`;
}
