import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../scss/styles.scss';
import * as bootstrap from 'bootstrap';

document.getElementById('search-btn').addEventListener('click', handleSearch);

async function handleSearch() {
    console.log("button clicked");
    const query = document.getElementById('search-input').value;
    console.log("query:", query);
    const data = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, spots: [] })
    }).then(r => r.json());
    console.log("response:", data);
    document.getElementById('responseText').textContent = data.response;
}