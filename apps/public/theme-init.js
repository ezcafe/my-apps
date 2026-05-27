(function () {
  try {
    var root = document.documentElement;
    var t = localStorage.getItem("workspace_theme");
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var resolved =
      t === "light" || t === "dark" ? t : mq.matches ? "dark" : "light";
    root.classList.toggle("dark", resolved === "dark");
    var s = localStorage.getItem("workspace_style");
    if (s === "linear" || s === "apple" || s === "swiss" || s === "notion") {
      root.dataset.style = s;
    } else {
      root.dataset.style = "linear";
    }
  } catch {}
})();
