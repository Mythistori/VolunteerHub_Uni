// Student volunteer profile.
// For now the student is found by email. When Person 2 finishes login (JWT),
// replace loadProfile(email) with a request that sends the token:
//   fetch(API_BASE + "/my-activity", { headers: { Authorization: "Bearer " + token } })
const API_BASE = "http://localhost:3000";
const STORAGE_KEY = "volunteerHubEmail";

const profileForm = document.getElementById("profile-form");
const emailInput = document.getElementById("profile-email");
const profileStatus = document.getElementById("profile-status");
const findSection = document.getElementById("find-profile");
const profileContent = document.getElementById("profile-content");
const applicationsBody = document.getElementById("applications-body");
const historyList = document.getElementById("history-list");

/* ---------- Helpers ---------- */

function formatDate(isoDate) {
    const date = new Date(isoDate);
    if (isNaN(date)) {
        return "—";
    }
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(isoDateTime) {
    return new Date(isoDateTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function shiftHours(shift) {
    const ms = new Date(shift.end_time) - new Date(shift.start_time);
    return Math.round((ms / 3600000) * 10) / 10;
}

// A shift counts as completed when the application was accepted and the shift is over
function isCompleted(application) {
    return application.status === "Accepted" &&
        application.shift &&
        new Date(application.shift.end_time) < new Date();
}

function saveEmail(email) {
    try { localStorage.setItem(STORAGE_KEY, email); } catch (e) { /* storage not available */ }
}

function getSavedEmail() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
}

function forgetEmail() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* storage not available */ }
}

/* ---------- Loading ---------- */

async function loadProfile(email) {
    profileStatus.textContent = "Loading...";

    try {
        const [regRes, eventsRes, shiftsRes] = await Promise.all([
            fetch(API_BASE + "/registrations?email=" + encodeURIComponent(email)),
            fetch(API_BASE + "/events"),
            fetch(API_BASE + "/shifts")
        ]);

        if (!regRes.ok || !eventsRes.ok || !shiftsRes.ok) {
            throw new Error("Failed to load profile data");
        }

        const registrations = await regRes.json();
        const events = await eventsRes.json();
        const shifts = await shiftsRes.json();

        // Only volunteer applications that point to a real event and shift
        const applications = registrations
            .filter(r => r.participation_type === "volunteer" && r.shift_id)
            .map(function (r) {
                return {
                    ...r,
                    status: r.status || "Pending",
                    event: events.find(e => e.id === r.event_id),
                    shift: shifts.find(s => s.id === r.shift_id)
                };
            })
            .filter(a => a.event && a.shift)
            .sort((a, b) => new Date(b.shift.start_time) - new Date(a.shift.start_time));

        if (applications.length === 0) {
            profileStatus.textContent = "No volunteer applications found for " + email + ".";
            return;
        }

        saveEmail(email);
        profileStatus.textContent = "";
        renderProfile(email, applications);

    } catch (error) {
        profileStatus.textContent = "Could not load your profile. Is the backend running? (npm start)";
        console.error(error);
    }
}

/* ---------- Rendering ---------- */

function renderProfile(email, applications) {
    const name = applications[0].full_name || email;

    document.getElementById("profile-name").textContent = name;
    document.getElementById("profile-email-text").textContent = email;
    document.getElementById("profile-avatar").textContent = name.trim().charAt(0).toUpperCase();

    const completed = applications.filter(isCompleted);
    const totalHours = completed.reduce((sum, a) => sum + shiftHours(a.shift), 0);

    // Points are given once per event, even if the student worked several shifts
    const pointsByEvent = {};
    completed.forEach(function (a) {
        pointsByEvent[a.event.id] = a.event.points;
    });
    const totalPoints = Object.values(pointsByEvent).reduce((sum, p) => sum + p, 0);

    document.getElementById("stat-hours").textContent = totalHours;
    document.getElementById("stat-points").textContent = totalPoints;
    document.getElementById("stat-events").textContent = completed.length;
    document.getElementById("stat-pending").textContent =
        applications.filter(a => a.status === "Pending").length;

    renderApplications(applications);
    renderHistory(completed);

    findSection.hidden = true;
    profileContent.hidden = false;
}

function renderApplications(applications) {
    applicationsBody.innerHTML = "";

    applications.forEach(function (a) {
        const row = document.createElement("tr");

        const eventCell = document.createElement("th");
        eventCell.scope = "row";
        const link = document.createElement("a");
        link.href = "events.html?id=" + a.event.id;
        link.textContent = a.event.title;
        eventCell.appendChild(link);

        const shiftCell = document.createElement("td");
        shiftCell.textContent = a.shift.role + ", " +
            formatTime(a.shift.start_time) + "–" + formatTime(a.shift.end_time);

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(a.shift.start_time);

        const hoursCell = document.createElement("td");
        hoursCell.textContent = shiftHours(a.shift);

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "status-badge status-" + a.status.toLowerCase();
        badge.textContent = isCompleted(a) ? "Completed" : a.status;
        if (isCompleted(a)) {
            badge.className = "status-badge status-completed";
        }
        statusCell.appendChild(badge);

        row.append(eventCell, shiftCell, dateCell, hoursCell, statusCell);
        applicationsBody.appendChild(row);
    });
}

function renderHistory(completed) {
    historyList.innerHTML = "";

    if (completed.length === 0) {
        const empty = document.createElement("li");
        empty.className = "muted";
        empty.textContent = "No completed shifts yet. Accepted shifts appear here after they end.";
        historyList.appendChild(empty);
        return;
    }

    completed.forEach(function (a) {
        const item = document.createElement("li");

        const title = document.createElement("strong");
        title.textContent = a.event.title;

        const details = document.createElement("span");
        details.className = "muted";
        details.textContent = formatDate(a.shift.start_time) + " · " + a.shift.role;

        const reward = document.createElement("span");
        reward.className = "points";
        reward.textContent = shiftHours(a.shift) + " h · +" + a.event.points + " points";

        item.append(title, details, reward);
        historyList.appendChild(item);
    });
}

/* ---------- Events ---------- */

profileForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = emailInput.value.trim().toLowerCase();
    if (email) {
        loadProfile(email);
    }
});

document.getElementById("logout-btn").addEventListener("click", function () {
    forgetEmail();
    profileContent.hidden = true;
    findSection.hidden = false;
    emailInput.value = "";
    emailInput.focus();
});

// Open the profile automatically if the email was entered before
const savedEmail = getSavedEmail();
if (savedEmail) {
    emailInput.value = savedEmail;
    loadProfile(savedEmail);
}
