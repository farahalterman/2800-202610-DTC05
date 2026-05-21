class navBar extends HTMLElement {
  connectedCallback() {
    const currentPage = window.location.pathname.split("/").pop();

    const isActive = (page) =>
      currentPage === page ? "bg-orange-200 scale-110 font-bold" : "";

    // Check if user is logged in
    const token = localStorage.getItem("token");
    const user = token ? JSON.parse(localStorage.getItem("user") || "null") : null;

    const accountLink = user
      ? `<div class="navItem">
            <a href="account.html">
                <h1>${user.first_name.toUpperCase()}</h1>
            </a>
        </div>`
      : `<div class="navItem">
            <a href="login.html">
                <h1>LOGIN</h1>
            </a>
        </div>`;

    this.innerHTML = `
      <footer>
        <div class="container" id="navbar">
                <div class="navItem">
                    <a href="home.html">
                        <h1>HOME</h1>
                    </a>
                </div>

                <div class="navItem">
                    <a href="index.html">
                        <h1>FAVOURITES</h1>
                    </a>
                </div>
          ${accountLink}
        </div>
      </footer>
    `;
  }
}

customElements.define("nav-bar", navBar);
