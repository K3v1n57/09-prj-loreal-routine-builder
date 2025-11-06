/* ---------- DOM References ---------- */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* ---------- State ---------- */
let allProducts = [];
let selectedProducts = JSON.parse(localStorage.getItem("selectedProducts")) || [];
let messages = []; // chat history for context memory

/* ---------- Load Product Data ---------- */
async function loadProducts() {
  try {
    const res = await fetch("products.json");
    const data = await res.json();
    allProducts = data.products;
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

/* ---------- Display Products ---------- */
function displayProducts(products) {
  if (!products.length) {
    productsContainer.innerHTML = `<div class="placeholder-message">No products in this category.</div>`;
    return;
  }

  productsContainer.innerHTML = products
    .map((p) => {
      const isSelected = selectedProducts.find((sp) => sp.id === p.id);
      return `
      <div class="product-card ${isSelected ? "selected" : ""}" data-id="${p.id}">
        <img src="${p.image}" alt="${p.name}" />
        <div class="product-info">
          <h3>${p.name}</h3>
          <p>${p.brand}</p>
          <button class="desc-btn" aria-label="Toggle description">Details</button>
          <div class="product-desc hidden">${p.description}</div>
        </div>
      </div>`;
    })
    .join("");

  addProductListeners();
}

/* ---------- Add Card Listeners ---------- */
function addProductListeners() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const id = parseInt(card.dataset.id);

    // Select/unselect product
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("desc-btn")) return; // Skip description clicks
      toggleProduct(id);
    });

    // Show/hide description
    const descBtn = card.querySelector(".desc-btn");
    descBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const desc = card.querySelector(".product-desc");
      desc.classList.toggle("hidden");
    });
  });
}

/* ---------- Toggle Product Selection ---------- */
function toggleProduct(id) {
  const product = allProducts.find((p) => p.id === id);
  const exists = selectedProducts.find((sp) => sp.id === id);

  if (exists) {
    selectedProducts = selectedProducts.filter((sp) => sp.id !== id);
  } else {
    selectedProducts.push(product);
  }

  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
  updateSelectedList();

  // Refresh product display with highlights
  const currentCategory = categoryFilter.value;
  if (currentCategory) {
    const filtered = allProducts.filter((p) => p.category === currentCategory);
    displayProducts(filtered);
  }
}

/* ---------- Update Selected Products List ---------- */
function updateSelectedList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `<p>No products selected yet.</p>`;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (p) => `
      <div class="chip">
        ${p.name}
        <button class="remove-chip" data-id="${p.id}">&times;</button>
      </div>`
    )
    .join("");

  document.querySelectorAll(".remove-chip").forEach((btn) => {
    btn.addEventListener("click", () => toggleProduct(parseInt(btn.dataset.id)));
  });
}

/* ---------- Category Filter ---------- */
categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;
  const filtered = allProducts.filter((p) => p.category === selectedCategory);
  displayProducts(filtered);
});

/* ---------- Generate Routine ---------- */
generateBtn.addEventListener("click", async () => {
  if (!selectedProducts.length) {
    appendMessage("bot", "Please select at least one product before generating your routine!");
    return;
  }

  appendMessage("user", "Generate my skincare routine");
  appendMessage("bot", "Working on your personalized routine...");

  const routinePrompt = `
You are a professional skincare advisor for L'Oréal.
Using these selected products, create a personalized skincare routine.
Products: ${selectedProducts.map((p) => p.name).join(", ")}.
Describe the order of use, time of day (AM/PM), and quick skincare tips.
`;

  messages.push({ role: "user", content: routinePrompt });

  try {
    const response = await fetch("https://ai-chatbot.gyeninkk.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No AI response received.";
    appendMessage("bot", reply);
    messages.push({ role: "assistant", content: reply });
  } catch (err) {
    console.error(err);
    appendMessage("bot", "Error generating routine. Check your API or Worker setup.");
  }
});

/* ---------- Chat Form Submit ---------- */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  userInput.value = "";

  messages.push({ role: "user", content: text });

  try {
    const response = await fetch("https://your-cloudflare-worker-url.workers.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "No AI reply.";
    appendMessage("bot", reply);
    messages.push({ role: "assistant", content: reply });
  } catch (err) {
    console.error(err);
    appendMessage("bot", "Error connecting to AI service.");
  }
});

/* ---------- Chat Display Helper ---------- */
function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("chat-message", sender);
  div.innerHTML = `<strong>${sender === "user" ? "You" : "Bot"}:</strong> ${text}`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ---------- Initialization ---------- */
(async function init() {
  await loadProducts();
  updateSelectedList();

  if (selectedProducts.length) {
    appendMessage("bot", "Welcome back! Your saved products are still selected.");
  } else {
    appendMessage("bot", "Hello! Select a category to start exploring L’Oréal products.");
  }
})();
