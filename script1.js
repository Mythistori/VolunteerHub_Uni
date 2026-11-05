const API_URL = "http://localhost:3000/registrations";

const registrationForm = document.querySelector("#registration form");
const statusMessage = document.getElementById("registrationStatus");

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
        event: formData.get("event"),
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


getRegistrations();
