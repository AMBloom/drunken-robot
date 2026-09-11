import type Phaser from 'phaser';
import type { RobotInputs } from '../entities/Robot.ts';

export interface TouchLayout {
  width: number;
  height: number;
  /** Bellows (jump) button: bottom-right square, in game pixels. */
  bellows: { x: number; y: number; size: number };
}

export function touchLayout(width: number, height: number): TouchLayout {
  const size = 132;
  return { width, height, bellows: { x: width - size - 24, y: height - size - 24, size } };
}

/**
 * Touch input for coarse pointers. Holding the left or right half of the
 * screen tilts the robot that way; holding the bellows button bottom-right
 * charges the jump, releasing fires it. Pointers are tracked by id so two
 * thumbs work at once. Purely a reader of pointer state; nothing is drawn.
 */
export class TouchControls {
  private readonly scene: Phaser.Scene;
  private readonly layout: TouchLayout;

  constructor(scene: Phaser.Scene, layout: TouchLayout) {
    this.scene = scene;
    this.layout = layout;
  }

  read(): RobotInputs {
    const inputs: RobotInputs = { left: false, right: false, jump: false };
    const { bellows, width } = this.layout;
    const pointers = [this.scene.input.pointer1, this.scene.input.pointer2, this.scene.input.pointer3];
    for (const p of pointers) {
      if (!p || !p.isDown) continue;
      const { x, y } = p;
      const onBellows =
        x >= bellows.x && x <= bellows.x + bellows.size && y >= bellows.y && y <= bellows.y + bellows.size;
      if (onBellows) {
        inputs.jump = true;
      } else if (x < width / 2) {
        inputs.left = true;
      } else {
        inputs.right = true;
      }
    }
    return inputs;
  }
}
