class navBar extends HTMLElement {
  connectedCallback() {
    const currentPage = window.location.pathname.split("/").pop();

    const token = localStorage.getItem("token");
    const user = token ? JSON.parse(localStorage.getItem("user") || "null") : null;

    const isActive = (page) =>
      currentPage === page ? "fw-bold opacity-100" : "opacity-60";

    const accountLink = user
      ? `<div class="navItem ${isActive("account.html")}">
            <a href="account.html">
                <h1>${user.first_name.toUpperCase()}</h1>
            </a>
        </div>`
      : `<div class="navItem ${isActive("login.html")}">
            <a href="login.html">
                <h1>LOGIN</h1>
            </a>
        </div>`;

    this.innerHTML = `
      <footer>
        <div id="navbar">
          <div class="navItem ${isActive("home.html")}">
            <a href="home.html"><h1>&#x1F3E0; Home</h1></a>
          </div>
          <div class="navItem ${isActive("favorites.html")}">
            <a href="favorites.html"><h1>&#x2605; Favorites</h1></a>
          </div>
          ${accountLink}
        </div>
      </footer>
    `;
  }
}

customElements.define("nav-bar", navBar);
