// Event details page: events.html?id=1
const API_BASE = "http://localhost:3000";

const eventId = Number(new URLSearchParams(window.location.search).get("id"));

const statusText = document.getElementById("event-status");
const detailsSection = document.getElementById("event-details");
const shiftsSection = document.getElementById("shifts");
const shiftList = document.getElementById("shift-list");
const applyForm = document.getElementById("apply-form");
const applyStatus = document.getElementById("apply-status");

let currentEvent = null;
let shifts = [];
let registrations = [];

/* ---------- Helpers ---------- */

function formatDate(isoDate) {
    const date = new Date(isoDate);
    if (isNaN(date)) {
        return "To be announced";
    }
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(isoDateTime) {
    return new Date(isoDateTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function shiftHours(shift) {
    const ms = new Date(shift.end_time) - new Date(shift.start_time);
    return Math.round((ms / 3600000) * 10) / 10;
}

// Rejected applications don't take a place in the shift
function takenPlaces(shiftId) {
    return registrations.filter(function (r) {
        return r.shift_id === shiftId && r.status !== "Rejected";
    }).length;
}

/* ---------- Loading ---------- */

async function loadPage() {
    if (!eventId) {
        statusText.textContent = "Event not found. Go back and choose an event.";
        return;
    }

    try {
        const [eventRes, shiftsRes, regRes] = await Promise.all([
            fetch(API_BASE + "/events/" + eventId),
            fetch(API_BASE + "/shifts?event_id=" + eventId),
            fetch(API_BASE + "/registrations?event_id=" + eventId)
        ]);

        if (eventRes.status === 404) {
            statusText.textContent = "This event does not exist.";
            return;
        }
        if (!eventRes.ok || !shiftsRes.ok || !regRes.ok) {
            throw new Error("Failed to load event data");
        }

        currentEvent = await eventRes.json();
        shifts = await shiftsRes.json();
        registrations = await regRes.json();

        renderEvent();
        renderShifts();
        statusText.hidden = true;

    } catch (error) {
        statusText.textContent = "Could not load the event. Is the backend running? (npm start)";
        console.error(error);
    }
}

/* ---------- Rendering ---------- */

function renderEvent() {
    const ev = currentEvent;
    document.title = ev.title + " | Volunteer Hub";

    const cover = document.getElementById("event-cover");
    cover.classList.add("category-" + ev.category.toLowerCase());
    if (ev.image) {
        const img = document.createElement("img");
        img.src = ev.image;
        img.alt = ev.title;
        cover.appendChild(img);
    } else {
        cover.textContent = ev.category;
    }

    document.getElementById("event-category").textContent = ev.category;
    document.getElementById("event-title").textContent = ev.title;
    document.getElementById("event-date").textContent = formatDate(ev.date);
    document.getElementById("event-location").textContent = ev.location;
    document.getElementById("event-places").textContent = ev.places_left > 0
        ? ev.places_left + " of " + ev.capacity + " places left"
        : "No places left";
    document.getElementById("event-points").textContent = "+" + ev.points + " Social GPA points";
    document.getElementById("event-description").textContent = ev.description;

    detailsSection.hidden = false;
}

function renderShifts() {
    shiftsSection.hidden = false;
    shiftList.innerHTML = "";

    if (shifts.length === 0) {
        shiftList.textContent = "No volunteer shifts for this event yet.";
        applyForm.querySelector("button[type=submit]").disabled = true;
        return;
    }

    shifts.forEach(function (shift) {
        const free = shift.capacity - takenPlaces(shift.id);

        const label = document.createElement("label");
        label.className = "shift-option";
        if (free <= 0) {
            label.classList.add("shift-full");
        }

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "shift_id";
        radio.value = String(shift.id);
        radio.required = true;
        radio.disabled = free <= 0;

        const info = document.createElement("span");
        info.className = "shift-info";

        const role = document.createElement("strong");
        role.textContent = shift.role;

        const time = document.createElement("span");
        time.textContent = formatTime(shift.start_time) + " – " + formatTime(shift.end_time) +
            " (" + shiftHours(shift) + " h)";

        const places = document.createElement("span");
        places.className = "shift-places";
        places.textContent = free > 0 ? free + " of " + shift.capacity + " places left" : "Full";

        info.append(role, time, places);
        label.append(radio, info);
        shiftList.appendChild(label);
    });
}

/* ---------- Applying ---------- */

applyForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(applyForm);
    const shiftId = Number(formData.get("shift_id"));
    const email = formData.get("email").trim().toLowerCase();

    // Simple duplicate check on the frontend. The backend should check it too.
    const alreadyApplied = registrations.some(function (r) {
        return r.shift_id === shiftId && r.email === email;
    });
    if (alreadyApplied) {
        showStatus("You have already applied for this shift.", "error");
        return;
    }

    const application = {
        full_name: formData.get("full_name").trim(),
        email: email,
        event_id: eventId,
        shift_id: shiftId,
        participation_type: "volunteer",
        status: "Pending",
        message: formData.get("message").trim(),
        created_at: new Date().toISOString()
    };

    try {
        const response = await fetch(API_BASE + "/registrations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(application)
        });

        if (!response.ok) {
            throw new Error("POST /registrations failed with status " + response.status);
        }

        const saved = await response.json();
        registrations.push(saved);

        applyForm.reset();
        renderShifts();
        // Remember the email so profile.html opens this student's activity
        try { localStorage.setItem("volunteerHubEmail", email); } catch (err) { /* storage not available */ }

        showStatus("Application sent! Status: Pending. You can follow it in My profile.", "success");

    } catch (error) {
        showStatus("Could not send your application. Check that the backend is running.", "error");
        console.error(error);
    }
});

function showStatus(text, type) {
    applyStatus.textContent = text;
    applyStatus.className = "form-status " + type;
}

loadPage();
