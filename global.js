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
