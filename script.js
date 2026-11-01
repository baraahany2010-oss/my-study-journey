
// ==========================================
// My Study Journey - Main Application
// ==========================================

// ---------- DOM Elements ----------

const modePanel = document.getElementById("modePanel");
const visitorBtn = document.getElementById("visitorBtn");
const ownerBtn = document.getElementById("ownerBtn");

const ownerLoginPanel = document.getElementById("ownerLoginPanel");
const ownerLoginForm = document.getElementById("ownerLoginForm");
const ownerPassword = document.getElementById("ownerPassword");
const backToModesBtn = document.getElementById("backToModesBtn");
const authMessage = document.getElementById("authMessage");

const userPanel = document.getElementById("userPanel");
const modeLabel = document.getElementById("modeLabel");
const modeTitle = document.getElementById("modeTitle");
const modeDescription = document.getElementById("modeDescription");
const exitModeBtn = document.getElementById("exitModeBtn");

const dashboard = document.querySelector(".dashboard");

const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");

const selectedDateElement = document.getElementById("selectedDate");

const uploadArea = document.getElementById("uploadArea");
const videoInput = document.getElementById("videoInput");
const uploadBtn = document.getElementById("uploadBtn");
const videoPreview = document.getElementById("videoPreview");

const studyNotes = document.getElementById("studyNotes");
const saveBtn = document.getElementById("saveBtn");
const deleteBtn = document.getElementById("deleteBtn");
const saveStatus = document.getElementById("saveStatus");

const entryActions = document.getElementById("entryActions");
const entryModeHint = document.getElementById("entryModeHint");


// ---------- Application State ----------

let currentMode = null;
let currentUser = null;

let currentDate = new Date();
let selectedDay = new Date();

let entries = {};
let selectedVideo = null;


// ---------- Helpers ----------

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function showStatus(message, isError = false) {
    saveStatus.textContent = message;
    saveStatus.style.color = isError ? "#FF8585" : "#55E6C1";
}

function clearVideoPreview() {
    videoPreview.innerHTML = "";
}

function showVideoPreview(url) {
    clearVideoPreview();

    if (!url) return;

    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.src = url;

    videoPreview.appendChild(video);
}

function getMonthRange(date) {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return {
        start: formatDate(firstDay),
        end: formatDate(lastDay)
    };
}

function setButtonLoading(button, loading, normalText) {
    button.disabled = loading;
    button.textContent = loading ? "PLEASE WAIT..." : normalText;
}


// ---------- Mode Management ----------

function showModeChooser() {
    currentMode = null;
    currentUser = null;
    selectedVideo = null;
    entries = {};

    modePanel.hidden = false;
    ownerLoginPanel.hidden = true;
    userPanel.hidden = true;
    dashboard.hidden = true;

    ownerPassword.value = "";
    authMessage.textContent = "";
    showStatus("");

    clearVideoPreview();
}

async function enterVisitorMode() {
    try {
        // Make sure the visitor is not using an old owner session.
        await supabaseClient.auth.signOut();

        currentMode = "visitor";
        currentUser = null;

        modePanel.hidden = true;
        ownerLoginPanel.hidden = true;
        userPanel.hidden = false;
        dashboard.hidden = false;

        modeLabel.textContent = "VISITOR MODE";
        modeTitle.textContent = "Welcome, Visitor";
        modeDescription.textContent =
            "You can explore the entire study journey. Editing is disabled.";

        studyNotes.readOnly = true;
        uploadArea.hidden = true;
        entryActions.hidden = true;

        entryModeHint.textContent = "READ ONLY · PUBLIC JOURNEY";

        selectedDay = new Date();
        currentDate = new Date();

        await loadMonthEntries();
        renderCalendar();
        await loadEntry();

    } catch (error) {
        console.error(error);
        alert("Could not open visitor mode. Please try again.");
    }
}

async function enterOwnerMode(password) {
    if (!OWNER_EMAIL || !OWNER_USER_ID ||
        OWNER_EMAIL === "YOUR_OWNER_EMAIL" ||
        OWNER_USER_ID === "YOUR_OWNER_UID") {
        authMessage.textContent =
            "Please configure OWNER_EMAIL and OWNER_USER_ID in supabase.js.";
        return;
    }

    setButtonLoading(ownerLoginForm.querySelector("button[type='submit']"), true, "ENTER OWNER MODE");

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: OWNER_EMAIL,
                password: password
            });

        if (error) throw error;

        if (!data.user || data.user.id !== OWNER_USER_ID) {
            await supabaseClient.auth.signOut();
            throw new Error("This account is not the configured owner account.");
        }

        currentUser = data.user;
        currentMode = "owner";

        ownerPassword.value = "";
        authMessage.textContent = "";

        modePanel.hidden = true;
        ownerLoginPanel.hidden = true;
        userPanel.hidden = false;
        dashboard.hidden = false;

        modeLabel.textContent = "OWNER MODE";
        modeTitle.textContent = "Welcome Back, Owner";
        modeDescription.textContent =
            "You have full control over your study journey.";

        studyNotes.readOnly = false;
        uploadArea.hidden = false;
        entryActions.hidden = false;

        entryModeHint.textContent = "OWNER MODE · FULL ACCESS";

        selectedDay = new Date();
        currentDate = new Date();

        await loadMonthEntries();
        renderCalendar();
        await loadEntry();

    } catch (error) {
        console.error(error);
        authMessage.textContent =
            error.message || "Login failed. Check your password and try again.";
    } finally {
        const submitButton =
            ownerLoginForm.querySelector("button[type='submit']");

        if (submitButton) {
            setButtonLoading(submitButton, false, "ENTER OWNER MODE");
        }
    }
}


// ---------- Owner Login Events ----------

visitorBtn.addEventListener("click", enterVisitorMode);

ownerBtn.addEventListener("click", () => {
    modePanel.hidden = true;
    ownerLoginPanel.hidden = false;
    ownerPassword.focus();
});

backToModesBtn.addEventListener("click", showModeChooser);

ownerLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = ownerPassword.value.trim();

    if (!password) {
        authMessage.textContent = "Please enter your password.";
        return;
    }

    await enterOwnerMode(password);
});

exitModeBtn.addEventListener("click", async () => {
    if (currentMode === "owner") {
        await supabaseClient.auth.signOut();
    }

    showModeChooser();
});


// ---------- Calendar ----------

function renderCalendar() {
    calendar.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    dayNames.forEach(day => {
        const element = document.createElement("div");
        element.className = "day-name";
        element.textContent = day;
        calendar.appendChild(element);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day empty";
        calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const key = formatDate(date);

        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";

        const todayKey = formatDate(new Date());
        const selectedKey = formatDate(selectedDay);

        if (key === todayKey) {
            cell.classList.add("today");
        }

        if (key === selectedKey) {
            cell.classList.add("selected");
        }

        const number = document.createElement("span");
        number.className = "day-number";
        number.textContent = day;

        cell.appendChild(number);

        if (entries[key]) {
            const indicator = document.createElement("span");
            indicator.className = "entry-indicator";
            cell.appendChild(indicator);
        }

        cell.addEventListener("click", async () => {
            selectedDay = date;
            renderCalendar();
            await loadEntry();
        });

        calendar.appendChild(cell);
    }
}

prevMonth.addEventListener("click", async () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    await loadMonthEntries();
    renderCalendar();
    await loadEntry();
});

nextMonth.addEventListener("click", async () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    await loadMonthEntries();
    renderCalendar();
    await loadEntry();
});

todayBtn.addEventListener("click", async () => {
    currentDate = new Date();
    selectedDay = new Date();

    await loadMonthEntries();
    renderCalendar();
    await loadEntry();
});


// ---------- Load Entries ----------

async function loadMonthEntries() {
    const { start, end } = getMonthRange(currentDate);

    showStatus("Loading study entries...");

    const { data, error } = await supabaseClient
        .from("study_entries")
        .select("*")
        .gte("entry_date", start)
        .lte("entry_date", end);

    if (error) {
        console.error(error);
        showStatus("Could not load entries: " + error.message, true);
        return;
    }

    entries = {};

    (data || []).forEach(entry => {
        entries[entry.entry_date] = entry;
    });

    showStatus("");
}


// ---------- Load Selected Day ----------

async function loadEntry() {
    const key = formatDate(selectedDay);

    selectedDateElement.textContent =
        selectedDay.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    selectedVideo = null;
    videoInput.value = "";

    clearVideoPreview();

    const entry = entries[key];

    if (!entry) {
        studyNotes.value = "";
        showStatus("No study entry for this day yet.");
        return;
    }

    studyNotes.value = entry.notes || "";

    if (entry.video_path) {
        const { data } = supabaseClient.storage
            .from("study-videos")
            .getPublicUrl(entry.video_path);

        if (data && data.publicUrl) {
            showVideoPreview(data.publicUrl);
        }
    }

    showStatus("Study entry loaded.");
}


// ---------- Video Selection ----------

uploadBtn.addEventListener("click", () => {
    if (currentMode !== "owner") return;
    videoInput.click();
});

videoInput.addEventListener("change", () => {
    if (currentMode !== "owner") return;

    const file = videoInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
        showStatus("Please select a valid video file.", true);
        videoInput.value = "";
        return;
    }

    selectedVideo = file;

    const localUrl = URL.createObjectURL(file);
    showVideoPreview(localUrl);

    showStatus("Video selected: " + file.name);
});


// ---------- Save Entry ----------

saveBtn.addEventListener("click", saveEntry);

async function saveEntry() {
    if (currentMode !== "owner" || !currentUser) {
        showStatus("Only the owner can save entries.", true);
        return;
    }

    const key = formatDate(selectedDay);
    const notes = studyNotes.value.trim();

    const oldEntry = entries[key];

    if (!notes && !selectedVideo && !(oldEntry && oldEntry.video_path)) {
        showStatus("Add notes or select a video first.", true);
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "SAVING...";

    try {
        let videoPath = oldEntry ? oldEntry.video_path : null;

        // Upload a newly selected video first.
        if (selectedVideo) {
            const safeName = selectedVideo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath =
                `${currentUser.id}/${key}/${Date.now()}_${safeName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from("study-videos")
                .upload(filePath, selectedVideo);

            if (uploadError) throw uploadError;

            videoPath = filePath;
        }

        const { data, error } = await supabaseClient
            .from("study_entries")
            .upsert({
                user_id: currentUser.id,
                entry_date: key,
                notes: notes,
                video_path: videoPath,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "user_id,entry_date"
            })
            .select()
            .single();

        if (error) throw error;

        // Delete the previous video only after the entry was saved.
        if (
            selectedVideo &&
            oldEntry &&
            oldEntry.video_path &&
            oldEntry.video_path !== videoPath
        ) {
            const { error: deleteOldError } = await supabaseClient.storage
                .from("study-videos")
                .remove([oldEntry.video_path]);

            if (deleteOldError) {
                console.warn("Old video could not be deleted:", deleteOldError);
            }
        }

        entries[key] = data;
        selectedVideo = null;
        videoInput.value = "";

        renderCalendar();
        await loadEntry();

        showStatus("Your study entry has been saved successfully.");

    } catch (error) {
        console.error(error);
        showStatus("Save failed: " + error.message, true);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'SAVE ENTRY <span>↗</span>';
    }
}


// ---------- Delete Entry ----------

deleteBtn.addEventListener("click", deleteEntry);

async function deleteEntry() {
    if (currentMode !== "owner" || !currentUser) {
        showStatus("Only the owner can delete entries.", true);
        return;
    }

    const key = formatDate(selectedDay);
    const entry = entries[key];

    if (!entry) {
        showStatus("There is no entry to delete.", true);
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to permanently delete this day's entry and video?"
    );

    if (!confirmed) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = "DELETING...";

    try {
        // Remove the video first, if one exists.
        if (entry.video_path) {
            const { error: storageError } = await supabaseClient.storage
                .from("study-videos")
                .remove([entry.video_path]);

            if (storageError) throw storageError;
        }

        const { error } = await supabaseClient
            .from("study_entries")
            .delete()
            .eq("id", entry.id)
            .eq("user_id", currentUser.id);

        if (error) throw error;

        delete entries[key];

        studyNotes.value = "";
        selectedVideo = null;
        videoInput.value = "";

        clearVideoPreview();
        renderCalendar();

        showStatus("Entry deleted successfully.");

    } catch (error) {
        console.error(error);
        showStatus("Delete failed: " + error.message, true);
    } finally {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "DELETE ENTRY";
    }
}


// ---------- Initial Setup ----------

document.addEventListener("DOMContentLoaded", () => {
    showModeChooser();
    renderCalendar();
});

showModeChooser();
