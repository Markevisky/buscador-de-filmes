const API_KEY = "2d2abec9";

const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const results = document.getElementById("results");
const favoritesList = document.getElementById("favoritesList");
const favoritesBtn = document.getElementById("favoritesBtn");
const favoritesSection = document.querySelector(".favorites");
const resultsSection = document.getElementById("results");

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

// Renderiza favoritos ao carregar
document.addEventListener("DOMContentLoaded", renderFavorites);

// ================= BUSCA NORMAL =================
searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (!query) return;
  fetchMovies(query);
});

async function fetchMovies(query) {
  results.innerHTML = "<p>Carregando...</p>";
  showResultsSection();
  hideFavoritesSection();

  try {
    const response = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}`
    );
    const data = await response.json();

    if (data.Response === "True") {
      await displayMovies(data.Search);
    } else {
      results.innerHTML = `<p>Nenhum filme encontrado para "${query}".</p>`;
    }
  } catch (err) {
    results.innerHTML = "<p>Erro ao buscar filmes.</p>";
    console.error(err);
  }
}

// ================= FILTRAGEM DE POSTERS =================
function checkPoster(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// ================= EXIBIÇÃO DOS FILMES =================
async function displayMovies(movies) {
  results.innerHTML = "";
  const moviesWithValidPoster = [];

  for (const movie of movies) {
    if (!movie.Poster || movie.Poster === "N/A") continue;
    const isValid = await checkPoster(movie.Poster);
    if (isValid) moviesWithValidPoster.push(movie);
  }

  if (moviesWithValidPoster.length === 0) {
    results.innerHTML = "<p>Nenhum filme com poster disponível.</p>";
    return;
  }

  moviesWithValidPoster.forEach((movie) => {
    const card = createMovieCard(movie, true);
    results.appendChild(card);
  });

  lazyLoadImages();
}

// ================= FAVORITOS =================
function renderFavorites() {
  favoritesList.innerHTML = "";
  favorites.forEach((movie) => {
    const card = createMovieCard(movie, false);
    favoritesList.appendChild(card);
  });
  lazyLoadImages();
}

function addFavorite(movie) {
  if (!favorites.some((fav) => fav.imdbID === movie.imdbID)) {
    favorites.push(movie);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
    showFavoriteConfirmation(`✨ "${movie.Title}" adicionado aos favoritos!`);
  } else {
    showFavoriteConfirmation(`⚠️ "${movie.Title}" já está nos favoritos.`);
  }
}

function removeFavorite(id) {
  favorites = favorites.filter((m) => m.imdbID !== id);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderFavorites();
}

// ================= CRIAÇÃO DOS CARDS =================
function createMovieCard(movie, isSearchResult) {
  const card = document.createElement("div");
  card.classList.add("movie-card");

  const poster = createPoster(movie);
  const title = document.createElement("h3");
  title.textContent = movie.Title;

  const year = document.createElement("p");
  year.textContent = movie.Year;

  const button = document.createElement("button");
  button.classList.add("favorite-btn");

  if (isSearchResult) {
    button.textContent = "Favoritar";
    button.onclick = () => addFavorite(movie);
  } else {
    button.textContent = "🗑️ Remover";
    button.onclick = () => removeFavorite(movie.imdbID);
  }

  card.append(poster, title, button);
  if (isSearchResult) card.appendChild(year);
  return card;
}

function createPoster(movie) {
  const poster = document.createElement("img");
  const src =
    movie.Poster && movie.Poster !== "N/A"
      ? movie.Poster
      : "assets/placeholder.jpg";
  poster.dataset.src = src;
  poster.loading = "lazy";

  poster.addEventListener("click", () => showOverlay(movie.imdbID));
  return poster;
}

// ================= DETALHES DO FILME (OVERLAY) =================
async function showOverlay(imdbID) {
  const prevResultsDisplay =
    results.style.display || getComputedStyle(results).display;
  const prevFavoritesDisplay =
    favoritesSection.style.display || getComputedStyle(favoritesSection).display;

  hideResultsSection();
  hideFavoritesSection();

  try {
    const response = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}`
    );
    const details = await response.json();

    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✖";
    closeBtn.classList.add("close-btn");

    function restorePreviousView() {
      overlay.remove();
      if (prevFavoritesDisplay !== "none") {
        favoritesSection.style.display = prevFavoritesDisplay;
        renderFavorites();
      } else {
        results.style.display = prevResultsDisplay;
      }
      lazyLoadImages();
    }

    closeBtn.onclick = restorePreviousView;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) restorePreviousView();
    });

    const info = document.createElement("div");
    info.classList.add("overlay-content");
    info.innerHTML = `
      <h2>${details.Title}</h2>
      <img src="${
        details.Poster !== "N/A"
          ? details.Poster
          : "assets/placeholder.jpg"
      }" alt="${details.Title}" />
      <h4><strong>Gênero:</strong> ${details.Genre}</h4>
      <h4><strong>Diretor:</strong> ${details.Director}</h4>
      <h4><strong>Atores:</strong> ${details.Actors}</h4>
      <h4><strong>Sinopse:</strong> ${details.Plot}</h4>
      <h4><strong>Ano:</strong> ${details.Year}</h4>
      <h4><strong>Duração:</strong> ${details.Runtime}</h4>
      <h4><strong>Nota IMDb:</strong> ${details.imdbRating}</h4>
    `;

    overlay.append(closeBtn, info);
    document.body.appendChild(overlay);
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar detalhes do filme.");
  }
}

// ================= LAZY LOAD =================
function lazyLoadImages() {
  const images = document.querySelectorAll("img[data-src]");
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        obs.unobserve(img);
      }
    });
  });
  images.forEach((img) => observer.observe(img));
}

// ================= EXIBIÇÃO/OCULTAÇÃO =================
function showResultsSection() {
  results.style.display = "flex";
}
function hideResultsSection() {
  results.style.display = "none";
}
function showFavoritesSection() {
  favoritesSection.style.display = "block";
}
function hideFavoritesSection() {
  favoritesSection.style.display = "none";
}

// ================= BOTÃO DE FAVORITOS =================
favoritesBtn.addEventListener("click", () => {
  const isVisible = favoritesSection.style.display === "block";

  if (isVisible) {
    hideFavoritesSection();
    showResultsSection();
  } else {
    showFavoritesSection();
    hideResultsSection();
    renderFavorites();
  }
});

// ============== CONFIRMAÇÃO DE FAVORITOS ==============

function showFavoriteConfirmation(message) {
  const confirmation = document.createElement("div");
  confirmation.classList.add("favorite-confirmation");
  confirmation.textContent = message;

  document.body.appendChild(confirmation);

  // força o reflow e adiciona a classe para animar
  requestAnimationFrame(() => {
    confirmation.classList.add("show");
  });

  // remove após 2 segundos
  setTimeout(() => {
    confirmation.classList.remove("show");
    setTimeout(() => confirmation.remove(), 300); // espera a animação de saída
  }, 2000);
}

// ================= BUSCA RÁPIDA =================
const marvelMap = {
  "The Avengers": "The Avengers",
  "Avengers: Age of Ultron": "Avengers: Age of Ultron",
  "Avengers: Infinity War": "Avengers: Infinity War",
  "Avengers: Endgame": "Avengers: Endgame",
  "Thor": "Thor",
  "Thor: Ragnarok": "Thor: Ragnarok",
  "Spider-Man: No Way Home": "Spider-Man: No Way Home",
  "Spider-Man: Across the Spider-Verse": "Spider-Man: Across the Spider-Verse",
};

const netflixMap = {
  "Aftersun": "Aftersun",
  "Nonnas": "Nonnas",
  "Alerta Vermelho": "Red Notice",
  "De volta a ação": "Back in Action",
  "A Sociedade da Neve": "Society of the Snow",
  "Camaleões": "Reptile",
  "Druk - Mais Uma Rodada": "Another Round",
  "Leo": "Leo",
};

const hboMap = {
  "Barbie": "Barbie",
  "Wonka": "Wonka",
  "Adão Negro": "Black Adam",
  "Elvis": "Elvis",
  "Duna": "Duna",
  "Godzilla Vs Kong": "Godzilla Vs Kong",
  "Space Jam": "Space Jam",
  "Mulher-Maravilha": "Wonder Woman",
};

// Marvel
document.querySelectorAll("#topo-fixo nav .menu-item:nth-child(2) .dropdown li")
  .forEach(li => {
    li.addEventListener("click", () => {
      const term = marvelMap[li.textContent];
      if (term) searchByTerm(term);
    });
  });

// Netflix
document.querySelectorAll("#topo-fixo nav .menu-item:nth-child(3) .dropdown li")
  .forEach(li => {
    li.addEventListener("click", () => {
      const term = netflixMap[li.textContent];
      if (term) searchByTerm(term);
    });
  });

// HBO
document.querySelectorAll("#topo-fixo nav .menu-item:nth-child(4) .dropdown li")
  .forEach(li => {
    li.addEventListener("click", () => {
      const term = hboMap[li.textContent];
      if (term) searchByTerm(term);
    });
  });

// ================= FUNÇÃO DE BUSCA RÁPIDA =================
async function searchByTerm(term) {
  results.innerHTML = "<p>Carregando...</p>";
  showResultsSection();
  hideFavoritesSection();

  try {
    const response = await fetch(
      `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(term)}`
    );
    const data = await response.json();

    if (data.Response === "True") {
      await displayMovies(data.Search);
    } else {
      results.innerHTML = `<p>Nenhum resultado para "${term}".</p>`;
    }
  } catch (err) {
    results.innerHTML = "<p>Erro ao buscar filmes.</p>";
    console.error(err);
  }
}
