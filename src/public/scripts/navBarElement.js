

class navBar extends HTMLElement {
connectedCallback() {
        const currentPage = window.location.pathname.split("/").pop(); 

        const isActive = (page) =>
            currentPage === page ? "bg-orange-200 scale-110 font-bold" : "";

        this.innerHTML = `
        <nav class="navbar navbar-expand-lg bg-body-tertiary fixed-bottom">
            <div class="container-fluid d-flex justify-content-around" id="navBar">
                <div id="navButton">
                    <a href="index.html">
                        <h1>1</h1>
                    </a>
                </div>
    
                <div id="navButton">
                    <a href="index.html">
                        <h1>1</h1>
                    </a>
                </div>
    
                <div id="navButton">
                    <a href="index.html">
                        <h1>1</h1>
                    </a>
                </div>
            </div>
        </nav>
        `;
    }
}

customElements.define('nav-bar', navBar);
