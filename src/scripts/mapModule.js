const DEFAULT_DATASETS = [
    {
        id: "parks",
        label: "Parks (areas)",
        url: "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parks-polygon-representation/exports/geojson",
        type: "polygon",
        style: {
            color: "#1b5e20",
            weight: 2,
            fillColor: "#66bb6a",
            fillOpacity: 0.35,
        },
        getPopupLabel: (properties = {}) =>
            properties.name ||
            properties.park_name ||
            properties.parkname ||
            properties.official_name ||
            "Vancouver Park",
    },
    {
        id: "fountains",
        label: "Drinking fountains (icons)",
        url: "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/drinking-fountains/exports/geojson",
        type: "point",
        icon: {
            html: "💧",
            className: "fountain-icon",
            iconSize: [18, 18],
        },
        getPopupLabel: (properties = {}) =>
            properties.name || properties.location || "Drinking Fountain",
    },
];

const DEFAULTS = {
    center: [49.2827, -123.1207],
    zoom: 12,
    datasets: DEFAULT_DATASETS,
};

async function fetchGeoJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Unable to load dataset: ${url}`);
    }
    return response.json();
}

function normalizeDatasets(datasets = []) {
    return datasets
        .filter((dataset) => dataset && dataset.id && dataset.url)
        .map((dataset) => ({
            type: "point",
            enabledByDefault: false,
            ...dataset,
            id: String(dataset.id),
            label: dataset.label || dataset.id,
        }));
}

export class MapModule {
    constructor(options = {}) {
        this.options = { ...DEFAULTS, ...options };
        this.datasets = normalizeDatasets(this.options.datasets);

        this.map =
            options.map ||
            L.map(options.containerId || "map", { zoomControl: true }).setView(
                this.options.center,
                this.options.zoom
            );

        this.layers = Object.fromEntries(this.datasets.map((dataset) => [dataset.id, null]));
        this.datasetCache = Object.fromEntries(this.datasets.map((dataset) => [dataset.id, null]));

        this.ensureBaseTiles();
        this.createFilterControl();
    }

    ensureBaseTiles() {
        if (this.options.skipBaseTiles) return;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(this.map);
    }

    createFilterControl() {
        const control = L.control({ position: "topright" });

        control.onAdd = () => {
            const container = L.DomUtil.create("div", "leaflet-bar dataset-control card border-0 shadow-sm");
            const optionsMarkup = this.datasets
                .map(
                    (dataset) => `
            <div class="form-check">
              <input class="form-check-input" id="toggle-${dataset.id}" type="checkbox" data-dataset-id="${dataset.id}" />
              <label class="form-check-label" for="toggle-${dataset.id}">${dataset.label}</label>
            </div>
          `
                )
                .join("");

            container.innerHTML = `
        <div class="dataset-control-body card-body">
          ${optionsMarkup}
        </div>
      `;

            L.DomEvent.disableClickPropagation(container);
            return container;
        };

        control.addTo(this.map);

        this.map.whenReady(() => {
            const toggles = document.querySelectorAll("[data-dataset-id]");

            toggles.forEach((toggle) => {
                toggle.addEventListener("change", (event) => {
                    const datasetId = event.currentTarget.dataset.datasetId;
                    this.toggleDataset(datasetId, event.currentTarget.checked);
                });
            });

            this.datasets.forEach((dataset) => {
                if (!dataset.enabledByDefault) return;
                const checkbox = document.querySelector(`[data-dataset-id=\"${dataset.id}\"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
                this.showDataset(dataset.id);
            });
        });
    }

    getDatasetConfig(datasetId) {
        return this.datasets.find((dataset) => dataset.id === datasetId) || null;
    }

    buildLayer(dataset, geoJson) {
        if (typeof dataset.createLayer === "function") {
            return dataset.createLayer({ L, geoJson, dataset, map: this.map });
        }

        const geoJsonOptions = { ...(dataset.geoJsonOptions || {}) };

        if (!geoJsonOptions.onEachFeature) {
            geoJsonOptions.onEachFeature = (feature, layer) => {
                const popupLabel = (dataset.getPopupLabel || (() => dataset.label))(
                    feature?.properties || {}
                );
                layer.bindPopup(`<strong>${popupLabel || dataset.label}</strong>`);
            };
        }

        if (dataset.type === "point" && !geoJsonOptions.pointToLayer) {
            const icon = dataset.icon ? L.divIcon(dataset.icon) : null;
            geoJsonOptions.pointToLayer = (feature, latlng) => {
                const marker = icon ? L.marker(latlng, { icon }) : L.marker(latlng);
                const popupLabel = (dataset.getPopupLabel || (() => dataset.label))(
                    feature?.properties || {}
                );
                return marker.bindPopup(`<strong>${popupLabel || dataset.label}</strong>`);
            };
        }

        if (dataset.type !== "point" && dataset.style && !geoJsonOptions.style) {
            geoJsonOptions.style = dataset.style;
        }

        return L.geoJSON(geoJson, geoJsonOptions);
    }

    async showDataset(datasetId) {
        const dataset = this.getDatasetConfig(datasetId);
        if (!dataset) return;

        if (!this.datasetCache[datasetId]) {
            this.datasetCache[datasetId] = await fetchGeoJson(dataset.url);
        }

        if (!this.layers[datasetId]) {
            this.layers[datasetId] = this.buildLayer(dataset, this.datasetCache[datasetId]);
        }

        this.layers[datasetId].addTo(this.map);
    }

    hideDataset(datasetId) {
        if (this.layers[datasetId]) {
            this.map.removeLayer(this.layers[datasetId]);
        }
    }

    toggleDataset(datasetId, isVisible) {
        if (isVisible) {
            this.showDataset(datasetId);
            return;
        }
        this.hideDataset(datasetId);
    }
}

export function initMap(options = {}) {
    return new MapModule(options);
}
