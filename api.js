const API_URL = "https://jsonplaceholder.typicode.com/posts";
const LOAD_LIMIT = 10;

const loadButton = document.getElementById("load-btn");
const submitButton = document.getElementById("submit-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];
let isLoadingNotes = false;
let isCreatingNote = false;

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = new Error("Request failed with HTTP " + response.status);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return { status: response.status, data: null };
  const data = await response.json();
  return { status: response.status, data };
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status" + (type ? " " + type : "");
}

function updateButtons() {
  loadButton.disabled = isLoadingNotes;
  submitButton.disabled = isCreatingNote || isLoadingNotes;
  loadButton.textContent = isLoadingNotes ? "Loading…" : "Load notes";
  submitButton.textContent = isCreatingNote ? "Creating…" : "Create note";
}

function createNoteElement(note) {
  const item = document.createElement("li");
  item.className = "note-card";

  const title = document.createElement("h3");
  title.textContent = note.title || "(Untitled note)";

  const body = document.createElement("p");
  body.textContent = note.body || "No note content.";

  const actions = document.createElement("div");
  actions.className = "note-actions";

  const idLabel = document.createElement("span");
  idLabel.className = "note-id";
  idLabel.textContent = "Note ID: " + note.id;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-btn";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteNote(note.id, deleteButton));

  actions.append(idLabel, deleteButton);
  item.append(title, body, actions);
  return item;
}

function renderNotes() {
  notesList.replaceChildren();
  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "note-card";
    empty.textContent = "No notes to show. Load notes or create one.";
    notesList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  notes.forEach((note) => fragment.append(createNoteElement(note)));
  notesList.append(fragment);
}

async function loadNotes() {
  if (isLoadingNotes) return;
  isLoadingNotes = true;
  updateButtons();
  setStatus("Loading notes…");

  try {
    const result = await request(API_URL + "?_limit=" + LOAD_LIMIT);
    notes = result.data;
    renderNotes();
    setStatus(
      notes.length
        ? "Loaded " + notes.length + " notes successfully (HTTP " + result.status + ")."
        : "The API returned no notes (HTTP " + result.status + ").",
      "success"
    );
  } catch (error) {
    setStatus("Could not load notes. " + error.message, "error");
  } finally {
    isLoadingNotes = false;
    updateButtons();
  }
}

async function createNote(event) {
  event.preventDefault();
  if (isCreatingNote || isLoadingNotes) return;

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  if (!title) {
    setStatus("Please enter a title before creating a note.", "error");
    titleInput.focus();
    return;
  }
  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  isCreatingNote = true;
  updateButtons();
  setStatus("Creating note…");

  try {
    // JSONPlaceholder simulates POST/DELETE responses; writes are not persisted.
    const result = await request(API_URL, {
      method: "POST",
      body: JSON.stringify({ title, body, userId: 1 })
    });
    notes.unshift(result.data);
    renderNotes();
    noteForm.reset();
    setStatus("Note created (HTTP " + result.status + ", simulated ID " + result.data.id + ").", "success");
  } catch (error) {
    setStatus("Could not create note. " + error.message, "error");
  } finally {
    isCreatingNote = false;
    updateButtons();
  }
}

async function deleteNote(id, button) {
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = "Deleting…";
  setStatus("Deleting note " + id + "…");

  try {
    const result = await request(API_URL + "/" + encodeURIComponent(id), { method: "DELETE" });
    notes = notes.filter((note) => String(note.id) !== String(id));
    renderNotes();
    setStatus("Delete request completed (HTTP " + result.status + ").", "success");
  } catch (error) {
    setStatus("Could not delete note " + id + ". " + error.message, "error");
    button.disabled = false;
    button.textContent = "Delete";
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);