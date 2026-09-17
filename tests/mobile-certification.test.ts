import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('YouTube Playables Mobile & Safe-Area Certification Audit', () => {
  const root = process.cwd();
  const htmlPath = path.join(root, 'index.html');
  const cssPath = path.join(root, 'src', 'styles.css');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');

  describe('1. Viewport & Scaling Restrictions', () => {
    it('should lock viewport scaling to avoid browser pinch-zoom and gesture interference', () => {
      const viewportRegex = /<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']/i;
      const match = html.match(viewportRegex);
      assert.ok(match, 'Viewport meta tag should exist');

      const content = match[1];
      assert.ok(content.includes('width=device-width'), 'Viewport must specify width=device-width');
      assert.ok(content.includes('initial-scale=1.0'), 'Viewport must specify initial-scale=1.0');
      assert.ok(content.includes('maximum-scale=1.0'), 'Viewport must specify maximum-scale=1.0 to prevent layout breakage');
      assert.ok(content.includes('user-scalable=no'), 'Viewport must specify user-scalable=no for arcade playables');
      assert.ok(content.includes('viewport-fit=cover'), 'Viewport must include viewport-fit=cover for safe-area insets');
    });
  });

  describe('2. Touch Latency & Gesture Hijacking Prevention', () => {
    it('should disable default touch actions and tap callouts on canvas and app container', () => {
      assert.match(
        css,
        /#game-canvas[^{]*\{[^}]*touch-action:\s*none;/s,
        '#game-canvas must specify touch-action: none for zero latency touch response'
      );
      assert.match(
        css,
        /#app[^{]*\{[^}]*touch-action:\s*none;/s,
        '#app must specify touch-action: none to prevent gesture conflict'
      );
      assert.match(
        css,
        /-webkit-touch-callout:\s*none;/s,
        'Must disable webkit-touch-callout to prevent iOS callout popups during rapid taps'
      );
    });

    it('should disable text selection across game body to prevent accidental selection', () => {
      assert.match(
        css,
        /body[^{]*\{[^}]*user-select:\s*none;/s,
        'body must specify user-select: none'
      );
      assert.match(
        css,
        /body[^{]*\{[^}]*-webkit-user-select:\s*none;/s,
        'body must specify -webkit-user-select: none'
      );
    });
  });

  describe('3. Minimum Touch Target Dimensions (48x48px Standard)', () => {
    it('should guarantee audio toggle meets or exceeds 48x48px', () => {
      assert.match(
        css,
        /\.audio-toggle[^{]*\{[^}]*min-width:\s*48px;[^}]*min-height:\s*48px;/s,
        '.audio-toggle must meet min 48x48px touch target standard'
      );
    });

    it('should guarantee practice button meets or exceeds 48x48px', () => {
      assert.match(
        css,
        /\.practice-btn[^{]*\{[^}]*min-height:\s*48px;[^}]*min-width:\s*48px;/s,
        '.practice-btn must meet min 48x48px touch target standard'
      );
    });

    it('should guarantee trophies button meets or exceeds 48x48px', () => {
      assert.match(
        css,
        /\.trophies-btn[^{]*\{[^}]*min-height:\s*48px;[^}]*min-width:\s*48px;/s,
        '.trophies-btn must meet min 48x48px touch target standard'
      );
    });

    it('should guarantee close trophies button meets or exceeds 48px height', () => {
      assert.match(
        css,
        /\.close-trophies-btn[^{]*\{[^}]*min-height:\s*48px;/s,
        '.close-trophies-btn must meet min 48px height'
      );
    });

    it('should guarantee primary play buttons meet or exceed 48px height', () => {
      assert.match(
        css,
        /\.primary\.play-btn[^{]*\{[^}]*min-height:\s*5[0-9]px;/s,
        '.primary.play-btn must meet or exceed 48px height'
      );
    });

    it('should guarantee dev toggle meets or exceeds 48x48px', () => {
      assert.match(
        css,
        /\.dev-toggle[^{]*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/s,
        '.dev-toggle must have 48x48px touch target'
      );
    });
  });

  describe('4. Safe-Area Inset Handling for Notches & Mobile Chrome', () => {
    it('should incorporate env(safe-area-inset-right) on HUD to prevent audio button or streak overlap', () => {
      assert.match(
        css,
        /#hud[^{]*\{[^}]*env\(safe-area-inset-right\)/s,
        '#hud must account for safe-area-inset-right'
      );
    });

    it('should incorporate env(safe-area-inset-bottom) on menu and modal cards to avoid home indicator clash', () => {
      assert.match(
        css,
        /\.menu-card[^{]*\{[^}]*env\(safe-area-inset-bottom\)/s,
        '.menu-card must account for safe-area-inset-bottom'
      );
      assert.match(
        css,
        /\.trophies-card[^{]*\{[^}]*env\(safe-area-inset-bottom\)/s,
        '.trophies-card must account for safe-area-inset-bottom'
      );
      assert.match(
        css,
        /\.result-card[^{]*\{[^}]*env\(safe-area-inset-bottom\)/s,
        '.result-card must account for safe-area-inset-bottom'
      );
    });
  });
});
