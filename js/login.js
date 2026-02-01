/**
 * KhataBook - Google OAuth Login
 * Uses Google Identity Services (GIS) to get ID token and exchange for JWT.
 */
document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("google-login-container");
  const errorEl = document.getElementById("login-error");
  const config = typeof KB_AUTH_CONFIG !== "undefined" ? KB_AUTH_CONFIG : { API_BASE_URL: "http://localhost:8080/api", GOOGLE_CLIENT_ID: "" };

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.add("show");
    }
  }

  function hideError() {
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.remove("show");
    }
  }

  function handleCredentialResponse(response) {
    hideError();
    const idToken = response.credential;
    if (!idToken) {
      showError("Failed to get Google credential.");
      return;
    }

    if (container) container.innerHTML = "<p>Signing in...</p>";

    fetch(`${config.API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          window.location.href = "index.html";
        } else {
          showError(data.error || "Login failed");
          initUI();
        }
      })
      .catch((err) => {
        console.error("Login error:", err);
        showError("Could not connect to server. Is the backend running?");
        initUI();
      });
  }

  function initUI() {
    const isConfigured = config.GOOGLE_CLIENT_ID && !config.GOOGLE_CLIENT_ID.startsWith("YOUR_");

    if (!isConfigured) {
      if (container) container.innerHTML = '<button type="button" class="btn-google" disabled>Configure GOOGLE_CLIENT_ID in js/auth-config.js</button>';
      showError("Google OAuth not configured. See SETUP.md for setup instructions.");
      return;
    }

    if (typeof google === "undefined" || !google.accounts) {
      if (container) container.innerHTML = '<button type="button" class="btn-google" id="manual-google-btn"><span>Login with Google</span></button>';
      document.getElementById("manual-google-btn")?.addEventListener("click", () => {
        showError("Google sign-in script still loading. Please refresh the page.");
      });
      setTimeout(initUI, 200);
      return;
    }

    google.accounts.id.initialize({
      client_id: config.GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
    });

    if (container) {
      container.innerHTML = "";
      google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
      });
    }
  }

  initUI();
});
