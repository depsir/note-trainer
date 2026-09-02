'use client';

type VexFlowModule = typeof import('vexflow');

let vexflowPromise: Promise<VexFlowModule> | null = null;

/** Loads VexFlow once and makes sure its music fonts are ready before first draw. */
export function loadVexFlow(): Promise<VexFlowModule> {
  if (!vexflowPromise) {
    vexflowPromise = import('vexflow')
      .then(async (module) => {
        await module.VexFlow.loadFonts('Bravura', 'Academico');
        module.VexFlow.setFonts('Bravura', 'Academico');
        return module;
      })
      .catch((error) => {
        vexflowPromise = null;
        throw error;
      });
  }
  return vexflowPromise;
}
