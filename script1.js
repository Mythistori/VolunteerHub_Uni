const API_BASE = "http://localhost:3000";
const API_URL = API_BASE + "/registrations";
const EVENTS_URL = API_BASE + "/events";

const registrationForm = document.querySelector("#registration form");
const statusMessage = document.getElementById("registrationStatus");

const eventsList = document.getElementById("events-list");
const eventsStatus = document.getElementById("events-status");
const searchInput = document.getElementById("event-search");
const categoryFilters = document.getElementById("category-filters");
const eventSelect = document.getElementById("event");

// All events loaded from the backend + current filter state
let allEvents = [];
let activeCategory = "All";

/* ---------- Events ---------- */

async function getEvents() {
    try {
        const response = await fetch(EVENTS_URL);

        if (!response.ok) {
            throw new Error("GET /events failed with status " + response.status);
        }

        allEvents = await response.json();
        console.log("GET events:", allEvents);

        renderCategoryButtons();
        renderEvents();
        fillEventSelect();

    } catch (error) {
        eventsStatus.textContent = "Could not load events. Is the backend running? (npm start)";
        console.error(error);
    }
}

function formatDate(isoDate) {
    const date = new Date(isoDate);

    if (isNaN(date)) {
        return "To be announced";
    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

// Creates one event card. textContent is used instead of innerHTML
// so data from the server can't inject HTML into the page.
function createEventCard(event) {
    const card = document.createElement("article");
    card.className = "event-card";
    card.id = "event-" + event.id;

    // Image or a coloured placeholder with the category name
    const cover = document.createElement("div");
    cover.className = "event-cover category-" + event.category.toLowerCase();

    if (event.image) {
        const img = document.createElement("img");
        img.src = event.image;
        img.alt = event.title;
        cover.appendChild(img);
    } else {
        cover.textContent = event.category;
    }

    const body = document.createElement("div");
    body.className = "event-body";

    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = event.category;

    const title = document.createElement("h3");
    title.textContent = event.title;

    const meta = document.createElement("ul");
    meta.className = "event-meta";
    addMetaItem(meta, "Date", formatDate(event.date));
    addMetaItem(meta, "Location", event.location);

    const placesText = event.places_left > 0
        ? event.places_left + " of " + event.capacity + " places left"
        : "No places left";
    addMetaItem(meta, "Places", placesText);

    const description = document.createElement("p");
    description.textContent = event.description;

    const footer = document.createElement("div");
    footer.className = "event-footer";

    const points = document.createElement("span");
    points.className = "points";
    points.textContent = "+" + event.points + " Social GPA";

    const button = document.createElement("a");
    button.className = "btn";
    button.href = "#registration";

    if (event.places_left > 0) {
        button.textContent = "Join";
        button.addEventListener("click", function () {
            eventSelect.value = String(event.id);
        });
    } else {
        button.textContent = "Full";
        button.classList.add("btn-disabled");
        button.removeAttribute("href");
        button.setAttribute("aria-disabled", "true");
    }

    footer.append(points, button);
    body.append(badge, title, meta, description, footer);
    card.append(cover, body);

    return card;
}

function addMetaItem(list, label, value) {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = label + ": ";
    item.append(strong, value);
    list.appendChild(item);
}

function renderCategoryButtons() {
    const categories = [...new Set(allEvents.map(event => event.category))];

    categories.forEach(function (category) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-btn";
        button.dataset.category = category;
        button.textContent = category;
        categoryFilters.appendChild(button);
    });
}

function getFilteredEvents() {
    const query = searchInput.value.trim().toLowerCase();

    return allEvents.filter(function (event) {
        const matchesCategory =
            activeCategory === "All" || event.category === activeCategory;

        const matchesSearch =
            event.title.toLowerCase().includes(query) ||
            event.location.toLowerCase().includes(query);

        return matchesCategory && matchesSearch;
    });
}

function renderEvents() {
    const events = getFilteredEvents();

    eventsList.innerHTML = "";

    if (events.length === 0) {
        eventsStatus.textContent = "No events match your search.";
        return;
    }

    eventsStatus.textContent = "Showing " + events.length + " of " + allEvents.length + " events";

    events.forEach(function (event) {
        eventsList.appendChild(createEventCard(event));
    });
}

function fillEventSelect() {
    allEvents.forEach(function (event) {
        const option = document.createElement("option");
        option.value = String(event.id);
        option.textContent = event.title;

        if (event.places_left <= 0) {
            option.disabled = true;
            option.textContent += " (full)";
        }

        eventSelect.appendChild(option);
    });
}

searchInput.addEventListener("input", renderEvents);

categoryFilters.addEventListener("click", function (event) {
    const button = event.target.closest(".filter-btn");

    if (!button) {
        return;
    }

    activeCategory = button.dataset.category;

    categoryFilters.querySelectorAll(".filter-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn === button);
    });

    renderEvents();
});

/* ---------- Registrations ---------- */

async function getRegistrations() {
    try {
        const response = await fetch(API_URL);

        const registrations = await response.json();

        statusMessage.textContent =
            "Total registrations: " + registrations.length;

        console.log("GET response:", registrations);

    } catch (error) {
        statusMessage.textContent = "Could not connect to backend.";
        console.error(error);
    }
}


registrationForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const formData = new FormData(registrationForm);

    const newRegistration = {
        full_name: formData.get("full_name"),
        email: formData.get("email"),
        event_id: Number(formData.get("event")),
        participation_type: formData.get("participation_type"),
        message: formData.get("message")
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newRegistration)
        });

        if (!response.ok) {
            throw new Error("POST request failed");
        }

        const result = await response.json();

        console.log("POST response:", result);

        alert("Registration successful!");

        registrationForm.reset();

        getRegistrations();

    } catch (error) {
        alert("Registration failed. Check your backend.");
        console.error(error);
    }
});


getEvents();
getRegistrations();
