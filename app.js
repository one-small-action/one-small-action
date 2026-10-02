import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* =========================================================
   ONE SMALL ACTION — SUPABASE SETUP
   ========================================================= */

const SUPABASE_URL = "https://sjegjaxluqdwzbexjasu.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Dfh1XAcCDhWTRsFNgo9VqQ_l-LAuv4D";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


/* =========================================================
   APP STATE
   ========================================================= */

let user = null;
let tasks = [];
let timerSeconds = 30 * 60;
let timerInterval = null;
let currentDay = getDayKey();


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function getDayKey() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function showToast(message) {
  const toast = $("toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}


/* =========================================================
   DEFAULT TASKS
   ========================================================= */

const DEFAULT_TASKS = [
  {
    title: "30 minute workout",
    meta: "Move your body and get your energy up.",
    done: false
  },
  {
    title: "30 minute study session",
    meta: "Learn something that moves you forward.",
    done: false
  },
  {
    title: "10 minute reflection",
    meta: "Take a moment to reflect on your day.",
    done: false
  }
];


/* =========================================================
   LOCAL TASKS
   Used when someone isn't logged in.
   ========================================================= */

function getLocalTasks() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("oneSmallActionTasks")
    );

    if (Array.isArray(saved)) {
      return saved;
    }
  } catch (error) {
    console.error(error);
  }

  return DEFAULT_TASKS.map(task => ({ ...task }));
}

function saveLocalTasks() {
  localStorage.setItem(
    "oneSmallActionTasks",
    JSON.stringify(tasks)
  );
}


/* =========================================================
   RENDER TASKS
   ========================================================= */

function renderTasks() {
  const list = $("taskList");

  if (!list) return;

  list.innerHTML = "";

  tasks.forEach((task, index) => {
    const row = document.createElement("div");

    row.className = "task";

    if (task.done) {
      row.classList.add("done");
    }

    const check = document.createElement("button");

    check.className = "check";
    check.type = "button";
    check.textContent = task.done ? "✓" : "";

    const info = document.createElement("div");

    info.className = "task-info";

    const title = document.createElement("div");

    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("div");

    meta.className = "task-meta";
    meta.textContent =
      task.meta || "Your personal action.";

    info.appendChild(title);
    info.appendChild(meta);

    const remove = document.createElement("button");

    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove task";

    check.addEventListener("click", () => {
      toggleTask(task, index);
    });

    remove.addEventListener("click", () => {
      removeTask(task, index);
    });

    row.appendChild(check);
    row.appendChild(info);
    row.appendChild(remove);

    list.appendChild(row);
  });

  updateProgressDisplay();
}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgressDisplay() {
  const completed = tasks.filter(
    task => task.done
  ).length;

  const total = tasks.length;

  const percentage =
    total === 0
      ? 0
      : Math.round((completed / total) * 100);

  if ($("progressText")) {
    $("progressText").textContent =
      `${completed} / ${total}`;
  }

  if ($("percent")) {
    $("percent").textContent =
      `${percentage}%`;
  }

  if ($("fill")) {
    $("fill").style.width =
      `${percentage}%`;
  }
}


/* =========================================================
   TOGGLE TASK
   ========================================================= */

async function toggleTask(task, index) {
  const newValue = !task.done;

  /* Not logged in */
  if (!user) {
    tasks[index].done = newValue;

    saveLocalTasks();

    renderTasks();

    showToast(
      newValue
        ? "Small action complete."
        : "Task reopened."
    );

    return;
  }

  /* Logged in */
  const { error } = await supabase
    .from("daily_tasks")
    .update({
      done: newValue
    })
    .eq("id", task.id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);

    showToast(
      "Couldn't update that task."
    );

    return;
  }

  tasks[index].done = newValue;

  renderTasks();

  showToast(
    newValue
      ? "Small action complete."
      : "Task reopened."
  );
}


/* =========================================================
   REMOVE TASK
   ========================================================= */

async function removeTask(task, index) {
  const confirmed = confirm(
    `Remove "${task.title}"?`
  );

  if (!confirmed) return;

  /* Not logged in */
  if (!user) {
    tasks.splice(index, 1);

    saveLocalTasks();

    renderTasks();

    showToast("Task removed.");

    return;
  }

  /* Logged in */
  const { error } = await supabase
    .from("daily_tasks")
    .delete()
    .eq("id", task.id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);

    showToast(
      "Couldn't remove that task."
    );

    return;
  }

  tasks.splice(index, 1);

  renderTasks();

  showToast("Task removed.");
}


/* =========================================================
   ADD TASK
   ========================================================= */

if ($("addForm")) {
  $("addForm").addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const input = $("newTask");

      if (!input) return;

      const title = input.value.trim();

      if (!title) return;


      /* Not logged in */
      if (!user) {
        tasks.push({
          title: title.slice(0, 80),
          meta: "Your personal action.",
          done: false
        });

        saveLocalTasks();

        renderTasks();

        input.value = "";

        showToast("Action added.");

        return;
      }


      /* Logged in */
      const { data, error } =
        await supabase
          .from("daily_tasks")
          .insert({
            user_id: user.id,
            day: currentDay,
            title: title.slice(0, 80),
            meta: "Your personal action.",
            done: false
          })
          .select()
          .single();

      if (error) {
        console.error(error);

        showToast(
          "Couldn't add that action."
        );

        return;
      }

      tasks.push(data);

      renderTasks();

      input.value = "";

      showToast("Action added.");
    }
  );
}


/* =========================================================
   AUTH UI
   ========================================================= */

function updateAuthUI() {
  const authButton = $("authBtn");
  const userEmail = $("userEmail");

  if (authButton) {
    authButton.textContent =
      user ? "Log out" : "Log in";
  }

  if (userEmail) {
    userEmail.hidden = !user;

    if (user) {
      userEmail.textContent =
        user.user_metadata?.full_name ||
        user.email ||
        "";
    }
  }
}


/* =========================================================
   AUTH DIALOG
   ========================================================= */

function openLogin() {
  const dialog = $("authDialog");

  if (!dialog) return;

  if ($("authTitle")) {
    $("authTitle").textContent =
      "Log in";
  }

  if ($("authIntro")) {
    $("authIntro").textContent =
      "Welcome back. Pick up where you left off.";
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      "Log in";
  }

  if ($("nameField")) {
    $("nameField").hidden = true;
  }

  if ($("emailField")) {
    $("emailField").hidden = false;
  }

  if ($("passwordField")) {
    $("passwordField").hidden = false;
  }

  if ($("authSwitch")) {
    $("authSwitch").hidden = false;
    $("authSwitch").textContent =
      "New here? Create an account";
  }

  if ($("authForgot")) {
    $("authForgot").hidden = false;
  }

  dialog.showModal();
}


function openSignup() {
  const dialog = $("authDialog");

  if (!dialog) return;

  if ($("authTitle")) {
    $("authTitle").textContent =
      "Create your account";
  }

  if ($("authIntro")) {
    $("authIntro").textContent =
      "Save your actions and track your progress.";
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent =
      "Create account";
  }

  if ($("nameField")) {
    $("nameField").hidden = false;
  }

  if ($("emailField")) {
    $("emailField").hidden = false;
  }

  if ($("passwordField")) {
    $("passwordField").hidden = false;
  }

  if ($("authSwitch")) {
    $("authSwitch").hidden = false;
    $("authSwitch").textContent =
      "Already have an account? Log in";
  }

  if ($("authForgot")) {
    $("authForgot").hidden = true;
  }

  dialog.showModal();
}


/* =========================================================
   LOGIN / LOGOUT BUTTON
   ========================================================= */

if ($("authBtn")) {
  $("authBtn").addEventListener(
    "click",
    async () => {

      if (!user) {
        openLogin();
        return;
      }

      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(error);
        showToast("Couldn't log out.");
        return;
      }

      user = null;

      tasks = getLocalTasks();

      updateAuthUI();

      renderTasks();

      showToast("Logged out.");
    }
  );
}


/* =========================================================
   CREATE ACCOUNT BUTTON
   ========================================================= */

if ($("progressSignup")) {
  $("progressSignup").addEventListener(
    "click",
    () => {
      openSignup();
    }
  );
}


/* =========================================================
   CLOSE LOGIN WINDOW
   ========================================================= */

if ($("authClose")) {
  $("authClose").addEventListener(
    "click",
    () => {
      const dialog = $("authDialog");

      if (dialog) {
        dialog.close();
      }
    }
  );
}


/* =========================================================
   SWITCH LOGIN / SIGNUP
   ========================================================= */

if ($("authSwitch")) {
  $("authSwitch").addEventListener(
    "click",
    () => {

      const title =
        $("authTitle")?.textContent || "";

      if (
        title.toLowerCase().includes("create")
      ) {
        openLogin();
      } else {
        openSignup();
      }
    }
  );
}


/* =========================================================
   AUTH FORM
   ========================================================= */

if ($("authForm")) {
  $("authForm").addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const title =
        $("authTitle")?.textContent || "";

      const isSignup =
        title.toLowerCase().includes("create");


      const email =
        $("authEmail")?.value.trim() || "";

      const password =
        $("authPassword")?.value || "";

      const name =
        $("authName")?.value.trim() || "";


      if (!email) {
        showAuthError(
          "Please enter your email."
        );

        return;
      }


      if (!password) {
        showAuthError(
          "Please enter your password."
        );

        return;
      }


      if (password.length < 6) {
        showAuthError(
          "Your password must be at least 6 characters."
        );

        return;
      }


      if ($("authSubmit")) {
        $("authSubmit").disabled = true;
      }


      try {

        /* =========================================
           CREATE ACCOUNT
           ========================================= */

        if (isSignup) {

          const { data, error } =
            await supabase.auth.signUp({
              email,
              password,

              options: {
                data: {
                  full_name: name
                },

                emailRedirectTo:
                  window.location.href
              }
            });


          if (error) {
            throw error;
          }


          const dialog =
            $("authDialog");

          if (dialog) {
            dialog.close();
          }


          if (data.session) {
            showToast(
              "Account created!"
            );
          } else {
            showToast(
              "Check your email to confirm your account."
            );
          }


          return;
        }


        /* =========================================
           LOGIN
           ========================================= */

        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password
          });


        if (error) {
          throw error;
        }


        user = data.user;


        const dialog =
          $("authDialog");

        if (dialog) {
          dialog.close();
        }


        updateAuthUI();

        await loadUserTasks();

        showToast(
          "Welcome back!"
        );

      } catch (error) {

        console.error(error);

        showAuthError(
          getFriendlyAuthError(error)
        );

      } finally {

        if ($("authSubmit")) {
          $("authSubmit").disabled = false;
        }

      }
    }
  );
}


/* =========================================================
   AUTH ERROR
   ========================================================= */

function showAuthError(message) {
  const errorBox = $("authError");

  if (!errorBox) {
    showToast(message);
    return;
  }

  errorBox.textContent = message;
  errorBox.hidden = false;
}


function getFriendlyAuthError(error) {

  const message =
    error?.message || "";

  const lower =
    message.toLowerCase();


  if (
    lower.includes(
      "invalid login credentials"
    )
  ) {
    return "Incorrect email or password.";
  }


  if (
    lower.includes(
      "email not confirmed"
    )
  ) {
    return "Please confirm your email before logging in.";
  }


  if (
    lower.includes(
      "user already registered"
    )
  ) {
    return "An account with that email already exists.";
  }


  if (
    lower.includes(
      "password should be at least"
    )
  ) {
    return "Your password is too short.";
  }


  return message ||
    "Something went wrong. Please try again.";
}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

if ($("authForgot")) {

  $("authForgot").addEventListener(
    "click",
    async () => {

      const email =
        $("authEmail")?.value.trim();

      if (!email) {
        showAuthError(
          "Enter your email address first."
        );

        return;
      }


      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              window.location.href
          }
        );


      if (error) {
        showAuthError(
          getFriendlyAuthError(error)
        );

        return;
      }


      const dialog =
        $("authDialog");

      if (dialog) {
        dialog.close();
      }


      showToast(
        "Check your email for a password reset link."
      );
    }
  );
}


/* =========================================================
   LOAD USER TASKS
   ========================================================= */

async function loadUserTasks() {

  if (!user) {
    tasks = getLocalTasks();

    renderTasks();

    return;
  }


  currentDay = getDayKey();


  const { data, error } =
    await supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("day", currentDay)
      .order("created_at", {
        ascending: true
      });


  if (error) {
    console.error(error);

    showToast(
      "Couldn't load your tasks."
    );

    return;
  }


  if (!data || data.length === 0) {

    const starterTasks =
      DEFAULT_TASKS.map(task => ({
        user_id: user.id,
        day: currentDay,
        title: task.title,
        meta: task.meta,
        done: false
      }));


    const { data: inserted, error: insertError } =
      await supabase
        .from("daily_tasks")
        .insert(starterTasks)
        .select();


    if (insertError) {
      console.error(insertError);

      showToast(
        "Couldn't create your starter tasks."
      );

      return;
    }


    tasks = inserted || [];

  } else {

    tasks = data;

  }


  renderTasks();
}


/* =========================================================
   TIMER
   ========================================================= */

function updateTimerDisplay() {

  const minutes =
    Math.floor(timerSeconds / 60);

  const seconds =
    timerSeconds % 60;


  const formatted =
    `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;


  if ($("timer")) {
    $("timer").textContent =
      formatted;
  }
}


if ($("timerStart")) {

  $("timerStart").addEventListener(
    "click",
    () => {

      if (timerInterval) {

        clearInterval(timerInterval);

        timerInterval = null;

        $("timerStart").textContent =
          "Resume";

        return;
      }


      $("timerStart").textContent =
        "Pause";


      timerInterval =
        setInterval(
          async () => {

            if (timerSeconds <= 0) {

              clearInterval(
                timerInterval
              );

              timerInterval = null;

              $("timerStart").textContent =
                "Start";


              showToast(
                "Focus session complete!"
              );


              if (user) {

                await supabase
                  .from("focus_sessions")
                  .insert({
                    user_id: user.id,
                    day: getDayKey()
                  });

              }


              return;
            }


            timerSeconds--;

            updateTimerDisplay();

          },
          1000
        );

    }
  );
}


if ($("timerReset")) {

  $("timerReset").addEventListener(
    "click",
    () => {

      clearInterval(
        timerInterval
      );

      timerInterval = null;

      timerSeconds = 30 * 60;

      if ($("timerStart")) {
        $("timerStart").textContent =
          "Start";
      }

      updateTimerDisplay();
    }
  );
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

if ($("startDay")) {

  $("startDay").addEventListener(
    "click",
    () => {

      const section =
        $("tasksSection");

      if (section) {
        section.scrollIntoView({
          behavior: "smooth"
        });
      }

    }
  );
}


if ($("scrollTasks")) {

  $("scrollTasks").addEventListener(
    "click",
    () => {

      const section =
        $("tasksSection");

      if (section) {
        section.scrollIntoView({
          behavior: "smooth"
        });
      }

    }
  );
}


/* =========================================================
   DATE
   ========================================================= */

if ($("date")) {

  $("date").textContent =
    new Intl.DateTimeFormat(
      undefined,
      {
        weekday: "short",
        month: "short",
        day: "numeric"
      }
    ).format(new Date());

}


/* =========================================================
   SUPABASE AUTH STATE
   ========================================================= */

supabase.auth.onAuthStateChange(
  async (event, session) => {

    user =
      session?.user || null;


    updateAuthUI();


    if (user) {

      await loadUserTasks();

    } else {

      tasks =
        getLocalTasks();

      renderTasks();

    }

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

(async function initialize() {

  updateTimerDisplay();

  updateAuthUI();


  const { data, error } =
    await supabase.auth.getSession();


  if (error) {
    console.error(error);
    return;
  }


  user =
    data.session?.user || null;


  updateAuthUI();


  if (user) {

    await loadUserTasks();

  } else {

    tasks =
      getLocalTasks();

    renderTasks();

  }

})();
