console.log("IT'S ALIVE!");

// helper function
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/* ---------------------------
   Step 3: Automatic navigation
   --------------------------- */

const pages = [
  { url: "",          title: "Home" },
  { url: "contact/",  title: "Contact" },
  { url: "projects/", title: "Projects" },
  { url: "resume/",   title: "Resume" },
  { url: "https://github.com/amjadfaiz-ma", title: "GitHub" },
];

// detect local vs GitHub Pages environment
const BASE_PATH =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/"
    : "/portfolio/";

// create the <nav> and add it at the start of <body>
const nav = document.createElement("nav");
const ul  = document.createElement("ul");
nav.appendChild(ul);
document.body.prepend(nav);

// build each <a> link dynamically
for (const p of pages) {
  let url = p.url.startsWith("http") ? p.url : BASE_PATH + p.url;

  const li = document.createElement("li");
  const a  = document.createElement("a");
  a.href = url;
  a.textContent = p.title;

  // highlight current page
  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  // open external links in new tab
  a.toggleAttribute("target", a.host !== location.host);
  if (a.hasAttribute("target")) a.rel = "noopener";

  li.appendChild(a);
  ul.appendChild(li);
}

/* ---------------------------
   Step 4.2: Dark mode switch
   --------------------------- */

// Insert the dropdown menu at the top of <body>
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

// Reference the select element
const themeSelect = document.querySelector("#theme-select");

// When user changes theme, update the <html> color-scheme property
themeSelect.addEventListener("change", (event) => {
  document.documentElement.style.colorScheme = event.target.value;
});

// Detect OS preference for initial labeling (optional enhancement)
if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  console.log("User prefers dark mode");
} else {
  console.log("User prefers light mode");
}

/* ---------------------------
   Step 4.4: Make dark mode switch work
   --------------------------- */

// Get reference to the <select> element inside our color-scheme label
const select = document.querySelector('.color-scheme select');

// Listen for input changes (fires when user picks a new theme)
select.addEventListener('input', function (event) {
  const value = event.target.value;
  console.log('color scheme changed to', value);

  // Apply the color-scheme to the root <html> element
  document.documentElement.style.setProperty('color-scheme', value);
});

/* ---------------------------
   Step 4.5: Save + restore theme
   --------------------------- */

// Single source of truth: apply theme + save it
function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  localStorage.colorScheme = colorScheme; // persist
}

// 1) Restore saved preference on load (if any)
if ("colorScheme" in localStorage) {
  // Use saved value
  setColorScheme(localStorage.colorScheme);
  // Keep the UI in sync with what we're using
  select.value = localStorage.colorScheme;
} else {
  // Default to automatic if nothing is saved
  setColorScheme('light dark');
  select.value = 'light dark';
}

// 2) Save & apply when user changes the dropdown
select.addEventListener('input', (event) => {
  setColorScheme(event.target.value);
  console.log('color scheme changed to', event.target.value);
});

/* -----------------------------------------
   Step 5: Better contact form (Optional)
   ----------------------------------------- */

// Find a mailto form on the page (optional chaining avoids errors on pages without a form)
const form = document.querySelector('form[action^="mailto:"]');

form?.addEventListener('submit', (event) => {
  // Stop the browser’s default submit (which would do the + encoding)
  event.preventDefault();

  const data = new FormData(form);

  // Build query string with proper percent-encoding
  const params = [];
  for (const [name, value] of data) {
    if (!value) continue; // skip empty fields

    // If you kept a "from" or "email" field by mistake, ignore it:
    if (name.toLowerCase() === 'email' || name.toLowerCase() === 'from') continue;

    params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
  }

  // Compose the mailto URL
  const url = `${form.action}?${params.join('&')}`;

  // Open the user’s email client with prefilled fields
  location.href = url;
});
