/**
 * Auth Guard - Protects pages that require login.
 * Include this script on index.html, add.html, report.html.
 * If user is not logged in, redirects to login.html.
 * Call ensureLoggedIn() early in page load (before rendering sensitive data).
 */
(function () {
  const LOGIN_PAGE = "login.html";

  function isLoggedIn() {
    const token = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("currentUser");
    return !!(token && userStr);
  }

  function redirectToLogin() {
    const currentPath = window.location.pathname;
    const loginUrl = LOGIN_PAGE + "?redirect=" + encodeURIComponent(currentPath + window.location.search);
    window.location.replace(loginUrl);
  }

  /**
   * Call this on protected pages. Redirects to login if not authenticated.
   */
  window.ensureLoggedIn = function () {
    if (!isLoggedIn()) {
      redirectToLogin();
      return false;
    }
    return true;
  };

  /**
   * Call this to check login without redirect (e.g. for conditional UI).
   */
  window.checkLoggedIn = isLoggedIn;

  // Auto-check on protected pages (skip login.html)
  const isLoginPage = /login\.html$/i.test(window.location.pathname);
  if (!isLoginPage && !isLoggedIn()) {
    redirectToLogin();
  }
})();
