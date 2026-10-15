/* COACH control-panel app. A read-mostly PWA, twin of the athlete app: it reads every athlete's
 * published plan/zones from Supabase and sends/reads messages. It does NOT compute plans, create
 * athletes or move workouts (all that stays on the PC webapp). The coach's broad access comes from
 * signing in as the coach + the is_coach() Row-Level-Security policies — never a secret key here.
 * Built by copying the athlete app so the UI stays identical; shared files (styles.css, vendored
 * supabase.js) are kept byte-identical and checked by tools/check-ui-sync.sh. Vanilla JS, no build.
 * UI is English by default; the Settings page switches theme (auto/light/dark) and language (en/it). */
(function () {
  "use strict";

  const APP_VERSION = "1.2.0";          // shown in the settings menu; keep in step with CHANGELOG.md
  let pendingReload = false;            // set when the coach taps "update"; drives the one reload below
  const CFG = window.IRONMAN_CONFIG || {};
  // "Remember me on this device": when on, the session lives in localStorage and survives app
  // restarts; when off, it lives in sessionStorage and is gone once the app is closed. The backend
  // is chosen live per read/write from the saved flag, so the login checkbox takes effect for the
  // session it creates. Every access is guarded for private mode.
  function rememberOn() { try { return localStorage.getItem("remember") !== "0"; } catch (e) { return true; } }
  const authStorage = {
    getItem(k) { try { return (rememberOn() ? localStorage : sessionStorage).getItem(k); } catch (e) { return null; } },
    setItem(k, v) { try { (rememberOn() ? localStorage : sessionStorage).setItem(k, v); } catch (e) { /* private mode */ } },
    removeItem(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  // The vendored Supabase library must have loaded before this runs (index.html loads it first). If a
  // precache gap ever serves something else in its place, fail with a readable message instead of a
  // silent white page -- createClient would otherwise throw at module load and nothing would render.
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    try {
      document.getElementById("app").innerHTML =
        '<div class="boot err">Couldn\'t load a required file. Reconnect once and reopen the app.</div>';
    } catch (e) { /* ignore */ }
    return;
  }
  const SB = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, detectSessionInUrl: false, autoRefreshToken: true, storage: authStorage },
  });

  // ---------- i18n ----------
  const STR = {
    en: {
      brand: "Ironman Coach", signout: "Sign out", back: "Back", settings: "Settings", menu: "Menu",
      nav_roster: "Athletes", nav_plan: "Plan", nav_zones: "Zones", nav_account: "Account", nav_settings: "Settings",
      roster_title: "Athletes", no_athletes: "No athletes yet — publish an athlete from the PC app and they'll appear here.",
      last_seen_ago: "last seen {when}", never_seen: "not signed in yet", online_now: "online now",
      not_coach_title: "Not a coach account", not_coach_sub: "You're signed in as {email}, but this login isn't set up as a coach. Sign in with your coach account.",
      compose_title: "Message athletes", to_label: "To", to_all: "All athletes",
      msg_sent_n: "Sent to {n}.", choose_recipient: "Choose who to message.",
      inbox_title: "Messages", inbox_from: "From {name}", view_test_result: "Test result", no_test_result: "No result submitted yet.",
      edit_session: "Edit this session", move_to_day: "Day", duration_min: "Duration (min)",
      add_note: "Add a note", note_ph: "e.g. keep it easy, you're flying tomorrow",
      save_edit: "Save change", edit_saved: "Saved — the athlete is notified.", no_change: "Nothing changed.",
      n_session_edit: "Session changed", session_changed_body: "Your coach changed the session on {day} — sync to see it.",
      no_zones: "No test results yet — your zones will appear here once your coach records a test.",
      threshold: "threshold", quest_soon: "You'll fill in your questionnaires here — coming soon.",
      m_hr: "Heart rate", m_power: "Power", m_pace: "Pace",
      quest_loading: "Loading your questionnaire…",
      quest_intro: "Fill this in so your coach can build your plan. You can stop and come back — your answers are saved on this device.",
      quest_review: "Review your answers", review_btn: "Review", send_to_coach: "Send to coach",
      back_edit: "Back to edit", edit_answers: "Edit answers", sending: "Sending…",
      quest_sent: "Sent. Your coach will build your plan — it'll appear under Plan.",
      quest_done: "You've completed your questionnaire. Your coach built your plan — see Plan.",
      quest_offline_fill: "You're offline — your answers are saved. Connect to send them.",
      quest_answer: "Please answer: {q}", coach_only: "For your coach — not used to build the plan",
      yes: "Yes", no: "No", unanswered: "—",
      nav_inbox: "Notifications", notifications: "Notifications", no_messages: "No notifications yet.",
      write_coach: "Message your coach", msg_kind: "About", kind_bug: "A bug / problem", kind_plan: "My training plan",
      msg_send: "Send", msg_sent: "Sent to your coach.", msg_offline: "You're offline — connect to send.",
      select_all: "Select all", deselect: "Deselect", del_selected: "Delete", del_offline: "You're offline — connect to delete.",
      msg_placeholder: "Write your message…",
      n_message: "Message from your coach", n_plan: "Plan updated", n_zones: "Zones updated", n_app: "App updated",
      n_app_available: "Update available", app_available: "A new version of the app is ready — tap to update.",
      app_update_now: "Update now",
      app_updated: "App updated to v{v}.",
      theme: "Theme", theme_auto: "Auto", theme_light: "Light", theme_dark: "Dark", language: "Language",
      account: "Account", signed_in_as: "Signed in as", sync_now: "Sync now", syncing: "Syncing…",
      change_pw: "Change password", new_pw_ph: "New password", save_pw: "Save password",
      pw_saved: "Password updated.", pw_short: "Use at least 6 characters.",
      totals: "Totals", t_plan: "plan", t_done: "done", t_total: "Total",
      sync_updated: "up to date", sync_offline: "offline", sync_offline_q: "offline · {n} queued", sync_send: "{n} to send…",
      login_title: "Coach sign-in",
      login_sub: "Sign in with your coach email and password.",
      email: "Email", email_ph: "you@example.com",
      password: "Password", password_ph: "Your password", remember: "Remember me on this device",
      signin: "Sign in", signing_in: "Signing in…",
      enter_email: "Enter your email.", enter_password: "Enter your password.",
      bad_login: "Wrong email or password, or your coach hasn't set up your login yet.",
      first_login_hint: "First time? Sign in with the temporary password your coach gave you, then change it in Settings.",
      error: "Error: ",
      no_plan: "No plan available yet.",
      no_plan_sub: "If your coach just published, try again shortly (the first load needs a connection).",
      not_conn_title: "Not connected yet",
      not_conn_sub: "You're signed in as {email}, but this email isn't connected to an athlete yet. Ask your coach to connect it, then reopen the app.",
      week_n: "Week {n}", today: "Today", recovery: "recovery", rest: "Rest",
      test_prefix: "Test: ", badge_test: "test", badge_key: "key",
      target: "Target", no_numeric: "No numeric target", use_talk: "Use the talk test:", talk: "talk test:",
      detail: "Detail", nutrition: "Nutrition",
      water_only: "Water only — under an hour the book skips in-session carbohydrate.",
      during: "During", carb_h: "{g} g carb/h", during_note: "{kcal} kcal/h · {total} g total",
      fluids: "Fluids", fluids_v: "{ml} ml/h", sodium: "Sodium", sodium_v: "{mg} mg/h",
      before: "Before", before_2h: "2 h before", before_10m: "up to 10 min before",
      after: "After", within30: "within 30 min",
      multi: "Above 60 g/h you need a glucose + fructose mix: a single sugar cannot be absorbed fast enough.",
      warm_up: "Warm-up", how: "How to do it", measures: "What it measures",
      test_coach: "Record the test result with your coach.",
      test_cta: "View test result",
      test_log_opt: "Session log",
      test_from_session: "This is a test — view the submitted result",
      test_enter: "Enter your result", test_submit: "Send to coach", test_update: "Update result",
      test_submitting: "Sending…",
      test_sent: "Sent. Your coach will review and approve it — your zones update once they do.",
      test_pending: "Already sent, waiting for your coach. You can correct it and send again.",
      test_offline: "You're offline — connect to send your result.",
      test_queued: "Saved on your phone — it'll be sent to your coach when you're back online.",
      test_bad_time: "Enter a time as mm:ss, e.g. 19:20.",
      test_need: "Fill in {field}.", test_conditions: "Conditions (optional)",
      test_indoor: "Done indoors / on a trainer", mmss: "mm:ss",
      log_edit: "Edit log", log_new: "Log the session", done_on: "Done on", planned: " (planned)",
      required: "·required", save_done: "Save as done", save: "Save", mark_skip: "Mark skipped",
      logged: "Logged", skipped: "Skipped", queued: "queued", done_on_s: "done {day}",
      r_duration: "Duration", r_distance: "Distance", r_avghr: "Avg HR", r_power: "Power",
      r_felt: "Felt", r_carb: "Carbs", r_gut: "Gut", r_note: "Note", no_reason: "no reason given",
      moved_note: "Done on another day: the session will move once your coach syncs.",
    },
    it: {
      brand: "Ironman Coach", signout: "Esci", back: "Indietro", settings: "Impostazioni", menu: "Menu",
      nav_roster: "Atleti", nav_plan: "Piano", nav_zones: "Zone", nav_account: "Account", nav_settings: "Impostazioni",
      roster_title: "Atleti", no_athletes: "Nessun atleta ancora — pubblica un atleta dall'app sul PC e comparirà qui.",
      last_seen_ago: "visto {when}", never_seen: "mai entrato", online_now: "online ora",
      not_coach_title: "Non è un account coach", not_coach_sub: "Hai effettuato l'accesso come {email}, ma questo accesso non è impostato come coach. Entra con il tuo account coach.",
      compose_title: "Scrivi agli atleti", to_label: "A", to_all: "Tutti gli atleti",
      msg_sent_n: "Inviato a {n}.", choose_recipient: "Scegli a chi scrivere.",
      inbox_title: "Messaggi", inbox_from: "Da {name}", view_test_result: "Risultato del test", no_test_result: "Nessun risultato inviato ancora.",
      edit_session: "Modifica questa sessione", move_to_day: "Giorno", duration_min: "Durata (min)",
      add_note: "Aggiungi una nota", note_ph: "es. tienila facile, domani voli",
      save_edit: "Salva modifica", edit_saved: "Salvato — l'atleta è avvisato.", no_change: "Nessuna modifica.",
      n_session_edit: "Sessione modificata", session_changed_body: "Il coach ha modificato la sessione del {day} — sincronizza per vederla.",
      no_zones: "Nessun test ancora — le tue zone compariranno qui dopo che il coach registra un test.",
      threshold: "soglia", quest_soon: "Qui compilerai i tuoi questionari — disponibile a breve.",
      m_hr: "Frequenza cardiaca", m_power: "Potenza", m_pace: "Passo",
      quest_loading: "Carico il tuo questionario…",
      quest_intro: "Compila così il coach può costruire il tuo piano. Puoi fermarti e riprendere — le risposte restano salvate su questo dispositivo.",
      quest_review: "Rivedi le risposte", review_btn: "Rivedi", send_to_coach: "Invia al coach",
      back_edit: "Torna a modificare", edit_answers: "Modifica le risposte", sending: "Invio…",
      quest_sent: "Inviato. Il coach costruirà il tuo piano — comparirà in Piano.",
      quest_done: "Hai completato il questionario. Il coach ha costruito il tuo piano — vedi Piano.",
      quest_offline_fill: "Sei offline — le risposte sono salvate. Collegati per inviarle.",
      quest_answer: "Rispondi a: {q}", coach_only: "Per il coach — non usato per costruire il piano",
      yes: "Sì", no: "No", unanswered: "—",
      nav_inbox: "Notifiche", notifications: "Notifiche", no_messages: "Nessuna notifica.",
      write_coach: "Scrivi al coach", msg_kind: "Riguardo", kind_bug: "Un bug / problema", kind_plan: "Il mio piano",
      msg_send: "Invia", msg_sent: "Inviato al coach.", msg_offline: "Sei offline — collegati per inviare.",
      select_all: "Seleziona tutti", deselect: "Deseleziona", del_selected: "Cancella", del_offline: "Sei offline — collegati per cancellare.",
      msg_placeholder: "Scrivi il tuo messaggio…",
      n_message: "Messaggio dal coach", n_plan: "Piano aggiornato", n_zones: "Zone aggiornate", n_app: "App aggiornata",
      n_app_available: "Aggiornamento disponibile", app_available: "È pronta una nuova versione dell'app — tocca per aggiornare.",
      app_update_now: "Aggiorna ora",
      app_updated: "App aggiornata alla v{v}.",
      theme: "Tema", theme_auto: "Auto", theme_light: "Chiaro", theme_dark: "Scuro", language: "Lingua",
      account: "Account", signed_in_as: "Connesso come", sync_now: "Sincronizza ora", syncing: "Sincronizzo…",
      change_pw: "Cambia password", new_pw_ph: "Nuova password", save_pw: "Salva password",
      pw_saved: "Password aggiornata.", pw_short: "Usa almeno 6 caratteri.",
      totals: "Totali", t_plan: "prev.", t_done: "fatto", t_total: "Totale",
      sync_updated: "aggiornato", sync_offline: "offline", sync_offline_q: "offline · {n} in coda", sync_send: "{n} da inviare…",
      login_title: "Accesso coach",
      login_sub: "Accedi con l'email e la password del coach.",
      email: "Email", email_ph: "tu@esempio.com",
      password: "Password", password_ph: "La tua password", remember: "Ricordami su questo dispositivo",
      signin: "Accedi", signing_in: "Accesso…",
      enter_email: "Scrivi la tua email.", enter_password: "Scrivi la password.",
      bad_login: "Email o password errate, oppure il coach non ha ancora creato il tuo accesso.",
      first_login_hint: "Primo accesso? Entra con la password temporanea che ti ha dato il coach, poi cambiala nelle Impostazioni.",
      error: "Errore: ",
      no_plan: "Nessun piano ancora disponibile.",
      no_plan_sub: "Se il coach ha appena pubblicato, riprova tra poco (serve la rete la prima volta).",
      not_conn_title: "Non ancora collegato",
      not_conn_sub: "Hai effettuato l'accesso come {email}, ma questa email non è ancora collegata a un atleta. Chiedi al coach di collegarla, poi riapri l'app.",
      week_n: "Settimana {n}", today: "Oggi", recovery: "recupero", rest: "Riposo",
      test_prefix: "Test: ", badge_test: "test", badge_key: "chiave",
      target: "Target", no_numeric: "Nessun target numerico", use_talk: "Usa il talk test:", talk: "talk test:",
      detail: "Dettaglio", nutrition: "Nutrizione",
      water_only: "Solo acqua — sotto l'ora il libro non prevede carboidrati in sessione.",
      during: "Durante", carb_h: "{g} g carbo/h", during_note: "{kcal} kcal/h · {total} g totali",
      fluids: "Liquidi", fluids_v: "{ml} ml/h", sodium: "Sodio", sodium_v: "{mg} mg/h",
      before: "Prima", before_2h: "2 h prima", before_10m: "fino a 10 min prima",
      after: "Dopo", within30: "entro 30 min",
      multi: "Sopra i 60 g/h serve un mix glucosio + fruttosio: uno zucchero solo non si assorbe abbastanza in fretta.",
      warm_up: "Riscaldamento", how: "Come si fa", measures: "Cosa misura",
      test_coach: "Registra il risultato del test con il coach.",
      test_cta: "Vedi il risultato del test",
      test_log_opt: "Log della sessione",
      test_from_session: "Questo è un test — vedi il risultato inviato",
      test_enter: "Inserisci il risultato", test_submit: "Invia al coach", test_update: "Aggiorna il risultato",
      test_submitting: "Invio…",
      test_sent: "Inviato. Il coach lo esaminerà e approverà — le zone si aggiornano quando lo fa.",
      test_pending: "Già inviato, in attesa del coach. Puoi correggerlo e inviarlo di nuovo.",
      test_offline: "Sei offline — collegati per inviare il risultato.",
      test_queued: "Salvato sul telefono — verrà inviato al coach al ritorno della rete.",
      test_bad_time: "Inserisci un tempo come mm:ss, es. 19:20.",
      test_need: "Compila: {field}.", test_conditions: "Condizioni (facoltativo)",
      test_indoor: "Fatto al chiuso / sui rulli", mmss: "mm:ss",
      log_edit: "Modifica il log", log_new: "Registra la sessione", done_on: "Fatto il giorno", planned: " (previsto)",
      required: "·richiesto", save_done: "Salva come fatto", save: "Salva", mark_skip: "Segna saltato",
      logged: "Registrato", skipped: "Saltato", queued: "in coda", done_on_s: "fatto {day}",
      r_duration: "Durata", r_distance: "Distanza", r_avghr: "FC media", r_power: "Potenza",
      r_felt: "Sensazione", r_carb: "Carboidrati", r_gut: "Stomaco", r_note: "Nota", no_reason: "nessun motivo indicato",
      moved_note: "Fatto un altro giorno: la sessione si sposterà quando il coach sincronizza.",
    },
  };
  const FELT = {
    en: { easy: "easier than planned", as_planned: "about as planned", hard: "harder than planned", cut_short: "had to cut it short" },
    it: { easy: "più facile del previsto", as_planned: "circa come previsto", hard: "più dura del previsto", cut_short: "ho dovuto accorciare" },
  };
  const CAL = {
    en: { WD: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          WD_FULL: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
          MO: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
    it: { WD: ["lun", "mar", "mer", "gio", "ven", "sab", "dom"],
          WD_FULL: ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"],
          MO: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"] },
  };
  function T(key, vars) {
    let s = (STR[S.lang] && STR[S.lang][key]) || STR.en[key] || key;
    if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }
  function feltLabel(v) { return (FELT[S.lang] && FELT[S.lang][v]) || v; }
  function cal() { return CAL[S.lang] || CAL.en; }

  // ---------- tiny helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const topbar = $("#topbar");
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function hhmm(min) {
    min = Math.round(min || 0);
    const h = Math.floor(min / 60), m = min % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}` : `${m} min`;
  }

  // ---------- dates (locale-aware, Monday-first), ISO strings, no timezone drift ----------
  function parseD(iso) { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); }
  function fmtISO(dt) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }
  function todayISO() { return fmtISO(new Date()); }
  function wdIdx(dt) { return (dt.getDay() + 6) % 7; }          // Monday = 0
  function shortDay(iso) { const d = parseD(iso), c = cal(); return `${c.WD[wdIdx(d)]} ${d.getDate()} ${c.MO[d.getMonth()]}`; }
  function longDay(iso) { const d = parseD(iso), c = cal(); return `${c.WD_FULL[wdIdx(d)]} ${d.getDate()} ${c.MO[d.getMonth()]}`; }
  function addDays(iso, n) { const d = parseD(iso); d.setDate(d.getDate() + n); return fmtISO(d); }
  function cap(s) { return s.replace(/^./, (c) => c.toUpperCase()); }

  // ---------- IndexedDB (plan cache + outbound queue) ----------
  let _dbp;
  function db() {
    return _dbp || (_dbp = new Promise((res, rej) => {
      const r = indexedDB.open("ironman-coach", 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("cache")) d.createObjectStore("cache");
        if (!d.objectStoreNames.contains("outbox")) d.createObjectStore("outbox", { keyPath: "key" });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }
  function store(name, mode) { return db().then((d) => d.transaction(name, mode).objectStore(name)); }
  async function idbGet(name, key) { const o = await store(name); return new Promise((res) => { const q = o.get(key); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); }
  async function idbSet(name, key, val) { const o = await store(name, "readwrite"); return new Promise((res) => { o.put(val, key); o.transaction.oncomplete = () => res(); o.transaction.onerror = () => res(); }); }
  async function idbPut(name, val) { const o = await store(name, "readwrite"); return new Promise((res) => { o.put(val); o.transaction.oncomplete = () => res(); o.transaction.onerror = () => res(); }); }
  async function idbAll(name) { const o = await store(name); return new Promise((res) => { const q = o.getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); }
  async function idbDel(name, key) { const o = await store(name, "readwrite"); return new Promise((res) => { o.delete(key); o.transaction.oncomplete = () => res(); o.transaction.onerror = () => res(); }); }
  async function idbClear(name) { const o = await store(name, "readwrite"); return new Promise((res) => { o.clear(); o.transaction.oncomplete = () => res(); o.transaction.onerror = () => res(); }); }

  async function doSignOut() {
    try { await idbClear("cache"); await idbClear("outbox"); } catch (e) { /* ignore */ }
    try { await SB.auth.signOut(); } catch (e) { /* ignore */ }
    location.reload();
  }

  function deviceId() {
    let id = null;
    try { id = localStorage.getItem("device_id"); if (!id) { id = (crypto.randomUUID && crypto.randomUUID()) || ("dev-" + Date.now()); localStorage.setItem("device_id", id); } }
    catch (e) { id = "dev-" + Date.now(); }
    return id;
  }
  function savePref(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function loadPrefs() {
    try { S.lang = localStorage.getItem("lang") || "en"; } catch (e) { S.lang = "en"; }
    try { S.theme = localStorage.getItem("theme") || "auto"; } catch (e) { S.theme = "auto"; }
  }

  // ---------- state ----------
  const S = {
    lang: "en", theme: "auto",
    isCoach: false,
    roster: [], selectedAthleteId: null, selectedName: "",
    athleteId: null, displayName: "", email: "", meta: null, prefs: {},
    weeks: [], sessions: [], tests: [], zones: {},
    logs: {}, outbox: {},
    fieldSpec: {}, weekIdx: null, section: "roster", view: "week", current: null,
    questionSpec: null, intakeResponse: null, intakeDraft: {}, intakeStep: "form", navChosen: false,
    messages: [], appNotice: null, swWaiting: null, submissions: {},
  };
  const lkey = (s) => `${s.on_date}|${s.session_key}`;

  // ================= theme / language / settings =================
  function applyTheme() {
    const r = document.documentElement;
    if (S.theme === "auto") r.removeAttribute("data-theme");
    else r.setAttribute("data-theme", S.theme);
  }
  function applyLang() {
    document.documentElement.lang = S.lang;
    document.title = T("brand");
    const b = $("#brand"); if (b) b.setAttribute("aria-label", T("brand"));
    const w = $(".wordmark"); if (w) w.textContent = T("brand");
    const mb = $("#menu"); if (mb) mb.setAttribute("aria-label", T("menu"));
    const bk = $("#back"); if (bk) bk.setAttribute("aria-label", T("back"));
    const dr = $("#drawer"); if (dr && !dr.hidden) renderDrawer();
    setSync();
  }
  // ---------- side menu (drawer) + section navigation ----------
  const NAV = [["roster", "nav_roster"], ["plan", "nav_plan"], ["zones", "nav_zones"],
               ["account", "nav_account"], ["settings", "nav_settings"]];
  function renderDrawer() {
    const d = $("#drawer");
    d.innerHTML = NAV.map(([k, lbl]) =>
      `<button class="drawitem ${S.section === k ? "active" : ""}" data-sec="${k}">${esc(T(lbl))}</button>`).join("");
    d.querySelectorAll("[data-sec]").forEach((b) =>
      b.addEventListener("click", () => go(b.getAttribute("data-sec"))));
  }
  function openDrawer() { renderDrawer(); $("#drawer").hidden = false; $("#backdrop").hidden = false; }
  function closeDrawer() { const d = $("#drawer"); if (d) d.hidden = true; const bd = $("#backdrop"); if (bd) bd.hidden = true; }
  function go(section) { S.navChosen = true; S.section = section; S.current = null; closeDrawer(); renderSection(); scrollTop(); }

  function renderSection() {
    // Plan and Zones need a chosen athlete; without one, fall back to the roster.
    if ((S.section === "plan" || S.section === "zones") && !S.selectedAthleteId) { renderRoster(); return; }
    if (S.section === "plan") { if (S.current) renderSession(S.current); else renderWeek(); return; }
    $("#back").hidden = true;
    if (S.section === "zones") renderZones();
    else if (S.section === "account") renderAccount();
    else if (S.section === "settings") renderSettingsPage();
    else if (S.section === "inbox") renderInbox();
    else renderRoster();
  }

  // ---------- Zones page ----------
  function mmss(sec) { sec = Math.round(sec || 0); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; }
  function metricLabel(m) {
    if (!m) return "";
    if (m.endsWith("_hr")) return T("m_hr");
    if (m === "bike_power") return T("m_power");
    if (m.endsWith("_pace")) return T("m_pace");
    return "";
  }
  function fmtThreshold(m, v) {
    if (v == null) return "";
    return (m === "run_pace" || m === "swim_pace") ? mmss(v) : String(Math.round(v));
  }
  function renderZones() {
    const list = Object.values(S.zones || {});
    if (!list.length) { app.innerHTML = `<h2 class="pagetitle">${T("nav_zones")}</h2><div class="card"><p class="muted">${T("no_zones")}</p></div>`; return; }
    let html = `<h2 class="pagetitle">${T("nav_zones")}</h2>`;
    list.forEach((z) => {
      const ml = metricLabel(z.metric);
      html += `<div class="zonecard"><div class="zonehead">${cap(esc(z.sport))}${ml ? " · " + esc(ml) : ""}` +
        ` <span class="note">${T("threshold")} ${esc(fmtThreshold(z.metric, z.threshold))}${z.unit ? " " + esc(z.unit) : ""}</span></div>` +
        `<table class="ztable">` +
        (z.zones || []).map((zz) =>
          `<tr class="z"><td class="zn">Z${esc(zz.name)}</td><td>${esc(zz.label)}</td><td class="num">${esc(zz.range)}</td></tr>`).join("") +
        `</table></div>`;
    });
    app.innerHTML = html;
  }


  // ---------- Account page ----------
  function renderAccount() {
    app.innerHTML = `<h2 class="pagetitle">${T("nav_account")}</h2>
      <div class="card">
        <div class="field"><label>${T("email")}</label><div class="readonly">${esc(S.email || "")}</div></div>
        <button id="changepw" class="ghost">${T("change_pw")}</button>
        <div id="pwbox" hidden>
          <input id="newpw" type="password" autocomplete="new-password" placeholder="${T("new_pw_ph")}">
          <button id="savepw" class="primary">${T("save_pw")}</button>
          <div id="pwmsg" class="msg" hidden></div>
        </div>
        <button id="panelsignout" class="ghost">${T("signout")}</button>
      </div>`;
    $("#changepw").addEventListener("click", () => { const b = $("#pwbox"); b.hidden = !b.hidden; if (!b.hidden) $("#newpw").focus(); });
    $("#savepw").addEventListener("click", changePassword);
    $("#panelsignout").addEventListener("click", doSignOut);
  }

  // ---------- Settings page ----------
  function renderSettingsPage() {
    const seg = (set, opts) => `<div class="segmented" data-set="${set}">` +
      opts.map(([v, lbl]) => `<button data-v="${v}" class="${S[set] === v ? "active" : ""}">${esc(lbl)}</button>`).join("") + `</div>`;
    app.innerHTML = `<h2 class="pagetitle">${T("nav_settings")}</h2>
      <div class="card">
        <div class="setgroup"><div class="setlabel">${T("theme")}</div>${seg("theme", [["auto", T("theme_auto")], ["light", T("theme_light")], ["dark", T("theme_dark")]])}</div>
        <div class="setgroup"><div class="setlabel">${T("language")}</div>${seg("lang", [["en", "English"], ["it", "Italiano"]])}</div>
        <button id="syncnow" class="ghost">${T("sync_now")}</button>
        <div id="syncmsg" class="msg" hidden></div>
        <div class="setversion">v${APP_VERSION}</div>
      </div>`;
    app.querySelectorAll(".segmented").forEach((sg) => sg.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        const set = sg.getAttribute("data-set"), v = b.getAttribute("data-v");
        S[set] = v; savePref(set, v);
        if (set === "theme") applyTheme(); else applyLang();
        renderSettingsPage();
      })));
    $("#syncnow").addEventListener("click", syncNow);
  }

  // ---------- Questionnaires page (initial intake) ----------





  async function syncNow() {
    const btn = $("#syncnow"), m = $("#syncmsg");
    if (!navigator.onLine) { m.hidden = false; m.className = "msg err"; m.textContent = T("sync_offline"); return; }
    btn.disabled = true; const t = btn.textContent; btn.textContent = T("syncing");
    try {
      await loadRoster();
      if (S.selectedAthleteId) await loadAthleteData(S.selectedAthleteId);
      await pollMessages();
      repaint(); setSync();
      m.hidden = false; m.className = "msg info"; m.textContent = T("sync_updated");
    } catch (e) {
      m.hidden = false; m.className = "msg err"; m.textContent = T("error") + ((e && e.message) || e);
    } finally { btn.disabled = false; btn.textContent = t; }
  }

  async function changePassword() {
    const inp = $("#newpw"), m = $("#pwmsg"), btn = $("#savepw");
    const pw = (inp.value || "");
    if (pw.length < 6) { m.hidden = false; m.className = "msg err"; m.textContent = T("pw_short"); return; }
    btn.disabled = true;
    try {
      const { error } = await SB.auth.updateUser({ password: pw });
      if (error) throw error;
      inp.value = ""; m.hidden = false; m.className = "msg info"; m.textContent = T("pw_saved");
    } catch (e) {
      m.hidden = false; m.className = "msg err"; m.textContent = T("error") + ((e && e.message) || e);
    } finally { btn.disabled = false; }
  }

  // ================= notifications / messages =================
  function unreadCount() {
    return (S.messages || []).filter((m) => !m.read_at).length + (S.appNotice && S.appNotice.unread ? 1 : 0);
  }
  function setBell() {
    const bell = $("#bell"), badge = $("#bellbadge");
    if (!bell || !badge) return;
    const n = unreadCount();
    if (n > 0) { badge.textContent = n > 9 ? "9+" : String(n); badge.hidden = false; bell.classList.add("lit"); }
    else { badge.hidden = true; bell.classList.remove("lit"); }
  }
  function checkAppUpdate() {
    let seen = null, viaTap = false;
    try { seen = localStorage.getItem("app_seen_version"); } catch (e) { /* private mode */ }
    try { viaTap = sessionStorage.getItem("updating_via_tap") === "1"; sessionStorage.removeItem("updating_via_tap"); } catch (e) { /* ignore */ }
    // Confirm an update only when it happened on its own (a full relaunch swapped in the new worker).
    // A tap-to-update already told the athlete, so skip the "updated" notice in that case.
    if (seen && seen !== APP_VERSION && !viaTap) { S.appNotice = { body: T("app_updated", { v: APP_VERSION }), unread: true }; setBell(); }
    try { localStorage.setItem("app_seen_version", APP_VERSION); } catch (e) { /* ignore */ }
  }
  // A newer app version finished downloading in the background (the service worker is now waiting):
  // light the bell with a "tap to update" notice, instead of silently swapping in a launch later.
  function onUpdateReady(reg) {
    S.swWaiting = (reg && reg.waiting) || null;
    S.appNotice = { body: T("app_available"), unread: true, action: "update" };
    setBell();
    if (S.section === "inbox") renderInbox();
  }
  function applyUpdate() {
    try { sessionStorage.setItem("updating_via_tap", "1"); } catch (e) { /* ignore */ }
    pendingReload = true;                                   // the controllerchange handler reloads us
    if (S.swWaiting) S.swWaiting.postMessage("SKIP_WAITING");
    else location.reload();                                 // fallback: no waiting worker reference
  }
  async function pollMessages() {
    if (!navigator.onLine || !S.isCoach) return;
    try {
      const { data } = await SB.from("message").select("id,athlete_id,kind,body,created_at,read_at")
        .eq("direction", "in").order("created_at", { ascending: false });
      if (data) { S.messages = data; setBell(); }
    } catch (e) { /* ignore */ }
  }
  async function markMessagesRead() {
    if (S.appNotice) S.appNotice.unread = false;
    const unread = (S.messages || []).filter((m) => !m.read_at);
    if (unread.length) {
      const now = new Date().toISOString();
      unread.forEach((m) => { m.read_at = now; });     // optimistic
      if (navigator.onLine) {
        try { await SB.from("message").update({ read_at: now }).eq("direction", "in").is("read_at", null); }
        catch (e) { /* will re-light on next refresh */ }
      }
    }
    setBell();
  }
  function rosterName(id) {
    const a = (S.roster || []).find((x) => x.athlete_id === id);
    return a ? (a.display_name || a.email || ("#" + id)) : ("#" + id);
  }
  // Coach composes a message to ONE athlete or to ALL (inserts one 'out' row per recipient; the
  // message_coach_send RLS policy allows it with the anon key + coach login — no admin key needed).
  async function composeSend() {
    const to = $("#msgto").value, body = ($("#msgbody").value || "").trim(), m = $("#msgmsg");
    if (!body) return;
    if (!to) { m.hidden = false; m.className = "msg err"; m.textContent = T("choose_recipient"); return; }
    if (!navigator.onLine) { m.hidden = false; m.className = "msg err"; m.textContent = T("msg_offline"); return; }
    const ids = to === "all" ? (S.roster || []).map((a) => a.athlete_id) : [Number(to)];
    if (!ids.length) { m.hidden = false; m.className = "msg err"; m.textContent = T("choose_recipient"); return; }
    const rows = ids.map((id) => ({ athlete_id: id, direction: "out", kind: "message", body, device_id: deviceId() }));
    const btn = $("#msgsend"); btn.disabled = true; const t = btn.textContent; btn.textContent = T("sending");
    try {
      const { error } = await SB.from("message").insert(rows);
      if (error) throw error;
      $("#msgbody").value = ""; m.hidden = false; m.className = "msg info"; m.textContent = T("msg_sent_n", { n: ids.length });
    } catch (e) {
      m.hidden = false; m.className = "msg err"; m.textContent = T("error") + ((e && e.message) || e);
    } finally { btn.disabled = false; btn.textContent = t; }
  }
  function noticeLabel(kind) {
    return kind === "plan_update" ? T("n_plan") : kind === "zones_update" ? T("n_zones")
      : kind === "session_edit" ? T("n_session_edit")
      : kind === "app_available" ? T("n_app_available") : kind === "app" ? T("n_app") : T("n_message");
  }
  function renderInbox() {
    $("#back").hidden = true;
    markMessagesRead();
    let html = `<h2 class="pagetitle">${T("inbox_title")}</h2>`;
    // Compose: to one athlete or to all.
    const opts = `<option value="">—</option><option value="all">${T("to_all")}</option>` +
      (S.roster || []).map((a) =>
        `<option value="${esc(a.athlete_id)}">${esc(a.display_name || a.email || ("#" + a.athlete_id))}</option>`).join("");
    html += `<div class="card"><div class="sectiontitle">${T("compose_title")}</div>
      <div class="field"><label for="msgto">${T("to_label")}</label><select id="msgto">${opts}</select></div>
      <div class="field"><textarea id="msgbody" rows="3" placeholder="${T("msg_placeholder")}"></textarea></div>
      <button id="msgsend" class="primary">${T("msg_send")}</button>
      <div id="msgmsg" class="msg" hidden></div></div>`;
    // App-update notice (if any) + inbound messages from athletes.
    const items = [];
    if (S.appNotice) items.push({ kind: S.appNotice.action === "update" ? "app_available" : "app", body: S.appNotice.body, created_at: null });
    (S.messages || []).forEach((m) => items.push(m));
    if (!items.length) html += `<div class="card"><p class="muted">${T("no_messages")}</p></div>`;
    else {
      // Select / delete toolbar — same as the athlete app (only real messages carry a checkbox).
      if ((S.messages || []).length) html +=
        `<div class="inboxbar"><button id="selall" class="ghost">${T("select_all")}</button>` +
        `<button id="selnone" class="ghost">${T("deselect")}</button>` +
        `<button id="delsel" class="ghost danger">${T("del_selected")}</button></div>` +
        `<div id="delmsg" class="msg" hidden></div>`;
      html += items.map((m) => {
        const who = m.athlete_id != null ? T("inbox_from", { name: esc(rosterName(m.athlete_id)) }) : noticeLabel(m.kind);
        const when = m.created_at ? ` <span class="muted small">${shortDay(m.created_at.slice(0, 10))}</span>` : "";
        const cb = m.id ? `<input type="checkbox" class="msgsel" value="${esc(m.id)}"> ` : "";
        const act = m.kind === "app_available" ? `<button id="updnow" class="primary">${T("app_update_now")}</button>` : "";
        return `<div class="card"><div class="sectiontitle">${cb}${who}${when}</div><p>${esc(m.body || "")}</p>${act}</div>`;
      }).join("");
    }
    app.innerHTML = html;
    $("#msgsend").addEventListener("click", composeSend);
    const upd = $("#updnow"); if (upd) upd.addEventListener("click", applyUpdate);
    const selall = $("#selall");
    if (selall) {
      selall.addEventListener("click", () => app.querySelectorAll(".msgsel").forEach((c) => { c.checked = true; }));
      $("#selnone").addEventListener("click", () => app.querySelectorAll(".msgsel").forEach((c) => { c.checked = false; }));
      $("#delsel").addEventListener("click", deleteSelectedMessages);
    }
  }
  async function deleteSelectedMessages() {
    const ids = [...app.querySelectorAll(".msgsel:checked")].map((c) => c.value), m = $("#delmsg");
    if (!ids.length) return;
    if (!navigator.onLine) { m.hidden = false; m.className = "msg err"; m.textContent = T("del_offline"); return; }
    try {
      const { error } = await SB.from("message").delete().in("id", ids);
      if (error) throw error;
      S.messages = (S.messages || []).filter((x) => ids.indexOf(x.id) < 0);
      renderInbox(); setBell();
    } catch (e) {
      m.hidden = false; m.className = "msg err"; m.textContent = T("error") + ((e && e.message) || e);
    }
  }

  // ================= auth / boot =================
  async function boot() {
    loadPrefs(); applyTheme(); applyLang();
    registerSW();
    checkAppUpdate();
    $("#back").addEventListener("click", () => {
      if (S.current) { S.current = null; renderSection(); }   // session detail -> week
      else { go("roster"); }                                  // week -> roster
    });
    $("#menu").addEventListener("click", (e) => {
      e.stopPropagation();
      const d = $("#drawer");
      if (d.hidden) openDrawer(); else closeDrawer();
    });
    $("#backdrop").addEventListener("click", closeDrawer);
    $("#bell").addEventListener("click", () => go("inbox"));
    window.addEventListener("online", () => {
      setSync();
      loadRoster().then(() => (S.selectedAthleteId ? loadAthleteData(S.selectedAthleteId) : null)).then(repaint).catch(() => {});
      pollMessages();
    });
    window.addEventListener("offline", setSync);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pollMessages(); });
    setInterval(pollMessages, 60000);
    // Supabase runs this callback while holding the auth lock; calling any SB.* inside it deadlocks.
    // Defer to the next tick, out of the lock, before (re-)routing.
    SB.auth.onAuthStateChange(() => { setTimeout(route, 0); });
    await route();
  }

  let _routing = false, _pending = false;
  async function route() {
    if (_routing) { _pending = true; return; }
    _routing = true;
    try { await _route(); } finally { _routing = false; if (_pending) { _pending = false; route(); } }
  }

  // ---------- coach data: the roster + a selected athlete's plan ----------
  // Paint the roster already saved on this device, with NO network call. Returns whether it showed one,
  // so boot is cache-first (instant, offline-friendly) and the ~30s token-refresh stall stays invisible.
  async function renderCachedRoster() {
    if (!rememberOn()) return false;
    try { S.isCoach = localStorage.getItem("coach_ok") === "1"; } catch (e) { S.isCoach = false; }
    if (!S.isCoach) return false;
    await loadCachedRoster();
    if (!S.roster.length) return false;
    topbar.hidden = false;
    gateSection();
    renderSection(); setSync(); setBell();
    return true;
  }
  async function loadRoster() {
    const { data, error } = await SB.from("athlete_account")
      .select("athlete_id, display_name, email, last_seen").order("display_name");
    if (error) throw error;
    S.roster = data || [];
    await idbSet("cache", "roster", S.roster);
  }
  async function loadCachedRoster() { const r = await idbGet("cache", "roster"); if (r) S.roster = r; }

  // Fetch ONE chosen athlete's published plan + zones + logs + test submissions. RLS lets a coach read
  // any athlete (is_coach()); we filter by athlete_id explicitly because we are not the single owner.
  async function loadAthleteData(id) {
    const [meta, weeks, sessions, tests, zones, logs, subs] = await Promise.all([
      SB.from("plan_meta").select("*").eq("athlete_id", id).maybeSingle(),
      SB.from("plan_week").select("*").eq("athlete_id", id).order("monday"),
      SB.from("plan_session").select("*").eq("athlete_id", id).order("on_date"),
      SB.from("plan_test").select("*").eq("athlete_id", id).order("on_date"),
      SB.from("zone_sheet").select("*").eq("athlete_id", id),
      SB.from("log").select("*").eq("athlete_id", id),
      SB.from("test_submission").select("protocol,on_date,fields,conditions,indoor,ingested_at").eq("athlete_id", id),
    ]);
    const zmap = {}; (zones.data || []).forEach((z) => { zmap[z.key] = z; });
    const smap = {}; (subs.data || []).forEach((r) => { smap[`${r.protocol}|${r.on_date}`] = r; });
    const p = { meta: meta.data, weeks: weeks.data || [], sessions: sessions.data || [],
                tests: tests.data || [], zones: zmap, submissions: smap };
    applyPlan(p);
    S.logs = {}; (logs.data || []).forEach((r) => { S.logs[`${r.on_date}|${r.session_key}`] = r; });
    await idbSet("cache", "plan:" + id, p);
    await idbSet("cache", "logs:" + id, S.logs);
  }
  async function loadCachedAthlete(id) {
    const p = await idbGet("cache", "plan:" + id); if (p) applyPlan(p); else { S.weeks = []; S.sessions = []; S.tests = []; S.zones = {}; }
    const logs = await idbGet("cache", "logs:" + id); S.logs = logs || {};
  }
  // Tap an athlete in the roster -> show their week (cache-first, then freshen online).
  async function selectAthlete(id, name) {
    S.selectedAthleteId = id; S.selectedName = name || "";
    S.current = null; S.weekIdx = null;
    await loadCachedAthlete(id);
    S.navChosen = true; S.section = "plan";
    if (S.weeks.length) { S.weekIdx = currentWeekIdx(); renderWeek(); } else renderRoster();
    scrollTop();
    if (navigator.onLine) {
      try {
        await loadAthleteData(id);
        if (S.selectedAthleteId === id && S.section === "plan" && !S.current) { S.weekIdx = currentWeekIdx(); renderWeek(); }
      } catch (e) { console.warn("athlete load failed", e); }
    }
    setSync(); setBell();
  }
  // Presence like the coach webapp roster: green <=5 min, amber if seen but idle, grey if never seen.
  function presenceInfo(iso) {
    if (!iso) return { cls: "off", label: T("never_seen") };
    const mins = (Date.now() - new Date(iso).getTime()) / 60000;
    if (mins <= 5) return { cls: "on", label: T("online_now") };
    return { cls: "idle", label: T("last_seen_ago", { when: shortDay(iso.slice(0, 10)) }) };
  }
  function renderRoster() {
    S.view = "week"; S.current = null; $("#back").hidden = true;
    let html = `<h2 class="pagetitle">${T("roster_title")}</h2>`;
    if (!S.roster.length) { app.innerHTML = html + `<div class="card"><p class="muted">${T("no_athletes")}</p></div>`; return; }
    html += S.roster.map((a) => {
      const p = presenceInfo(a.last_seen);
      const nm = a.display_name || a.email || ("#" + a.athlete_id);
      return `<button class="sess rosteritem" data-aid="${esc(a.athlete_id)}" data-name="${esc(nm)}">
        <span class="dot ${p.cls}" aria-hidden="true"></span>
        <div class="body"><div class="t">${esc(nm)}</div><div class="sub">${esc(p.label)}</div></div>
        <span class="chevron">›</span></button>`;
    }).join("");
    app.innerHTML = html;
    app.querySelectorAll("[data-aid]").forEach((b) => b.addEventListener("click", () =>
      selectAthlete(Number(b.getAttribute("data-aid")), b.getAttribute("data-name"))));
  }
  function renderNotCoach(email) {
    topbar.hidden = true; closeDrawer();
    app.innerHTML = `<div class="card" style="margin-top:2rem">
      <h1>${T("not_coach_title")}</h1>
      <p class="muted">${T("not_coach_sub", { email: esc(email || "") })}</p>
      <button id="nc_out" class="ghost">${T("signout")}</button></div>`;
    const b = $("#nc_out"); if (b) b.addEventListener("click", doSignOut);
  }

  async function _route() {
    // 1) Optimistic paint from the device cache (the roster), BEFORE any network-dependent auth call,
    //    so an expired-token refresh (which can stall ~30s offline) is invisible.
    const painted = await renderCachedRoster();

    // 2) Resolve the session.
    const { data } = await SB.auth.getSession();
    const session = data && data.session;
    if (!session) {
      if (painted) { setSync(); setBell(); return; }
      showLogin(); return;
    }

    // 3) Signed in — but ONLY a coach may use this app. is_coach() is the server's word (anon key +
    //    coach login); cached offline so the app still opens without a connection.
    S.email = (session.user && session.user.email) || "";
    if (navigator.onLine) {
      try { const { data: ic } = await SB.rpc("is_coach"); S.isCoach = ic === true; savePref("coach_ok", S.isCoach ? "1" : "0"); }
      catch (e) { try { S.isCoach = localStorage.getItem("coach_ok") === "1"; } catch (e2) { S.isCoach = false; } }
    } else {
      try { S.isCoach = localStorage.getItem("coach_ok") === "1"; } catch (e) { S.isCoach = painted; }
    }
    if (!S.isCoach) { renderNotCoach(S.email); return; }

    // 4) Load the roster (all athletes) and show it.
    topbar.hidden = false;
    if (navigator.onLine) { try { await loadRoster(); } catch (e) { console.warn("roster failed", e); } }
    if (!S.roster.length) await loadCachedRoster();
    gateSection();
    renderSection();
    setSync(); setBell();
  }

  // The home follows whether a plan exists — questionnaire when there's none, Plan once there is —
  // until the athlete picks a section from the menu, after which their choice is respected.
  function gateSection() { if (!S.navChosen) S.section = "roster"; }

  // Re-render only the data-driven sections after a sync, so a background refresh never clobbers a
  // form the athlete is filling in (Account password, Settings).
  function repaint() { if (S.section === "plan" || S.section === "zones" || S.section === "roster") renderSection(); }

  function applyPlan(p) {
    S.meta = p.meta || null;
    S.prefs = (S.meta && S.meta.prefs) || {};
    S.weeks = (p.weeks || []).slice().sort((a, b) => (a.monday < b.monday ? -1 : 1));
    S.sessions = p.sessions || [];
    S.tests = p.tests || [];
    S.zones = p.zones || {};
    S.questionSpec = p.questionSpec || S.questionSpec || null;
    S.intakeResponse = ("intake" in p) ? p.intake : S.intakeResponse;
    S.submissions = p.submissions || {};
    S.fieldSpec = {}; ((S.meta && S.meta.field_spec) || []).forEach((f) => { S.fieldSpec[f.name] = f; });
  }

  // ================= login =================
  function showLogin() {
    topbar.hidden = true; closeDrawer();
    app.innerHTML = `
      <div class="login">
        <h1>${T("login_title")}</h1>
        <p class="muted small">${T("login_sub")}</p>
        <div class="card">
          <div class="field">
            <label for="email">${T("email")}</label>
            <input id="email" type="email" inputmode="email" autocomplete="email" placeholder="${T("email_ph")}">
          </div>
          <div class="field">
            <label for="password">${T("password")}</label>
            <input id="password" type="password" autocomplete="current-password" placeholder="${T("password_ph")}">
          </div>
          <label class="check"><input id="remember" type="checkbox" ${rememberOn() ? "checked" : ""}> ${T("remember")}</label>
          <button id="signin" class="primary" type="button">${T("signin")}</button>
          <div id="loginmsg" class="msg err" hidden></div>
          <p class="note">${T("first_login_hint")}</p>
        </div>
        <div class="segmented" data-set="lang" style="max-width:16rem">
          <button data-v="en" class="${S.lang === "en" ? "active" : ""}">English</button>
          <button data-v="it" class="${S.lang === "it" ? "active" : ""}">Italiano</button>
        </div>
      </div>`;
    app.querySelectorAll('[data-set="lang"] button').forEach((b) => b.addEventListener("click", () => {
      S.lang = b.getAttribute("data-v"); savePref("lang", S.lang); applyLang(); showLogin();
    }));
    const msg = $("#loginmsg");
    const showErr = (txt) => { msg.hidden = false; msg.className = "msg err"; msg.textContent = txt; };
    async function doSignIn() {
      const email = $("#email").value.trim().toLowerCase();
      const password = $("#password").value;
      if (!email) return showErr(T("enter_email"));
      if (!password) return showErr(T("enter_password"));
      // Save the remember choice BEFORE signing in, so the new session lands in the right store.
      savePref("remember", $("#remember").checked ? "1" : "0");
      const btn = $("#signin"); btn.disabled = true; const t = btn.textContent; btn.textContent = T("signing_in");
      try {
        const { error } = await SB.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange re-routes us into the app.
      } catch (e) {
        const m = ((e && e.message) || "").toLowerCase();
        showErr(m.includes("invalid") || m.includes("credential") ? T("bad_login") : T("error") + ((e && e.message) || e));
        btn.disabled = false; btn.textContent = t;
      }
    }
    $("#signin").addEventListener("click", doSignIn);
    $("#password").addEventListener("keydown", (e) => { if (e.key === "Enter") doSignIn(); });
  }


  // ================= week view =================
  function currentWeekIdx() {
    const t = todayISO();
    let i = S.weeks.findIndex((w) => w.monday <= t && t <= w.sunday);
    if (i < 0) i = S.weeks.findIndex((w) => w.monday > t);
    return i < 0 ? Math.max(0, S.weeks.length - 1) : i;
  }
  function sessionsOn(iso) {
    return S.sessions.filter((s) => s.on_date === iso).sort((a, b) =>
      a.sport === b.sport ? (a.ordinal || 0) - (b.ordinal || 0) : a.sport < b.sport ? -1 : 1);
  }
  function testsOn(iso) { return S.tests.filter((t) => t.on_date === iso); }

  function logState(s) {
    const k = lkey(s);
    const pend = S.outbox[k];
    const rec = (pend && pend.record) || S.logs[k];
    if (!rec) return null;
    const c = rec.payload && rec.payload.completed;
    const done = c === "1" || c === 1 || c === "yes" || c === true;
    return { rec, done, pending: !!pend, doneOn: rec.done_on };
  }

  // Planned vs done minutes per sport for a week — same logic as the coach calendar's Totals column:
  // planned = sum of session minutes by sport; done = sum of logged minutes of COMPLETED sessions,
  // counted against the planned (date, session_key) so a "done on another day" log stays in its week.
  const SPORT_ORDER = ["swim", "bike", "run", "strength"];
  function weekTotals(monday) {
    const planned = {}, done = {};
    for (let i = 0; i < 7; i++) {
      sessionsOn(addDays(monday, i)).forEach((s) => {
        planned[s.sport] = (planned[s.sport] || 0) + (s.minutes || 0);
        const st = logState(s);
        if (st && st.done) done[s.sport] = (done[s.sport] || 0) + (Number((st.rec.payload || {}).minutes) || 0);
      });
    }
    const extra = Object.keys(Object.assign({}, planned, done)).filter((s) => SPORT_ORDER.indexOf(s) < 0);
    const rows = [];
    SPORT_ORDER.concat(extra).forEach((sport) => {
      const pl = planned[sport] || 0, dn = done[sport] || 0;
      if (pl || dn) rows.push({ sport, planned: pl, done: dn });
    });
    return rows;
  }

  function renderWeek() {
    S.view = "week"; S.current = null; $("#back").hidden = false;   // coach: back returns to the roster
    if (!S.weeks.length) {
      app.innerHTML = `<div class="card"><p>${T("no_plan")}</p><p class="muted small">${T("no_plan_sub")}</p></div>`;
      return;
    }
    const c = cal();
    const w = S.weeks[S.weekIdx];
    const t = todayISO();
    let html = `
      ${S.selectedName ? `<h2 class="pagetitle rostername">${esc(S.selectedName)}</h2>` : ""}
      <div class="weekhead">
        <button class="navbtn" id="prev" ${S.weekIdx <= 0 ? "disabled" : ""} aria-label="‹">‹</button>
        <h2>${T("week_n", { n: w.week_index })}</h2>
        <button class="navbtn" id="today">${T("today")}</button>
        <button class="navbtn" id="next" ${S.weekIdx >= S.weeks.length - 1 ? "disabled" : ""} aria-label="›">›</button>
      </div>
      <div class="weekmeta">${esc(w.period || "")}${w.is_recovery ? ` · <span class="badge recovery">${T("recovery")}</span>` : ""}${w.hours_shown != null ? " · " + w.hours_shown + " h" : ""} · ${shortDay(w.monday)} – ${shortDay(w.sunday)}</div>`;

    for (let i = 0; i < 7; i++) {
      const iso = addDays(w.monday, i);
      const d = parseD(iso);
      const sess = sessionsOn(iso);
      const tsts = testsOn(iso);
      html += `<div class="day ${iso === t ? "today" : ""}"><div class="dayhead">${cap(c.WD_FULL[i])} <span class="dd">${d.getDate()} ${c.MO[d.getMonth()]}</span></div>`;
      if (!sess.length && !tsts.length) {
        html += `<div class="rest">${T("rest")}</div>`;
      } else {
        // The test's OWN result entry (e.g. the 400 m and 200 m times) is the primary action on a
        // test day: a prominent button at the top that opens the result form.
        tsts.forEach((ts) => {
          html += `<button class="sess testcta" data-test="${esc(iso)}|${esc(ts.protocol)}">
            <div class="body"><div class="t">${T("test_prefix")}${esc(ts.name || ts.protocol)} <span class="badge test">${T("badge_test")}</span></div>
            <div class="sub">${T("test_cta")} · ${esc(ts.sport || "")}</div></div>
            <span class="chevron">›</span></button>`;
        });
        // A scheduled test is ALSO a loggable "TEST: …" session. When its result entry is shown
        // above, demote that session to a quiet "log how it went" link so the result stays the
        // obvious thing to tap; keep it a normal tile if there is no matching test to record.
        const demoted = [];
        sess.forEach((s) => {
          const isTestSess = (s.is_test || /^TEST\b/i.test(s.title || "")) && tsts.some((x) => x.sport === s.sport);
          if (isTestSess) { demoted.push(s); return; }
          const st = logState(s);
          let chip = "";
          if (st) chip = st.pending ? `<span class="chip pend">${T("queued")}</span>`
            : st.done ? `<span class="chip done">${T("logged")}</span>` : `<span class="chip skip">${T("skipped")}</span>`;
          const zone = s.zone && s.zone !== "-" ? ` · Z${esc(s.zone)}` : "";
          html += `<button class="sess" data-key="${esc(iso)}|${esc(s.session_key)}">
            <div class="body"><div class="t">${esc(s.title)}${s.is_bt ? ` <span class="badge bt">${T("badge_key")}</span>` : ""}</div>
            <div class="sub">${hhmm(s.minutes)} · ${esc(s.sport)}${zone}</div></div>
            ${chip}<span class="chevron">›</span></button>`;
        });
        demoted.forEach((s) => {
          const st = logState(s);
          const chipTxt = st ? (st.pending ? T("queued") : st.done ? T("logged") : T("skipped")) : "";
          html += `<button class="sess testlog" data-key="${esc(iso)}|${esc(s.session_key)}">
            <div class="body"><div class="sub">${T("test_log_opt")}${chipTxt ? " · " + esc(chipTxt) : ""}</div></div>
            <span class="chevron">›</span></button>`;
        });
      }
      html += `</div>`;
    }

    const trows = weekTotals(w.monday);
    if (trows.length) {
      let tp = 0, td = 0;
      const body = trows.map((r) => {
        tp += r.planned; td += r.done;
        return `<tr class="${esc(r.sport)}"><td><span class="sport"><span class="dot"></span>${cap(esc(r.sport))}</span></td>` +
               `<td class="num">${hhmm(r.planned)}</td><td class="num">${r.done ? hhmm(r.done) : "—"}</td></tr>`;
      }).join("");
      html += `<div class="weektotals"><div class="tothead">${T("totals")}</div>` +
        `<table class="tot"><thead><tr><th></th><th class="num">${T("t_plan")}</th><th class="num">${T("t_done")}</th></tr></thead>` +
        `<tbody>${body}</tbody>` +
        `<tbody><tr class="sum"><td>${T("t_total")}</td><td class="num">${hhmm(tp)}</td><td class="num">${hhmm(td)}</td></tr></tbody></table></div>`;
    }

    app.innerHTML = html;
    $("#prev").addEventListener("click", () => { if (S.weekIdx > 0) { S.weekIdx--; renderWeek(); scrollTop(); } });
    $("#next").addEventListener("click", () => { if (S.weekIdx < S.weeks.length - 1) { S.weekIdx++; renderWeek(); scrollTop(); } });
    $("#today").addEventListener("click", () => { S.weekIdx = currentWeekIdx(); renderWeek(); scrollTop(); });
    app.querySelectorAll("[data-key]").forEach((b) => b.addEventListener("click", () => {
      const [iso, key] = b.getAttribute("data-key").split("|");
      const s = S.sessions.find((x) => x.on_date === iso && x.session_key === key);
      if (s) renderSession(s);
    }));
    app.querySelectorAll("[data-test]").forEach((b) => b.addEventListener("click", () => {
      const [iso, proto] = b.getAttribute("data-test").split("|");
      const ts = S.tests.find((x) => x.on_date === iso && x.protocol === proto);
      if (ts) renderTest(ts);
    }));
  }
  function scrollTop() { window.scrollTo(0, 0); }

  // ================= session detail =================
  function targetHtml(t) {
    if (!t) return "";
    let s = `<div class="sectiontitle">${T("target")}</div><div class="target">`;
    if (t.range) {
      s += `<strong>${esc(t.range)}</strong>${t.unit ? " " + esc(t.unit) : ""}`;
      if (t.talk) s += ` · ${T("talk")} ${esc(t.talk)}`;
      if (t.rpe) s += ` · RPE ${esc(t.rpe[0])}–${esc(t.rpe[1])}`;
    } else {
      s += `${T("no_numeric")}${t.why ? " (" + esc(t.why) + ")" : ""}. ${T("use_talk")} <em>${esc(t.talk || "")}</em>`;
    }
    return s + `</div>`;
  }
  function fuelHtml(f, sport, minutes) {
    if (!f || sport === "strength") return "";
    if (f.water_only) return `<div class="sectiontitle">${T("nutrition")}</div><p class="note">${T("water_only")}</p>`;
    const r = (x) => Math.round(x || 0);
    const rows = [];
    rows.push(`<tr><th>${T("during")}</th><td>${T("carb_h", { g: r(f.during_carb_g_h) })} <span class="note">(${T("during_note", { kcal: r(f.during_kcal_h), total: r(f.total_carb_g) })})</span></td></tr>`);
    rows.push(`<tr><th>${T("fluids")}</th><td>${T("fluids_v", { ml: r(f.fluid_ml_h) })}</td></tr>`);
    rows.push(`<tr><th>${T("sodium")}</th><td>${T("sodium_v", { mg: r(f.sodium_mg_h) })}</td></tr>`);
    if (f.pre_kcal) rows.push(`<tr><th>${T("before")}</th><td>${r(f.pre_kcal[0])}–${r(f.pre_kcal[1])} kcal <span class="note">${minutes >= 60 ? T("before_2h") : T("before_10m")}</span></td></tr>`);
    rows.push(`<tr><th>${T("after")}</th><td>${r(f.post_kcal)} kcal <span class="note">${T("within30")}</span></td></tr>`);
    let extra = "";
    if (f.needs_multi_transportable) extra += `<p class="note">${T("multi")}</p>`;
    if (f.notes && f.notes.length) extra += `<ul class="lines note">${f.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
    return `<div class="sectiontitle">${T("nutrition")}</div><table class="fuel"><tbody>${rows.join("")}</tbody></table>${extra}`;
  }
  function renderSession(s) {
    S.view = "session"; S.current = s; $("#back").hidden = false;
    const zone = s.zone && s.zone !== "-" ? ` · Z${esc(s.zone)}` : "";
    // A "TEST: …" session carries its own result form (e.g. the 400 m and 200 m times) as a
    // separate test. Surface it as the lead action so the athlete enters the measurement the coach
    // needs, not just a generic minutes/RPE log.
    const testFor = s.is_test ? S.tests.find((x) => x.on_date === s.on_date && x.sport === s.sport) : null;
    let html = `<div class="detail">
      <div class="muted small">${longDay(s.on_date)}</div>
      <h1>${esc(s.title)}${s.is_bt ? ` <span class="badge bt">${T("badge_key")}</span>` : ""}${s.is_test ? ` <span class="badge test">${T("badge_test")}</span>` : ""}</h1>
      <div class="kv">${hhmm(s.minutes)} · ${esc(s.sport)}${zone}</div>`;
    if (testFor) html += `<button type="button" id="gototest" class="gototest">${T("test_from_session")} ›</button>`;
    html += targetHtml(s.target);
    if (s.detail && s.detail.length) html += `<div class="sectiontitle">${T("detail")}</div><ul class="lines">${s.detail.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
    html += fuelHtml(s.fuel, s.sport, s.minutes);
    if (s.provenance) html += `<p class="note">${esc(s.provenance)}</p>`;
    html += loggedReadOnly(s);                            // what the athlete logged (read-only)
    // --- coach edit: move the session, change its duration, add a note (direct row writes) ---
    const wm = weekMondayOf(s.on_date);
    let dayOpts = "";
    for (let i = 0; i < 7; i++) { const iso = addDays(wm, i); dayOpts += `<option value="${iso}" ${iso === s.on_date ? "selected" : ""}>${esc(shortDay(iso))}</option>`; }
    html += `<div class="sectiontitle">${T("edit_session")}</div>
      <form id="editform">
        <div class="field"><label for="ed_day">${T("move_to_day")}</label><select id="ed_day">${dayOpts}</select></div>
        <div class="field"><label for="ed_min">${T("duration_min")}</label><input id="ed_min" type="number" inputmode="numeric" min="0" value="${esc(s.minutes || 0)}"></div>
        <div class="field"><label for="ed_note">${T("add_note")}</label><input id="ed_note" type="text" placeholder="${T("note_ph")}"></div>
        <div class="actions"><button type="button" id="ed_save" class="primary">${T("save_edit")}</button></div>
        <div id="ed_msg" class="msg" hidden></div>
      </form>`;
    html += `</div>`;
    app.innerHTML = html;
    const gt = $("#gototest");
    if (gt && testFor) gt.addEventListener("click", () => renderTest(testFor));
    $("#ed_save").addEventListener("click", () => saveSessionEdit(s));
    scrollTop();
  }
  // Coach edit = a direct write to the plan_session row on Supabase (migration 0010 allows it), then a
  // "session changed" notice. No engine: the materialized plan is the source of truth. A move appends on
  // the target day (new ordinal) so nothing else renumbers.
  async function saveSessionEdit(s) {
    const m = $("#ed_msg"), btn = $("#ed_save");
    if (!navigator.onLine) { m.hidden = false; m.className = "msg err"; m.textContent = T("msg_offline"); return; }
    const newDay = $("#ed_day").value;
    const mins = parseInt($("#ed_min").value, 10);
    const note = ($("#ed_note").value || "").trim();
    const patch = {};
    if (Number.isFinite(mins) && mins !== s.minutes) patch.minutes = mins;
    if (note) patch.detail = (s.detail || []).concat([note]);
    let moved = false, dayFor = s.on_date;
    if (newDay && newDay !== s.on_date) {
      const n = sessionsOn(newDay).filter((x) => x.sport === s.sport && x.role === s.role).length;
      patch.on_date = newDay; patch.session_key = `${s.sport}-${s.role}-${n + 1}`; patch.ordinal = n + 1;
      moved = true; dayFor = newDay;
    }
    if (!Object.keys(patch).length) { m.hidden = false; m.className = "msg info"; m.textContent = T("no_change"); return; }
    btn.disabled = true;
    try {
      const { error } = await SB.from("plan_session").update(patch)
        .eq("athlete_id", S.selectedAthleteId).eq("on_date", s.on_date).eq("session_key", s.session_key);
      if (error) throw error;
      try { await SB.from("message").insert({ athlete_id: S.selectedAthleteId, direction: "out",
        kind: "session_edit", body: T("session_changed_body", { day: shortDay(dayFor) }) }); } catch (e) { /* best effort */ }
      m.hidden = false; m.className = "msg info"; m.textContent = T("edit_saved");
      await loadAthleteData(S.selectedAthleteId);        // refresh from the source of truth
      S.current = null; S.section = "plan"; renderWeek();
    } catch (e) {
      m.hidden = false; m.className = "msg err"; m.textContent = T("error") + ((e && e.message) || e); btn.disabled = false;
    }
  }
  // Read-only "what the athlete logged" box (same markup as the athlete app's logged box — no form).
  function loggedReadOnly(s) {
    const st = logState(s);
    if (!st) return "";
    const p = st.rec.payload || {};
    const rows = [];
    if (st.done) {
      if (p.minutes) rows.push(`<tr><th>${T("r_duration")}</th><td>${hhmm(p.minutes)}</td></tr>`);
      if (p.distance) rows.push(`<tr><th>${T("r_distance")}</th><td>${esc(p.distance)} ${esc(p.distance_unit || "")}</td></tr>`);
      if (p.avg_hr) rows.push(`<tr><th>${T("r_avghr")}</th><td>${esc(p.avg_hr)} bpm</td></tr>`);
      if (p.avg_power) rows.push(`<tr><th>${T("r_power")}</th><td>${esc(p.avg_power)} W</td></tr>`);
      if (p.rpe) rows.push(`<tr><th>RPE</th><td>${esc(p.rpe)}/10</td></tr>`);
      if (p.felt) rows.push(`<tr><th>${T("r_felt")}</th><td>${esc(feltLabel(p.felt))}</td></tr>`);
      if (p.carb_g) rows.push(`<tr><th>${T("r_carb")}</th><td>${esc(p.carb_g)} g</td></tr>`);
      if (p.gi_symptoms) rows.push(`<tr><th>${T("r_gut")}</th><td>${esc(p.gi_symptoms)}</td></tr>`);
      if (p.note) rows.push(`<tr><th>${T("r_note")}</th><td>${esc(p.note)}</td></tr>`);
    } else {
      rows.push(`<tr><th>${T("skipped")}</th><td>${esc(p.skip_reason || T("no_reason"))}</td></tr>`);
    }
    const moved = st.doneOn ? ` · ${T("done_on_s", { day: shortDay(st.doneOn) })}` : "";
    return `<div class="loggedbox"><strong>${st.done ? T("logged") : T("skipped")}${moved}</strong>
            <table><tbody>${rows.join("")}</tbody></table></div>`;
  }

  function renderTest(ts) {
    S.view = "session"; S.current = null; $("#back").hidden = false;
    let html = `<div class="detail">
      <div class="muted small">${longDay(ts.on_date)}</div>
      <h1>${T("test_prefix")}${esc(ts.name || ts.protocol)}</h1>
      <div class="kv">${esc(ts.sport || "")}</div>`;
    if (ts.reason) html += `<p class="note">${esc(ts.reason)}</p>`;
    if (ts.warm_up) html += `<div class="sectiontitle">${T("warm_up")}</div><p>${esc(ts.warm_up)}</p>`;
    if (ts.instructions && ts.instructions.length) html += `<div class="sectiontitle">${T("how")}</div><ul class="lines">${ts.instructions.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
    if (ts.yields) html += `<div class="sectiontitle">${T("measures")}</div><p>${esc(ts.yields)}</p>`;
    if (ts.provenance) html += `<p class="note">${esc(ts.provenance)}</p>`;

    // Coach view: show the athlete's submitted result read-only (no entry form).
    const sub = S.submissions[`${ts.protocol}|${ts.on_date}`];
    html += `<div class="sectiontitle">${T("view_test_result")}</div>`;
    if (sub && sub.fields && Object.keys(sub.fields).length) {
      const rows = Object.keys(sub.fields).filter((k) => !k.endsWith("_unit")).map((k) =>
        `<tr><th>${esc(k)}</th><td>${esc(sub.fields[k])}${sub.fields[k + "_unit"] ? " " + esc(sub.fields[k + "_unit"]) : ""}</td></tr>`).join("");
      const extra = [];
      if (sub.conditions) extra.push(`<tr><th>${T("test_conditions")}</th><td>${esc(sub.conditions)}</td></tr>`);
      if (sub.indoor) extra.push(`<tr><th>${T("test_indoor")}</th><td>${T("yes")}</td></tr>`);
      html += `<div class="loggedbox"><table><tbody>${rows}${extra.join("")}</tbody></table></div>`;
    } else {
      html += `<p class="note">${T("no_test_result")}</p>`;
    }
    html += `</div>`;
    app.innerHTML = html;
    scrollTop();
  }


  // ================= logging =================
  function unitOptions(sport) {
    return sport === "swim" ? [["m", "m"], ["yd", "yd"]] : [["km", "km"], ["mi", "mi"]];
  }
  function defaultUnit(sport) {
    const metric = (S.meta && S.meta.units) !== "imperial";
    if (sport === "swim") return metric ? "m" : "yd";
    return metric ? "km" : "mi";
  }



  function weekMondayOf(iso) {
    const w = S.weeks.find((x) => x.monday <= iso && iso <= x.sunday);
    if (w) return w.monday;
    const d = parseD(iso); return addDays(iso, -wdIdx(d));
  }

  // ================= chrome =================
  function setSync() {
    const el = $("#sync");
    if (!el) return;
    const n = Object.keys(S.outbox).length;
    if (!navigator.onLine) el.textContent = n ? T("sync_offline_q", { n }) : T("sync_offline");
    else el.textContent = n ? T("sync_send", { n }) : T("sync_updated");
  }
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js").then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) onUpdateReady(reg);   // one already waiting
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          // "installed" while a controller already runs = an UPDATE (not the first install) is ready.
          if (nw.state === "installed" && navigator.serviceWorker.controller) onUpdateReady(reg);
        });
      });
      reg.update().catch(() => {});                                        // check promptly on boot…
      document.addEventListener("visibilitychange", () => {               // …and whenever reopened
        if (!document.hidden) reg.update().catch(() => {});
      });
    }).catch((e) => console.warn("SW registration failed", e));
    // After the waiting worker takes over (our SKIP_WAITING), reload once into the new code.
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (pendingReload) location.reload(); });
  }

  boot();
})();
