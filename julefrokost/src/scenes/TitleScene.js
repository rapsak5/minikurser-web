// Titelskærmen.

import { GAME_W, GAME_H, GROUND_Y, VERSION, PROMO } from '../config.js';
import { fisherById, isFisher, DEFAULT_FISHER } from '../data/fishers.js';
import { txt, panel, pad, C } from '../game/ui.js';
import * as Scores from '../systems/scores.js';
import * as Save from '../systems/save.js';
import { unlock, sfx } from '../systems/audio.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const t = 'dragoer';
    this.add.image(0, 0, `${t}_sky`).setOrigin(0);
    this.far = this.add.tileSprite(0, 0, GAME_W, GAME_H, `${t}_far`).setOrigin(0);
    this.mid = this.add.tileSprite(0, 0, GAME_W, GAME_H, `${t}_mid`).setOrigin(0);
    this.ground = this.add.tileSprite(0, GROUND_Y, GAME_W, GAME_H - GROUND_Y, `${t}_ground`).setOrigin(0);
    this.snow = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'snow').setOrigin(0).setAlpha(0.8);

    const id = fisherById(Save.load().fisher).id;
    this.add.sprite(150, GROUND_Y, 'atlas', `fisher/${id}/run0`).setOrigin(0.375, 1).play(`${id}_run`);
    this.add.sprite(540, GROUND_Y, 'atlas', 'enemy/cat0').setOrigin(0.5, 1).play('cat_walk');
    this.add.sprite(520, GROUND_Y - 150, 'atlas', 'enemy/gull0').play('gull_fly');

    // afsender: ai-workshops logo og navn
    const by = 22;
    const pres = txt(this, 0, by, 'PRÆSENTERER', { font: 'small_o', ox: 0 });
    const bw = 24 + 6 + 96 + 6 + pres.width;
    const bx = Math.round(GAME_W / 2 - bw / 2);
    this.add.rectangle(GAME_W / 2, by, bw + 16, 32, C.night, 0.75);
    this.add.image(bx, by, 'brand_mark24').setOrigin(0, 0.5);
    this.add.image(bx + 30, by + 1, 'brand_word96').setOrigin(0, 0.5);
    pres.setPosition(bx + 132, by + 2);
    pres.setDepth(1);
    txt(this, GAME_W / 2, 60, 'JULEFROKOST', { font: 'big_o', scale: 3 });
    txt(this, GAME_W / 2, 104, 'PÅ AMAGER', { font: 'big_o', scale: 3, tint: C.yellow });

    // topscorerlisten i miniformat: de fem bedste
    panel(this, GAME_W / 2 - 126, 130, 252, 132, { alpha: 0.92 });
    txt(this, GAME_W / 2, 146, 'TOPSCORERLISTEN', { font: 'small_o', tint: C.yellow });
    this.topRows = [];
    this.drawTop(Scores.localBoard());
    if (Scores.isShared()) Scores.fetchBoard().then((b) => { if (b && this.sys.isActive()) this.drawTop(b); });

    this.add.rectangle(GAME_W / 2, 277, 200, 24, C.night, 0.8);
    const start = txt(this, GAME_W / 2, 276, 'TRYK FOR AT SPILLE', { font: 'ui' });
    this.tweens.add({ targets: start, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    const tz = txt(this, GAME_W / 2, 304, PROMO.teaser, { font: 'small_o', tint: C.yellow });
    this.add.rectangle(GAME_W / 2, 304, tz.width + 14, 16, C.night, 0.8);
    tz.setDepth(1);
    txt(this, 6, GAME_H - 6, PROMO.credit.toUpperCase(), { font: 'small_o', ox: 0, oy: 1, tint: C.yellow });
    txt(this, GAME_W - 6, GAME_H - 6, `v${VERSION}`, { font: 'small_o', ox: 1, oy: 1 });

    const go = () => {
      unlock();
      sfx('click');
      // På Android kan spillet gå i fuldskærm og låse til bredformat. iPhone understøtter det ikke i Safari.
      const dev = this.sys.game.device;
      if (!dev.os.desktop && this.scale.fullscreen.available && !this.scale.isFullscreen) {
        try {
          this.scale.startFullscreen();
          window.screen.orientation?.lock?.('landscape').catch(() => {});
        } catch (e) { /* ikke muligt her */ }
      }
      this.scene.start(Save.hasName() ? 'Map' : 'Select');
    };
    this.input.once('pointerup', go);
    this.input.keyboard?.once('keydown', go);
  }

  drawTop(board) {
    this.topRows.forEach((o) => o.destroy());
    this.topRows = [];
    const keep = (o) => { this.topRows.push(o); return o; };
    const rows = board.rows.filter((r) => r.score > 0).slice(0, 5);
    if (!rows.length) {
      keep(txt(this, GAME_W / 2, 196, 'Ingen point endnu.\nBliv den første!', { font: 'ui', center: true, tint: C.soft }));
      return;
    }
    rows.forEach((r, i) => {
      const y = 168 + i * 19;
      if (r.me) keep(this.add.rectangle(GAME_W / 2, y, 236, 18, C.panel));
      keep(txt(this, GAME_W / 2 - 112, y, `${i + 1}.`, { font: 'small_o', ox: 0, tint: i === 0 ? C.yellow : C.soft }));
      keep(this.add.image(GAME_W / 2 - 86, y, 'atlas', `portrait/${isFisher(r.fisher) ? r.fisher : DEFAULT_FISHER}`).setScale(0.28));
      keep(txt(this, GAME_W / 2 - 72, y, String(r.name).toUpperCase(), { font: 'small_o', ox: 0, tint: i === 0 ? C.yellow : 0xffffff }));
      keep(txt(this, GAME_W / 2 + 112, y, pad(r.score), { font: 'small_o', ox: 1 }));
    });
    if (board.me && board.me.rank > 5 && board.me.score > 0) {
      keep(txt(this, GAME_W / 2, 255, `DU ER NR. ${board.me.rank} AF ${board.count}`, { font: 'small', tint: C.soft }));
    }
  }

  update(time) {
    const scroll = time * 0.05;
    this.far.tilePositionX = Math.floor(scroll * 0.15);
    this.mid.tilePositionX = Math.floor(scroll * 0.45);
    this.ground.tilePositionX = Math.floor(scroll);
    this.snow.tilePositionX = Math.floor(scroll * 0.7);
    this.snow.tilePositionY = -Math.floor(time * 0.03);
  }
}
