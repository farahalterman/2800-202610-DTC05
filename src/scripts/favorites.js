const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "login.html";
}

async function loadFavorites() {
  const list = document.getElementById("favoritesList");
  const empty = document.getElementById("emptyFavorites");

  try {
    const res = await fetch(`/api/users/${user.user_id}/favorites`);
    if (!res.ok) throw new Error("Failed");
    const favs = await res.json();

    if (!favs.length) {
      list.innerHTML = "";
      empty.classList.remove("d-none");
      return;
    }

    empty.classList.add("d-none");
    list.innerHTML = favs.map(f => {
      const rating = parseFloat(f.overall_rating_avg) || 0;
      const pct = Math.round((rating / 10) * 100);
      const shadeColor = rating >= 8 ? "var(--shade-high)" : rating >= 5 ? "var(--shade-mid)" : "var(--shade-low)";

      return `
        <div class="location-card card mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <h3 class="h6 mb-1">${esc(f.location_name)}</h3>
                <span class="badge shade-badge" style="background:${shadeColor}">${rating.toFixed(1)}/10</span>
              </div>
              <button class="btn btn-sm btn-outline-danger" onclick="removeFav(${f.favorite_id})">&times;</button>
            </div>
            <div class="shade-bar mt-2">
              <div class="shade-bar-fill" style="width:${pct}%"></div>
            </div>
            <small class="text-muted">Saved ${new Date(f.favorited_at).toLocaleDateString()}</small>
          </div>
        </div>
      `;
    }).join("");
  } catch (e) {
    list.innerHTML = '<div class="text-center py-5 text-danger">Could not load favorites</div>';
  }
}

async function removeFav(favId) {
  try {
    const res = await fetch(`/api/favorites/${favId}`, {
      method: "DELETE",
    });
    if (res.ok) loadFavorites();
  } catch (e) { /* ignore */ }
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

loadFavorites();
