// Løberen. Løber selv. Kan hoppe, slide og sige "Excuse me!" (tap).
// Fysikkroppen bruges kun til at stå på jorden. Skader og slag regnes ud fra
// kasserne i hurtRect() og swingRect(), så de kan justeres uafhængigt af grafikken.

import { TUNING, DEPTH } from '../config.js';
import { sfx } from '../systems/audio.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, runnerId, outfit) {
    super(scene, x, y, 'atlas', `runner/${runnerId}/${outfit}/run0`);
    this.base = `runner/${runnerId}/${outfit}`;
    this.animKey = `${runnerId}_${outfit}_run`;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    // Cellen er 128x96. Kroppen står med midten 48 px inde og fødderne i bunden.
    this.setOrigin(0.375, 1).setDepth(DEPTH.player);
    this.body.setSize(20, 40).setOffset(38, 56);
    this.body.setGravityY(TUNING.gravity);
    this.body.maxVelocity.y = 900;

    this.onGround = true;
    this.lastGroundAt = 0;
    this.jumpQueuedAt = -9999;
    this.sliding = false;
    this.slideUntil = 0;
    this.slideOnLand = false;
    this.holdSlide = false;   // sættes af banen, mens der er noget lavt over fiskeren
    this.swingAt = -9999;
    this.swingId = 0;
    this.invulnUntil = 0;
    this.rainbow = false;
    this.play(this.animKey);
  }

  // ---------- kommandoer ----------
  jump(now) {
    this.jumpQueuedAt = now;
  }

  slide(now) {
    if (this.onGround) this.startSlide(now);
    else { this.body.setVelocityY(Math.max(this.body.velocity.y, TUNING.fastFallV)); this.slideOnLand = true; }
  }

  /** Returnerer true, hvis slaget blev startet. */
  swing(now) {
    if (now - this.swingAt < TUNING.swingCooldownMs) return false;
    this.swingAt = now;
    this.swingId++;
    this.sliding = false;
    sfx('swing');
    return true;
  }

  startSlide(now) {
    this.sliding = true;
    this.slideUntil = now + TUNING.slideMs;
    this.slideOnLand = false;
    sfx('slide');
  }

  // ---------- tilstand ----------
  isSwinging(now) { return now - this.swingAt < TUNING.swingMs; }
  isSwingActive(now) { return now - this.swingAt < TUNING.swingActiveMs; }
  isInvulnerable(now) { return now < this.invulnUntil; }

  /** Kassen, løberen kan blive ramt i. */
  hurtRect() {
    if (this.sliding) return { x: this.x - 8, y: this.y - 26, w: 46, h: 26 };
    return { x: this.x - 10, y: this.y - 66, w: 20, h: 66 };
  }

  /** Kassen, "Excuse me!" virker i. */
  swingRect() {
    return { x: this.x - 4, y: this.y - 88, w: 84, h: 88 };
  }

  // ---------- pr. frame ----------
  tick(now) {
    const b = this.body;
    const wasOnGround = this.onGround;
    this.onGround = b.blocked.down || b.touching.down;
    if (this.onGround) this.lastGroundAt = now;

    if (this.onGround && !wasOnGround && this.slideOnLand) this.startSlide(now);
    if (this.sliding && ((now > this.slideUntil && !this.holdSlide) || !this.onGround)) this.sliding = false;

    const canJump = this.onGround || now - this.lastGroundAt < TUNING.coyoteMs;
    if (canJump && now - this.jumpQueuedAt < TUNING.jumpBufferMs) {
      this.jumpQueuedAt = -9999;
      this.lastGroundAt = -9999;
      this.sliding = false;
      this.slideOnLand = false;
      b.setVelocityY(TUNING.jumpV);
      this.onGround = false;
      sfx('jump');
    }

    // grafik
    if (this.isSwinging(now)) { this.anims.stop(); this.setFrame(`${this.base}/swing`); }
    else if (this.sliding) { this.anims.stop(); this.setFrame(`${this.base}/slide`); }
    else if (!this.onGround) { this.anims.stop(); this.setFrame(`${this.base}/jump`); }
    else if (!this.anims.isPlaying) this.play(this.animKey);

    this.blink(now);
  }

  blink(now) {
    this.setAlpha(this.isInvulnerable(now) && Math.floor(now / 70) % 2 ? 0.35 : 1);
    if (this.rainbow) this.setTint(Phaser.Display.Color.HSVToRGB((now % 600) / 600, 0.5, 1).color);
    else this.clearTint();
  }
}
