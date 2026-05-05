const $ = (id) => document.getElementById(id);

const THEME_KEY = "lab3-theme";

function setTheme(mode) {
  const isLight = mode === "light";
  document.body.setAttribute("data-theme", isLight ? "light" : "dark");
  const icon = $("themeToggleIcon");
  const text = $("themeToggleText");
  if (icon) icon.textContent = isLight ? "Light" : "Dark";
  if (text) text.textContent = isLight ? "Светлая" : "Темная";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const preferredDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved || (preferredDark ? "dark" : "light"));

  const toggle = $("themeToggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });
}

function isAdmin() {
  return $("adminMode").checked;
}

function headers(json = true) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (isAdmin()) h["x-role"] = "admin";
  return h;
}

function showToast(message, ok = true) {
  const el = $("toast");
  el.textContent = message;
  el.className = `toast ${ok ? "ok" : "err"}`;
  setTimeout(() => (el.className = "toast hidden"), 3000);
}

async function api(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Ошибка ${res.status}`);
  }
  return data;
}

function renderList(el, rows, mapper) {
  el.innerHTML = "";
  if (!rows.length) {
    el.innerHTML = "<li>Нет данных</li>";
    return;
  }
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.textContent = mapper(row);
    el.appendChild(li);
  });
}

async function loadCategories() {
  const rows = await api("/api/v1/categories");
  renderList($("categoriesList"), rows, (x) => `#${x.category_id} - ${x.name}`);
}

async function loadManufacturers() {
  const rows = await api("/api/v1/manufacturers");
  renderList($("manufacturersList"), rows, (x) => `#${x.manufacturer_id} - ${x.name}${x.country ? ` (${x.country})` : ""}`);
}

async function loadComponents() {
  const rows = await api("/api/v1/components");
  renderList(
    $("componentsList"),
    rows,
    (x) => `#${x.component_id} - ${x.name} ${x.model || ""} | SKU: ${x.sku} | ${x.price} руб.`
  );
}

function formData(form) {
  const data = {};
  for (const [k, v] of new FormData(form).entries()) {
    data[k] = v.toString().trim();
  }
  return data;
}

$("btnSeedHint").addEventListener("click", () => $("hint").classList.toggle("hidden"));
$("loadCategories").addEventListener("click", () => loadCategories().catch((e) => showToast(e.message, false)));
$("loadManufacturers").addEventListener("click", () => loadManufacturers().catch((e) => showToast(e.message, false)));
$("loadComponents").addEventListener("click", () => loadComponents().catch((e) => showToast(e.message, false)));

$("btnLoadAll").addEventListener("click", async () => {
  try {
    await Promise.all([loadCategories(), loadManufacturers(), loadComponents()]);
    showToast("Списки обновлены");
  } catch (e) {
    showToast(e.message, false);
  }
});

$("categoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    const payload = { name: d.name, parent_id: d.parent_id ? Number(d.parent_id) : null };
    await api("/api/v1/categories", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
    e.target.reset();
    await loadCategories();
    showToast("Категория добавлена");
  } catch (err) {
    showToast(err.message, false);
  }
});

$("manufacturerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    await api("/api/v1/manufacturers", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: d.name, country: d.country || null })
    });
    e.target.reset();
    await loadManufacturers();
    showToast("Производитель добавлен");
  } catch (err) {
    showToast(err.message, false);
  }
});

$("componentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    const payload = {
      category_id: Number(d.category_id),
      manufacturer_id: Number(d.manufacturer_id),
      name: d.name,
      model: d.model || null,
      sku: d.sku,
      price: Number(d.price),
      warranty_months: d.warranty_months ? Number(d.warranty_months) : null,
      description: d.description || null
    };
    await api("/api/v1/components", { method: "POST", headers: headers(), body: JSON.stringify(payload) });
    e.target.reset();
    await loadComponents();
    showToast("Товар добавлен");
  } catch (err) {
    showToast(err.message, false);
  }
});

$("stockForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    const data = await api(`/api/v1/components/${Number(d.component_id)}/stock`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ quantity: Number(d.quantity) })
    });
    $("stockResult").textContent = JSON.stringify(data, null, 2);
    showToast("Остаток обновлен");
  } catch (err) {
    showToast(err.message, false);
  }
});

$("stockGetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    const data = await api(`/api/v1/components/${Number(d.component_id)}/stock`);
    $("stockResult").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    showToast(err.message, false);
  }
});

$("specForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    await api("/api/v1/specs", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ name: d.name })
    });
    e.target.reset();
    showToast("Характеристика добавлена");
  } catch (err) {
    showToast(err.message, false);
  }
});

$("componentSpecForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    await api(`/api/v1/components/${Number(d.component_id)}/specs`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ spec_id: Number(d.spec_id), value: d.value })
    });
    e.target.reset();
    showToast("Характеристика привязана к товару");
  } catch (err) {
    showToast(err.message, false);
  }
});

$("componentSpecGetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const d = formData(e.target);
    const data = await api(`/api/v1/components/${Number(d.component_id)}/specs`);
    $("specResult").textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    showToast(err.message, false);
  }
});

const docsFrameWrap = $("docsFrameWrap");
const toggleDocsFrame = $("toggleDocsFrame");
if (toggleDocsFrame && docsFrameWrap) {
  toggleDocsFrame.addEventListener("click", () => {
    const on = docsFrameWrap.classList.toggle("hidden") === false;
    toggleDocsFrame.textContent = on ? "Скрыть встроенный Swagger" : "Показать Swagger на этой странице";
  });
}

initTheme();

Promise.all([loadCategories(), loadManufacturers(), loadComponents()]).catch(() => {
  showToast("Сервер отвечает, но часть данных пока не загружена", false);
});
