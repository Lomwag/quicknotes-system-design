
"use strict";

// Personal Notes mode — separate from the original API demo.
const PERSONAL_NOTES_KEY = "quicknotes-personal-notes";

const personalForm = document.getElementById("personal-note-form");
const personalTitleInput = document.getElementById("personal-title-input");
const personalBodyInput = document.getElementById("personal-body-input");
const personalCategoryInput = document.getElementById("personal-category-input");
const personalSubmitButton = document.getElementById("personal-submit-btn");
const personalStatus = document.getElementById("personal-status");
const personalNotesList = document.getElementById("personal-notes-list");
const personalSearchInput = document.getElementById("personal-search-input");
const personalCategoryFilter = document.getElementById("personal-category-filter");
const exportPersonalNotesButton = document.getElementById(
  "export-personal-notes-btn"
);

// Read saved notes from this browser.
function getPersonalNotes() {
  try {
    const savedNotes = localStorage.getItem(PERSONAL_NOTES_KEY);

    if (!savedNotes) {
      return [];
    }

    const notes = JSON.parse(savedNotes);

    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    console.error("Could not read personal notes:", error);
    personalStatus.textContent = "Unable to read saved notes.";
    return [];
  }
}

// Save notes to this browser.
function savePersonalNotes(notes) {
  try {
    localStorage.setItem(PERSONAL_NOTES_KEY, JSON.stringify(notes));
    return true;
  } catch (error) {
    console.error("Could not save personal notes:", error);
    personalStatus.textContent =
      "Unable to save notes. Check available browser storage.";
    return false;
  }
}

// Format stored dates for display.
function formatDate(dateValue) {
  if (!dateValue) {
    return "Unavailable";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleString();
}

// Display notes, applying both search and category filters.
function renderPersonalNotes() {
  const notes = getPersonalNotes();
  const searchTerm = personalSearchInput.value.trim().toLowerCase();
  const selectedCategory = personalCategoryFilter.value;

  const filteredNotes = notes.filter((note) => {
    const title = (note.title || "").toLowerCase();
    const body = (note.body || "").toLowerCase();

    const matchesSearch =
      title.includes(searchTerm) || body.includes(searchTerm);

    const matchesCategory =
      selectedCategory === "All" ||
      note.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  personalNotesList.replaceChildren();

  if (filteredNotes.length === 0) {
    const message = document.createElement("li");

    message.textContent = notes.length === 0
      ? "No personal notes yet. Add your first note above."
      : "No notes match your search or category filter.";

    personalNotesList.appendChild(message);
    return;
  }

  filteredNotes.forEach((note) => {
    const item = document.createElement("li");
    const title = document.createElement("h3");
    const body = document.createElement("p");
    const category = document.createElement("p");
    const createdDate = document.createElement("p");
    const updatedDate = document.createElement("p");
    const actions = document.createElement("div");

    title.textContent = note.title || "Untitled";
    body.textContent = note.body || "No note content.";
    category.textContent = `Category: ${note.category || "Personal"}`;
    createdDate.textContent = `Created: ${formatDate(note.createdAt)}`;
    updatedDate.textContent = `Last updated: ${formatDate(note.updatedAt)}`;

    // Edit button loads the selected note into the form.
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button-secondary";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      personalTitleInput.value = note.title || "";
      personalBodyInput.value = note.body || "";
      personalCategoryInput.value = note.category || "Personal";

      personalTitleInput.dataset.editingId = note.id;
      personalSubmitButton.textContent = "Update personal note";
      personalStatus.textContent = `Editing: ${note.title}`;
      personalTitleInput.focus();

      personalForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    // Delete button removes the selected note after confirmation.
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button-secondary";
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${note.title}"?`
      );

      if (!confirmed) {
        return;
      }

      const remainingNotes = getPersonalNotes().filter(
        (savedNote) => savedNote.id !== note.id
      );

      if (savePersonalNotes(remainingNotes)) {
        // Clear the form if the deleted note was being edited.
        if (personalTitleInput.dataset.editingId === note.id) {
          personalForm.reset();
          delete personalTitleInput.dataset.editingId;
          personalSubmitButton.textContent = "Save personal note";
        }

        personalStatus.textContent = "Personal note deleted successfully.";
        renderPersonalNotes();
      }
    });

    actions.append(editButton, deleteButton);
    item.append(
      title,
      body,
      category,
      createdDate,
      updatedDate,
      actions
    );

    personalNotesList.appendChild(item);
  });
}

// Save a new note or update an existing one.
personalForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = personalTitleInput.value.trim();
  const body = personalBodyInput.value.trim();
  const category = personalCategoryInput.value;

  if (!title) {
    personalStatus.textContent = "Please enter a title.";
    personalTitleInput.focus();
    return;
  }

  if (title.length > 100) {
    personalStatus.textContent =
      "The title must not exceed 100 characters.";
    personalTitleInput.focus();
    return;
  }

  const notes = getPersonalNotes();
  const editingId = personalTitleInput.dataset.editingId;
  const now = new Date().toISOString();

  let updatedNotes;

  if (editingId) {
    const noteExists = notes.some((note) => note.id === editingId);

    if (!noteExists) {
      personalStatus.textContent =
        "The note could not be found. Please refresh and try again.";
      return;
    }

    updatedNotes = notes.map((note) => {
      if (note.id !== editingId) {
        return note;
      }

      return {
        ...note,
        title,
        body,
        category,
        updatedAt: now
      };
    });
  } else {
    const newNote = {
      id: crypto.randomUUID(),
      title,
      body,
      category,
      createdAt: now,
      updatedAt: now
    };

    updatedNotes = [newNote, ...notes];
  }

  if (!savePersonalNotes(updatedNotes)) {
    return;
  }

  const wasEditing = Boolean(editingId);

  personalForm.reset();
  delete personalTitleInput.dataset.editingId;
  personalSubmitButton.textContent = "Save personal note";

  personalStatus.textContent = wasEditing
    ? "Personal note updated successfully."
    : "Personal note saved successfully.";

  renderPersonalNotes();
});

// Search updates the list as the user types.
personalSearchInput.addEventListener("input", renderPersonalNotes);

// Category selection refreshes the displayed list.
personalCategoryFilter.addEventListener("change", renderPersonalNotes);

// Download all saved personal notes as a JSON file.
exportPersonalNotesButton.addEventListener("click", () => {
  const notes = getPersonalNotes();

  if (notes.length === 0) {
    personalStatus.textContent = "There are no personal notes to export.";
    return;
  }

  const json = JSON.stringify(notes, null, 2);
  const blob = new Blob([json], {
    type: "application/json;charset=utf-8"
  });

  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;
  downloadLink.download = "quicknotes-personal-notes.json";

  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();

  URL.revokeObjectURL(downloadUrl);

  personalStatus.textContent =
    `Exported ${notes.length} personal note(s) as JSON.`;
});

// Display saved notes when the page loads.
renderPersonalNotes();
