/* =====================================================================
   app.js - WHAT THE APP DOES

   Sections, in order:
     1. Saving & loading your history
     2. Looking things up in your history
     3. Deciding today's numbers   (the same idea as plan_for_today in Python)
     4. Voice, sound and keeping the screen awake
     5. Timers
     6. Screens: Home, Exercise, Summary, History
     7. Buttons: what each tap does
     8. Starting the app
   ===================================================================== */

"use strict";

// Everything the app is keeping track of right now lives in one object.
const state = {
  screen: "home",           // which screen is showing
  sessions: [],             // every saved workout, oldest first
  picked: new Set(),        // exercises ticked on the home screen
  pickedPhase: null,        // "power", "core", "strength" or null
  workout: null,            // the workout in progress (see startWorkout)
  confirmEnd: false,        // showing the "end workout?" question
  announce: false,          // read the prep for the next exercise shown
  savedTo: null,            // where the last workout was saved
};

const appEl = document.getElementById("app");
const barEl = document.getElementById("action-bar");
const barInner = document.getElementById("actions");

let stopFigure = () => {};   // stops the stick-figure animation
let stopTimers = () => {};   // stops any running timers
let timersRunning = 0;       // how many exercise timers are counting right now


/* =====================================================================
   1. SAVING & LOADING

   Your history is saved in your own private space on your Claude
   account, with a copy on the phone. If the account space isn't
   available, the app keeps working with the phone copy only.
   No passwords or keys are involved anywhere.
   ===================================================================== */

const LOCAL_KEY = "golf-fit.sessions.v1";

const Store = {
  where: "phone",   // becomes "account" once connected
  db: null,
  userId: null,

  readPhone() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
    catch (e) { return []; }
  },

  writePhone(sessions) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(sessions)); }
    catch (e) { /* storage blocked */ }
  },

  async connect() {
    if (!window.claude || !window.claude.use) return false;
    try {
      const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
      if (!db || !user) return false;
      const id = await user.id();
      if (!id) return false;
      this.db = db;
      this.userId = id;
      this.where = "account";
      return true;
    } catch (e) {
      return false;
    }
  },

  // Your private folder. Each workout is one document in it.
  folder() {
    return this.db.collection("data/users/" + this.userId);
  },

  async loadAll() {
    const onPhone = this.readPhone();
    if (!this.db) return onPhone;
    try {
      const snapshot = await this.folder().get();
      const saved = snapshot.docs
        .filter((doc) => doc.id.startsWith("s-"))
        .map((doc) => doc.data());
      const known = new Set(saved.map((s) => s.id));
      for (const session of onPhone) {          // upload phone-only workouts
        if (!known.has(session.id)) {
          await this.folder().doc(session.id).set(session);
          saved.push(session);
        }
      }
      this.writePhone(saved);
      return saved;
    } catch (e) {
      this.where = "phone";
      return onPhone;
    }
  },

  async save(session) {
    const all = this.readPhone().filter((s) => s.id !== session.id);
    all.push(session);
    this.writePhone(all);
    if (!this.db) return "phone";
    try {
      await this.folder().doc(session.id).set(session);
      return "account";
    } catch (e) {
      return "phone";
    }
  },
};


/* =====================================================================
   2. LOOKING THINGS UP IN YOUR HISTORY
   ===================================================================== */

function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }

function exerciseById(id) { return EXERCISES.find((ex) => ex.id === id); }

function inSection(section) { return EXERCISES.filter((ex) => ex.section === section); }

// The most recent result for one exercise (skips are ignored)
function lastResult(id, onlyCounted) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const r = state.sessions[i].results[id];
    if (!r || r.skipped) continue;
    if (onlyCounted && !r.sets) continue;
    return { date: state.sessions[i].date, ...r };
  }
  return null;
}

function lastPhaseDate(phase) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    if (state.sessions[i].phase === phase) return state.sessions[i].date;
  }
  return null;
}

// Suggest the phase you've gone longest without doing
function suggestedPhase() {
  let best = null, bestDate = null;
  for (const phase of ["strength", "core", "power"]) {
    const d = lastPhaseDate(phase);
    if (!d) return phase;
    if (!bestDate || d < bestDate) { best = phase; bestDate = d; }
  }
  return best;
}

function bestSeconds(id) {
  let best = 0;
  for (const s of state.sessions) {
    const r = s.results[id];
    if (r && r.seconds > best) best = r.seconds;
  }
  return best;
}

function daysAgo(isoDate) {
  if (!isoDate) return "Not yet";
  const then = new Date(isoDate), now = new Date();
  const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((dayStart(now) - dayStart(then)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return days + " days ago";
}

function niceDate(isoDate) {
  return new Date(isoDate).toLocaleDateString(undefined,
    { weekday: "short", month: "short", day: "numeric" });
}

// 754 seconds -> "12:34"
function minutes(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}


/* =====================================================================
   3. DECIDING TODAY'S NUMBERS

   Same rules as the Python version:
     - First time: start at the bottom of Jimmy's range.
     - Missed a set last time: same again.
     - Hit every set: add a rep (or seconds), up to the top of the range.
     - At the top with a weight: add weight, reps go back to the bottom.
   ===================================================================== */

function planFor(ex) {
  if (!ex.reps) return null;
  const { low, high } = ex.reps;
  const step = ex.reps.step || 1;
  const startWeight = ex.weight ? ex.weight.start : null;
  const last = lastResult(ex.id, true);

  if (!last) {
    return { target: low, weight: startWeight, reason: "First time: start of the range." };
  }

  const target = last.target;
  const weight = last.weight != null ? last.weight : startWeight;
  const hitEverySet = last.sets.every((done) => done >= target);

  if (!hitEverySet) {
    return { target, weight, reason: "You missed a set last time, so same again." };
  }
  if (target < high) {
    const next = Math.min(target + step, high);
    return { target: next, weight, reason: `Good session last time. Up to ${next} ${ex.unit}.` };
  }
  if (ex.weight && ex.autoWeight !== false && weight != null) {
    return { target: low, weight: weight + ex.weight.step,
      reason: `You hit ${high} on every set. Weight up ${ex.weight.step} lb, reps back to ${low}.` };
  }
  if (low === high) return { target, weight, reason: "Jimmy's prescription." };
  return { target, weight, reason: "Top of the range. Ask Jimmy about the next step." };
}

function goalFor(ex, plan) {
  const { low, high } = ex.reps;
  if (ex.weight && ex.autoWeight !== false && plan.weight != null) {
    if (plan.target < high) return { big: `${high} ${ex.unit}`, small: `at ${plan.weight} lb, then +${ex.weight.step} lb` };
    return { big: `${plan.weight + ex.weight.step} lb`, small: `after ${high} on all ${ex.sets} sets` };
  }
  if (low === high) return { big: `${high}`, small: "Jimmy's number" };
  if (plan.target < high) return { big: `${high} ${ex.unit}`, small: "top of the range" };
  return { big: "Next step", small: "ask Jimmy" };
}


/* =====================================================================
   4. VOICE, SOUND, SCREEN AWAKE

   Three kinds of speaking:
     - prep:      when an exercise opens, she reads what to do
     - reminders: short cues every so often while you work
     - cues:      "Switch sides", "Breathe in" from the timers
   iPhones only allow sound after a tap, so the first tap unlocks it.
   The ringer must be on for beeps.
   ===================================================================== */

function setting(key, fallback) {
  try { const v = localStorage.getItem("golf-fit." + key); return v === null ? fallback : v; }
  catch (e) { return fallback; }
}
function saveSetting(key, value) {
  try { localStorage.setItem("golf-fit." + key, value); } catch (e) {}
}

const SPEEDS = [["Slower", 0.8], ["Normal", 0.9], ["Faster", 1.0]];

const Sound = {
  ctx: null,
  voice: null,
  voiceOn: setting("voice", "on") !== "off",   // timer cues
  readOn: setting("read", "on") !== "off",     // prep + reminders
  rate: parseFloat(setting("rate", "0.9")),

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  beep(freq = 880, ms = 160, delayMs = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delayMs / 1000;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.05);
  },
  tick() { this.beep(1200, 70); },
  go() { this.beep(880, 260); },
  done() { this.beep(880, 150); this.beep(880, 150, 220); this.beep(1320, 380, 440); },

  // Prefer a natural English voice when the phone has one
  pickVoice() {
    if (this.voice || !window.speechSynthesis) return;
    const voices = speechSynthesis.getVoices();
    const liked = ["Samantha", "Ava", "Allison", "Susan", "Zoe", "Karen", "Serena", "Google US English"];
    this.voice = voices.find((v) => liked.some((name) => v.name.includes(name)))
      || voices.find((v) => v.lang && v.lang.startsWith("en-US"))
      || null;
  },

  // interrupt = true stops whatever is being said first
  speak(text, interrupt) {
    if (!window.speechSynthesis || !text) return;
    try {
      this.pickVoice();
      if (interrupt) speechSynthesis.cancel();
      const words = new SpeechSynthesisUtterance(forSpeech(text));
      words.rate = this.rate;
      if (this.voice) words.voice = this.voice;
      speechSynthesis.speak(words);
    } catch (e) { /* no voice available */ }
  },
  isSpeaking() { return !!(window.speechSynthesis && speechSynthesis.speaking); },
  hush() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {} },

  say(text) { if (this.voiceOn) this.speak(text, true); },   // timer cues

  // Prep: name, today's amount, how-to, your notes
  prep(ex, plan) {
    if (!this.readOn) return;
    const lines = [ex.name + "."];
    if (plan) {
      const unit = [ex.unit, ex.side].filter(Boolean).join(", ");
      let today = `Today: ${ex.sets} ${ex.sets === 1 ? "set" : "sets"} of ${plan.target} ${unit}`;
      if (plan.weight != null) today += `, at ${plan.weight} pounds`;
      lines.push(today + ".");
    } else if (ex.dose) {
      lines.push(ex.dose + ".");
    }
    lines.push(...ex.how);
    if (ex.notes.length) lines.push("Your notes: " + ex.notes.join(". ") + ".");
    lines.forEach((line, i) => this.speak(line, i === 0));
  },

  // A reminder only plays if nothing else is being said
  remind(text) { if (this.readOn && !this.isSpeaking()) this.speak(text, false); },
};

// Make text sound right when spoken: "8–10 s" becomes "8 to 10 seconds"
function forSpeech(line) {
  return line
    .replace(/(\d+)\s?–\s?(\d+)/g, "$1 to $2")
    .replace(/(\d+)\s?s\b/g, "$1 seconds")
    .replace(/(\d+)\s?lb\b/g, "$1 pounds")
    .replace(/°/g, " degrees")
    .replace(/×/g, " by ")
    .replace(/2x4/g, "two by four");
}

// Gives the next cue every so often: reminder(secondsSoFar)
function makeReminder(cues, firstAt, every) {
  let next = firstAt, i = 0;
  return (elapsed) => {
    if (!cues || !cues.length || elapsed < next) return;
    next += every;
    Sound.remind(cues[i % cues.length]);
    i++;
  };
}

if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { Sound.voice = null; };

let wakeLock = null;
async function keepScreenOn() {
  try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request("screen"); }
  catch (e) { /* not allowed here; the screen may dim */ }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.workout) keepScreenOn();
});


/* =====================================================================
   5. TIMERS

   Exercise clock: Start when you begin, End when you finish. It records
   how long the exercise took and speaks a reminder every 25 seconds.

   Countdown timers are a list of steps, e.g. for a stretch on each side:
     [ {label: "Get ready", seconds: 5},
       {label: "First side", seconds: 60},
       {label: "Switch sides", seconds: 5},
       {label: "Second side", seconds: 60} ]
   Long steps get spoken reminders too.
   ===================================================================== */

function stepsForTimer(ex, plan, choice) {
  const t = ex.timer;
  const ready = { label: "Get ready", seconds: 5, say: "Get ready" };

  if (t.type === "countdown") {
    const secs = t.useTarget ? plan.target : t.seconds;
    if (!t.perSide) return [ready, { label: "Hold", seconds: secs, say: "Go", remind: true }];
    return [ready,
      { label: "First side", seconds: secs, say: "First side", remind: true },
      { label: "Switch sides", seconds: 5, say: "Switch sides" },
      { label: "Second side", seconds: secs, say: "Second side", remind: true }];
  }

  if (t.type === "breathing") {
    const steps = [ready];
    for (let i = 1; i <= t.rounds; i++) {
      steps.push({ label: `Breathe in · ${i} of ${t.rounds}`, seconds: t.inhale, say: "Breathe in" });
      steps.push({ label: `Breathe out · ${i} of ${t.rounds}`, seconds: t.exhale, say: "Breathe out" });
    }
    return steps;
  }

  if (t.type === "holds") {
    const option = t.options[choice || 0];
    const legs = option.bothLegs ? [""] : ["Right leg", "Left leg"];
    const steps = [];
    legs.forEach((leg, n) => {
      if (n === 0) {
        steps.push({ label: "Get ready", seconds: 6,
          say: leg ? "Get ready. Right leg straight, left knee bent." : "Get ready. Both legs straight." });
      } else {
        steps.push({ label: "Switch legs", seconds: 8, say: "Switch legs. Left leg straight, right knee bent." });
      }
      for (let i = 1; i <= option.reps; i++) {
        const last = option.bothLegs && i === option.reps;
        steps.push({ label: `${leg ? leg + " · " : ""}Hold ${i} of ${option.reps}${last ? " · long hold" : ""}`,
          seconds: last ? 15 : option.hold, say: last ? "Last one. Hold it." : "Up" });
        if (i < option.reps) steps.push({ label: "Down · relax", seconds: option.pause, say: "Down" });
      }
    });
    return steps;
  }

  return [];
}

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return String(s);
  return minutes(s);
}

// Wires up one countdown card. Returns a function that stops it.
function runCountdown(card, getSteps, cues) {
  const labelEl = card.querySelector(".timer-label");
  const clockEl = card.querySelector(".timer-clock");
  const barFill = card.querySelector(".timer-bar div");
  const startBtn = card.querySelector("[data-timer=start]");
  const resetBtn = card.querySelector("[data-timer=reset]");

  let steps = getSteps();
  let index = -1, msLeft = 0, lastTime = 0, interval = null, lastWhole = null, reminder = null;
  const total = () => steps.reduce((sum, s) => sum + s.seconds, 0);

  function setRunning(on) {
    if (on && !interval) { interval = setInterval(loop, 100); timersRunning++; }
    if (!on && interval) { clearInterval(interval); interval = null; timersRunning--; }
  }

  function show() {
    if (index < 0) {
      labelEl.textContent = "Ready when you are";
      const first = steps.find((s) => !s.label.startsWith("Get ready")) || steps[0];
      clockEl.textContent = formatClock(first ? first.seconds : 0);
      barFill.style.width = "0%";
      return;
    }
    labelEl.textContent = steps[index].label;
    clockEl.textContent = formatClock(msLeft / 1000);
    const done = steps.slice(0, index).reduce((sum, s) => sum + s.seconds, 0)
      + steps[index].seconds - msLeft / 1000;
    barFill.style.width = Math.min(100, (done / total()) * 100) + "%";
  }

  function enterStep(i) {
    index = i;
    msLeft = steps[i].seconds * 1000;
    lastWhole = null;
    reminder = steps[i].remind && steps[i].seconds >= 30 ? makeReminder(cues, 12, 15) : null;
    Sound.go();
    if (Sound.voiceOn) Sound.say(steps[i].say); else Sound.hush();
  }

  function loop() {
    const now = performance.now();
    msLeft -= now - lastTime;
    lastTime = now;
    const whole = Math.ceil(msLeft / 1000);
    if (whole !== lastWhole && whole <= 3 && whole > 0 && steps[index].seconds >= 8) Sound.tick();
    lastWhole = whole;
    if (reminder && msLeft > 6000) reminder(steps[index].seconds - msLeft / 1000);
    if (msLeft <= 0) {
      if (index < steps.length - 1) enterStep(index + 1);
      else return finish();
    }
    show();
  }

  function finish() {
    setRunning(false);
    index = -1;
    labelEl.textContent = "Done!";
    clockEl.textContent = "✓";
    barFill.style.width = "100%";
    startBtn.textContent = "Start again";
    Sound.done();
    Sound.say("Done");
  }

  startBtn.addEventListener("click", () => {
    Sound.unlock();
    if (interval) {                          // running: pause
      setRunning(false);
      Sound.hush();
      startBtn.textContent = "Resume";
      return;
    }
    if (index < 0) { steps = getSteps(); enterStep(0); }
    lastTime = performance.now();
    setRunning(true);
    startBtn.textContent = "Pause";
    show();
  });

  resetBtn.addEventListener("click", () => {
    setRunning(false);
    Sound.hush();
    steps = getSteps();
    index = -1;
    startBtn.textContent = "Start";
    show();
  });

  show();
  return () => setRunning(false);
}

// A stopwatch counts up. "onStop" receives the seconds.
function runStopwatch(card, onStop, cues) {
  const labelEl = card.querySelector(".timer-label");
  const clockEl = card.querySelector(".timer-clock");
  const startBtn = card.querySelector("[data-timer=start]");
  const resetBtn = card.querySelector("[data-timer=reset]");
  let startedAt = 0, interval = null, seconds = 0, reminder = null;

  function show() { clockEl.textContent = formatClock(seconds); }
  function stopCounting() { if (interval) { clearInterval(interval); interval = null; timersRunning--; } }

  startBtn.addEventListener("click", () => {
    Sound.unlock();
    if (interval) {
      stopCounting();
      seconds = Math.floor(seconds);
      labelEl.textContent = `Stopped at ${seconds} s`;
      startBtn.textContent = "Start";
      Sound.hush();
      Sound.done();
      if (onStop) onStop(seconds);
      show();
      return;
    }
    Sound.go();
    Sound.say("Go");
    reminder = makeReminder(cues, 10, 15);
    startedAt = performance.now();
    labelEl.textContent = "Holding…";
    startBtn.textContent = "Stop";
    timersRunning++;
    interval = setInterval(() => {
      seconds = (performance.now() - startedAt) / 1000;
      reminder(seconds);
      show();
    }, 200);
  });

  resetBtn.addEventListener("click", () => {
    stopCounting();
    Sound.hush();
    seconds = 0;
    labelEl.textContent = "Tap Start, then Stop when you're done";
    startBtn.textContent = "Start";
    show();
  });

  show();
  return stopCounting;
}

// The workout clock: one Start / Stop for the whole workout.
// It shows on every exercise page and keeps counting as you move on.
// While it runs, each page speaks a short reminder every 25 seconds.
function workoutSeconds(w) {
  return w.clockTotal + (w.clockStartedAt ? (Date.now() - w.clockStartedAt) / 1000 : 0);
}

function runWorkoutClock(ex) {
  const w = state.workout;
  const clockEl = document.getElementById("wo-clock");
  const btn = document.getElementById("wo-clock-btn");
  const pageOpened = Date.now();
  const reminder = makeReminder(ex.cues, 20, 25);

  function show() {
    clockEl.textContent = minutes(workoutSeconds(w));
    if (w.clockStartedAt) { btn.textContent = "Stop"; btn.classList.add("btn-primary"); btn.classList.remove("btn-flag"); }
    else { btn.textContent = w.clockTotal ? "Resume" : "Start workout"; btn.classList.add("btn-flag"); btn.classList.remove("btn-primary"); }
  }

  const interval = setInterval(() => {
    // reminders only while the clock runs and no other timer is talking
    if (w.clockStartedAt && timersRunning === 0) reminder((Date.now() - pageOpened) / 1000);
    show();
  }, 500);

  btn.addEventListener("click", () => {
    Sound.unlock();
    if (w.clockStartedAt) {
      w.clockTotal = workoutSeconds(w);
      w.clockStartedAt = null;
      Sound.done();
    } else {
      w.clockStartedAt = Date.now();
      Sound.go();
    }
    show();
  });

  show();
  return () => clearInterval(interval);
}


/* =====================================================================
   6. SCREENS

   Each screen is built as text (HTML) and placed into the page.
   esc() makes text safe to put into HTML.
   ===================================================================== */

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setActions(buttons) {
  barInner.innerHTML = buttons.map((b) =>
    `<button class="btn ${b.kind || ""}" data-act="${b.act}" ${b.disabled ? "disabled" : ""}>${esc(b.label)}</button>`
  ).join("");
  barEl.hidden = buttons.length === 0;
}

function render() {
  stopFigure(); stopTimers();
  stopFigure = () => {}; stopTimers = () => {};
  timersRunning = 0;
  if (state.screen === "home") renderHome();
  if (state.screen === "exercise") renderExercise();
  if (state.screen === "summary") renderSummary();
  if (state.screen === "history") renderHistory();
}

function go(screen) {
  state.screen = screen;
  if (screen !== "exercise") Sound.hush();
  render();
  window.scrollTo(0, 0);
}

/* ---------- HOME ---------- */

// One tappable row: number circle, name, when you last did it
function pickRow(ex) {
  const last = lastResult(ex.id, false);
  return `
    <button class="hole" data-act="toggleItem" data-id="${ex.id}" aria-pressed="${state.picked.has(ex.id)}">
      <span class="hole-num ${ex.label.length > 1 ? "two" : ""}">${esc(ex.label)}</span>
      <span class="hole-name">${esc(ex.name)}</span>
      <span class="hole-last">${daysAgo(last && last.date)}</span>
    </button>`;
}

function renderHome() {
  const suggestion = suggestedPhase();
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = state.sessions.filter((s) => new Date(s.date).getTime() > weekAgo).length;
  const warmups = inSection("front9").filter((ex) => ex.label.startsWith("W"));
  const nine = inSection("front9").filter((ex) => !ex.label.startsWith("W"));

  const phaseButtons = ["power", "core", "strength"].map((phase) => `
    <button class="phase-btn phase-${phase}" data-act="pickPhase" data-phase="${phase}"
            aria-pressed="${state.pickedPhase === phase}">
      ${phase === suggestion ? '<span class="suggest">Next up</span>' : ""}
      <span class="phase-name">${SECTIONS[phase].name}</span>
      <span class="phase-last">${daysAgo(lastPhaseDate(phase))}</span>
    </button>`).join("");

  const phaseList = state.pickedPhase ? `
    <p class="small muted">Untick any you're skipping today.</p>
    <div class="scorecard phase-${state.pickedPhase}">${inSection(state.pickedPhase).map(pickRow).join("")}</div>` : "";

  const speedButtons = SPEEDS.map(([name, rate]) =>
    `<button class="choice" data-act="speed" data-rate="${rate}" aria-pressed="${Sound.rate === rate}">${name}</button>`).join("");

  const count = selectedList().length;

  appEl.innerHTML = `
    <div class="screen">
      <header class="masthead">
        <div>
          <div class="eyebrow">Jimmy's program · Oct 2026</div>
          <h1>Golf Fitness Log</h1>
        </div>
        <div class="count">${state.sessions.length} sessions<br>${thisWeek} this week · goal 3</div>
      </header>

      <section class="card">
        <div class="row-between">
          <h2>Warm-up</h2>
          <button class="btn-ghost btn-small" data-act="allOf" data-group="warm">Select all</button>
        </div>
        <div class="scorecard">${warmups.map(pickRow).join("")}</div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Front Nine</h2>
          <button class="btn-ghost btn-small" data-act="allOf" data-group="nine">Select all</button>
        </div>
        <p class="small muted">Tick the stretches you'll do today.</p>
        <div class="scorecard">${nine.map(pickRow).join("")}</div>
      </section>

      <section class="card">
        <div class="row-between">
          <h2>Plus one phase</h2>
          <span class="small muted">Tap again to skip</span>
        </div>
        <div class="phase-grid">${phaseButtons}</div>
        ${phaseList}
      </section>

      <section class="card">
        <h3>Voice & sound</h3>
        <p class="small muted">Turn the ringer on, or the beeps stay silent.</p>
        <div class="row-between">
          <span>Speaking speed</span>
          <div class="choice-row">${speedButtons}</div>
        </div>
        <div class="row-between">
          <span>Read instructions & reminders</span>
          <button class="btn btn-small" data-act="toggleRead">${Sound.readOn ? "On" : "Off"}</button>
        </div>
        <div class="row-between">
          <span>Timer cues ("switch sides")</span>
          <button class="btn btn-small" data-act="toggleVoice">${Sound.voiceOn ? "On" : "Off"}</button>
        </div>
        <button class="btn btn-small" data-act="testSound">Test voice & beeps</button>
      </section>

      <p class="status-line">${Store.where === "account"
        ? "History is saved to your Claude account."
        : "History is saved on this phone."}</p>
    </div>`;

  setActions([
    { label: "History", act: "showHistory" },
    { label: count ? `Start · ${count} exercises` : "Pick exercises", act: "start", kind: "btn-primary", disabled: !count },
  ]);
}

// What you ticked, in program order
function selectedList() {
  return EXERCISES.filter((ex) => state.picked.has(ex.id) &&
    (ex.section === "front9" || ex.section === state.pickedPhase));
}

/* ---------- EXERCISE ---------- */

function renderExercise() {
  const w = state.workout;
  const ex = exerciseById(w.list[w.index]);
  const plan = w.plans[ex.id];
  const draft = w.drafts[ex.id];
  const isLast = w.index === w.list.length - 1;
  const where = ex.section === "front9"
    ? (ex.label.startsWith("W") ? `Warm-up · ${ex.label}` : `Front Nine · ${ex.label}`)
    : `${SECTIONS[ex.section].name} phase · ${ex.label}`;

  appEl.innerHTML = `
    <div class="screen">
      <div class="topbar">
        <button class="btn-ghost" data-act="prev">‹ ${w.index ? "Back" : "Home"}</button>
        <span class="progress-text">${w.index + 1} of ${w.list.length}</span>
        <button class="btn-ghost" data-act="askEnd">End</button>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${(w.index / w.list.length) * 100}%"></div></div>
      ${state.confirmEnd ? confirmEndCard() : ""}

      <section class="card ex-clock">
        <div>
          <h3>Workout time</h3>
          <span class="ex-clock-time" id="wo-clock">0:00</span>
        </div>
        <button class="btn btn-flag" id="wo-clock-btn">Start workout</button>
      </section>

      <div class="figure-box" id="figure"></div>

      <div class="title-block">
        <span class="tag phase-${ex.section} tag-${ex.section}">${esc(where)}</span>
        <h1>${esc(ex.name)}</h1>
        ${ex.equipment.length ? `<div class="chips">${ex.equipment.map((e) => `<span class="chip">${esc(e)}</span>`).join("")}</div>` : ""}
      </div>

      ${planCard(ex, plan)}
      ${ex.timer ? timerCard(ex) : ""}

      <section class="card">
        <div class="row-between">
          <h3>How to</h3>
          <button class="btn btn-small" data-act="readHow">Read aloud</button>
        </div>
        <ul class="how">${ex.how.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
      </section>

      ${ex.notes.length ? `
      <section class="card">
        <h3>Your notes</h3>
        <ul class="notes">${ex.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
      </section>` : ""}

      ${ex.reps ? logCard(ex, plan, draft) : ""}
      ${ex.rest ? restCard(ex) : ""}
    </div>`;

  stopFigure = showFigure(document.getElementById("figure"), ex.figure);

  const stops = [runWorkoutClock(ex)];
  const timerEl = appEl.querySelector("[data-timer-card=main]");
  if (timerEl) {
    if (ex.timer.type === "stopwatch") {
      stops.push(runStopwatch(timerEl, ex.timer.record ? (secs) => { draft.seconds = secs; } : null, ex.cues));
    } else {
      stops.push(runCountdown(timerEl, () => stepsForTimer(ex, plan, w.holdChoice), ex.cues));
    }
  }
  const restEl = appEl.querySelector("[data-timer-card=rest]");
  if (restEl) stops.push(runCountdown(restEl, () => [{ label: "Rest", seconds: ex.rest, say: "Rest" }], null));
  stopTimers = () => stops.forEach((stop) => stop());

  setActions([
    { label: "Skip", act: "skip" },
    { label: isLast ? "Done · Finish" : "Done ✓", act: "done", kind: "btn-primary" },
  ]);

  if (state.announce) { state.announce = false; Sound.prep(ex, plan); }
}

function confirmEndCard() {
  return `
    <section class="card confirm">
      <h2>End this workout?</h2>
      <p class="small muted">Saving keeps everything you've marked done so far.</p>
      <div class="timer-buttons">
        <button class="btn btn-primary" data-act="saveEnd">Save & end</button>
        <button class="btn" data-act="discard">Discard</button>
      </div>
      <button class="btn-ghost" data-act="keepGoing">Keep going</button>
    </section>`;
}

function sourceNote(ex) {
  if (ex.draft) return '<span class="check-note">Draft: tell Claude how Jimmy does this one.</span>';
  if (ex.added) return '<span class="check-note">Not on Jimmy\'s sheet. Check the numbers with him.</span>';
  if (ex.check) return '<span class="check-note">Placeholder numbers. Check with Jimmy.</span>';
  return "";
}

function planCard(ex, plan) {
  if (!plan) {
    if (ex.timer && ex.timer.record) {
      const best = bestSeconds(ex.id);
      return `
      <section class="card plan">
        <div><h3>Today</h3><span class="big">${best ? `Beat ${best} s` : "Hold"}</span><span class="small muted">until form breaks</span></div>
        <div class="goal"><h3>Best</h3><span class="big">${best ? best + " s" : "—"}</span><span class="small muted">${best ? "your record" : "set your first"}</span></div>
      </section>`;
    }
    const note = sourceNote(ex);
    return `
      <section class="card plan">
        <div class="dose"><h3>Today</h3><span>${esc(ex.dose)}</span></div>
        ${note ? `<div class="reason">${note}</div>` : ""}
      </section>`;
  }
  const goal = goalFor(ex, plan);
  const unitLine = [ex.unit, ex.side].filter(Boolean).join(" · ");
  const weightLine = plan.weight != null ? ` @ ${plan.weight} lb` : (ex.weight ? " · choose weight" : "");
  const note = sourceNote(ex);
  return `
    <section class="card plan">
      <div>
        <h3>Today</h3>
        <span class="big">${ex.sets} × ${plan.target}</span>
        <span class="small muted">${esc(unitLine + weightLine)}</span>
      </div>
      <div class="goal">
        <h3>Goal</h3>
        <span class="big">${esc(goal.big)}</span>
        <span class="small muted">${esc(goal.small)}</span>
      </div>
      <div class="reason">${esc(plan.reason)}${ex.benchmark ? " · " + esc(ex.benchmark) : ""}
        ${note ? "<br>" + note : ""}</div>
    </section>`;
}

function timerCard(ex) {
  const t = ex.timer;
  const title = { countdown: "Timer", breathing: "Breathing guide", holds: "Hold timer", stopwatch: "Stopwatch" }[t.type];
  const chosen = state.workout.holdChoice || 0;
  const choices = t.options ? `
    <div class="choice-row">
      ${t.options.map((o, i) => `<button class="choice" data-act="holdChoice" data-n="${i}"
         aria-pressed="${chosen === i}">${esc(o.label)}</button>`).join("")}
    </div>` : "";
  return `
    <section class="card timer" data-timer-card="main">
      <h3>${title}</h3>
      ${choices}
      <div class="timer-label">${t.type === "stopwatch" ? "Tap Start, then Stop when you're done" : ""}</div>
      <div class="timer-clock">0</div>
      ${t.type === "stopwatch" ? "" : '<div class="timer-bar"><div></div></div>'}
      <div class="timer-buttons">
        <button class="btn btn-flag" data-timer="start">Start</button>
        <button class="btn" data-timer="reset">Reset</button>
      </div>
    </section>`;
}

function restCard(ex) {
  return `
    <section class="card timer" data-timer-card="rest">
      <h3>Rest between sets · ${ex.rest} s</h3>
      <div class="timer-label"></div>
      <div class="timer-clock">${ex.rest}</div>
      <div class="timer-bar"><div></div></div>
      <div class="timer-buttons">
        <button class="btn btn-flag" data-timer="start">Start</button>
        <button class="btn" data-timer="reset">Reset</button>
      </div>
    </section>`;
}

function logCard(ex, plan, draft) {
  const unitShort = ex.unit === "seconds" ? "s" : ex.unit;
  const weightRow = ex.weight ? `
    <div class="set-row">
      <span class="set-label">Weight</span>
      <div class="stepper">
        <button data-act="weight" data-d="-1" aria-label="Less weight">−</button>
        <input id="weight-${ex.id}" type="number" inputmode="decimal" placeholder="lb"
               value="${draft.weight != null ? draft.weight : ""}" data-act-input="weight">
        <button data-act="weight" data-d="1" aria-label="More weight">+</button>
      </div>
    </div>` : "";
  const setRows = draft.sets.map((n, i) => `
    <div class="set-row">
      <span class="set-label">Set ${i + 1}</span>
      <div class="stepper ${n < plan.target ? "short" : ""}">
        <button data-act="setReps" data-i="${i}" data-d="-1" aria-label="One less">−</button>
        <span class="val">${n}<small>${esc(unitShort)}</small></span>
        <button data-act="setReps" data-i="${i}" data-d="1" aria-label="One more">+</button>
      </div>
    </div>`).join("");
  return `
    <section class="card">
      <h3>Log it</h3>
      ${weightRow}
      ${setRows}
      <p class="small muted">Each set starts at today's target. Tap − if you fell short.</p>
    </section>`;
}

/* ---------- SUMMARY ---------- */

function resultText(ex, r) {
  if (!r || r.skipped) return "Skipped";
  let text = "Done";
  if (r.sets) {
    const unit = ex.unit === "seconds" ? "s" : ex.unit;
    text = r.sets.join(" / ") + " " + unit + (r.weight != null ? ` @ ${r.weight} lb` : "");
  } else if (r.seconds) {
    text = r.seconds + " s hold";
  }
  if (r.duration) text += " · " + minutes(r.duration);
  return text;
}

function resultRows(session) {
  return Object.keys(session.results).map((id) => {
    const ex = exerciseById(id);
    if (!ex) return "";
    const r = session.results[id];
    return `<li class="${r.skipped ? "skipped" : ""}">
      <span class="r-name">${esc(ex.name)}</span><span class="r-val">${esc(resultText(ex, r))}</span></li>`;
  }).join("");
}

function renderSummary() {
  const session = state.lastSaved;
  appEl.innerHTML = `
    <div class="screen">
      <div class="eyebrow">${esc(niceDate(session.date))}</div>
      <h1>Round complete</h1>
      <section class="card saved-banner">${state.savedTo === "account"
        ? "Saved to your Claude account."
        : "Saved on this phone."}</section>
      <section class="card plan">
        <div><h3>Total time</h3><span class="big">${session.totalSeconds ? minutes(session.totalSeconds) : "—"}</span></div>
        <div><h3>Exercises</h3><span class="big">${Object.values(session.results).filter((r) => !r.skipped).length}</span></div>
      </section>
      <section class="card">
        <h3>Today${session.phase ? " · Front Nine + " + SECTIONS[session.phase].name : ""}</h3>
        <ul class="result-list">${resultRows(session)}</ul>
      </section>
    </div>`;
  setActions([
    { label: "History", act: "showHistory" },
    { label: "Back to start", act: "home", kind: "btn-primary" },
  ]);
}

/* ---------- HISTORY ---------- */

function renderHistory() {
  const front = inSection("front9");
  const tallyRows = front.map((ex) => {
    const times = state.sessions.filter((s) => s.results[ex.id] && !s.results[ex.id].skipped).length;
    const last = lastResult(ex.id, false);
    return `<tr><td>${esc(ex.label)}</td><td>${esc(ex.name)}</td>
      <td class="num">${times}</td><td class="num">${esc(daysAgo(last && last.date))}</td></tr>`;
  }).join("");

  const phaseRows = ["power", "core", "strength"].map((p) => {
    const times = state.sessions.filter((s) => s.phase === p).length;
    return `<tr><td colspan="2">${SECTIONS[p].name}</td><td class="num">${times}</td>
      <td class="num">${esc(daysAgo(lastPhaseDate(p)))}</td></tr>`;
  }).join("");

  const sessions = state.sessions.slice().reverse().map((s) => {
    const holes = front.map((ex) => `<span class="mini-hole ${s.results[ex.id] && !s.results[ex.id].skipped ? "on" : ""}">
      ${esc(ex.label)}</span>`).join("");
    return `
      <section class="card">
        <div class="session-head">
          <h2>${esc(niceDate(s.date))}</h2>
          <span class="small muted">${s.totalSeconds ? minutes(s.totalSeconds) : ""}</span>
          ${s.phase ? `<span class="tag phase-${s.phase}">${SECTIONS[s.phase].name}</span>` : ""}
        </div>
        <div class="mini-holes" aria-label="Warm-up and Front Nine done">${holes}</div>
        <ul class="result-list">${resultRows(s)}</ul>
      </section>`;
  }).join("");

  const backupCard = `
    <section class="card">
      <h3>Backup</h3>
      <p class="small muted">Copy your history and paste it into Notes to keep it safe,
        or to move it into the app on another phone or your home screen.</p>
      <div class="timer-buttons">
        <button class="btn" data-act="copyBackup" ${state.sessions.length ? "" : "disabled"}>Copy backup</button>
        <button class="btn" data-act="showRestore">Restore</button>
      </div>
      <div id="backup-area" class="backup-area" hidden>
        <textarea id="backup-text" rows="5" placeholder="Paste your backup here"></textarea>
        <button class="btn btn-primary" id="restore-btn" data-act="restore">Restore these workouts</button>
      </div>
      <p class="small" id="backup-status" aria-live="polite"></p>
    </section>`;

  appEl.innerHTML = `
    <div class="screen">
      <div class="topbar"><button class="btn-ghost" data-act="home">‹ Home</button><span></span><span></span></div>
      <h1>History</h1>
      ${backupCard}
      ${state.sessions.length ? `
      <section class="card">
        <h3>How often you do each one</h3>
        <div style="overflow-x:auto">
          <table class="tally">
            <thead><tr><th>#</th><th>Exercise</th><th class="num">Times</th><th class="num">Last</th></tr></thead>
            <tbody>${tallyRows}${phaseRows}</tbody>
          </table>
        </div>
      </section>
      ${sessions}` : `
      <section class="card empty">
        <h2>No workouts yet</h2>
        <p>Finish your first workout and it shows up here, with which stretches you did, your sets, weights and times.</p>
      </section>`}
    </div>`;
  setActions([{ label: "Back to start", act: "home", kind: "btn-primary" }]);
}


/* =====================================================================
   7. BUTTONS

   Every button has data-act="name". One listener catches all taps and
   runs the matching function from this list.
   ===================================================================== */

function startWorkout() {
  const list = selectedList();
  const plans = {}, drafts = {};
  for (const ex of list) {
    const plan = planFor(ex);
    plans[ex.id] = plan;
    drafts[ex.id] = {
      sets: plan ? Array(ex.sets).fill(plan.target) : null,
      weight: plan ? plan.weight : null,
      seconds: null,
    };
  }
  state.workout = {
    id: "s-" + Date.now(),
    date: new Date().toISOString(),
    startedAt: Date.now(),
    clockTotal: 0, clockStartedAt: null,   // the workout clock
    phase: state.pickedPhase,
    list: list.map((ex) => ex.id),
    index: 0, plans, drafts, results: {},
  };
  state.announce = true;
  keepScreenOn();
  go("exercise");
}

function recordCurrent(skipped) {
  const w = state.workout;
  const ex = exerciseById(w.list[w.index]);
  const draft = w.drafts[ex.id];
  let r;
  if (skipped) r = { skipped: true };
  else if (ex.reps) r = { sets: draft.sets.slice(), target: w.plans[ex.id].target, weight: draft.weight };
  else if (draft.seconds) r = { seconds: draft.seconds };
  else r = { done: true };
  w.results[ex.id] = r;
}

async function finishWorkout() {
  const w = state.workout;
  // use the workout clock if you started it; otherwise time since you tapped Start
  const clocked = workoutSeconds(w);
  const session = { id: w.id, date: w.date, phase: w.phase, results: w.results,
    totalSeconds: Math.round(clocked > 0 ? clocked : (Date.now() - w.startedAt) / 1000) };
  state.savedTo = await Store.save(session);
  state.sessions = state.sessions.filter((s) => s.id !== session.id).concat(session).sort(byDate);
  state.lastSaved = session;
  state.workout = null;
  state.confirmEnd = false;
  state.picked.clear();
  state.pickedPhase = null;
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  go("summary");
  if (Sound.voiceOn) Sound.speak("Workout complete. Nice work.", true);
}

function nextExercise() {
  const w = state.workout;
  state.confirmEnd = false;
  if (w.index < w.list.length - 1) {
    w.index++;
    state.announce = true;
    go("exercise");
  } else {
    finishWorkout();
  }
}

function currentExercise() { return exerciseById(state.workout.list[state.workout.index]); }

const actions = {
  toggleItem(btn) {
    const id = btn.dataset.id;
    if (state.picked.has(id)) state.picked.delete(id); else state.picked.add(id);
    render();
  },
  allOf(btn) {
    const warm = btn.dataset.group === "warm";
    const group = inSection("front9").filter((ex) => ex.label.startsWith("W") === warm);
    const allOn = group.every((ex) => state.picked.has(ex.id));
    group.forEach((ex) => allOn ? state.picked.delete(ex.id) : state.picked.add(ex.id));
    render();
  },
  pickPhase(btn) {
    const phase = btn.dataset.phase;
    if (state.pickedPhase) inSection(state.pickedPhase).forEach((ex) => state.picked.delete(ex.id));
    if (state.pickedPhase === phase) {
      state.pickedPhase = null;
    } else {
      state.pickedPhase = phase;
      inSection(phase).forEach((ex) => state.picked.add(ex.id));   // all ticked to start
    }
    render();
  },
  speed(btn) { Sound.rate = parseFloat(btn.dataset.rate); saveSetting("rate", Sound.rate); render(); actions.testSound(); },
  testSound() {
    Sound.unlock(); Sound.done();
    Sound.speak("This is how I'll sound during your workout. Switch sides.", true);
  },
  toggleVoice() { Sound.voiceOn = !Sound.voiceOn; saveSetting("voice", Sound.voiceOn ? "on" : "off"); render(); },
  toggleRead() { Sound.readOn = !Sound.readOn; saveSetting("read", Sound.readOn ? "on" : "off"); render(); },
  start() { Sound.unlock(); startWorkout(); },

  readHow() {
    Sound.unlock();
    const was = Sound.readOn;
    Sound.readOn = true;
    Sound.prep(currentExercise(), state.workout.plans[currentExercise().id]);
    Sound.readOn = was;
  },

  done() { recordCurrent(false); nextExercise(); },
  skip() { recordCurrent(true); nextExercise(); },
  prev() {
    if (state.workout.index === 0) { state.workout = null; go("home"); return; }
    state.workout.index--;
    state.announce = true;
    go("exercise");
  },
  askEnd() { state.confirmEnd = true; render(); },
  keepGoing() { state.confirmEnd = false; render(); },
  saveEnd() {
    if (Object.keys(state.workout.results).length === 0) return actions.discard();
    finishWorkout();
  },
  discard() { state.workout = null; state.confirmEnd = false; go("home"); },

  setReps(btn) {
    const ex = currentExercise();
    const draft = state.workout.drafts[ex.id];
    const step = (ex.reps.step || 1) * Number(btn.dataset.d);
    const i = Number(btn.dataset.i);
    draft.sets[i] = Math.max(0, draft.sets[i] + step);
    updateLogInPlace(ex);
  },
  weight(btn) {
    const ex = currentExercise();
    const draft = state.workout.drafts[ex.id];
    const current = draft.weight != null ? draft.weight : 0;
    draft.weight = Math.max(0, current + ex.weight.step * Number(btn.dataset.d));
    document.getElementById("weight-" + ex.id).value = draft.weight;
  },
  holdChoice(btn) {
    state.workout.holdChoice = Number(btn.dataset.n);
    appEl.querySelectorAll("[data-act=holdChoice]").forEach((b) =>
      b.setAttribute("aria-pressed", String(b === btn)));
    const reset = appEl.querySelector("[data-timer-card=main] [data-timer=reset]");
    if (reset) reset.click();
  },

  // BACKUP: your whole history as text you can copy and paste
  copyBackup() {
    const text = JSON.stringify({ app: "golf-fit", version: 1, sessions: state.sessions });
    const status = document.getElementById("backup-status");
    const showText = () => {
      document.getElementById("backup-area").hidden = false;
      document.getElementById("restore-btn").hidden = true;
      const box = document.getElementById("backup-text");
      box.value = text;
      box.select();
      status.textContent = "Select all of the text above and copy it.";
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { status.textContent = `Copied ${state.sessions.length} workouts. Paste them into a note to keep.`; })
        .catch(showText);
    } else {
      showText();
    }
  },
  showRestore() {
    document.getElementById("backup-area").hidden = false;
    document.getElementById("restore-btn").hidden = false;
    const box = document.getElementById("backup-text");
    box.value = "";
    box.focus();
    document.getElementById("backup-status").textContent = "Paste a backup, then tap Restore.";
  },
  async restore() {
    const status = document.getElementById("backup-status");
    let incoming;
    try {
      incoming = JSON.parse(document.getElementById("backup-text").value).sessions;
      if (!Array.isArray(incoming)) throw new Error("no sessions");
    } catch (e) {
      status.textContent = "That doesn't look like a backup from this app. Copy it again and paste the whole thing.";
      return;
    }
    const known = new Set(state.sessions.map((s) => s.id));
    const fresh = incoming.filter((s) => s && typeof s.id === "string" && s.id.startsWith("s-")
      && s.date && s.results && !known.has(s.id));
    for (const session of fresh) await Store.save(session);
    state.sessions = state.sessions.concat(fresh).sort(byDate);
    render();
    document.getElementById("backup-status").textContent =
      fresh.length ? `Restored ${fresh.length} workouts.` : "Nothing new: those workouts are already here.";
  },

  showHistory() { go("history"); },
  home() { go("home"); },
};

// Change the set numbers without redrawing the screen,
// so running timers keep going while you log.
function updateLogInPlace(ex) {
  const draft = state.workout.drafts[ex.id];
  const target = state.workout.plans[ex.id].target;
  const unit = ex.unit === "seconds" ? "s" : ex.unit;
  appEl.querySelectorAll("[data-act=setReps][data-d='-1']").forEach((btn) => {
    const i = Number(btn.dataset.i);
    const stepper = btn.parentElement;
    stepper.classList.toggle("short", draft.sets[i] < target);
    stepper.querySelector(".val").innerHTML = `${draft.sets[i]}<small>${esc(unit)}</small>`;
  });
}

document.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-act]");
  if (!btn || btn.disabled) return;
  const handler = actions[btn.dataset.act];
  if (handler) handler(btn);
});

document.addEventListener("input", (event) => {
  if (event.target.dataset.actInput !== "weight" || !state.workout) return;
  const value = parseFloat(event.target.value);
  state.workout.drafts[currentExercise().id].weight = isNaN(value) ? null : value;
});


/* =====================================================================
   8. STARTING THE APP
   ===================================================================== */

async function boot() {
  state.sessions = Store.readPhone().sort(byDate);
  render();
  const connected = await Store.connect();
  if (connected) state.sessions = (await Store.loadAll()).sort(byDate);
  if (state.screen === "home" || state.screen === "history") render();
}

boot();
