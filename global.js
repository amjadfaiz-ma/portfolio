console.log("IT'S ALIVE!");

// Tiny helper (same as before)
function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

/* ---------------------------
   Step 3: Automatic navigation
   --------------------------- */

// 3.1 — Pages list (internal links are relative to the site root)
const pages = [
  { url: "",          title: "Home" },
  { url: "contact/",  title: "Contact" },
  { url: "projects/", title: "Projects" },
  { url: "resume/",   title: "Resume" },
  { url: "https://github.com/amjadfaiz-ma", title: "GitHub", external: true },
];

// Detect local dev vs GitHub Pages and set a base path accordingly.
// Your repo is served under /portfolio/ on GitHub Pages.
const BASE_PATH =
  (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "/"
    : "/portfolio/";

// Create <nav><ul>...</ul></nav> and add it to the top of <body>
const nav = document.createElement("nav");
const ul  = document.createElement("ul");
nav.appendChild(ul);
document.body.prepend(nav);

// Build links
for (const p of pages) {
  let href = p.url;

  // If it's an internal (relative) link, prefix with BASE_PATH
  if (!href.startsWith("http")) {
    href = BASE_PATH + href;
  }

  const li = document.createElement("li");
  const a  = document.createElement("a");
  a.href = href;
  a.textContent = p.title;

  // External links: open in new tab
  if (p.external) {
    a.target = "_blank";
    a.rel = "noopener";
  }

  li.appendChild(a);
  ul.appendChild(li);
}

// Mark the current page link (same logic as Step 2)
const navLinks = $$("nav a");
const currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname
);
currentLink?.classList.add("current");
