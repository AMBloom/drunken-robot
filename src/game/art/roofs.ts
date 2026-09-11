import type Phaser from 'phaser';
import { drawCubic, drawQuad } from './primitives.ts';

export type RoofType = 'gable' | 'gambrel' | 'mansard' | 'spire' | 'shed' | 'bell';

export interface RoofDef {
  x: number;
  w: number;
  roofHeight: number;
  sag: number;
  roofType: RoofType;
}

export interface RoofGeometry {
  leftEaveX: number;
  rightEaveX: number;
  eaveY: number;
  peakX: number;
  roofPeakY: number;
}

/**
 * Appends a roof silhouette to the current path, from the left eave to the right
 * eave. Used twice per building: once inside the fill path and once for the
 * stroke, so the two always match. `includeShedEdge` closes the shed roof's
 * vertical right edge, which the fill needs and the stroke does not.
 */
export function traceRoofPath(
  gfx: Phaser.GameObjects.Graphics,
  roof: RoofDef,
  geo: RoofGeometry,
  includeShedEdge: boolean,
): void {
  const { leftEaveX, rightEaveX, eaveY, peakX, roofPeakY } = geo;
  if (roof.roofType === 'gambrel') {
    const midPitchY = eaveY - roof.roofHeight * 0.6;
    drawQuad(gfx, leftEaveX, eaveY, leftEaveX + 15, midPitchY + roof.sag, roof.x + roof.w * 0.25, midPitchY);
    drawQuad(gfx, roof.x + roof.w * 0.25, midPitchY, peakX - 15, roofPeakY + roof.sag, peakX, roofPeakY);
    drawQuad(gfx, peakX, roofPeakY, peakX + 15, roofPeakY + roof.sag, roof.x + roof.w * 0.75, midPitchY);
    drawQuad(
      gfx,
      roof.x + roof.w * 0.75,
      midPitchY,
      rightEaveX - 15,
      midPitchY + roof.sag,
      rightEaveX,
      eaveY,
    );
  } else if (roof.roofType === 'mansard') {
    drawCubic(
      gfx,
      leftEaveX,
      eaveY,
      leftEaveX + 8,
      eaveY - roof.roofHeight * 0.7,
      roof.x + roof.w * 0.2,
      roofPeakY + 4,
      peakX - 25,
      roofPeakY,
    );
    gfx.lineTo(peakX + 25, roofPeakY);
    drawCubic(
      gfx,
      peakX + 25,
      roofPeakY,
      roof.x + roof.w * 0.8,
      roofPeakY + 4,
      rightEaveX - 8,
      eaveY - roof.roofHeight * 0.7,
      rightEaveX,
      eaveY,
    );
  } else if (roof.roofType === 'bell') {
    drawQuad(
      gfx,
      leftEaveX,
      eaveY,
      leftEaveX + 20,
      eaveY - 20,
      leftEaveX + 25,
      eaveY - roof.roofHeight * 0.5,
    );
    drawQuad(
      gfx,
      leftEaveX + 25,
      eaveY - roof.roofHeight * 0.5,
      leftEaveX + 28,
      roofPeakY + 10,
      peakX,
      roofPeakY,
    );
    drawQuad(
      gfx,
      peakX,
      roofPeakY,
      rightEaveX - 28,
      roofPeakY + 10,
      rightEaveX - 25,
      eaveY - roof.roofHeight * 0.5,
    );
    drawQuad(
      gfx,
      rightEaveX - 25,
      eaveY - roof.roofHeight * 0.5,
      rightEaveX - 20,
      eaveY - 20,
      rightEaveX,
      eaveY,
    );
  } else if (roof.roofType === 'shed') {
    drawQuad(gfx, leftEaveX, eaveY, roof.x + roof.w * 0.5, roofPeakY + roof.sag, rightEaveX, roofPeakY);
    if (includeShedEdge) {
      gfx.lineTo(rightEaveX, eaveY);
    }
  } else {
    drawQuad(
      gfx,
      leftEaveX,
      eaveY,
      (leftEaveX + peakX) / 2 - 4,
      (eaveY + roofPeakY) / 2 + roof.sag,
      peakX,
      roofPeakY,
    );
    drawQuad(
      gfx,
      peakX,
      roofPeakY,
      (peakX + rightEaveX) / 2 + 4,
      (roofPeakY + eaveY) / 2 + roof.sag,
      rightEaveX,
      eaveY,
    );
  }
}
