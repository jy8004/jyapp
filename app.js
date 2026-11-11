import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "./firebase.js";

// --- State ---
let currentUser = null;
let unsubscribeNotes = null;
let allNotes = [];
let selectedEra = "all";
let selectedStatus = "all";
let searchQuery = "";
let currentViewMode = "grid"; // 'grid' | 'timeline' | 'flashcard'
let flashcardIndex = 0;
let isSignUpMode = false;

// --- DOM Elements ---
const initialLoadingView = document.getElementById("initialLoadingView");
const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const headerUserArea = document.getElementById("headerUserArea");
const userAvatar = document.getElementById("userAvatar");
const userAvatarFallback = document.getElementById("userAvatarFallback");
const userNameDisplay = document.getElementById("userNameDisplay");
const userEmailDisplay = document.getElementById("userEmailDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

// Auth Form Elements
const googleLoginBtn = document.getElementById("googleLoginBtn");
const tabSignInBtn = document.getElementById("tabSignInBtn");
const tabSignUpBtn = document.getElementById("tabSignUpBtn");
const signUpNameField = document.getElementById("signUpNameField");
const authDisplayName = document.getElementById("authDisplayName");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const emailAuthForm = document.getElementById("emailAuthForm");
const emailSubmitBtnText = document.getElementById("emailSubmitBtnText");
const authErrorBox = document.getElementById("authErrorBox");

// Dashboard Elements
const statTotalNotes = document.getElementById("statTotalNotes");
const statMasteredPercent = document.getElementById("statMasteredPercent");
const statMasteredCount = document.getElementById("statMasteredCount");
const statProgressBar = document.getElementById("statProgressBar");
const statReviewCount = document.getElementById("statReviewCount");
const firestorePathBadge = document.getElementById("firestorePathBadge");

const eraFilterContainer = document.getElementById("eraFilterContainer");
const searchInput = document.getElementById("searchInput");
const statusFilterSelect = document.getElementById("statusFilterSelect");
const viewModeBtns = document.querySelectorAll(".view-mode-btn");

const emptyStateView = document.getElementById("emptyStateView");
const emptyStateTitle = document.getElementById("emptyStateTitle");
const emptyStateDesc = document.getElementById("emptyStateDesc");
const notesGridContainer = document.getElementById("notesGridContainer");
const notesTimelineContainer = document.getElementById("notesTimelineContainer");
const notesFlashcardContainer = document.getElementById("notesFlashcardContainer");

// Flashcard Elements
const flashcardBox = document.getElementById("flashcardBox");
const flashcardInner = document.getElementById("flashcardInner");
const flashcardCounter = document.getElementById("flashcardCounter");
const fcEraBadge = document.getElementById("fcEraBadge");
const fcYearBadge = document.getElementById("fcYearBadge");
const fcTitle = document.getElementById("fcTitle");
const fcKeywords = document.getElementById("fcKeywords");
const fcMasteredBadge = document.getElementById("fcMasteredBadge");
const fcContent = document.getElementById("fcContent");
const fcToggleMasteredBtn = document.getElementById("fcToggleMasteredBtn");
const fcPrevBtn = document.getElementById("fcPrevBtn");
const fcNextBtn = document.getElementById("fcNextBtn");

// Modal Elements
const noteModalBackdrop = document.getElementById("noteModalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const noteForm = document.getElementById("noteForm");
const noteIdInput = document.getElementById("noteIdInput");
const noteEraInput = document.getElementById("noteEraInput");
const noteYearInput = document.getElementById("noteYearInput");
const noteTitleInput = document.getElementById("noteTitleInput");
const noteImportanceInput = document.getElementById("noteImportanceInput");
const noteKeywordsInput = document.getElementById("noteKeywordsInput");
const noteContentInput = document.getElementById("noteContentInput");
const noteMasteredInput = document.getElementById("noteMasteredInput");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const emptyAddNoteBtn = document.getElementById("emptyAddNoteBtn");
const seedSampleNotesBtn = document.getElementById("seedSampleNotesBtn");
const closeNoteModalBtn = document.getElementById("closeNoteModalBtn");
const cancelNoteModalBtn = document.getElementById("cancelNoteModalBtn");

// Initialize Icons
if (window.lucide) {
  window.lucide.createIcons();
}

// --- Theme Toggle ---
themeToggleBtn.addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
});

// --- Toast Notification Helper ---
function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  const el = document.createElement("div");
  const colorClasses =
    type === "error"
      ? "bg-rose-600 text-white border-rose-500"
      : type === "info"
      ? "bg-slate-800 text-white border-slate-700"
      : "bg-emerald-600 text-white border-emerald-500";

  el.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-xs font-semibold transition-all duration-200 ${colorClasses}`;
  el.innerHTML = `<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, 3200);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Auth Mode Switch (Sign In vs Sign Up) ---
function setAuthTabMode(signUp) {
  isSignUpMode = signUp;
  authErrorBox.classList.add("hidden");
  if (isSignUpMode) {
    tabSignUpBtn.className = "py-2 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm transition-all";
    tabSignInBtn.className = "py-2 text-xs font-semibold rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all";
    signUpNameField.classList.remove("hidden");
    emailSubmitBtnText.textContent = "이메일로 회원가입 및 시작";
  } else {
    tabSignInBtn.className = "py-2 text-xs font-semibold rounded-lg bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm transition-all";
    tabSignUpBtn.className = "py-2 text-xs font-semibold rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all";
    signUpNameField.classList.add("hidden");
    emailSubmitBtnText.textContent = "이메일로 로그인";
  }
}

tabSignInBtn.addEventListener("click", () => setAuthTabMode(false));
tabSignUpBtn.addEventListener("click", () => setAuthTabMode(true));

function showAuthError(error) {
  console.error("Auth Error:", error);
  const code = error?.code || "";
  let msg = error?.message || "로그인 처리 중 오류가 발생했습니다.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    msg = "이메일 또는 비밀번호가 올바르지 않습니다. 계정이 없다면 '신규 회원가입' 탭에서 먼저 가입해 주세요.";
  } else if (code === "auth/email-already-in-use") {
    msg = "이미 가입된 이메일 주소입니다. '이메일 로그인' 탭에서 로그인해 주세요.";
  } else if (code === "auth/weak-password") {
    msg = "비밀번호는 최소 6자 이상이어야 합니다.";
  } else if (code === "auth/popup-closed-by-user") {
    msg = "Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.";
  } else if (code === "auth/unauthorized-domain") {
    msg = `현재 도메인(${window.location.hostname})이 Firebase 승인된 도메인에 등록되지 않았습니다. Firebase Console > Authentication > 설정 > 승인된 도메인에 '${window.location.hostname}'을(를) 추가해 주세요.`;
  }
  authErrorBox.textContent = msg;
  authErrorBox.classList.remove("hidden");
}

// --- Google Login ---
googleLoginBtn.addEventListener("click", async () => {
  authErrorBox.classList.add("hidden");
  try {
    await signInWithPopup(auth, googleProvider);
    showToast("Google 계정으로 로그인되었습니다.");
  } catch (err) {
    showAuthError(err);
  }
});

// --- Email/Password Login & Sign-up ---
emailAuthForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authErrorBox.classList.add("hidden");
  const email = authEmail.value.trim();
  const password = authPassword.value;
  const displayName = authDisplayName.value.trim();

  try {
    if (isSignUpMode) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      showToast("회원가입 및 로그인이 완료되었습니다!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("이메일 계정으로 로그인되었습니다.");
    }
    emailAuthForm.reset();
  } catch (err) {
    showAuthError(err);
  }
});

// --- Logout ---
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    showToast("안전하게 로그아웃되었습니다.", "info");
  } catch (err) {
    showToast("로그아웃 중 오류가 발생했습니다.", "error");
  }
});

// --- Sync User Document at users/{userId} ---
async function syncUserProfileDoc(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const fallbackName = user.displayName || (user.email ? user.email.split("@")[0] : "역사 학습자");
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: (user.email || "").slice(0, 320),
        displayName: fallbackName.slice(0, 200),
        photoURL: (user.photoURL || "").slice(0, 2048),
        updatedAt: Date.now()
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("User profile sync warning:", err);
  }
}

// --- Observe Auth State ---
onAuthStateChanged(auth, (user) => {
  initialLoadingView.classList.add("hidden");

  if (unsubscribeNotes) {
    unsubscribeNotes();
    unsubscribeNotes = null;
  }

  if (user) {
    currentUser = user;
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    headerUserArea.classList.remove("hidden");
    headerUserArea.classList.add("flex");

    const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "학습자");
    userNameDisplay.textContent = displayName;
    userEmailDisplay.textContent = user.email || user.uid.slice(0, 8);
    firestorePathBadge.textContent = `users/${user.uid.slice(0, 10)}.../notes`;
    firestorePathBadge.title = `Firestore 경로: users/${user.uid}/notes`;

    if (user.photoURL) {
      userAvatar.src = user.photoURL;
      userAvatar.classList.remove("hidden");
      userAvatarFallback.classList.add("hidden");
    } else {
      userAvatar.classList.add("hidden");
      userAvatarFallback.classList.remove("hidden");
      userAvatarFallback.textContent = displayName.charAt(0).toUpperCase();
    }

    syncUserProfileDoc(user);
    subscribeToUserNotes(user.uid);
  } else {
    currentUser = null;
    allNotes = [];
    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    headerUserArea.classList.add("hidden");
    headerUserArea.classList.remove("flex");
  }
});

// --- Subscribe to Firestore `users/{userId}/notes` ---
function subscribeToUserNotes(uid) {
  const notesColRef = collection(db, "users", uid, "notes");
  unsubscribeNotes = onSnapshot(
    notesColRef,
    (snapshot) => {
      const items = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort newest first by createdAt
      items.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      allNotes = items;
      updateDashboardStats();
      renderNotesView();
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      showToast("데이터를 불러오는 중 권한 또는 네트워크 오류가 발생했습니다.", "error");
    }
  );
}

// --- Update Top Statistics ---
function updateDashboardStats() {
  const total = allNotes.length;
  const mastered = allNotes.filter((n) => Boolean(n.mastered)).length;
  const review = total - mastered;
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  statTotalNotes.textContent = String(total);
  statMasteredCount.innerHTML = `${mastered} <span class="text-xs font-sans font-normal text-slate-400">/ ${total} 완료</span>`;
  statMasteredPercent.textContent = `${pct}%`;
  statProgressBar.style.width = `${pct}%`;
  statReviewCount.textContent = String(review);
}

// --- Filter Notes ---
function getFilteredNotes() {
  return allNotes.filter((note) => {
    if (selectedEra !== "all" && note.era !== selectedEra) return false;
    if (selectedStatus === "mastered" && !note.mastered) return false;
    if (selectedStatus === "learning" && note.mastered) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inTitle = (note.title || "").toLowerCase().includes(q);
      const inContent = (note.content || "").toLowerCase().includes(q);
      const inYear = (note.year || "").toLowerCase().includes(q);
      const inKeywords = Array.isArray(note.keywords) && note.keywords.some((k) => String(k).toLowerCase().includes(q));
      if (!inTitle && !inContent && !inYear && !inKeywords) return false;
    }
    return true;
  });
}

// --- Importance Badge Helper ---
function getImportanceBadge(importance) {
  if (importance === "high") {
    return `<span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">★ 핵심 빈출</span>`;
  }
  if (importance === "low") {
    return `<span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-500/10 text-slate-500 dark:text-slate-400">기본 배경</span>`;
  }
  return `<span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">중요 개념</span>`;
}

// --- Render Active View (Grid / Timeline / Flashcard) ---
function renderNotesView() {
  const filtered = getFilteredNotes();

  notesGridContainer.classList.add("hidden");
  notesTimelineContainer.classList.add("hidden");
  notesFlashcardContainer.classList.add("hidden");

  if (filtered.length === 0) {
    emptyStateView.classList.remove("hidden");
    if (allNotes.length === 0) {
      emptyStateTitle.textContent = "아직 등록된 역사 학습 노트가 없습니다";
      emptyStateDesc.textContent = "직접 첫 번째 역사 사건 노트를 추가하거나, 한국사 핵심 샘플 데이터를 불러와 바로 체험해 보세요!";
      seedSampleNotesBtn.classList.remove("hidden");
    } else {
      emptyStateTitle.textContent = "조건에 맞는 학습 노트가 없습니다";
      emptyStateDesc.textContent = "검색어나 시대/학습 상태 필터를 변경해 보세요.";
      seedSampleNotesBtn.classList.add("hidden");
    }
    return;
  }

  emptyStateView.classList.add("hidden");

  if (currentViewMode === "grid") {
    notesGridContainer.classList.remove("hidden");
    renderGridCards(filtered);
  } else if (currentViewMode === "timeline") {
    notesTimelineContainer.classList.remove("hidden");
    renderTimeline(filtered);
  } else if (currentViewMode === "flashcard") {
    notesFlashcardContainer.classList.remove("hidden");
    renderFlashcard(filtered);
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// --- 1. Render Card Grid ---
function renderGridCards(notes) {
  notesGridContainer.innerHTML = notes
    .map((note) => {
      const keywordsHtml = Array.isArray(note.keywords) && note.keywords.length > 0
        ? `<div class="flex flex-wrap gap-1.5 mt-3">
            ${note.keywords
              .map((kw) => `<span class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">#${escapeHtml(kw)}</span>`)
              .join("")}
          </div>`
        : "";

      const masteredBtnClass = note.mastered
        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
        : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-300";

      return `
        <article class="group p-5 rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.08] hover:border-brand-500/40 dark:hover:border-brand-500/40 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <!-- Card Top Metadata -->
            <div class="flex items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400">${escapeHtml(note.era)}</span>
                ${note.year ? `<span class="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">${escapeHtml(note.year)}</span>` : ""}
              </div>
              ${getImportanceBadge(note.importance)}
            </div>

            <!-- Title -->
            <h3 class="text-base font-bold text-slate-900 dark:text-white leading-snug mb-2 ${note.mastered ? 'line-through decoration-emerald-500/50 text-slate-500 dark:text-slate-400' : ''}">
              ${escapeHtml(note.title)}
            </h3>

            <!-- Content -->
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-5">${escapeHtml(note.content)}</p>

            ${keywordsHtml}
          </div>

          <!-- Card Footer Actions -->
          <div class="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between gap-2">
            <button type="button" data-action="toggle-mastered" data-id="${escapeHtml(note.id)}"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${masteredBtnClass}">
              <i data-lucide="${note.mastered ? 'check-circle-2' : 'circle'}" class="w-3.5 h-3.5"></i>
              <span>${note.mastered ? '암기 완료' : '학습 중'}</span>
            </button>

            <div class="flex items-center gap-1">
              <button type="button" data-action="edit" data-id="${escapeHtml(note.id)}" title="수정"
                class="p-2 rounded-xl text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              <button type="button" data-action="delete" data-id="${escapeHtml(note.id)}" title="삭제"
                class="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

// --- 2. Render Chronological Timeline ---
function renderTimeline(notes) {
  const sorted = [...notes].sort((a, b) => {
    const numA = parseInt((a.year || "").replace(/[^0-9-]/g, ""), 10) || 9999;
    const numB = parseInt((b.year || "").replace(/[^0-9-]/g, ""), 10) || 9999;
    return numA - numB;
  });

  notesTimelineContainer.innerHTML = sorted
    .map((note) => `
      <div class="relative group">
        <div class="w-3.5 h-3.5 rounded-full ${note.mastered ? 'bg-emerald-500' : 'bg-brand-500'} ring-4 ring-slate-50 dark:ring-[#09090b] absolute -left-[31px] sm:-left-[39px] top-1.5"></div>
        <div class="p-5 rounded-2xl bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400">${escapeHtml(note.era)}</span>
              <span class="text-sm font-mono font-bold text-amber-500">${escapeHtml(note.year || '연도 미상')}</span>
              ${getImportanceBadge(note.importance)}
            </div>
            <div class="flex items-center gap-1">
              <button type="button" data-action="toggle-mastered" data-id="${escapeHtml(note.id)}"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold ${note.mastered ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}">
                ${note.mastered ? '✓ 암기 완료' : '학습 중'}
              </button>
              <button type="button" data-action="edit" data-id="${escapeHtml(note.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              <button type="button" data-action="delete" data-id="${escapeHtml(note.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          <h4 class="text-base font-bold mb-1.5">${escapeHtml(note.title)}</h4>
          <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">${escapeHtml(note.content)}</p>
        </div>
      </div>
    `)
    .join("");
}

// --- 3. Render Flashcard Mode ---
function renderFlashcard(notes) {
  if (flashcardIndex >= notes.length) flashcardIndex = 0;
  if (flashcardIndex < 0) flashcardIndex = notes.length - 1;

  const note = notes[flashcardIndex];
  flashcardInner.classList.remove("flip-card-flipped");
  flashcardCounter.textContent = `${flashcardIndex + 1} / ${notes.length}`;
  fcEraBadge.textContent = note.era;
  fcYearBadge.textContent = note.year || "연도 미지정";
  fcTitle.textContent = note.title;
  fcContent.textContent = note.content;

  fcKeywords.innerHTML = Array.isArray(note.keywords)
    ? note.keywords.map((k) => `<span class="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">#${escapeHtml(k)}</span>`).join("")
    : "";

  if (note.mastered) {
    fcMasteredBadge.textContent = "✓ 암기 완료";
    fcMasteredBadge.className = "px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300";
    fcToggleMasteredBtn.textContent = "복습 필요로 변경";
  } else {
    fcMasteredBadge.textContent = "학습 중";
    fcMasteredBadge.className = "px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300";
    fcToggleMasteredBtn.textContent = "암기 완료로 체크";
  }

  fcToggleMasteredBtn.onclick = async (e) => {
    e.stopPropagation();
    await toggleNoteMastered(note.id);
  };
}

flashcardBox.addEventListener("click", () => {
  flashcardInner.classList.toggle("flip-card-flipped");
});

fcPrevBtn.addEventListener("click", () => {
  const filtered = getFilteredNotes();
  if (!filtered.length) return;
  flashcardIndex = (flashcardIndex - 1 + filtered.length) % filtered.length;
  renderFlashcard(filtered);
});

fcNextBtn.addEventListener("click", () => {
  const filtered = getFilteredNotes();
  if (!filtered.length) return;
  flashcardIndex = (flashcardIndex + 1) % filtered.length;
  renderFlashcard(filtered);
});

// --- Delegated Clicks on Grid & Timeline Cards ---
function handleCardActionClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const noteId = btn.dataset.id;
  if (action === "toggle-mastered") {
    toggleNoteMastered(noteId);
  } else if (action === "edit") {
    openEditNoteModal(noteId);
  } else if (action === "delete") {
    deleteStudyNote(noteId);
  }
}

notesGridContainer.addEventListener("click", handleCardActionClick);
notesTimelineContainer.addEventListener("click", handleCardActionClick);

// --- CRUD Operations on Firestore (`users/{userId}/notes/{noteId}`) ---
async function toggleNoteMastered(noteId) {
  if (!currentUser) return;
  const note = allNotes.find((n) => n.id === noteId);
  if (!note) return;
  try {
    const noteRef = doc(db, "users", currentUser.uid, "notes", noteId);
    await updateDoc(noteRef, {
      mastered: !note.mastered,
      updatedAt: Date.now()
    });
    showToast(!note.mastered ? "암기 완료로 표시했습니다!" : "복습 필요 상태로 변경했습니다.", "info");
  } catch (err) {
    console.error("Toggle mastered error:", err);
    showToast("상태 변경 중 오류가 발생했습니다.", "error");
  }
}

async function deleteStudyNote(noteId) {
  if (!currentUser) return;
  const note = allNotes.find((n) => n.id === noteId);
  if (!note) return;
  if (!window.confirm(`'${note.title}' 노트를 정말 삭제하시겠습니까?`)) return;

  try {
    const noteRef = doc(db, "users", currentUser.uid, "notes", noteId);
    await deleteDoc(noteRef);
    showToast("학습 노트가 삭제되었습니다.", "info");
  } catch (err) {
    console.error("Delete note error:", err);
    showToast("삭제 중 오류가 발생했습니다.", "error");
  }
}

// --- Modal Open / Close ---
function openAddNoteModal() {
  noteForm.reset();
  noteIdInput.value = "";
  modalTitle.textContent = "새 역사 학습 노트 추가";
  noteImportanceInput.value = "medium";
  noteModalBackdrop.classList.remove("hidden");
  noteModalBackdrop.classList.add("flex");
  noteTitleInput.focus();
}

function openEditNoteModal(noteId) {
  const note = allNotes.find((n) => n.id === noteId);
  if (!note) return;
  noteIdInput.value = note.id;
  modalTitle.textContent = "역사 학습 노트 수정";
  noteEraInput.value = note.era || "조선";
  noteYearInput.value = note.year || "";
  noteTitleInput.value = note.title || "";
  noteImportanceInput.value = note.importance || "medium";
  noteKeywordsInput.value = Array.isArray(note.keywords) ? note.keywords.join(", ") : "";
  noteContentInput.value = note.content || "";
  noteMasteredInput.checked = Boolean(note.mastered);

  noteModalBackdrop.classList.remove("hidden");
  noteModalBackdrop.classList.add("flex");
  noteTitleInput.focus();
}

function closeNoteModal() {
  noteModalBackdrop.classList.add("hidden");
  noteModalBackdrop.classList.remove("flex");
}

openAddModalBtn.addEventListener("click", openAddNoteModal);
emptyAddNoteBtn.addEventListener("click", openAddNoteModal);
closeNoteModalBtn.addEventListener("click", closeNoteModal);
cancelNoteModalBtn.addEventListener("click", closeNoteModal);
noteModalBackdrop.addEventListener("click", (e) => {
  if (e.target === noteModalBackdrop) closeNoteModal();
});

// --- Create or Update Note Submit ---
noteForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const editingId = noteIdInput.value.trim();
  const title = noteTitleInput.value.trim().slice(0, 200);
  const era = noteEraInput.value.trim().slice(0, 100);
  const year = noteYearInput.value.trim().slice(0, 100);
  const content = noteContentInput.value.trim().slice(0, 5000);
  const importance = ["high", "medium", "low"].includes(noteImportanceInput.value)
    ? noteImportanceInput.value
    : "medium";
  const keywords = noteKeywordsInput.value
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 20);
  const mastered = Boolean(noteMasteredInput.checked);

  if (!title || !era || !content) {
    showToast("필수 항목(시대, 제목, 내용)을 모두 입력해 주세요.", "error");
    return;
  }

  try {
    if (editingId) {
      const noteRef = doc(db, "users", currentUser.uid, "notes", editingId);
      await updateDoc(noteRef, {
        title,
        era,
        year,
        content,
        importance,
        keywords,
        mastered,
        updatedAt: Date.now()
      });
      showToast("학습 노트가 수정되었습니다!");
    } else {
      const notesColRef = collection(db, "users", currentUser.uid, "notes");
      await addDoc(notesColRef, {
        uid: currentUser.uid,
        title,
        era,
        year,
        content,
        importance,
        keywords,
        mastered,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      showToast("새 역사 학습 노트가 저장되었습니다!");
    }
    closeNoteModal();
  } catch (err) {
    console.error("Save note error:", err);
    showToast("저장 중 오류가 발생했습니다.", "error");
  }
});

// --- Seed 5 Sample Korean History Notes ---
seedSampleNotesBtn.addEventListener("click", async () => {
  if (!currentUser) return;
  const samples = [
    {
      era: "고조선·삼국",
      year: "기원전 2333년 (삼국유사 기록)",
      title: "고조선의 건국과 8조법",
      importance: "high",
      keywords: ["단군왕검", "홍익인간", "청동기 문화", "8조법"],
      content: "• 청동기 문화를 배경으로 단군왕검이 건국 (제정일치 사회)\n• 건국 이념: 널리 인간을 이롭게 한다는 '홍익인간(弘益人間)'\n• 8조법: 생명 존중, 노동력 중시, 사유재산 보호 및 계급 사회였음을 보여줌.",
      mastered: false
    },
    {
      era: "고조선·삼국",
      year: "612년 (영양왕 23년)",
      title: "살수대첩과 을지문덕의 활약",
      importance: "high",
      keywords: ["을지문덕", "수 양제", "살수(청천강)", "고구려 대외항쟁"],
      content: "• 배경: 중국을 통일한 수나라 양제가 113만 대군을 동원해 고구려를 침략\n• 전개: 을지문덕 장군이 유도 작전과 '여수장우중문시'로 적을 피로하게 한 뒤 살수(청천강)에서 대파\n• 의의: 고구려가 동북아 세력 균형을 지켜내고 수나라 멸망의 원인이 됨.",
      mastered: true
    },
    {
      era: "남북국·고려",
      year: "993년 (성종 12년)",
      title: "서희의 외교 담판과 강동 6주 확보",
      importance: "high",
      keywords: ["서희", "거란 1차 침입", "소손녕", "강동 6주"],
      content: "• 배경: 거란(요)의 소손녕이 80만 대군을 이끌고 고려를 침입\n• 전개: 서희가 거란의 침입 의도(송과의 단교 요구)를 간파하고 고구려 계승 의식을 내세워 담판\n• 결과: 거란과 교류하는 조건으로 압록강 동쪽 '강동 6주'를 확보하여 영토를 확장함.",
      mastered: false
    },
    {
      era: "조선",
      year: "1443년 창제 · 1446년 반포",
      title: "훈민정음 창제와 민족 문화의 발달",
      importance: "high",
      keywords: ["세종대왕", "집현전", "훈민정음 해례본", "애민정신"],
      content: "• 배경: 한자 사용의 어려움으로 백성들이 뜻을 펴지 못하는 것을 안타깝게 여긴 세종의 애민정신\n• 특징: 발음 기관을 본뜬 과학적 자음과 천·지·인 삼재를 본뜬 모음으로 구성된 독창적 문자\n• 의의: 유네스코 세계기록유산 등재 (훈민정음 해례본).",
      mastered: true
    },
    {
      era: "근현대",
      year: "1919년 3월 1일 ~ 4월",
      title: "3·1 운동과 대한민국 임시정부 수립",
      importance: "high",
      keywords: ["기미독립선언서", "비폭력 만세운동", "대한민국 임시정부", "문화통치"],
      content: "• 배경: 윌슨의 민족자결주의 제창, 도쿄 2·8 독립선언, 고종 황제의 인산일\n• 전개: 도시에서 농촌 및 국외(만주, 연해주, 미주)로 확산된 최대 규모의 항일 독립운동\n• 의의: 일제 통치 방식이 무단통치에서 이른바 '문화통치'로 전환되었고, 상하이 대한민국 임시정부 수립의 계기가 됨.",
      mastered: false
    }
  ];

  try {
    seedSampleNotesBtn.disabled = true;
    const notesColRef = collection(db, "users", currentUser.uid, "notes");
    const now = Date.now();
    for (let i = 0; i < samples.length; i++) {
      const item = samples[i];
      await addDoc(notesColRef, {
        uid: currentUser.uid,
        title: item.title,
        era: item.era,
        year: item.year,
        content: item.content,
        importance: item.importance,
        keywords: item.keywords,
        mastered: item.mastered,
        createdAt: now + i,
        updatedAt: now + i
      });
    }
    showToast("한국사 핵심 샘플 노트 5선이 추가되었습니다!");
  } catch (err) {
    console.error("Seed sample error:", err);
    showToast("샘플 데이터 추가 중 오류가 발생했습니다.", "error");
  } finally {
    seedSampleNotesBtn.disabled = false;
  }
});

// --- Filters & View Switcher Events ---
eraFilterContainer.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-era]");
  if (!btn) return;
  selectedEra = btn.dataset.era;
  eraFilterContainer.querySelectorAll(".era-tab").forEach((el) => {
    if (el.dataset.era === selectedEra) {
      el.className = "era-tab px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-brand-600 text-white shadow-sm transition-all";
    } else {
      el.className = "era-tab px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-slate-100 dark:bg-zinc-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all";
    }
  });
  flashcardIndex = 0;
  renderNotesView();
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  flashcardIndex = 0;
  renderNotesView();
});

statusFilterSelect.addEventListener("change", (e) => {
  selectedStatus = e.target.value;
  flashcardIndex = 0;
  renderNotesView();
});

viewModeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentViewMode = btn.dataset.view;
    viewModeBtns.forEach((b) => {
      if (b.dataset.view === currentViewMode) {
        b.className = "view-mode-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm transition-all";
      } else {
        b.className = "view-mode-btn px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all";
      }
    });
    renderNotesView();
  });
});
