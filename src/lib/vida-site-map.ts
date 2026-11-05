/**
 * Interactive hit areas over the user-supplied original numbered Vida masterplan.
 * Coordinates are image-registered interactive hotspots, not engineering survey
 * polygons; the architectural image itself is never redrawn or replaced.
 * Image is normalized to 1000 x 962, preserving the original image aspect ratio.
 */
export const VIDA_SITE_WIDTH=1000;
export const VIDA_SITE_HEIGHT=962;
export type VidaSiteBuilding={id:number;phase:1|2|3;cx:number;cy:number;rx:number;ry:number;rotation:number};
export const vidaSiteBuildings:readonly VidaSiteBuilding[] = [
  {
    "id": 1,
    "phase": 1,
    "cx": 777,
    "cy": 148,
    "rx": 39,
    "ry": 35,
    "rotation": 0
  },
  {
    "id": 2,
    "phase": 1,
    "cx": 691,
    "cy": 149,
    "rx": 53,
    "ry": 35,
    "rotation": 0
  },
  {
    "id": 3,
    "phase": 1,
    "cx": 596,
    "cy": 148,
    "rx": 51,
    "ry": 36,
    "rotation": 0
  },
  {
    "id": 4,
    "phase": 1,
    "cx": 491,
    "cy": 148,
    "rx": 53,
    "ry": 36,
    "rotation": 0
  },
  {
    "id": 5,
    "phase": 1,
    "cx": 378,
    "cy": 149,
    "rx": 55,
    "ry": 38,
    "rotation": 0
  },
  {
    "id": 6,
    "phase": 1,
    "cx": 280,
    "cy": 169,
    "rx": 37,
    "ry": 42,
    "rotation": -34
  },
  {
    "id": 7,
    "phase": 1,
    "cx": 230,
    "cy": 244,
    "rx": 37,
    "ry": 45,
    "rotation": -38
  },
  {
    "id": 8,
    "phase": 1,
    "cx": 233,
    "cy": 323,
    "rx": 45,
    "ry": 43,
    "rotation": -18
  },
  {
    "id": 9,
    "phase": 1,
    "cx": 272,
    "cy": 367,
    "rx": 41,
    "ry": 40,
    "rotation": 22
  },
  {
    "id": 10,
    "phase": 1,
    "cx": 380,
    "cy": 366,
    "rx": 57,
    "ry": 43,
    "rotation": -20
  },
  {
    "id": 11,
    "phase": 1,
    "cx": 485,
    "cy": 286,
    "rx": 58,
    "ry": 34,
    "rotation": -40
  },
  {
    "id": 12,
    "phase": 1,
    "cx": 594,
    "cy": 254,
    "rx": 51,
    "ry": 36,
    "rotation": 0
  },
  {
    "id": 13,
    "phase": 1,
    "cx": 690,
    "cy": 255,
    "rx": 57,
    "ry": 36,
    "rotation": 0
  },
  {
    "id": 14,
    "phase": 1,
    "cx": 782,
    "cy": 258,
    "rx": 39,
    "ry": 37,
    "rotation": 0
  },
  {
    "id": 15,
    "phase": 1,
    "cx": 160,
    "cy": 133,
    "rx": 45,
    "ry": 44,
    "rotation": -40
  },
  {
    "id": 16,
    "phase": 1,
    "cx": 125,
    "cy": 215,
    "rx": 35,
    "ry": 43,
    "rotation": -6
  },
  {
    "id": 17,
    "phase": 1,
    "cx": 128,
    "cy": 332,
    "rx": 39,
    "ry": 48,
    "rotation": -8
  },
  {
    "id": 18,
    "phase": 1,
    "cx": 163,
    "cy": 403,
    "rx": 43,
    "ry": 48,
    "rotation": -35
  },
  {
    "id": 19,
    "phase": 2,
    "cx": 813,
    "cy": 390,
    "rx": 42,
    "ry": 64,
    "rotation": 0
  },
  {
    "id": 20,
    "phase": 2,
    "cx": 818,
    "cy": 508,
    "rx": 41,
    "ry": 54,
    "rotation": 0
  },
  {
    "id": 21,
    "phase": 2,
    "cx": 818,
    "cy": 619,
    "rx": 42,
    "ry": 66,
    "rotation": 0
  },
  {
    "id": 22,
    "phase": 2,
    "cx": 778,
    "cy": 744,
    "rx": 39,
    "ry": 35,
    "rotation": 37
  },
  {
    "id": 23,
    "phase": 2,
    "cx": 699,
    "cy": 765,
    "rx": 34,
    "ry": 45,
    "rotation": 0
  },
  {
    "id": 24,
    "phase": 2,
    "cx": 724,
    "cy": 659,
    "rx": 35,
    "ry": 45,
    "rotation": 0
  },
  {
    "id": 25,
    "phase": 2,
    "cx": 725,
    "cy": 571,
    "rx": 36,
    "ry": 40,
    "rotation": 0
  },
  {
    "id": 26,
    "phase": 2,
    "cx": 725,
    "cy": 494,
    "rx": 41,
    "ry": 39,
    "rotation": -15
  },
  {
    "id": 27,
    "phase": 2,
    "cx": 698,
    "cy": 435,
    "rx": 39,
    "ry": 44,
    "rotation": 15
  },
  {
    "id": 28,
    "phase": 2,
    "cx": 649,
    "cy": 364,
    "rx": 52,
    "ry": 45,
    "rotation": 17
  },
  {
    "id": 29,
    "phase": 2,
    "cx": 566,
    "cy": 494,
    "rx": 38,
    "ry": 48,
    "rotation": 20
  },
  {
    "id": 30,
    "phase": 2,
    "cx": 615,
    "cy": 575,
    "rx": 41,
    "ry": 43,
    "rotation": -16
  },
  {
    "id": 31,
    "phase": 2,
    "cx": 634,
    "cy": 661,
    "rx": 43,
    "ry": 39,
    "rotation": 0
  },
  {
    "id": 32,
    "phase": 3,
    "cx": 496,
    "cy": 665,
    "rx": 63,
    "ry": 40,
    "rotation": 0
  },
  {
    "id": 33,
    "phase": 3,
    "cx": 414,
    "cy": 666,
    "rx": 39,
    "ry": 40,
    "rotation": 0
  },
  {
    "id": 34,
    "phase": 3,
    "cx": 347,
    "cy": 666,
    "rx": 39,
    "ry": 42,
    "rotation": 0
  },
  {
    "id": 35,
    "phase": 3,
    "cx": 285,
    "cy": 625,
    "rx": 36,
    "ry": 44,
    "rotation": 48
  },
  {
    "id": 36,
    "phase": 3,
    "cx": 230,
    "cy": 599,
    "rx": 38,
    "ry": 45,
    "rotation": 45
  },
  {
    "id": 37,
    "phase": 3,
    "cx": 229,
    "cy": 512,
    "rx": 40,
    "ry": 47,
    "rotation": -12
  },
  {
    "id": 38,
    "phase": 3,
    "cx": 294,
    "cy": 513,
    "rx": 48,
    "ry": 42,
    "rotation": -3
  },
  {
    "id": 39,
    "phase": 3,
    "cx": 349,
    "cy": 487,
    "rx": 44,
    "ry": 37,
    "rotation": -9
  },
  {
    "id": 40,
    "phase": 3,
    "cx": 395,
    "cy": 479,
    "rx": 40,
    "ry": 41,
    "rotation": -8
  },
  {
    "id": 41,
    "phase": 3,
    "cx": 433,
    "cy": 476,
    "rx": 34,
    "ry": 43,
    "rotation": -8
  },
  {
    "id": 42,
    "phase": 3,
    "cx": 462,
    "cy": 570,
    "rx": 44,
    "ry": 43,
    "rotation": 0
  }
];
export function getVidaSiteBuilding(id:number):VidaSiteBuilding|null{return vidaSiteBuildings.find(s=>s.id===id)||null;}
export function vidaHotspotPoints(s:VidaSiteBuilding):string{
 const rad=s.rotation*Math.PI/180,c=Math.cos(rad),d=Math.sin(rad);
 return [[-s.rx,-s.ry],[s.rx,-s.ry],[s.rx,s.ry],[-s.rx,s.ry]]
   .map(([x,y])=>[(s.cx+x*c-y*d).toFixed(1),(s.cy+x*d+y*c).toFixed(1)].join(",")).join(" ");
}
