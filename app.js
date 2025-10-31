// app.js — updated (search, history, clear button, safe regex, favorites/history/nav)
//
// Drop-in replace for your current app.js. Keeps your existing HTML/CSS.
// Notes: escapes regex for user input to avoid scrambled/highlight issues.

let medicines = [];
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];

// 🧠 Icons map (unchanged)
const sideEffectIcons = {
  "Nausea": "fas fa-dizzy",
  "Stomach pain": "fas fa-stomach",
  "Heartburn": "fas fa-fire-alt",
  "Dizziness": "fas fa-head-side-mask",
  "Allergic rash": "fas fa-allergies",
  "Liver damage": "fas fa-lungs",
  "Drowsiness": "fas fa-bed",
  "Dry mouth": "fas fa-frown",
  "Fatigue": "fas fa-tired",
  "Headache": "fas fa-head-side-mask",
  "Vomiting": "fas fa-poop",
  "Diarrhea": "fas fa-toilet",
  "Constipation": "fas fa-box",
  "Insomnia": "fas fa-moon",
  "Blurred vision": "fas fa-eye",
  "Muscle pain": "fas fa-hand-fist",
  "Cough": "fas fa-lungs"
};

// 🔗 DOM
const searchInput = document.getElementById("search");
const micIcon = document.getElementById("mic-icon");
const getStartedBtn = document.getElementById("get-started-btn");
const welcomeScreen = document.getElementById("welcome-screen");
const medicineDetailsView = document.getElementById("medicine-details-view");
const searchSuggestions = document.getElementById("search-suggestions");
const content = document.querySelector(".content");
const navItems = document.querySelectorAll(".nav-item");

getStartedBtn.addEventListener("click", () => {
  // act just like tapping search bar
  welcomeScreen.style.display = "none";
  searchInput.focus();
  renderHistoryPreview(); // show recent searches (like tapping bar)
});

// create & inject clear button (×) inside .search-bar if not in HTML
const clearBtn = document.getElementById("clear-btn");

// NOTE: Assuming clearBtn is now defined in index.html, no need to create/inject.
// -------------------- utilities --------------------
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function saveHistory() {
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
}

// safe function used by history buttons
function searchMedicine(name) {
  if (!name) return;
  searchInput.value = name;
  performSearch(name);
  hideDropdowns();
}

// hide suggestions/history dropdown
function hideDropdowns() {
  searchSuggestions.style.display = "none";
  clearBtn.style.display = searchInput.value ? "inline-block" : "none";
}

// show welcome
function showWelcomeScreen() {
  welcomeScreen.style.display = "flex";
  medicineDetailsView.style.display = "none";
  content.innerHTML = "";
  content.appendChild(welcomeScreen);
  hideDropdowns();
}

// -------------------- load medicines --------------------
fetch("medicines.json")
  .then(res => res.json())
  .then(data => {
    medicines = data;
    showWelcomeScreen();
  })
  .catch(err => {
    console.error("Error loading medicines:", err);
    showWelcomeScreen();
  });

// -------------------- history functions --------------------
function addToHistory(medName) {
  if (!medName) return;
  // normalize
  medName = medName.trim();
  searchHistory = searchHistory.filter(x => x.toLowerCase() !== medName.toLowerCase());
  searchHistory.unshift(medName);
  if (searchHistory.length > 10) searchHistory.pop();
  saveHistory();
}

function getRecentHistory(limit = 4) {
  return (searchHistory || []).slice(0, limit);
}

function renderHistoryPreview() {
  // used when input is empty and search bar focused
  searchSuggestions.innerHTML = "";
  const recent = getRecentHistory(4);
  if (recent.length === 0) {
    searchSuggestions.style.display = "none";
    return;
  }
  recent.forEach(item => {
    const div = document.createElement("div");
    div.className = "search-suggestion-item dropdown-item";
    div.innerHTML = `<i class="fas fa-history"></i> ${item}`;
    div.onclick = () => searchMedicine(item);
    searchSuggestions.appendChild(div);
  });
  // show small "clear preview" row at bottom
  const clearRow = document.createElement("div");
  clearRow.className = "search-suggestion-item dropdown-item";
  clearRow.style.justifyContent = "center";
  clearRow.innerHTML = `<button class="clear-history-small" style="border:none;background:#ff4b5c;color:#fff;padding:6px 12px;border-radius:8px;cursor:pointer;">Clear recent</button>`;
  clearRow.querySelector("button").onclick = (e) => {
    e.stopPropagation();
    searchHistory = [];
    saveHistory();
    renderHistoryPreview();
  };
  searchSuggestions.appendChild(clearRow);
  searchSuggestions.style.display = "block";
}

// -------------------- search logic --------------------
function performSearch(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) {
    showWelcomeScreen();
    return;
  }

  // 🔍 Direct match
  let matched = medicines.find(m => m.name.toLowerCase() === q);

  // 🔍 If not found, check aliases (otherNames)
  if (!matched) {
    matched = medicines.find(m =>
      (m.otherNames || []).some(alias => alias.toLowerCase() === q)
    );
  }

  // 🔍 If still not found, try partial match in names
  if (!matched) {
    matched = medicines.find(m =>
      m.name.toLowerCase().includes(q) ||
      (m.otherNames || []).some(alias => alias.toLowerCase().includes(q))
    );
  }

  if (matched) {
    showMedicineDetails(matched);
  } else {
    alert("No medicine found for: " + query);
  }
}


function renderSuggestions(query) {
  searchSuggestions.innerHTML = "";
  const q = (query || "").trim();
  if (!q) {
    searchSuggestions.style.display = "none";
    return;
  }

  const safe = escapeRegex(q);
  const matched = medicines.filter(m => m.name.toLowerCase().includes(q.toLowerCase()));
  if (matched.length === 0) {
    searchSuggestions.style.display = "none";
    return;
  }

  matched.slice(0, 6).forEach(med => {
    const item = document.createElement("div");
    item.className = "search-suggestion-item dropdown-item";
    // highlight match safely
    const regex = new RegExp(`(${safe})`, "ig");
    const labelHTML = med.name.replace(regex, "<strong>$1</strong>");
    item.innerHTML = `<i class="fas fa-pills"></i> ${labelHTML}`;
    item.onclick = () => {
      searchInput.value = med.name;
      hideDropdowns();
      showMedicineDetails(med);
    };
    searchSuggestions.appendChild(item);
  });

  // show small "see more" row if more results exist
  if (matched.length > 6) {
    const more = document.createElement("div");
    more.className = "search-suggestion-item dropdown-item";
    more.style.justifyContent = "center";
    more.innerHTML = `<small>Show more results...</small>`;
    searchSuggestions.appendChild(more);
  }

  searchSuggestions.style.display = "block";
}

// -------------------- event listeners --------------------

// input typing → suggestions
searchInput.addEventListener("input", (e) => {
  const q = e.target.value || "";
  clearBtn.style.display = q.trim() ? "inline-block" : "none";

  if (!q.trim()) {
    // if empty, show recent preview on focus only; hide otherwise
    searchSuggestions.style.display = "none";
    return;
  }
  renderSuggestions(q);
});

// on focus → show recent history preview when empty
searchInput.addEventListener("focus", () => {
  const q = searchInput.value || "";
  if (!q.trim()) {
    renderHistoryPreview();
  }
});

// on blur → hide suggestions after short delay (allows click handler)
searchInput.addEventListener("blur", () => {
  setTimeout(() => {
    hideDropdowns();
  }, 180);
});

// Enter key → search (Home fallback)
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) {
      showWelcomeScreen();
      return;
    }
    performSearch(q);
    hideDropdowns();
  }
});

// clear button behaviour
clearBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  searchInput.value = "";
  searchSuggestions.innerHTML = "";
  searchSuggestions.style.display = "none";
  clearBtn.style.display = "none";
  searchInput.focus();
});

// mic icon clears (existing behaviour)
if (micIcon) {
  micIcon.addEventListener("click", () => {
    searchInput.value = "";
    searchSuggestions.style.display = "none";
    clearBtn.style.display = "none";
    searchInput.focus();
  });
}

// -------------------- medicine details --------------------
function showMedicineDetails(medicine) {
  if (!medicine) return;
  welcomeScreen.style.display = "none";
  medicineDetailsView.style.display = "block";

  // render into .content (replace content)
  content.innerHTML = "";
  content.appendChild(medicineDetailsView);

  const isFav = favorites.some(f => f.name === medicine.name);
  addToHistory(medicine.name);

  const sideEffectsHtml = (medicine.sideEffects || []).map(effect => `
    <div class="side-effect-card">
      <i class="${sideEffectIcons[effect] || 'fas fa-question-circle'} side-effect-icon"></i>
      <p>${effect}</p>
    </div>
  `).join("");

  medicineDetailsView.innerHTML = `
    <div class="medicine-card">
      <button id="fav-btn" class="fav-btn ${isFav ? 'active' : ''}" title="Add to favorites">
        <i class="fas fa-heart"></i>
      </button>

      <div class="medicine-header">
        <h2>${medicine.name}</h2>
      </div>

      <div class="details-section">
        <p><strong>Uses:</strong> ${medicine.uses || "-"}</p>
        <p><strong>Ingredients:</strong> ${Array.isArray(medicine.ingredients) ? medicine.ingredients.join(", ") : (medicine.ingredients || "-")}</p>
      </div>

      ${medicine.dosage ? `
        <h3 class="section-title">Recommended Dosage</h3>
        <div class="dosage-section">
          <div class="dosage-card adult">
            <div class="dosage-icon adult-icon"></div>
            <h4>Adults</h4>
            <p><strong>Amount:</strong> ${medicine.dosage.adult.amount}</p>
            <p><strong>Interval:</strong> ${medicine.dosage.adult.interval}</p>
            <p><strong>Max per Day:</strong> ${medicine.dosage.adult.maxPerDay}</p>
          </div>
          <div class="dosage-card child">
            <div class="dosage-icon child-icon"></div>
            <h4>Children</h4>
            <p><strong>Amount:</strong> ${medicine.dosage.child.amount}</p>
            <p><strong>Interval:</strong> ${medicine.dosage.child.interval}</p>
            <p><strong>Max per Day:</strong> ${medicine.dosage.child.maxPerDay}</p>
          </div>
        </div>
      ` : ""}

      <h3 class="section-title">Potential Side Effects</h3>
      <div class="side-effects-grid">
        ${sideEffectsHtml}
      </div>
    </div>
  `;

  // fav button handler
  const favBtn = document.getElementById("fav-btn");
  favBtn.addEventListener("click", () => toggleFavorite(medicine, favBtn));
}

// -------------------- favorites --------------------
function toggleFavorite(medicine, favBtn) {
  const exists = favorites.find(f => f.name === medicine.name);
  if (exists) {
    favorites = favorites.filter(f => f.name !== medicine.name);
    favBtn.classList.remove("active");
  } else {
    favorites.push(medicine);
    favBtn.classList.add("active");
  }
  saveFavorites();
}

// show favorites page
function showFavorites() {
  content.innerHTML = `<h2 class="fav-title">❤️ Your Favorites</h2>`;
  if (!favorites.length) {
    content.innerHTML += `<p class="no-fav">No favorites added yet.</p>`;
    return;
  }
  const favGrid = document.createElement("div");
  favGrid.className = "side-effects-grid";
  favorites.forEach(med => {
    // find full record if possible
    const full = medicines.find(x => x.name === med.name) || med;
    const card = document.createElement("div");
    card.className = "side-effect-card";
    card.innerHTML = `<div class="fav-card-content"><p class="fav-name">${full.name}</p></div>`;
    card.onclick = () => showMedicineDetails(full);
    favGrid.appendChild(card);
  });
  content.appendChild(favGrid);
}
//mic
// 🎙️ Voice Search Feature
// micIcon already declared above; reuse the existing variable
// Remove duplicate declaration of searchInput

if ("webkitSpeechRecognition" in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-IN";
  recognition.continuous = false;
  recognition.interimResults = false;

  micIcon.addEventListener("click", () => {
    recognition.start();
    micIcon.classList.add("listening");
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    searchInput.value = transcript;
    searchInput.dispatchEvent(new Event("input")); // trigger search
  };

  recognition.onerror = () => {
    alert("Voice recognition error. Please try again.");
  };

  recognition.onend = () => {
    micIcon.classList.remove("listening");
  };
} else {
  micIcon.addEventListener("click", () => {
    alert("Speech recognition not supported in this browser.");
  });
}

// -------------------- full history page --------------------
function showFullHistory() {
  content.innerHTML = `
    <div class="history-page">
      <div class="history-header">
        <h2>🔍 Search History</h2>
        <button id="clear-history-btn" class="clear-history-btn">Clear All</button>
      </div>
      <div id="history-list"></div>
    </div>
  `;

  const historyList = document.getElementById("history-list");
  if (!searchHistory.length) {
    historyList.innerHTML = "<p>No history yet.</p>";
    document.getElementById("clear-history-btn").style.display = "none";
    return;
  }

  searchHistory.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<span>${item}</span><i class="fas fa-arrow-right"></i>`;
    div.onclick = () => {
      searchInput.value = item;
      performSearch(item);
    };
    historyList.appendChild(div);
  });

  document.getElementById("clear-history-btn").addEventListener("click", () => {
    if (!confirm("Clear all search history?")) return;
    searchHistory = [];
    saveHistory();
    showFullHistory();
  });
}

// -------------------- nav handling --------------------
navItems.forEach(item => {
  item.addEventListener("click", () => {
    navItems.forEach(n => n.classList.remove("active-nav"));
    item.classList.add("active-nav");

    const label = (item.querySelector("p") || {}).textContent || "";
    if (label.trim() === "Home") showWelcomeScreen();
    else if (label.trim() === "Favorites") showFavorites();
    else if (label.trim() === "History") showFullHistory();
  });
});

// -------------------- start --------------------
if (getStartedBtn) getStartedBtn.addEventListener("click", showWelcomeScreen);

// Small helper to hide dropdowns on outside click
document.addEventListener("click", (e) => {
  const inSearch = e.target.closest(".search-bar") || e.target.closest("#search-suggestions");
  if (!inSearch) hideDropdowns();
});

// Export small API (optional)
window.appAPI = {
  searchMedicine,
  showFullHistory,
  showFavorites,
  showWelcomeScreen
};
// -------------------- OCR Integration --------------------
// -------------------- OCR Integration (Smart Filter) --------------------
const ocrBtn = document.getElementById("ocr-btn");
const ocrInput = document.getElementById("ocr-image");

const medicinePriorityList = [
  "Paracetamol", "Ibuprofen", "Cetirizine", "Amoxicillin", "Azithromycin",
  "Dolo", "Crocin", "Panadol", "Calpol", "Metformin",
  "Pantoprazole", "Omeprazole", "Cetrizine", "Aspirin", "Diclofenac",
  "Losartan", "Amlodipine", "Atorvastatin", "Levocetirizine", "Ranitidine"
];

const ignoreWords = [
  "Tablet", "Tablets", "Capsule", "Capsules", "Strip", "Syrup", "Injection",
  "Suspension", "Dose", "For", "Use", "Mg", "Ml", "Each", "Contains"
];

ocrBtn.addEventListener("click", () => {
  ocrInput.click();
});

ocrInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("apikey", "02de19fdfa88957"); // your OCR.space API key
  formData.append("language", "eng");
  formData.append("isOverlayRequired", "false");
  formData.append("file", file);

  // show spinner while processing
  ocrBtn.disabled = true;
  const originalHTML = ocrBtn.innerHTML;
  ocrBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i>`;

  try {
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    const text = data?.ParsedResults?.[0]?.ParsedText || "";
    if (!text.trim()) {
      alert("No readable text found in image.");
      return;
    }

    console.log("🩺 OCR Raw:", text);

    // Clean and normalize words
    const words = text
      .replace(/[^A-Za-z0-9\s]/g, " ")
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 2 && w.length < 20)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .filter(w => !ignoreWords.includes(w));

    console.log("💊 Filtered Words:", words);

    // Look for a medicine in the priority list
    let probableMed = words.find(w => medicinePriorityList.includes(w));

    // If no direct match, find one that ends with "mg" or number combo
    if (!probableMed) {
      probableMed = words.find((w, i) => /\d+mg/i.test(words[i + 1] || ""));
      if (probableMed) probableMed += " " + (words[words.indexOf(probableMed) + 1] || "");
    }

    // If still nothing, fallback to first valid word
    if (!probableMed && words.length) probableMed = words[0];

    if (probableMed) {
      searchInput.value = probableMed;
      searchInput.dispatchEvent(new Event("input")); // show clear button
      performSearch(probableMed);
    } else {
      alert("No valid medicine name detected.");
    }
  } catch (err) {
    console.error("OCR error:", err);
    alert("Failed to extract text. Try again.");
  } finally {
    ocrBtn.disabled = false;
    ocrBtn.innerHTML = originalHTML;
  }
});


