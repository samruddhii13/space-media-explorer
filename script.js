const CONFIG = {
  NASA_API_KEY: "faywMKSbtCyhgDMGjJ5xR6qwJ4SUMVbN1PGvOuIx",
  SEARCH_API: "https://images-api.nasa.gov/search",
  APOD_API: "https://api.nasa.gov/planetary/apod",
  PAGE_SIZE: 20,
};

const RANDOM_TOPICS = [
  "Andromeda", "Supernova", "Jupiter", "Milky Way", "ISS", "Voyager",
  "Saturn Rings", "Solar Flare", "Comet", "Aurora Borealis", "Crab Nebula",
  "Pluto", "Mars Rover", "Artemis", "James Webb", "Black Hole", "Exoplanet",
  "Cassini", "Eclipse", "Dark Matter", "Asteroid Belt", "Titan", "Europa",
  "Ganymede", "Neutron Star", "Quasar", "Pulsar", "Mercury Transit", "Venus", "Deep Space",
];

let state = {
  allResults: [],
  displayedItems: [],
  currentFilter: "all",
  currentSort: "default",
  currentPage: 1,
  isLoading: false,
  savedItems: [],
  activeSection: "search",
  apodHD: false,
  currentAPOD: null,
};

const $ = (id) => document.getElementById(id);

const dom = {
  searchInput: $("searchInput"),
  searchBtn: $("searchBtn"),
  randomBtn: $("randomBtn"),
  gallery: $("gallery"),
  emptyState: $("emptyState"),
  controls: $("controls"),
  resultsInfo: $("resultsInfo"),
  sortSelect: $("sortSelect"),
  loadMoreContainer: $("loadMoreContainer"),
  loadMoreBtn: $("loadMoreBtn"),
  apodCard: $("apodCard"),
  apodDateInput: $("apodDateInput"),
  apodGoBtn: $("apodGoBtn"),
  apodTodayBtn: $("apodTodayBtn"),
  apodRandomBtn: $("apodRandomBtn"),
  savedGallery: $("savedGallery"),
  savedEmptyState: $("savedEmptyState"),
  savedActions: $("savedActions"),
  savedCount: $("savedCount"),
  clearSavedBtn: $("clearSavedBtn"),
  modalOverlay: $("modalOverlay"),
  modal: $("modal"),
  modalClose: $("modalClose"),
  modalContent: $("modalContent"),
  toast: $("toast"),
  loadingOverlay: $("loadingOverlay"),
  stars: $("stars"),
  themeToggle: $("themeToggle"),
  themeIcon: $("themeIcon"),
  fullscreenOverlay: $("fullscreenOverlay"),
  fullscreenImg: $("fullscreenImg"),
};

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  generateStars();
  loadSavedItems();
  updateSavedCount();
  bindNavigation();
  bindSearch();
  bindFilters();
  bindModal();
  bindThemeToggle();
  bindAPODControls();
  applyStoredTheme();
  const todayStr = new Date().toISOString().slice(0, 10);
  dom.apodDateInput.max = todayStr;
  dom.apodDateInput.value = todayStr;
  fetchAPOD();
});

// ── STARS ──
function generateStars() {
  const count = window.innerWidth < 768 ? 80 : 160;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const star = document.createElement("div");
    star.className = "star";
    const size = Math.random() * 2.5 + 0.5;
    star.style.cssText = `width:${size}px;height:${size}px;top:${Math.random() * 100}%;left:${Math.random() * 100}%;--dur:${(Math.random() * 4 + 2).toFixed(1)}s;animation-delay:${(Math.random() * 5).toFixed(1)}s;opacity:${Math.random() * 0.6 + 0.1};`;
    frag.appendChild(star);
  }
  dom.stars.appendChild(frag);
}

// ── DARK / LIGHT MODE ──
function applyStoredTheme() {
  const saved = localStorage.getItem("spaceTheme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  dom.themeIcon.className = saved === "dark" ? "fas fa-moon" : "fas fa-sun";
}

function bindThemeToggle() {
  dom.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("spaceTheme", next);
    dom.themeIcon.className = next === "dark" ? "fas fa-moon" : "fas fa-sun";
    showToast(next === "dark" ? "🌙 Dark mode on" : "☀️ Light mode on");
  });
}

// ── NAVIGATION ──
function bindNavigation() {
  document.querySelectorAll(".nav-btn[data-section]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      switchSection(target);
      document.querySelectorAll(".nav-btn[data-section]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function switchSection(name) {
  state.activeSection = name;
  document.querySelectorAll(".section").forEach((s) => s.classList.remove("active"));
  $(`${name}Section`).classList.add("active");
  if (name === "saved") renderSavedGallery();
}

// ── DEBOUNCE ──
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ── SEARCH BINDINGS ──
function bindSearch() {
  dom.searchBtn.addEventListener("click", handleSearch);
  dom.searchInput.addEventListener("input", debounce(handleSearch, 600));
  dom.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSearch();
  });
  dom.randomBtn.addEventListener("click", () => {
    dom.searchInput.value = RANDOM_TOPICS[Math.floor(Math.random() * RANDOM_TOPICS.length)];
    handleSearch();
  });
  document.querySelectorAll(".quick-tag").forEach((tag) => {
    tag.addEventListener("click", () => {
      dom.searchInput.value = tag.dataset.query;
      handleSearch();
    });
  });
  dom.loadMoreBtn.addEventListener("click", loadMore);
  dom.sortSelect.addEventListener("change", () => {
    state.currentSort = dom.sortSelect.value;
    applyFilterSortAndRender();
  });
}

// ── FILTER BINDINGS ──
function bindFilters() {
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.currentFilter = btn.dataset.filter;
      state.currentPage = 1;
      applyFilterSortAndRender();
    });
  });
}

// ── HANDLE SEARCH ──
async function handleSearch() {
  const query = dom.searchInput.value.trim();
  if (!query) return;

  state.currentPage = 1;
  state.currentFilter = "all";
  state.currentSort = "default";
  dom.sortSelect.value = "default";
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('.filter-btn[data-filter="all"]').classList.add("active");

  showLoading(true);
  clearGallery();

  try {
    const data = await fetchNASASearch(query);
    if (!data || !data.collection || !data.collection.items) throw new Error("No data");
    const items = data.collection.items;
    state.allResults = items;
    if (items.length === 0) {
      showEmptyState(dom.gallery, dom.emptyState, "🌌 No results found. Try a different search term.");
      dom.loadMoreContainer.style.display = "none";
    } else {
      dom.emptyState.style.display = "none";
      applyFilterSortAndRender();
    }
    dom.controls.style.display = "flex";
  } catch (err) {
    console.error(err);
    showEmptyState(dom.gallery, dom.emptyState, "⚠️ Failed to fetch data. Check your connection and try again.");
  } finally {
    showLoading(false);
  }
}

async function fetchNASASearch(query) {
  const url = `${CONFIG.SEARCH_API}?q=${encodeURIComponent(query)}&page_size=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── FILTER + SORT + RENDER (Array HOFs) ──
function applyFilterSortAndRender() {
  let items = state.currentFilter !== "all"
    ? state.allResults.filter((item) => item.data?.[0]?.media_type === state.currentFilter)
    : [...state.allResults];
  items = sortItems(items, state.currentSort);
  state.displayedItems = items;
  state.currentPage = 1;
  renderGallery(items.slice(0, CONFIG.PAGE_SIZE), dom.gallery, false);
  updateResultsInfo(items.length);
  updateLoadMore(items.length);
}

function sortItems(items, sortType) {
  const copy = [...items];
  switch (sortType) {
    case "az":
      return copy.sort((a, b) => (a.data?.[0]?.title || "").localeCompare(b.data?.[0]?.title || ""));
    case "za":
      return copy.sort((a, b) => (b.data?.[0]?.title || "").localeCompare(a.data?.[0]?.title || ""));
    case "newest":
      return copy.sort((a, b) => new Date(b.data?.[0]?.date_created || 0) - new Date(a.data?.[0]?.date_created || 0));
    case "oldest":
      return copy.sort((a, b) => new Date(a.data?.[0]?.date_created || 0) - new Date(b.data?.[0]?.date_created || 0));
    default:
      return copy;
  }
}

// ── LOAD MORE ──
function loadMore() {
  state.currentPage++;
  const start = (state.currentPage - 1) * CONFIG.PAGE_SIZE;
  const end = start + CONFIG.PAGE_SIZE;
  const next = state.displayedItems.slice(start, end);
  if (next.length > 0) renderGallery(next, dom.gallery, true);
  if (end >= state.displayedItems.length) dom.loadMoreContainer.style.display = "none";
}

function updateLoadMore(total) {
  dom.loadMoreContainer.style.display = total > CONFIG.PAGE_SIZE ? "block" : "none";
}

function updateResultsInfo(count) {
  dom.resultsInfo.textContent = `${count.toLocaleString()} result${count !== 1 ? "s" : ""} found`;
}

// ── RENDER GALLERY ──
function renderGallery(items, container, append = false) {
  if (!append) {
    Array.from(container.children).forEach((child) => {
      if (!child.classList.contains("empty-state")) container.removeChild(child);
    });
  }
  const frag = document.createDocumentFragment();
  items.forEach((item) => {
    const data = item.data?.[0];
    if (!data) return;
    const mediaType = data.media_type || "image";
    const title = data.title || "Untitled";
    const date = formatDate(data.date_created);
    const desc = data.description || data.description_508 || "No description available.";
    const nasaId = data.nasa_id;
    const links = item.links || [];
    const thumbUrl = links.find((l) => l.rel === "preview")?.href || null;
    const isSaved = isItemSaved(nasaId);

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.nasaId = nasaId;
    card.innerHTML = `
      <div class="card-media">
        ${buildCardMedia(mediaType, thumbUrl)}
        <span class="card-type-badge badge-${mediaType}">${mediaType}</span>
        <button class="card-save-btn ${isSaved ? "saved" : ""}" data-nasa-id="${nasaId}" title="${isSaved ? "Remove from saved" : "Save item"}">
          <i class="fa${isSaved ? "s" : "r"} fa-heart"></i>
        </button>
      </div>
      <div class="card-body">
        <div class="card-title">${escHtml(title)}</div>
        <div class="card-date"><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:5px;"></i>${date}</div>
        <div class="card-desc">${escHtml(desc)}</div>
      </div>
    `;
    card.querySelector(".card-save-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSave(item, e.currentTarget);
    });
    card.addEventListener("click", () => openModal(item));
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

function buildCardMedia(type, thumbUrl) {
  if (type === "image" && thumbUrl)
    return `<img src="${thumbUrl}" alt="Space image" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-media-icon\\'><i class=\\'fas fa-image\\'></i><span>Image not available</span></div>'" />`;
  if (type === "video")
    return `<div class="card-media-icon"><i class="fas fa-play-circle"></i><span>Video</span></div>`;
  if (type === "audio")
    return `<div class="card-media-icon"><i class="fas fa-headphones"></i><span>Audio</span></div>`;
  return `<div class="card-media-icon"><i class="fas fa-satellite"></i><span>Media</span></div>`;
}

// ── MODAL ──
function bindModal() {
  dom.modalClose.addEventListener("click", closeModal);
  dom.modalOverlay.addEventListener("click", (e) => {
    if (e.target === dom.modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeFullscreen();
    }
  });
}

async function openModal(item) {
  const data = item.data?.[0];
  if (!data) return;
  const mediaType = data.media_type || "image";
  const title = data.title || "Untitled";
  const date = formatDate(data.date_created);
  const desc = data.description || data.description_508 || "No description available.";
  const nasaId = data.nasa_id;
  const isSaved = isItemSaved(nasaId);

  dom.modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  dom.modalContent.innerHTML = `<div class="loader-wrap"><div class="loader"></div><p>Loading media...</p></div>`;

  let mediaHtml = "";
  try {
    const assetUrl = `https://images-api.nasa.gov/asset/${encodeURIComponent(nasaId)}`;
    const res = await fetch(assetUrl);
    const assetData = await res.json();
    const hrefs = (assetData?.collection?.items || []).map((a) => a.href);

    if (mediaType === "image") {
      const imgSrc =
        hrefs.find((h) => h.match(/~orig\.(jpg|jpeg|png|gif|tif)/i)) ||
        hrefs.find((h) => h.match(/\.(jpg|jpeg|png|gif)/i)) ||
        item.links?.[0]?.href || "";
      mediaHtml = imgSrc
        ? `<img class="modal-media" src="${imgSrc}" alt="${escHtml(title)}" style="cursor:zoom-in" onclick="openFullscreen('${imgSrc}')" />`
        : `<div class="card-media-icon" style="min-height:200px;border-radius:var(--radius);"><i class="fas fa-image"></i><span>Image not available</span></div>`;
    } else if (mediaType === "video") {
      const videoSrc = hrefs.find((h) => h.endsWith(".mp4")) || "";
      const thumbSrc = item.links?.find((l) => l.rel === "preview")?.href || "";
      if (videoSrc) {
        mediaHtml = `<video class="modal-media" controls poster="${thumbSrc}" style="max-height:420px;background:#000;"><source src="${videoSrc}" type="video/mp4" />Your browser does not support the video tag.</video>`;
      } else {
        const ytHref = hrefs.find((h) => h.includes("youtube")) || "";
        mediaHtml = ytHref
          ? `<div class="modal-iframe-wrap"><iframe src="${ytHref}" allowfullscreen></iframe></div>`
          : `<div class="card-media-icon" style="min-height:200px;border-radius:var(--radius);"><i class="fas fa-video"></i><span>Video not available</span></div>`;
      }
    } else if (mediaType === "audio") {
      const audioSrc = hrefs.find((h) => h.match(/\.(mp3|wav|ogg|m4a)/i)) || "";
      mediaHtml = audioSrc
        ? `<audio class="modal-audio" controls src="${audioSrc}"></audio>`
        : `<div class="card-media-icon" style="min-height:140px;border-radius:var(--radius);"><i class="fas fa-headphones"></i><span>Audio not available</span></div>`;
    }
  } catch {
    mediaHtml = `<div class="card-media-icon" style="min-height:180px;border-radius:var(--radius);"><i class="fas fa-satellite"></i><span>Media not available</span></div>`;
  }

  dom.modalContent.innerHTML = `
    ${mediaHtml}
    <span class="modal-type-badge badge-${mediaType} card-type-badge">${mediaType}</span>
    <h2 class="modal-title">${escHtml(title)}</h2>
    <div class="modal-date"><i class="fas fa-calendar-alt"></i>${date}</div>
    <p class="modal-desc">${escHtml(desc)}</p>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalSaveBtn">
        <i class="fa${isSaved ? "s" : "r"} fa-heart"></i>
        ${isSaved ? "Saved!" : "Save to Collection"}
      </button>
      <a class="btn btn-ghost" href="https://images.nasa.gov/details-${encodeURIComponent(nasaId)}" target="_blank" rel="noopener">
        <i class="fas fa-external-link-alt"></i> View on NASA
      </a>
    </div>
  `;

  $("modalSaveBtn").addEventListener("click", () => {
    toggleSave(item, $("modalSaveBtn"), true);
    const nowSaved = isItemSaved(nasaId);
    $("modalSaveBtn").innerHTML = `<i class="fa${nowSaved ? "s" : "r"} fa-heart"></i> ${nowSaved ? "Saved!" : "Save to Collection"}`;
  });
}

function closeModal() {
  dom.modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  dom.modalContent.querySelectorAll("video, audio").forEach((el) => el.pause());
}

// ── FULLSCREEN ──
window.openFullscreen = function (src) {
  dom.fullscreenImg.src = src;
  dom.fullscreenOverlay.classList.add("open");
};

window.closeFullscreen = function () {
  dom.fullscreenOverlay.classList.remove("open");
  dom.fullscreenImg.src = "";
};

// ── APOD CONTROLS ──
function bindAPODControls() {
  dom.apodGoBtn.addEventListener("click", () => {
    const date = dom.apodDateInput.value;
    if (!date) {
      showToast("⚠️ Please pick a date");
      return;
    }
    fetchAPOD(date);
  });
  dom.apodTodayBtn.addEventListener("click", () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    dom.apodDateInput.value = todayStr;
    fetchAPOD();
  });
  dom.apodRandomBtn.addEventListener("click", () => {
    const start = new Date("1995-06-16").getTime();
    const end = new Date().getTime();
    const rand = new Date(start + Math.random() * (end - start));
    const dateStr = rand.toISOString().slice(0, 10);
    dom.apodDateInput.value = dateStr;
    fetchAPOD(dateStr);
  });
}

async function fetchAPOD(date) {
  dom.apodCard.innerHTML = `<div class="loader-wrap"><div class="loader"></div><p>Fetching cosmic wonder...</p></div>`;
  state.apodHD = false;
  try {
    let url = `${CONFIG.APOD_API}?api_key=${CONFIG.NASA_API_KEY}&thumbs=true`;
    if (date) url += `&date=${date}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.currentAPOD = data;
    renderAPOD(data);
  } catch (err) {
    console.error(err);
    dom.apodCard.innerHTML = `
      <div class="loader-wrap">
        <i class="fas fa-exclamation-triangle" style="font-size:2.5rem;color:var(--accent3)"></i>
        <p>Failed to load APOD. Please try another date.</p>
        <button class="btn btn-primary" onclick="fetchAPOD()"><i class="fas fa-redo"></i> Load Today</button>
      </div>`;
  }
}

function renderAPOD(data) {
  const { title, date, explanation, url, hdurl, media_type, thumbnail_url, copyright } = data;
  const imgSrc = (state.apodHD && hdurl) ? hdurl : url;
  const apodId = `apod-${date}`;
  const isSaved = isItemSaved(apodId);

  let mediaHtml = "";
  if (media_type === "video") {
    if (thumbnail_url) {
      mediaHtml = `
        <div style="position:relative;">
          <img class="apod-media" src="${thumbnail_url}" alt="${escHtml(title)}" />
          <a href="${url}" target="_blank" rel="noopener"
            style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);font-size:4rem;color:var(--accent3);text-decoration:none;">
            <i class="fas fa-play-circle"></i>
          </a>
        </div>`;
    } else {
      mediaHtml = `<div class="apod-iframe-wrap"><iframe src="${url}" allowfullscreen></iframe></div>`;
    }
  } else {
    mediaHtml = `<img class="apod-media" src="${imgSrc}" alt="${escHtml(title)}" loading="lazy" onclick="openFullscreen('${hdurl || url}')" />`;
  }

  dom.apodCard.innerHTML = `
    ${mediaHtml}
    <div class="apod-body">
      <div class="apod-meta">
        <div class="apod-date"><i class="fas fa-calendar-alt"></i> ${formatDate(date)}</div>
        ${copyright ? `<div class="apod-copyright"><i class="fas fa-user-astronaut"></i> © ${escHtml(copyright.replace(/\n/g, " "))}</div>` : ""}
      </div>
      <h2 class="apod-title">${escHtml(title)}</h2>
      <p class="apod-desc">${escHtml(explanation)}</p>
      <div class="apod-actions">
        ${(hdurl || url) ? `<a class="btn btn-primary" href="${hdurl || url}" target="_blank" rel="noopener"><i class="fas fa-expand"></i> Full Resolution</a>` : ""}
        ${hdurl ? `<button class="hd-badge ${state.apodHD ? "active" : ""}" id="hdToggleBtn"><i class="fas fa-expand-arrows-alt" style="font-size:0.9em"></i> HD ${state.apodHD ? "ON" : "OFF"}</button>` : ""}
        <button class="btn btn-ghost" id="apodSaveBtn">
          <i class="fa${isSaved ? "s" : "r"} fa-heart" ${isSaved ? 'style="color:var(--accent3)"' : ""}></i>
          ${isSaved ? "Saved!" : "Save to Collection"}
        </button>
      </div>
    </div>
  `;

  const hdBtn = $("hdToggleBtn");
  if (hdBtn) {
    hdBtn.addEventListener("click", () => {
      state.apodHD = !state.apodHD;
      const img = dom.apodCard.querySelector(".apod-media");
      if (img) {
        img.src = state.apodHD ? (hdurl || url) : url;
        showToast(state.apodHD ? "🔭 HD image loaded" : "📷 Standard image");
      }
      hdBtn.classList.toggle("active", state.apodHD);
      hdBtn.innerHTML = `<i class="fas fa-expand-arrows-alt" style="font-size:0.9em"></i> HD ${state.apodHD ? "ON" : "OFF"}`;
    });
  }

  const apodSaveBtn = $("apodSaveBtn");
  apodSaveBtn.addEventListener("click", () => {
    const apodItem = buildAPODSaveItem(data);
    const saved = isItemSaved(apodId);
    if (saved) {
      removeFromSaved(apodId);
      apodSaveBtn.innerHTML = `<i class="far fa-heart"></i> Save to Collection`;
      showToast("💔 Removed from your collection");
    } else {
      saveItem(apodItem);
      apodSaveBtn.innerHTML = `<i class="fas fa-heart" style="color:var(--accent3)"></i> Saved!`;
      showToast("❤️ APOD saved to your collection!");
    }
    updateSavedCount();
  });
}

function buildAPODSaveItem(data) {
  return {
    _apodItem: true,
    data: [{
      nasa_id: `apod-${data.date}`,
      title: data.title,
      date_created: data.date,
      description: data.explanation,
      media_type: data.media_type === "video" ? "video" : "image",
    }],
    links: [{ href: data.thumbnail_url || data.url, rel: "preview" }],
    _apodUrl: data.hdurl || data.url,
  };
}

// ── SAVE / UNSAVE ──
function loadSavedItems() {
  try {
    state.savedItems = JSON.parse(localStorage.getItem("spaceExplorerSaved") || "[]");
  } catch {
    state.savedItems = [];
  }
}

function persistSavedItems() {
  localStorage.setItem("spaceExplorerSaved", JSON.stringify(state.savedItems));
}

function isItemSaved(nasaId) {
  return state.savedItems.some((s) => s.data?.[0]?.nasa_id === nasaId);
}

function saveItem(item) {
  if (!isItemSaved(item.data?.[0]?.nasa_id)) {
    state.savedItems.unshift(item);
    persistSavedItems();
  }
}

function removeFromSaved(nasaId) {
  state.savedItems = state.savedItems.filter((s) => s.data?.[0]?.nasa_id !== nasaId);
  persistSavedItems();
}

function toggleSave(item, btnEl, isModalBtn = false) {
  const nasaId = item.data?.[0]?.nasa_id;
  const isSaved = isItemSaved(nasaId);
  if (isSaved) {
    removeFromSaved(nasaId);
    showToast("💔 Removed from your collection");
    if (!isModalBtn) {
      btnEl.classList.remove("saved");
      btnEl.innerHTML = `<i class="far fa-heart"></i>`;
    }
    if (state.activeSection === "saved") renderSavedGallery();
  } else {
    saveItem(item);
    showToast("❤️ Saved to your collection!");
    if (!isModalBtn) {
      btnEl.classList.add("saved");
      btnEl.innerHTML = `<i class="fas fa-heart"></i>`;
    }
  }
  updateSavedCount();
  document.querySelectorAll(`.card-save-btn[data-nasa-id="${nasaId}"]`).forEach((b) => {
    const nowSaved = isItemSaved(nasaId);
    b.classList.toggle("saved", nowSaved);
    b.innerHTML = `<i class="fa${nowSaved ? "s" : "r"} fa-heart"></i>`;
  });
}

function updateSavedCount() {
  const count = state.savedItems.length;
  dom.savedCount.textContent = count;
  dom.savedCount.classList.toggle("visible", count > 0);
}

// ── SAVED GALLERY ──
function renderSavedGallery() {
  Array.from(dom.savedGallery.children).forEach((child) => {
    if (!child.classList.contains("empty-state")) dom.savedGallery.removeChild(child);
  });
  if (state.savedItems.length === 0) {
    dom.savedEmptyState.style.display = "flex";
    dom.savedActions.style.display = "none";
  } else {
    dom.savedEmptyState.style.display = "none";
    dom.savedActions.style.display = "flex";
    renderGallery(state.savedItems, dom.savedGallery, false);
  }
}

dom.clearSavedBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all saved items?")) {
    state.savedItems = [];
    persistSavedItems();
    updateSavedCount();
    renderSavedGallery();
    showToast("🗑️ All saved items cleared");
    document.querySelectorAll(".card-save-btn").forEach((b) => {
      b.classList.remove("saved");
      b.innerHTML = `<i class="far fa-heart"></i>`;
    });
  }
});

// ── HELPERS ──
function clearGallery() {
  Array.from(dom.gallery.children).forEach((child) => {
    if (!child.classList.contains("empty-state")) dom.gallery.removeChild(child);
  });
  dom.emptyState.style.display = "flex";
  dom.emptyState.innerHTML = `<i class="fas fa-satellite-dish"></i><p>Scanning the cosmos...</p>`;
  dom.loadMoreContainer.style.display = "none";
  dom.resultsInfo.textContent = "";
}

function showEmptyState(container, el, message) {
  el.style.display = "flex";
  el.innerHTML = `<i class="fas fa-meteor"></i><p>${message}</p>`;
}

function showLoading(show) {
  state.isLoading = show;
  dom.loadingOverlay.classList.toggle("show", show);
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  clearTimeout(dom.toast._timer);
  dom.toast._timer = setTimeout(() => dom.toast.classList.remove("show"), 3200);
}

function formatDate(dateStr) {
  if (!dateStr) return "Date unknown";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}