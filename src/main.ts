import "./styles.css";
import { Game } from "./core/Game";
import { InputManager } from "./core/InputManager";
import { Renderer } from "./rendering/Renderer";
import { YouTubePlatformAdapter } from "./platform/PlatformAdapter";
import { ACHIEVEMENTS_LIST } from "./core/achievements";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Missing canvas");
const platform = new YouTubePlatformAdapter();
const game = new Game(new Renderer(canvas), platform);

platform.firstFrameReady();
platform.onPause(() => game.setSuspended(true));
platform.onResume(() => game.setSuspended(false));
game.setAudioEnabled(platform.isAudioEnabled());

const audioToggle = document.querySelector<HTMLButtonElement>("#audio-toggle");
const audioIcon = document.querySelector<HTMLElement>("#audio-icon");
const updateAudioUI = () => {
  const muted = game.isAudioMuted();
  if (audioIcon) audioIcon.textContent = muted ? "🔇" : "🔊";
  if (audioToggle) {
    audioToggle.setAttribute("aria-label", muted ? "Unmute Sound" : "Mute Sound");
    audioToggle.setAttribute("title", muted ? "Unmute Sound" : "Mute Sound");
  }
};
updateAudioUI();

platform.onAudioChanged((enabled) => {
  game.setAudioEnabled(enabled);
  updateAudioUI();
});
platform.gameReady();

// Pass isModalActive to InputManager so all gameplay controls are strictly suppressed while in modals
new InputManager(() => game.primary(), () => game.isModalActive()).bind(document.querySelector("#app")!);

// Suppress gameplay input on UI controls
document.querySelectorAll<HTMLElement>("button, input").forEach((control) =>
  control.addEventListener("pointerdown", (event) => event.stopPropagation())
);

document.querySelector<HTMLButtonElement>("#play-button")!.addEventListener("click", () => game.primary());
document.querySelector<HTMLButtonElement>("#again-button")!.addEventListener("click", () => game.primary());
document.querySelector<HTMLButtonElement>("#practice-button")!.addEventListener("click", () => game.startPractice());

audioToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  game.toggleAudio();
  updateAudioUI();
});

// --- Trophies & Achievements Showcase ---
let trophiesReturnScreen: "MENU" | "GAME_OVER" = "MENU";

const trophiesScreen = document.getElementById("trophies-screen");
// Prevent taps anywhere inside the trophies overlay from bubbling to gameplay
trophiesScreen?.addEventListener("pointerdown", (e) => e.stopPropagation());
// Clicking the dark backdrop outside the modal card closes the modal
trophiesScreen?.addEventListener("click", (e) => {
  if (e.target === trophiesScreen) {
    closeTrophies();
  }
});

const renderTrophiesModal = () => {
  const unlocked = game.getAchievements();
  const listEl = document.getElementById("trophies-list");
  const ratioEl = document.getElementById("trophies-unlocked-ratio");
  if (ratioEl) ratioEl.textContent = `${unlocked.length} / ${ACHIEVEMENTS_LIST.length}`;
  if (listEl) {
    listEl.innerHTML = ACHIEVEMENTS_LIST.map((ach) => {
      const isUnlocked = unlocked.includes(ach.id);
      return `
        <div class="trophy-card ${isUnlocked ? 'unlocked' : 'locked'}">
          <div class="trophy-icon-box">
            <span>${isUnlocked ? ach.icon : '🔒'}</span>
          </div>
          <div class="trophy-info">
            <div class="trophy-name-row">
              <span class="trophy-name">${ach.name}</span>
              <span class="trophy-status-pill">${isUnlocked ? '★ UNLOCKED' : 'LOCKED'}</span>
            </div>
            <p class="trophy-desc">${ach.desc}</p>
          </div>
        </div>
      `;
    }).join("");
  }
};

const openTrophies = (from: "MENU" | "GAME_OVER") => {
  trophiesReturnScreen = from;
  game.setModalOpen(true);
  renderTrophiesModal();
  document.getElementById("menu")?.classList.add("hidden");
  document.getElementById("game-over")?.classList.add("hidden");
  trophiesScreen?.classList.remove("hidden");
};

const closeTrophies = () => {
  game.setModalOpen(false);
  trophiesScreen?.classList.add("hidden");
  if (trophiesReturnScreen === "GAME_OVER") {
    document.getElementById("game-over")?.classList.remove("hidden");
  } else {
    document.getElementById("menu")?.classList.remove("hidden");
  }
};

document.querySelector<HTMLButtonElement>("#trophies-button")?.addEventListener("click", () => openTrophies("MENU"));
document.querySelector<HTMLButtonElement>("#over-trophies-button")?.addEventListener("click", () => openTrophies("GAME_OVER"));
document.querySelector<HTMLButtonElement>("#close-trophies-button")?.addEventListener("click", () => closeTrophies());

// Close trophies modal with Escape, Space, or Enter key rather than starting a run
window.addEventListener("keydown", (e) => {
  if (trophiesScreen && !trophiesScreen.classList.contains("hidden")) {
    if (e.key === "Escape" || e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      closeTrophies();
    }
  }
});

// --- Dev Tools ---
const panel = document.querySelector<HTMLElement>("#dev-panel")!;
const devToggle = document.querySelector<HTMLElement>("#dev-toggle")!;
if (import.meta.env.DEV) {
  devToggle.addEventListener("click", () => panel.classList.toggle("hidden"));
  document.querySelector<HTMLInputElement>("#invincible")!.addEventListener("change", (e) =>
    game.setDev("invincible", (e.target as HTMLInputElement).checked)
  );
  document.querySelector<HTMLInputElement>("#speed")!.addEventListener("input", (e) =>
    game.setDev("speed", Number((e.target as HTMLInputElement).value))
  );
  document.querySelector<HTMLInputElement>("#score-multiplier")!.addEventListener("input", (e) =>
    game.setDev("scoreMultiplier", Number((e.target as HTMLInputElement).value))
  );
  document.querySelector("#spawn-bot")!.addEventListener("click", () => game.spawnBot());
  document.querySelector("#spawn-sweeper")!.addEventListener("click", () => game.triggerSweeper());
} else {
  devToggle.classList.add("hidden");
}
