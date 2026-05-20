

class navBar extends HTMLElement {
connectedCallback() {
        const currentPage = window.location.pathname.split("/").pop(); 

        const isActive = (page) =>
            currentPage === page ? "bg-orange-200 scale-110 font-bold" : "";

        this.innerHTML = `
        <footer>
            <div class="container" id="navbar">

                <a href="home.html" class="navItem">
                    <div>
                        <h1>HOME</h1>
                    </div>
                </a>

                <a href="index.html" class="navItem">
                    <div>
                        <h1>FAVORITES</h1>
                    </div>
                </a>

                <a href="Account.html" class="navItem">
                    <div>
                        <h1>ACCOUNT</h1>
                    </div>
                </a>

            </div>
        </footer>
        `;
    }
}

customElements.define('nav-bar', navBar);
