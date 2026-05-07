/*
  Smart Classroom - script.js
  Basic JavaScript only: variables, arrays, loops,
  functions, if/else, localStorage.
  No frameworks, no advanced methods.
*/


/* ==========================================
   DARK MODE
========================================== */

// When the page loads, check if dark mode was saved and apply it
function loadTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    var toggle = document.getElementById("darkToggle");
    if (toggle) toggle.checked = true;
  }
}
loadTheme();

// Called when the user clicks the dark mode checkbox
function toggleDarkMode() {
  document.body.classList.toggle("dark");
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}


/* ==========================================
   TAB SWITCHING
========================================== */

// Shows the selected tab panel and hides the others
function switchTab(name) {
  // Hide all panels
  document.getElementById("attendanceTab").style.display = "none";
  document.getElementById("homeworkTab").style.display   = "none";
  document.getElementById("aboutTab").style.display      = "none";

  // Remove active class from all tab buttons
  document.getElementById("tabAttendance").classList.remove("active");
  document.getElementById("tabHomework").classList.remove("active");
  document.getElementById("tabAbout").classList.remove("active");

  // Show the right panel and mark the right button as active
  if (name === "attendance") {
    document.getElementById("attendanceTab").style.display = "block";
    document.getElementById("tabAttendance").classList.add("active");

  } else if (name === "homework") {
    document.getElementById("homeworkTab").style.display = "block";
    document.getElementById("tabHomework").classList.add("active");
    showHomeworkList();
    updateHwStats();

  } else if (name === "about") {
    document.getElementById("aboutTab").style.display = "block";
    document.getElementById("tabAbout").classList.add("active");
  }
}


/* ==========================================
   ATTENDANCE DATA
========================================== */

// Load saved subjects from localStorage, or start with empty array
var subjects = JSON.parse(localStorage.getItem("subjects")) || [];

// Save the subjects array to localStorage
function saveSubjects() {
  localStorage.setItem("subjects", JSON.stringify(subjects));
}

// Track which subject is being edited (-1 means we are adding, not editing)
var editIndex = -1;


/* ==========================================
   ATTENDANCE FORM — Add or Edit a subject
========================================== */

// Called when the user clicks "Add Subject" or "Save Changes"
function saveSubject() {
  var name     = document.getElementById("subjectName").value.trim();
  var total    = parseInt(document.getElementById("totalClasses").value);
  var attended = parseInt(document.getElementById("attendedClasses").value);
  var errBox   = document.getElementById("formError");

  // Hide any old error first
  errBox.style.display = "none";

  // Check the inputs are valid
  if (!name) {
    errBox.textContent = "Please enter a subject name.";
    errBox.style.display = "block";
    return;
  }
  if (isNaN(total) || total < 0) {
    errBox.textContent = "Please enter a valid number for total classes.";
    errBox.style.display = "block";
    return;
  }
  if (isNaN(attended) || attended < 0) {
    errBox.textContent = "Please enter a valid number for attended classes.";
    errBox.style.display = "block";
    return;
  }
  if (attended > total) {
    errBox.textContent = "Attended classes cannot be more than total classes.";
    errBox.style.display = "block";
    return;
  }

  if (editIndex === -1) {
    // Adding a new subject
    subjects.push({ name: name, total: total, attended: attended });
  } else {
    // Updating an existing subject
    subjects[editIndex].name     = name;
    subjects[editIndex].total    = total;
    subjects[editIndex].attended = attended;
  }

  saveSubjects();
  resetSubjectForm();
  showSubjectList();
  updateAttendanceStats();
}

// Reset the form back to "Add" state
function resetSubjectForm() {
  document.getElementById("subjectName").value    = "";
  document.getElementById("totalClasses").value   = "";
  document.getElementById("attendedClasses").value = "";
  document.getElementById("formError").style.display = "none";
  document.getElementById("formTitle").textContent   = "Add Subject";
  document.getElementById("saveSubjectBtn").textContent = "Add Subject";
  document.getElementById("cancelSubjectBtn").style.display = "none";
  editIndex = -1;
}

// Load a subject's data into the form for editing
function editSubject(i) {
  var sub = subjects[i];
  document.getElementById("subjectName").value     = sub.name;
  document.getElementById("totalClasses").value    = sub.total;
  document.getElementById("attendedClasses").value = sub.attended;
  document.getElementById("formTitle").textContent  = "Edit Subject";
  document.getElementById("saveSubjectBtn").textContent = "Save Changes";
  document.getElementById("cancelSubjectBtn").style.display = "inline-block";
  document.getElementById("formError").style.display = "none";
  editIndex = i;
  // Scroll to the form so the user can see it
  document.getElementById("subjectFormBox").scrollIntoView({ behavior: "smooth" });
}

// Cancel editing — go back to add mode
function cancelEdit() {
  resetSubjectForm();
}

// Remove a subject from the list
function deleteSubject(i) {
  if (confirm("Delete " + subjects[i].name + "? This cannot be undone.")) {
    subjects.splice(i, 1);
    saveSubjects();
    if (editIndex === i) resetSubjectForm();
    showSubjectList();
    updateAttendanceStats();
  }
}


/* ==========================================
   ATTENDANCE CALCULATIONS
========================================== */

// Calculate percentage: attended out of total
function getPercent(attended, total) {
  if (total === 0) return 0;
  return (attended / total) * 100;
}

/*
  How many classes must I attend in a row to reach 75%?
  Formula: (attended + x) / (total + x) = 0.75
  Solving for x: x = (3 * total - 4 * attended)
*/
function classesNeeded(attended, total) {
  var needed = 3 * total - 4 * attended;
  return Math.ceil(needed);
}

/*
  How many classes can I skip and still stay at 75%?
  Formula: attended / (total + x) = 0.75
  Solving for x: x = (4 * attended - 3 * total) / 3
*/
function classesCanSkip(attended, total) {
  var skippable = (4 * attended - 3 * total) / 3;
  return Math.floor(skippable);
}


/* ==========================================
   RENDER SUBJECT CARDS
========================================== */

function showSubjectList() {
  var list      = document.getElementById("subjectList");
  var noMsg     = document.getElementById("noSubjects");

  // If there are no subjects, show the empty message
  if (subjects.length === 0) {
    noMsg.style.display = "block";
    list.innerHTML = "";
    return;
  }

  noMsg.style.display = "none";
  list.innerHTML = "";

  for (var i = 0; i < subjects.length; i++) {
    var sub  = subjects[i];
    var pct  = getPercent(sub.attended, sub.total);
    var pctText = pct.toFixed(1) + "%";

    // Decide the color class based on the percentage
    var statusClass, barClass, pctClass, adviceText, adviceClass;

    if (pct >= 75) {
      statusClass  = "status-ok";
      barClass     = "bar-ok";
      pctClass     = "pct-ok";
      adviceClass  = "advice-ok";

      var skip = classesCanSkip(sub.attended, sub.total);
      if (skip <= 0) {
        adviceText = "You are right at 75%. Do not miss any more classes.";
      } else {
        adviceText = "You can afford to miss " + skip + " more " + (skip === 1 ? "class" : "classes") + " and stay above 75%.";
      }

    } else if (pct >= 60) {
      statusClass  = "status-warning";
      barClass     = "bar-warning";
      pctClass     = "pct-warning";
      adviceClass  = "advice-danger";
      var need     = classesNeeded(sub.attended, sub.total);
      adviceText   = "Attendance is below 75%. Attend the next " + need + " " + (need === 1 ? "class" : "classes") + " in a row to reach 75%.";

    } else {
      statusClass  = "status-danger";
      barClass     = "bar-danger";
      pctClass     = "pct-danger";
      adviceClass  = "advice-danger";
      var need     = classesNeeded(sub.attended, sub.total);
      adviceText   = "Attendance is critically low. You need to attend " + need + " consecutive " + (need === 1 ? "class" : "classes") + " to reach 75%.";
    }

    // Cap the bar width at 100%
    var barWidth = Math.min(Math.round(pct), 100);
    var missed   = sub.total - sub.attended;

    // Build the card using a template string style (basic concatenation)
    var card = document.createElement("div");
    card.className = "subject-card " + statusClass;

    card.innerHTML =
      "<div class='card-header'>" +
        "<span class='card-name'>" + escapeHTML(sub.name) + "</span>" +
        "<div class='card-btns'>" +
          "<button class='btn-small btn-edit-s' onclick='editSubject(" + i + ")'>Edit</button>" +
          "<button class='btn-small btn-delete-s' onclick='deleteSubject(" + i + ")'>Delete</button>" +
        "</div>" +
      "</div>" +

      "<div class='card-stats'>" +
        "<div class='card-stat-item'><span class='card-stat-label'>Total</span><span class='card-stat-value'>" + sub.total + "</span></div>" +
        "<div class='card-stat-item'><span class='card-stat-label'>Attended</span><span class='card-stat-value'>" + sub.attended + "</span></div>" +
        "<div class='card-stat-item'><span class='card-stat-label'>Missed</span><span class='card-stat-value'>" + missed + "</span></div>" +
        "<div class='card-stat-item'><span class='card-stat-label'>Percentage</span><span class='card-stat-value " + pctClass + "'>" + pctText + "</span></div>" +
      "</div>" +

      "<div class='progress-wrap'>" +
        "<div class='progress-track'>" +
          "<div class='progress-bar " + barClass + "' style='width:" + barWidth + "%'></div>" +
          "<div class='progress-marker'></div>" +
        "</div>" +
        "<p class='progress-note'>75% minimum required</p>" +
      "</div>" +

      "<div class='advice-box " + adviceClass + "'>" + adviceText + "</div>";

    list.appendChild(card);
  }
}


/* ==========================================
   ATTENDANCE SUMMARY STATS
========================================== */

function updateAttendanceStats() {
  var total  = subjects.length;
  var safe   = 0;
  var risk   = 0;
  var sumPct = 0;

  for (var i = 0; i < subjects.length; i++) {
    var pct = getPercent(subjects[i].attended, subjects[i].total);
    sumPct += pct;
    if (pct >= 75) {
      safe++;
    } else {
      risk++;
    }
  }

  var avg = total > 0 ? (sumPct / total).toFixed(1) + "%" : "--";

  document.getElementById("totalSubjects").textContent = total;
  document.getElementById("safeCount").textContent     = safe;
  document.getElementById("riskCount").textContent     = risk;
  document.getElementById("overallAvg").textContent    = avg;
}


/* ==========================================
   HOMEWORK DATA
========================================== */

// Load saved homework from localStorage, or start with empty array
var homeworkList = JSON.parse(localStorage.getItem("homeworkList")) || [];

// Save homework to localStorage
function saveHomeworkData() {
  localStorage.setItem("homeworkList", JSON.stringify(homeworkList));
}

// Current active filter
var activeFilter = "all";

// Which homework item is being edited (-1 = none)
var hwEditIndex = -1;


/* ==========================================
   HOMEWORK FORM — Add or Edit
========================================== */

// Called when the user clicks "Add Homework" or "Save Changes"
function saveHomework() {
  var subject = document.getElementById("hwSubject").value.trim();
  var title   = document.getElementById("hwTitle").value.trim();
  var desc    = document.getElementById("hwDesc").value.trim();
  var dueDate = document.getElementById("hwDueDate").value;
  var errBox  = document.getElementById("hwFormError");

  errBox.style.display = "none";

  // Validate inputs
  if (!subject) { errBox.textContent = "Please enter a subject name."; errBox.style.display = "block"; return; }
  if (!title)   { errBox.textContent = "Please enter an assignment title."; errBox.style.display = "block"; return; }
  if (!dueDate) { errBox.textContent = "Please select a due date."; errBox.style.display = "block"; return; }

  if (hwEditIndex === -1) {
    // Add new homework
    homeworkList.push({
      id:        Date.now(),  // unique number using the current time
      subject:   subject,
      title:     title,
      desc:      desc,
      dueDate:   dueDate,     // stored as "YYYY-MM-DD"
      completed: false
    });
  } else {
    // Update existing homework
    homeworkList[hwEditIndex].subject = subject;
    homeworkList[hwEditIndex].title   = title;
    homeworkList[hwEditIndex].desc    = desc;
    homeworkList[hwEditIndex].dueDate = dueDate;
  }

  saveHomeworkData();
  resetHwForm();
  showHomeworkList();
  updateHwStats();
}

// Reset the homework form to "Add" state
function resetHwForm() {
  document.getElementById("hwSubject").value   = "";
  document.getElementById("hwTitle").value     = "";
  document.getElementById("hwDesc").value      = "";
  document.getElementById("hwDueDate").value   = "";
  document.getElementById("hwFormError").style.display  = "none";
  document.getElementById("hwFormTitle").textContent    = "Add Homework";
  document.getElementById("saveHwBtn").textContent      = "Add Homework";
  document.getElementById("cancelHwBtn").style.display  = "none";
  hwEditIndex = -1;
}

// Load a homework entry into the form for editing
function editHomework(i) {
  var hw = homeworkList[i];
  document.getElementById("hwSubject").value   = hw.subject;
  document.getElementById("hwTitle").value     = hw.title;
  document.getElementById("hwDesc").value      = hw.desc;
  document.getElementById("hwDueDate").value   = hw.dueDate;
  document.getElementById("hwFormTitle").textContent   = "Edit Homework";
  document.getElementById("saveHwBtn").textContent     = "Save Changes";
  document.getElementById("cancelHwBtn").style.display = "inline-block";
  document.getElementById("hwFormError").style.display = "none";
  hwEditIndex = i;
  document.getElementById("hwFormBox").scrollIntoView({ behavior: "smooth" });
}

// Cancel editing
function cancelHwEdit() {
  resetHwForm();
}

// Delete a homework entry
function deleteHomework(i) {
  if (confirm("Delete \"" + homeworkList[i].title + "\"? This cannot be undone.")) {
    homeworkList.splice(i, 1);
    saveHomeworkData();
    if (hwEditIndex === i) resetHwForm();
    showHomeworkList();
    updateHwStats();
  }
}

// Toggle a homework item between pending and completed
function toggleDone(i) {
  homeworkList[i].completed = !homeworkList[i].completed;
  saveHomeworkData();
  showHomeworkList();
  updateHwStats();
}


/* ==========================================
   OVERDUE CHECK & DATE DISPLAY
========================================== */

// Returns true if the homework is past due and not completed
function checkOverdue(hw) {
  if (hw.completed) return false;

  var today = new Date();
  today.setHours(0, 0, 0, 0); // use midnight so we compare dates only

  // dueDate is stored as "YYYY-MM-DD", split it to build a Date
  var parts = hw.dueDate.split("-");
  var due   = new Date(parts[0], parts[1] - 1, parts[2]);

  return due < today;
}

// Convert "YYYY-MM-DD" to a readable format like "10 Jan 2025"
function showDate(dateStr) {
  if (!dateStr) return "No date";
  var parts  = dateStr.split("-");
  var d      = new Date(parts[0], parts[1] - 1, parts[2]);
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}


/* ==========================================
   HOMEWORK FILTER
========================================== */

// Called when the user clicks a filter button
function setFilter(name) {
  activeFilter = name;

  // Remove active class from all filter buttons
  var buttons = document.querySelectorAll(".filter-btn");
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].classList.remove("active");
  }

  // Mark the clicked button active
  document.getElementById("filter-" + name).classList.add("active");

  showHomeworkList();
}

// Returns the filtered list of homework with their original indexes
function getFiltered() {
  var result = [];

  for (var i = 0; i < homeworkList.length; i++) {
    var hw = homeworkList[i];

    if (activeFilter === "all") {
      result.push({ hw: hw, index: i });

    } else if (activeFilter === "pending") {
      if (!hw.completed && !checkOverdue(hw)) {
        result.push({ hw: hw, index: i });
      }

    } else if (activeFilter === "completed") {
      if (hw.completed) {
        result.push({ hw: hw, index: i });
      }

    } else if (activeFilter === "overdue") {
      if (checkOverdue(hw)) {
        result.push({ hw: hw, index: i });
      }
    }
  }

  return result;
}


/* ==========================================
   RENDER HOMEWORK CARDS
========================================== */

function showHomeworkList() {
  var list   = document.getElementById("homeworkList");
  var noMsg  = document.getElementById("noHomework");
  var items  = getFiltered();

  if (items.length === 0) {
    noMsg.style.display = "block";
    list.innerHTML = "";
    return;
  }

  noMsg.style.display = "none";
  list.innerHTML = "";

  for (var i = 0; i < items.length; i++) {
    var hw    = items[i].hw;
    var index = items[i].index;

    // Decide status, badge text, and button based on the homework state
    var cardClass, badgeClass, badgeText, actionBtn;

    if (hw.completed) {
      cardClass  = "hw-completed";
      badgeClass = "badge-completed";
      badgeText  = "Completed";
      actionBtn  = "<button class='btn-small btn-undo-s' onclick='toggleDone(" + index + ")'>Undo</button>";

    } else if (checkOverdue(hw)) {
      cardClass  = "hw-overdue";
      badgeClass = "badge-overdue";
      badgeText  = "Overdue";
      actionBtn  = "<button class='btn-small btn-done-s' onclick='toggleDone(" + index + ")'>Mark Done</button>";

    } else {
      cardClass  = "hw-pending";
      badgeClass = "badge-pending";
      badgeText  = "Pending";
      actionBtn  = "<button class='btn-small btn-done-s' onclick='toggleDone(" + index + ")'>Mark Done</button>";
    }

    // Show description only if it exists
    var notesHTML = "";
    if (hw.desc) {
      notesHTML = "<p class='hw-notes'>" + escapeHTML(hw.desc) + "</p>";
    }

    var card = document.createElement("div");
    card.className = "hw-card " + cardClass;

    card.innerHTML =
      "<div class='hw-card-header'>" +
        "<div>" +
          "<span class='hw-subject-tag'>" + escapeHTML(hw.subject) + "</span>" +
          "<div class='hw-title-text'>" + escapeHTML(hw.title) + "</div>" +
        "</div>" +
        "<div class='hw-card-btns'>" +
          actionBtn +
          "<button class='btn-small btn-edit-s' onclick='editHomework(" + index + ")'>Edit</button>" +
          "<button class='btn-small btn-delete-s' onclick='deleteHomework(" + index + ")'>Delete</button>" +
        "</div>" +
      "</div>" +
      "<div class='hw-meta'>" +
        "<span class='hw-due'>Due: " + showDate(hw.dueDate) + "</span>" +
        "<span class='hw-badge " + badgeClass + "'>" + badgeText + "</span>" +
      "</div>" +
      notesHTML;

    list.appendChild(card);
  }
}


/* ==========================================
   HOMEWORK SUMMARY STATS
========================================== */

function updateHwStats() {
  var total     = homeworkList.length;
  var completed = 0;
  var overdue   = 0;

  for (var i = 0; i < homeworkList.length; i++) {
    if (homeworkList[i].completed) {
      completed++;
    } else if (checkOverdue(homeworkList[i])) {
      overdue++;
    }
  }

  var pending = total - completed;

  document.getElementById("hw-total").textContent     = total;
  document.getElementById("hw-pending").textContent   = pending;
  document.getElementById("hw-completed").textContent = completed;
  document.getElementById("hw-overdue").textContent   = overdue;
}


/* ==========================================
   HELPER — Prevent HTML injection
   Replaces special characters in user input
   so they don't break the page layout
========================================== */

function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


/* ==========================================
   START — Run when the page first loads
========================================== */

showSubjectList();
updateAttendanceStats();
updateHwStats();
