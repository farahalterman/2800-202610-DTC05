

class navBar extends HTMLElement {
connectedCallback() {
        const currentPage = window.location.pathname.split("/").pop(); 

        const isActive = (page) =>
            currentPage === page ? "bg-orange-200 scale-110 font-bold" : "";

        this.innerHTML = `
        <footer>
            <div class="container" id="navbar">

                <div class="navItem">
                    <a href="index.html">
                        <h1>HOME</h1>
                    </a>
                </div>

                <div class="navItem">
                    <a href="index.html">
                        <h1>FAVOURITES</h1>
                    </a>
                </div>

                <div class="navItem">
                    <a href="index.html">
                        <h1>ACCOUNT</h1>
                    </a>
                </div>

            </div>
        </footer>
        `;
    }
}

customElements.define('nav-bar', navBar);
