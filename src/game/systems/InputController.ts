import Phaser from 'phaser';
import type { RobotInputs } from '../entities/Robot.ts';
import { TouchControls, touchLayout, type TouchLayout } from './TouchControls.ts';

/**
 * Merges keyboard and touch into one RobotInputs per frame. Either source can
 * drive the robot; the scene never sees which one did.
 */
export class InputController {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keyA?: Phaser.Input.Keyboard.Key;
  private readonly keyD?: Phaser.Input.Keyboard.Key;
  private readonly keyW?: Phaser.Input.Keyboard.Key;
  private readonly keySpace?: Phaser.Input.Keyboard.Key;
  private readonly touch: TouchControls | null;
  public readonly layout: TouchLayout;

  constructor(scene: Phaser.Scene, enableTouch: boolean) {
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    this.layout = touchLayout(scene.scale.width, scene.scale.height);
    this.touch = enableTouch ? new TouchControls(scene, this.layout) : null;
  }

  read(): RobotInputs {
    const key: RobotInputs = {
      left: Boolean(this.cursors?.left.isDown || this.keyA?.isDown),
      right: Boolean(this.cursors?.right.isDown || this.keyD?.isDown),
      jump: Boolean(
        this.cursors?.space.isDown || this.keySpace?.isDown || this.keyW?.isDown || this.cursors?.up.isDown,
      ),
    };
    if (!this.touch) return key;
    const t = this.touch.read();
    return { left: key.left || t.left, right: key.right || t.right, jump: key.jump || t.jump };
  }
}
