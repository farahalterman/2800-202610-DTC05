class navBar extends HTMLElement {
  connectedCallback() {
    const currentPage = window.location.pathname.split("/").pop();

    const isActive = (page) =>
      currentPage === page ? "bg-orange-200 scale-110 font-bold" : "";

    // Check if user is logged in
    const token = localStorage.getItem("token");
    const user = token ? JSON.parse(localStorage.getItem("user") || "null") : null;

    const accountLink = user
      ? `<a href="account.html" class="navItem">
           <div><h1>${user.first_name.toUpperCase()}</h1></div>
         </a>`
      : `<a href="login.html" class="navItem">
           <div><h1>LOGIN</h1></div>
         </a>`;

    this.innerHTML = `
      <footer>
        <div class="container" id="navbar">
          <a href="home.html" class="navItem">
            <div><h1>HOME</h1></div>
          </a>
          <a href="index.html" class="navItem">
            <div><h1>FAVORITES</h1></div>
          </a>
          ${accountLink}
        </div>
      </footer>
    `;
  }
}

customElements.define("nav-bar", navBar);
