export class InputManager {
  private pressed = false;

  constructor(
    private readonly action: () => void,
    private readonly isBlocked?: () => boolean
  ) {
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space" && !event.repeat) {
        if (this.isBlocked?.()) return;
        event.preventDefault();
        this.fire();
      }
    });
  }

  bind(target: HTMLElement): void {
    target.addEventListener("pointerdown", (event) => {
      if (this.isBlocked?.()) return;
      if ((event.target as HTMLElement).closest("button, input, [role='dialog'], #trophies-screen")) return;
      event.preventDefault();
      this.fire();
    });
  }

  private fire(): void {
    if (!this.pressed) {
      this.pressed = true;
      this.action();
      queueMicrotask(() => {
        this.pressed = false;
      });
    }
  }
}
