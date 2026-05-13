

class navBar extends HTMLElement {
connectedCallback() {
        const currentPage = window.location.pathname.split("/").pop(); 

        const isActive = (page) =>
            currentPage === page ? "bg-orange-200 scale-110 font-bold" : "";

        this.innerHTML = `
        <footer>
            <div>

                <a href="home.html">
                    <div>
                        <h1>Home/Map</h1>
                    </div>
                </a>

                <a href="index.html">
                    <div>
                        <h1>2</h1>
                    </div>
                </a>

                <a href="index.html">
                    <div>
                        <h1>3</h1>
                    </div>
                </a>

            </div>
        </footer>
        `;
    }
}

customElements.define('nav-bar', navBar);
