// Fiskeren. Løber selv. Kan hoppe, slide og slå med pokalen.
// Fysikkroppen bruges kun til at stå på jorden. Skader og slag regnes ud fra
// kasserne i hurtRect() og swingRect(), så de kan justeres uafhængigt af grafikken.

import { TUNING, DEPTH } from '../config.js';
import { sfx } from '../systems/audio.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, fisherId) {
    super(scene, x, y, 'atlas', `fisher/${fisherId}/run0`);
    this.fisherId = fisherId;
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
    this.swim = false;
    this.play(`${fisherId}_run`);
  }

  /** Undervandsbaner: ingen tyngdekraft. Fiskeren svømmer i en af tre baner (0 = øverst). */
  enableSwim(laneYs) {
    this.swim = true;
    this.laneYs = laneYs;
    this.lane = 1;
    this.body.setGravityY(0);
    this.setOrigin(0.375, 0.75);
    this.setY(laneYs[1]);
    this.onGround = true;
    this.play(`${this.fisherId}_swim`);
  }

  // ---------- kommandoer ----------
  jump(now) {
    if (this.swim) { if (this.lane > 0) { this.lane--; sfx('slide'); } return; }
    this.jumpQueuedAt = now;
  }

  slide(now) {
    if (this.swim) { if (this.lane < this.laneYs.length - 1) { this.lane++; sfx('slide'); } return; }
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

  /** Kassen, fiskeren kan blive ramt i. Stående tæller pokalen med. */
  hurtRect() {
    if (this.swim) return { x: this.x - 34, y: this.y - 13, w: 40, h: 26 };
    if (this.sliding) return { x: this.x - 2, y: this.y - 28, w: 42, h: 28 };
    return { x: this.x - 11, y: this.y - 78, w: 22, h: 78 };
  }

  /** Kassen, pokalen rammer i, når der slås. */
  swingRect() {
    if (this.swim) return { x: this.x - 4, y: this.y - 28, w: 84, h: 56 };
    return { x: this.x - 4, y: this.y - 88, w: 74, h: 88 };
  }

  // ---------- pr. frame ----------
  tick(now) {
    if (this.swim) { this.tickSwim(now); return; }
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
    const id = this.fisherId;
    if (this.isSwinging(now)) { this.anims.stop(); this.setFrame(`fisher/${id}/swing`); }
    else if (this.sliding) { this.anims.stop(); this.setFrame(`fisher/${id}/slide`); }
    else if (!this.onGround) { this.anims.stop(); this.setFrame(`fisher/${id}/jump`); }
    else if (!this.anims.isPlaying) this.play(`${id}_run`);

    this.blink(now);
  }

  tickSwim(now) {
    const dy = this.laneYs[this.lane] - this.y;
    if (Math.abs(dy) < 3) { this.setY(this.laneYs[this.lane]); this.body.setVelocityY(0); }
    else this.body.setVelocityY(Phaser.Math.Clamp(dy * 14, -460, 460));
    const id = this.fisherId;
    if (this.isSwinging(now)) { this.anims.stop(); this.setFrame(`fisher/${id}/swimhit`); }
    else if (!this.anims.isPlaying) this.play(`${id}_swim`);
    this.blink(now);
  }

  blink(now) {
    this.setAlpha(this.isInvulnerable(now) && Math.floor(now / 70) % 2 ? 0.35 : 1);
    if (this.rainbow) this.setTint(Phaser.Display.Color.HSVToRGB((now % 600) / 600, 0.5, 1).color);
    else this.clearTint();
  }
}
