// public/js/theme-toggle.js
function toggleTheme() {
  const body = document.body;
  const currentTheme = body.classList.contains("dark") ? "dark" : "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  body.classList.toggle("dark"); // Toggle the class immediately for visual feedback

  // Update the button icon
  const themeToggleButton = document.querySelector(".theme-toggle-btn");
  if (themeToggleButton) {
    themeToggleButton.innerHTML = newTheme === "dark" ? "☀️" : "🌙";
  }

  // Send update to the server
  fetch("/set-theme", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme: newTheme }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Theme updated successfully on server.");
      } else {
        console.error("Failed to update theme on server:", data.message);
        // Optionally revert UI if server update fails
        body.classList.toggle("dark");
        if (themeToggleButton) {
          themeToggleButton.innerHTML = currentTheme === "dark" ? "☀️" : "🌙";
        }
      }
    })
    .catch((error) => {
      console.error("Error sending theme update:", error);
      // Optionally revert UI on network/server error
      body.classList.toggle("dark");
      if (themeToggleButton) {
        themeToggleButton.innerHTML = currentTheme === "dark" ? "☀️" : "🌙";
      }
    });
}
