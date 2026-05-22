// Redirect if not logged in
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
  window.location.href = "login.html";
}

async function loadProfile() {
  try {
    const res = await fetch(`/api/users/${user.user_id}/profile`);
    if (!res.ok) throw new Error("Failed");
    const profile = await res.json();

    document.getElementById("profileAvatar").textContent =
      (profile.first_name?.[0] || "") + (profile.last_name?.[0] || "");
    document.getElementById("profileName").textContent =
      `${profile.first_name} ${profile.last_name}`;
    document.getElementById("profileEmail").textContent = profile.email;
    document.getElementById("profileLocation").textContent =
      profile.home_location || "No home location set";

    document.getElementById("statReviews").textContent = profile.total_reviews || 0;
    document.getElementById("statFavorites").textContent = profile.total_favorites || 0;
    document.getElementById("statRating").textContent =
      profile.avg_rating_given ? parseFloat(profile.avg_rating_given).toFixed(1) : "—";

    // Pre-fill edit form
    document.getElementById("editFirstName").value = profile.first_name || "";
    document.getElementById("editLastName").value = profile.last_name || "";
    document.getElementById("editEmail").value = profile.email || "";
    document.getElementById("editHomeLocation").value = profile.home_location || "";

    // Update localStorage with fresh data
    const fresh = { user_id: profile.user_id, first_name: profile.first_name, email: profile.email, admin: profile.admin };
    localStorage.setItem("user", JSON.stringify(fresh));
  } catch (e) {
    document.getElementById("profileName").textContent = "Could not load profile";
  }
}

loadProfile();

// Profile update form
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("profileMsg");
  msg.style.display = "none";

  const payload = {
    first_name: document.getElementById("editFirstName").value.trim(),
    last_name: document.getElementById("editLastName").value.trim(),
    email: document.getElementById("editEmail").value.trim(),
    home_location: document.getElementById("editHomeLocation").value.trim() || null,
  };

  const pw = document.getElementById("editPassword").value;
  if (pw) payload.password = pw;

  try {
    const res = await fetch(`/api/users/${user.user_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    msg.textContent = res.ok ? "Profile updated!" : (data.error || "Update failed");
    msg.className = `small text-center mt-2 ${res.ok ? "text-success" : "text-danger"}`;
    msg.style.display = "block";

    if (res.ok) loadProfile();
  } catch (err) {
    msg.textContent = "Network error";
    msg.className = "small text-center mt-2 text-danger";
    msg.style.display = "block";
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});
