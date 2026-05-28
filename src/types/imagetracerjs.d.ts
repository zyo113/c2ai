declare module 'imagetracerjs' {
  interface ImageData {
    data: number[];
    width: number;
    height: number;
  }

  interface TracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    rightangleenhance?: boolean;
    colorsampling?: number;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    scale?: number;
    simplify?: number;
    roundcoords?: number;
    lcpr?: number;
    qcpr?: number;
    desc?: boolean;
    viewbox?: boolean;
    blurradius?: number;
    blurdelta?: number;
  }

  export function imagedataToSVG(imageData: ImageData, options?: TracerOptions): string;
  export function optionpresets(): Record<string, TracerOptions>;
  export function imageToSVG(src: string, options?: TracerOptions): string;
}