
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


function $(id) {
  return document.getElementById(id);
}

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
  modalClose: $("modalClose"),
  modalContent: $("modalContent"),
  toast: $("toast"),
  loadingOverlay: $("loadingOverlay"),
  stars: $("stars"),
  themeToggle: $("themeToggle"),
  themeIcon: $("themeIcon"),
};

document.addEventListener("DOMContentLoaded", function() {
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
  
  let todayStr = new Date().toISOString().slice(0, 10);
  dom.apodDateInput.max = todayStr;
  dom.apodDateInput.value = todayStr;
  fetchAPOD();
});


function generateStars() {
  let count = window.innerWidth < 768 ? 80 : 160;
  let starsArray = Array(count).fill();
  
  starsArray.forEach(function() {
    let star = document.createElement("div");
    star.className = "star";
    let size = Math.random() * 2.5 + 0.5;
    let top = Math.random() * 100;
    let left = Math.random() * 100;
    let duration = (Math.random() * 4 + 2).toFixed(1);
    let delay = (Math.random() * 5).toFixed(1);
    let opacity = Math.random() * 0.6 + 0.1;
    
    star.style.cssText = "width:" + size + "px;height:" + size + "px;top:" + top + "%;left:" + left + "%;--dur:" + duration + "s;animation-delay:" + delay + "s;opacity:" + opacity + ";";
    dom.stars.appendChild(star);
  });
}


function applyStoredTheme() {
  let saved = localStorage.getItem("spaceTheme");
  
  if (saved === null) {
    saved = "dark";
  }
  
  document.documentElement.setAttribute("data-theme", saved);
  
  if (saved === "dark") {
    dom.themeIcon.className = "fas fa-moon";
  } else {
    dom.themeIcon.className = "fas fa-sun";
  }
}
//Dark/light toogle
function bindThemeToggle() {
  dom.themeToggle.addEventListener("click", function() {
    let current = document.documentElement.getAttribute("data-theme");
    let next;
    
    if (current === "dark") {
      next = "light";
    } else {
      next = "dark";
    }
    
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("spaceTheme", next);
    
    if (next === "dark") {
      dom.themeIcon.className = "fas fa-moon";
      showToast("🌙 Dark mode on");
    } else {
      dom.themeIcon.className = "fas fa-sun";
      showToast("☀️ Light mode on");
    }
  });
}


function bindNavigation() {
  let navButtons = document.querySelectorAll(".nav-btn[data-section]");
  
  navButtons.forEach(function(btn) {
    btn.addEventListener("click", function() {
      let target = btn.dataset.section;
      switchSection(target);
      
      navButtons.forEach(function(b) {
        b.classList.remove("active");
      });
      
      btn.classList.add("active");
    });
  });
}

function switchSection(name) {
  state.activeSection = name;
  let sections = document.querySelectorAll(".section");
  
  sections.forEach(function(s) {
    s.classList.remove("active");
  });
  
  $(name + "Section").classList.add("active");
  
  if (name === "saved") {
    renderSavedGallery();
  }
}


function bindSearch() {
  dom.searchBtn.addEventListener("click", handleSearch);
  
  dom.searchInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      handleSearch();
    }
  });
  
  dom.randomBtn.addEventListener("click", function() {
    let randomIndex = Math.floor(Math.random() * RANDOM_TOPICS.length);
    dom.searchInput.value = RANDOM_TOPICS[randomIndex];
    handleSearch();
  });
  
  let quickTags = document.querySelectorAll(".quick-tag");
  quickTags.forEach(function(tag) {
    tag.addEventListener("click", function() {
      dom.searchInput.value = tag.dataset.query;
      handleSearch();
    });
  });
  
  dom.loadMoreBtn.addEventListener("click", loadMore);
  dom.sortSelect.addEventListener("change", function() {
    state.currentSort = dom.sortSelect.value;
    applyFilterSortAndRender();
  });
}

//searching
async function handleSearch() {
  let query = dom.searchInput.value.trim();
  
  if (query === "") {
    return;
  }

  state.currentPage = 1;
  state.currentFilter = "all";
  state.currentSort = "default";
  dom.sortSelect.value = "default";
  
  let filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(function(btn) {
    btn.classList.remove("active");
  });
  
  document.querySelector('.filter-btn[data-filter="all"]').classList.add("active");

  showLoading(true);
  clearGallery();

  try {
    let data = await fetchNASASearch(query);
    
    if (!data || !data.collection || !data.collection.items) {
      throw new Error("No data");
    }
    
    let items = data.collection.items;
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
//api fetch
async function fetchNASASearch(query) {
  let url = CONFIG.SEARCH_API + "?q=" + encodeURIComponent(query) + "&page_size=100";
  let res = await fetch(url);
  
  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }
  
  return res.json();
}

//Filter
function applyFilterSortAndRender() {
  let items;
  
  if (state.currentFilter !== "all") {
    items = [];
    state.allResults.forEach(function(item) {
      if (item.data && item.data[0] && item.data[0].media_type === state.currentFilter) {
        items.push(item);
      }
    });
  } else {
    items = [];
    state.allResults.forEach(function(item) {
      items.push(item);
    });
  }
  
  items = sortItems(items, state.currentSort);
  state.displayedItems = items;
  state.currentPage = 1;
  
  let firstPage = items.slice(0, CONFIG.PAGE_SIZE);
  
  renderGallery(firstPage, dom.gallery, false);
  updateResultsInfo(items.length);
  updateLoadMore(items.length);
}

//sorting
function sortItems(items, sortType) {
  let copy = [];
  items.forEach(function(item) {
    copy.push(item);
  });
  
  if (sortType === "az") {
    copy.sort(function(a, b) {
      let titleA = a.data && a.data[0] && a.data[0].title ? a.data[0].title : "";
      let titleB = b.data && b.data[0] && b.data[0].title ? b.data[0].title : "";
      
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      return 0;
    });
  } 
  else if (sortType === "za") {
    copy.sort(function(a, b) {
      let titleA = a.data && a.data[0] && a.data[0].title ? a.data[0].title : "";
      let titleB = b.data && b.data[0] && b.data[0].title ? b.data[0].title : "";
      
      if (titleB < titleA) return -1;
      if (titleB > titleA) return 1;
      return 0;
    });
  }
  else if (sortType === "newest") {
    copy.sort(function(a, b) {
      let dateA = a.data && a.data[0] && a.data[0].date_created ? new Date(a.data[0].date_created).getTime() : 0;
      let dateB = b.data && b.data[0] && b.data[0].date_created ? new Date(b.data[0].date_created).getTime() : 0;
      return dateB - dateA;
    });
  }
  else if (sortType === "oldest") {
    copy.sort(function(a, b) {
      let dateA = a.data && a.data[0] && a.data[0].date_created ? new Date(a.data[0].date_created).getTime() : 0;
      let dateB = b.data && b.data[0] && b.data[0].date_created ? new Date(b.data[0].date_created).getTime() : 0;
      return dateA - dateB;
    });
  }
  
  return copy;
}


//load more
function loadMore() {
  state.currentPage++;
  let start = (state.currentPage - 1) * CONFIG.PAGE_SIZE;
  let end = start + CONFIG.PAGE_SIZE;
  
  let next = state.displayedItems.slice(start, end);
  
  if (next.length > 0) {
    renderGallery(next, dom.gallery, true);
  }
  
  if (end >= state.displayedItems.length) {
    dom.loadMoreContainer.style.display = "none";
  }
}

function updateLoadMore(total) {
  if (total > CONFIG.PAGE_SIZE) {
    dom.loadMoreContainer.style.display = "block";
  } else {
    dom.loadMoreContainer.style.display = "none";
  }
}

function updateResultsInfo(count) {
  let message = count.toLocaleString() + " result";
  if (count !== 1) {
    message = message + "s";
  }
  message = message + " found";
  dom.resultsInfo.textContent = message;
}

function renderGallery(items, container, append) {
  if (!append) {
    let children = Array.from(container.children);
    children.forEach(function(child) {
      if (!child.classList.contains("empty-state")) {
        container.removeChild(child);
      }
    });
  }
  
  items.forEach(function(item) {
    let data = item.data ? item.data[0] : null;
    
    if (!data) {
      return;
    }
    
    let mediaType = data.media_type || "image";
    let title = data.title || "Untitled";
    let date = formatDate(data.date_created);
    let desc = data.description || data.description_508 || "No description available.";
    let nasaId = data.nasa_id;
    let links = item.links || [];
    
    let thumbUrl = null;
    links.forEach(function(link) {
      if (link.rel === "preview") {
        thumbUrl = link.href;
      }
    });
    
    let isSaved = isItemSaved(nasaId);
    
    let card = document.createElement("div");
    card.className = "card";
    card.dataset.nasaId = nasaId;
    
    let mediaHtml = buildCardMedia(mediaType, thumbUrl);
    let badgeClass = "card-type-badge badge-" + mediaType;
    let saveBtnClass = "card-save-btn";
    
    if (isSaved) {
      saveBtnClass = saveBtnClass + " saved";
    }
    
    let heartIcon = "fa" + (isSaved ? "s" : "r") + " fa-heart";
    
    card.innerHTML = `
      <div class="card-media">
        ${mediaHtml}
        <span class="${badgeClass}">${mediaType}</span>
        <button class="${saveBtnClass}" data-nasa-id="${nasaId}" title="${isSaved ? "Remove from saved" : "Save item"}">
          <i class="${heartIcon}"></i>
        </button>
      </div>
      <div class="card-body">
        <div class="card-title">${escHtml(title)}</div>
        <div class="card-date"><i class="fas fa-calendar-alt" style="color:var(--accent);margin-right:5px;"></i>${date}</div>
        <div class="card-desc">${escHtml(desc)}</div>
      </div>
    `;
    
    let saveBtn = card.querySelector(".card-save-btn");
    saveBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      toggleSave(item, e.currentTarget);
    });
    
    card.addEventListener("click", function() {
      openModal(item);
    });
    
    container.appendChild(card);
  });
}

function buildCardMedia(type, thumbUrl) {
  if (type === "image" && thumbUrl) {
    return '<img src="' + thumbUrl + '" alt="Space image" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=\\\'card-media-icon\\\'><i class=\\\'fas fa-image\\\'></i><span>Image not available</span></div>\'" />';
  }
  
  if (type === "video") {
    return '<div class="card-media-icon"><i class="fas fa-play-circle"></i><span>Video</span></div>';
  }
  
  if (type === "audio") {
    return '<div class="card-media-icon"><i class="fas fa-headphones"></i><span>Audio</span></div>';
  }
  
  return '<div class="card-media-icon"><i class="fas fa-satellite"></i><span>Media</span></div>';
}


function bindModal() {
  dom.modalClose.addEventListener("click", closeModal);
  dom.modalOverlay.addEventListener("click", function(e) {
    if (e.target === dom.modalOverlay) {
      closeModal();
    }
  });
  
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

async function openModal(item) {
  let data = item.data ? item.data[0] : null;
  if (!data) return;
  
  let mediaType = data.media_type || "image";
  let title = data.title || "Untitled";
  let date = formatDate(data.date_created);
  let desc = data.description || data.description_508 || "No description available.";
  let nasaId = data.nasa_id;
  let isSaved = isItemSaved(nasaId);
  
  dom.modalOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  dom.modalContent.innerHTML = '<div class="loader-wrap"><div class="loader"></div><p>Loading media...</p></div>';
  
  let mediaHtml = "";
  
  try {
    let assetUrl = "https://images-api.nasa.gov/asset/" + encodeURIComponent(nasaId);
    let res = await fetch(assetUrl);
    let assetData = await res.json();
    
    let hrefs = [];
    if (assetData && assetData.collection && assetData.collection.items) {
      assetData.collection.items.forEach(function(assetItem) {
        hrefs.push(assetItem.href);
      });
    }
    
    if (mediaType === "image") {
      let imgSrc = "";
      
      hrefs.forEach(function(href) {
        if (href.match(/~orig\.(jpg|jpeg|png|gif|tif)/i) && imgSrc === "") {
          imgSrc = href;
        }
      });
      
      if (imgSrc === "") {
        hrefs.forEach(function(href) {
          if (href.match(/\.(jpg|jpeg|png|gif)/i) && imgSrc === "") {
            imgSrc = href;
          }
        });
      }
      
      if (imgSrc === "" && item.links && item.links[0]) {
        imgSrc = item.links[0].href || "";
      }
      
      if (imgSrc) {
        mediaHtml = '<img class="modal-media" src="' + imgSrc + '" alt="' + escHtml(title) + '" />';
      } else {
        mediaHtml = '<div class="card-media-icon" style="min-height:200px;border-radius:var(--radius);"><i class="fas fa-image"></i><span>Image not available</span></div>';
      }
    }
    else if (mediaType === "video") {
      let videoSrc = "";
      hrefs.forEach(function(href) {
        if (href.endsWith(".mp4") && videoSrc === "") {
          videoSrc = href;
        }
      });
      
      let thumbSrc = "";
      if (item.links) {
        item.links.forEach(function(link) {
          if (link.rel === "preview") {
            thumbSrc = link.href;
          }
        });
      }
      
      if (videoSrc) {
        mediaHtml = '<video class="modal-media" controls poster="' + thumbSrc + '" style="max-height:420px;background:#000;"><source src="' + videoSrc + '" type="video/mp4" />Your browser does not support the video tag.</video>';
      } else {
        let ytHref = "";
        hrefs.forEach(function(href) {
          if (href.includes("youtube") && ytHref === "") {
            ytHref = href;
          }
        });
        
        if (ytHref) {
          mediaHtml = '<div class="modal-iframe-wrap"><iframe src="' + ytHref + '" allowfullscreen></iframe></div>';
        } else {
          mediaHtml = '<div class="card-media-icon" style="min-height:200px;border-radius:var(--radius);"><i class="fas fa-video"></i><span>Video not available</span></div>';
        }
      }
    }
    else if (mediaType === "audio") {
      let audioSrc = "";
      hrefs.forEach(function(href) {
        if (href.match(/\.(mp3|wav|ogg|m4a)/i) && audioSrc === "") {
          audioSrc = href;
        }
      });
      
      if (audioSrc) {
        mediaHtml = '<audio class="modal-audio" controls src="' + audioSrc + '"></audio>';
      } else {
        mediaHtml = '<div class="card-media-icon" style="min-height:140px;border-radius:var(--radius);"><i class="fas fa-headphones"></i><span>Audio not available</span></div>';
      }
    }
  } catch (error) {
    mediaHtml = '<div class="card-media-icon" style="min-height:180px;border-radius:var(--radius);"><i class="fas fa-satellite"></i><span>Media not available</span></div>';
  }
  
  let badgeHtml = '<span class="modal-type-badge badge-' + mediaType + ' card-type-badge">' + mediaType + '</span>';
  let heartIcon = "fa" + (isSaved ? "s" : "r") + " fa-heart";
  let saveBtnText = isSaved ? "Saved!" : "Save to Collection";
  
  dom.modalContent.innerHTML = `
    ${mediaHtml}
    ${badgeHtml}
    <h2 class="modal-title">${escHtml(title)}</h2>
    <div class="modal-date"><i class="fas fa-calendar-alt"></i>${date}</div>
    <p class="modal-desc">${escHtml(desc)}</p>
    <div class="modal-actions">
      <button class="btn btn-primary" id="modalSaveBtn">
        <i class="${heartIcon}"></i>
        ${saveBtnText}
      </button>
      <a class="btn btn-ghost" href="https://images.nasa.gov/details-${encodeURIComponent(nasaId)}" target="_blank" rel="noopener">
        <i class="fas fa-external-link-alt"></i> View on NASA
      </a>
    </div>
  `;
  
  let modalSaveBtn = $("modalSaveBtn");
  modalSaveBtn.addEventListener("click", function() {
    toggleSave(item, modalSaveBtn, true);
    let nowSaved = isItemSaved(nasaId);
    let newHeartIcon = "fa" + (nowSaved ? "s" : "r") + " fa-heart";
    let newBtnText = nowSaved ? "Saved!" : "Save to Collection";
    modalSaveBtn.innerHTML = '<i class="' + newHeartIcon + '"></i> ' + newBtnText;
  });
}

function closeModal() {
  dom.modalOverlay.classList.remove("open");
  document.body.style.overflow = "";
  
  let mediaElements = dom.modalContent.querySelectorAll("video, audio");
  mediaElements.forEach(function(el) {
    el.pause();
  });
}

function bindAPODControls() {
  dom.apodGoBtn.addEventListener("click", function() {
    let date = dom.apodDateInput.value;
    if (!date) {
      showToast("⚠️ Please pick a date");
      return;
    }
    fetchAPOD(date);
  });
  
  dom.apodTodayBtn.addEventListener("click", function() {
    let todayStr = new Date().toISOString().slice(0, 10);
    dom.apodDateInput.value = todayStr;
    fetchAPOD();
  });
  
  dom.apodRandomBtn.addEventListener("click", function() {
    let start = new Date("1995-06-16").getTime();
    let end = new Date().getTime();
    let rand = new Date(start + Math.random() * (end - start));
    let dateStr = rand.toISOString().slice(0, 10);
    dom.apodDateInput.value = dateStr;
    fetchAPOD(dateStr);
  });
}

async function fetchAPOD(date) {
  dom.apodCard.innerHTML = '<div class="loader-wrap"><div class="loader"></div><p>Fetching cosmic wonder...</p></div>';
  state.apodHD = false;
  
  try {
    let url = CONFIG.APOD_API + "?api_key=" + CONFIG.NASA_API_KEY + "&thumbs=true";
    if (date) {
      url = url + "&date=" + date;
    }
    
    let res = await fetch(url);
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    
    let data = await res.json();
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
  let title = data.title;
  let date = data.date;
  let explanation = data.explanation;
  let url = data.url;
  let hdurl = data.hdurl;
  let media_type = data.media_type;
  let thumbnail_url = data.thumbnail_url;
  let copyright = data.copyright;
  
  let imgSrc;
  if (state.apodHD && hdurl) {
    imgSrc = hdurl;
  } else {
    imgSrc = url;
  }
  
  let apodId = "apod-" + date;
  let isSaved = isItemSaved(apodId);
  
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
      mediaHtml = '<div class="apod-iframe-wrap"><iframe src="' + url + '" allowfullscreen></iframe></div>';
    }
  } else {
    mediaHtml = '<img class="apod-media" src="' + imgSrc + '" alt="' + escHtml(title) + '" loading="lazy" />';
  }
  
  let copyrightHtml = "";
  if (copyright) {
    copyrightHtml = '<div class="apod-copyright"><i class="fas fa-user-astronaut"></i> © ' + escHtml(copyright.replace(/\n/g, " ")) + '</div>';
  }
  
  let fullResHtml = "";
  if (hdurl || url) {
    fullResHtml = '<a class="btn btn-primary" href="' + (hdurl || url) + '" target="_blank" rel="noopener"><i class="fas fa-expand"></i> Full Resolution</a>';
  }
  
  let hdBtnHtml = "";
  if (hdurl) {
    let hdClass = "hd-badge";
    if (state.apodHD) {
      hdClass = hdClass + " active";
    }
    hdBtnHtml = '<button class="' + hdClass + '" id="hdToggleBtn"><i class="fas fa-expand-arrows-alt" style="font-size:0.9em"></i> HD ' + (state.apodHD ? "ON" : "OFF") + '</button>';
  }
  
  let heartIcon = "fa" + (isSaved ? "s" : "r") + " fa-heart";
  let saveStyle = isSaved ? 'style="color:var(--accent3)"' : "";
  let saveBtnText = isSaved ? "Saved!" : "Save to Collection";
  
  dom.apodCard.innerHTML = `
    ${mediaHtml}
    <div class="apod-body">
      <div class="apod-meta">
        <div class="apod-date"><i class="fas fa-calendar-alt"></i> ${formatDate(date)}</div>
        ${copyrightHtml}
      </div>
      <h2 class="apod-title">${escHtml(title)}</h2>
      <p class="apod-desc">${escHtml(explanation)}</p>
      <div class="apod-actions">
        ${fullResHtml}
        ${hdBtnHtml}
        <button class="btn btn-ghost" id="apodSaveBtn">
          <i class="${heartIcon}" ${saveStyle}></i>
          ${saveBtnText}
        </button>
      </div>
    </div>
  `;
  
  let hdBtn = $("hdToggleBtn");
  if (hdBtn) {
    hdBtn.addEventListener("click", function() {
      state.apodHD = !state.apodHD;
      let img = dom.apodCard.querySelector(".apod-media");
      if (img) {
        if (state.apodHD && hdurl) {
          img.src = hdurl;
        } else {
          img.src = url;
        }
        
        if (state.apodHD) {
          showToast("🔭 HD image loaded");
        } else {
          showToast("📷 Standard image");
        }
      }
      
      hdBtn.classList.toggle("active", state.apodHD);
      hdBtn.innerHTML = '<i class="fas fa-expand-arrows-alt" style="font-size:0.9em"></i> HD ' + (state.apodHD ? "ON" : "OFF");
    });
  }
  
  let apodSaveBtn = $("apodSaveBtn");
  apodSaveBtn.addEventListener("click", function() {
    let apodItem = buildAPODSaveItem(data);
    let saved = isItemSaved(apodId);
    
    if (saved) {
      removeFromSaved(apodId);
      apodSaveBtn.innerHTML = '<i class="far fa-heart"></i> Save to Collection';
      showToast("💔 Removed from your collection");
    } else {
      saveItem(apodItem);
      apodSaveBtn.innerHTML = '<i class="fas fa-heart" style="color:var(--accent3)"></i> Saved!';
      showToast("❤️ APOD saved to your collection!");
    }
    
    updateSavedCount();
  });
}

function buildAPODSaveItem(data) {
  let item = {
    _apodItem: true,
    data: [{
      nasa_id: "apod-" + data.date,
      title: data.title,
      date_created: data.date,
      description: data.explanation,
      media_type: "video"
    }],
    links: [{ href: data.thumbnail_url || data.url, rel: "preview" }],
    _apodUrl: data.hdurl || data.url
  };
  
  if (data.media_type === "video") {
    item.data[0].media_type = "video";
  } else {
    item.data[0].media_type = "image";
  }
  
  return item;
}


function loadSavedItems() {
  let saved = localStorage.getItem("spaceExplorerSaved");
  
  if (saved === null) {
    state.savedItems = [];
  } else {
    try {
      state.savedItems = JSON.parse(saved);
    } catch (error) {
      state.savedItems = [];
    }
  }
}

function persistSavedItems() {
  localStorage.setItem("spaceExplorerSaved", JSON.stringify(state.savedItems));
}

function isItemSaved(nasaId) {
  let found = false;
  state.savedItems.forEach(function(item) {
    if (item.data && item.data[0] && item.data[0].nasa_id === nasaId) {
      found = true;
    }
  });
  return found;
}

function saveItem(item) {
  let nasaId = item.data[0].nasa_id;
  
  if (!isItemSaved(nasaId)) {
    let newArray = [item];
    state.savedItems.forEach(function(savedItem) {
      newArray.push(savedItem);
    });
    state.savedItems = newArray;
    persistSavedItems();
  }
}

function removeFromSaved(nasaId) {
  let newArray = [];
  
  state.savedItems.forEach(function(item) {
    if (item.data && item.data[0] && item.data[0].nasa_id !== nasaId) {
      newArray.push(item);
    }
  });
  
  state.savedItems = newArray;
  persistSavedItems();
}

//toogle Saved
function toggleSave(item, btnEl, isModalBtn) {
  let nasaId = item.data[0].nasa_id;
  let isSaved = isItemSaved(nasaId);
  
  if (isSaved) {
    removeFromSaved(nasaId);
    showToast("💔 Removed from your collection");
    
    if (!isModalBtn) {
      btnEl.classList.remove("saved");
      btnEl.innerHTML = '<i class="far fa-heart"></i>';
    }
    
    if (state.activeSection === "saved") {
      renderSavedGallery();
    }
  } else {
    saveItem(item);
    showToast("❤️ Saved to your collection!");
    
    if (!isModalBtn) {
      btnEl.classList.add("saved");
      btnEl.innerHTML = '<i class="fas fa-heart"></i>';
    }
  }
  
  updateSavedCount();
  
  let allBtns = document.querySelectorAll('.card-save-btn[data-nasa-id="' + nasaId + '"]');
  allBtns.forEach(function(b) {
    let nowSaved = isItemSaved(nasaId);
    
    if (nowSaved) {
      b.classList.add("saved");
      b.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
      b.classList.remove("saved");
      b.innerHTML = '<i class="far fa-heart"></i>';
    }
  });
}

function updateSavedCount() {
  let count = state.savedItems.length;
  dom.savedCount.textContent = count;
  
  if (count > 0) {
    dom.savedCount.classList.add("visible");
  } else {
    dom.savedCount.classList.remove("visible");
  }
}


function renderSavedGallery() {
  let children = Array.from(dom.savedGallery.children);
  children.forEach(function(child) {
    if (!child.classList.contains("empty-state")) {
      dom.savedGallery.removeChild(child);
    }
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

dom.clearSavedBtn.addEventListener("click", function() {
  let confirmClear = confirm("Are you sure you want to clear all saved items?");
  
  if (confirmClear) {
    state.savedItems = [];
    persistSavedItems();
    updateSavedCount();
    renderSavedGallery();
    showToast("🗑️ All saved items cleared");
    
    let allSaveBtns = document.querySelectorAll(".card-save-btn");
    allSaveBtns.forEach(function(b) {
      b.classList.remove("saved");
      b.innerHTML = '<i class="far fa-heart"></i>';
    });
  }
});


function bindFilters() {
  let filterBtns = document.querySelectorAll(".filter-btn");
  
  filterBtns.forEach(function(btn) {
    btn.addEventListener("click", function() {
      filterBtns.forEach(function(b) {
        b.classList.remove("active");
      });
      
      btn.classList.add("active");
      state.currentFilter = btn.dataset.filter;
      state.currentPage = 1;
      applyFilterSortAndRender();
    });
  });
}


function clearGallery() {
  let children = Array.from(dom.gallery.children);
  children.forEach(function(child) {
    if (!child.classList.contains("empty-state")) {
      dom.gallery.removeChild(child);
    }
  });
  
  dom.emptyState.style.display = "flex";
  dom.emptyState.innerHTML = '<i class="fas fa-satellite-dish"></i><p>Scanning the cosmos...</p>';
  dom.loadMoreContainer.style.display = "none";
  dom.resultsInfo.textContent = "";
}

function showEmptyState(container, el, message) {
  el.style.display = "flex";
  el.innerHTML = '<i class="fas fa-meteor"></i><p>' + message + '</p>';
}

function showLoading(show) {
  state.isLoading = show;
  
  if (show) {
    dom.loadingOverlay.classList.add("show");
  } else {
    dom.loadingOverlay.classList.remove("show");
  }
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  
  if (dom.toast._timer) {
    clearTimeout(dom.toast._timer);
  }
  
  dom.toast._timer = setTimeout(function() {
    dom.toast.classList.remove("show");
  }, 3200);
}

function formatDate(dateStr) {
  if (!dateStr) {
    return "Date unknown";
  }
  
  try {
    let date = new Date(dateStr);
    let options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  } catch (error) {
    return dateStr;
  }
}

function escHtml(str) {
  if (!str) {
    return "";
  }
  
  let result = String(str);
  result = result.replace(/&/g, "&amp;");
  result = result.replace(/</g, "&lt;");
  result = result.replace(/>/g, "&gt;");
  result = result.replace(/"/g, "&quot;");
  result = result.replace(/'/g, "&#039;");
  
  return result;
}