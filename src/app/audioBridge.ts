import { MusicDirector } from '../audio/director.ts';
import { EnsembleMixer } from '../audio/mixer.ts';

/**
 * The only place the game layer reaches the audio layer. The director
 * subscribes to the event bus and store itself; this just builds the graph.
 */
export interface AudioBridge {
  mixer: EnsembleMixer;
  director: MusicDirector;
}

export function createAudioBridge(): AudioBridge {
  const mixer = new EnsembleMixer();
  const director = new MusicDirector(mixer, Date.now() % 1_000_000);
  director.attach();
  return { mixer, director };
}
