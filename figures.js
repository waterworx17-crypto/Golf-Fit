/* =====================================================================
   figures.js - THE STICK FIGURES

   A stick figure is just a list of points (joints). Lines join them:

        h = head     n = neck      p = pelvis (hips)
        e1, w1 = near elbow, wrist      e2, w2 = far elbow, wrist
        k1, f1 = near knee, foot        k2, f2 = far knee, foot

   Each figure has two "frames": a start pose and an end pose. The app
   slides every joint smoothly between the two, which animates the move.
   Each point is [x, y]; y grows DOWNWARD (that's how screens work).

   "props" are things around the figure: the floor, a bench, a foam
   roller, a band. A prop can use a joint name instead of a point, so a
   dumbbell held at "w1" moves with the hand.

   Helpers at the top save typing: shift() moves a whole pose, and
   mirror() flips it left-to-right.
   ===================================================================== */

const STAND = {
  h: [120, 30], n: [120, 41], p: [120, 84],
  e1: [124, 62], w1: [126, 84], e2: [116, 62], w2: [114, 84],
  k1: [122, 111], f1: [122, 138], k2: [118, 111], f2: [118, 138],
};

function shift(pose, dx, dy) {
  const out = {};
  for (const joint in pose) out[joint] = [pose[joint][0] + dx, pose[joint][1] + dy];
  return out;
}

function mirror(pose, centerX) {
  const out = {};
  for (const joint in pose) out[joint] = [2 * centerX - pose[joint][0], pose[joint][1]];
  return out;
}

// Same as another pose, but with some joints replaced
function change(pose, changes) {
  return Object.assign({}, pose, changes);
}

/* ---------- shared poses ---------- */

const LIE_KNEES_BENT = {
  h: [38, 128], n: [50, 132], p: [100, 134],
  e1: [70, 137], w1: [90, 138], e2: [70, 137], w2: [90, 138],
  k1: [122, 108], f1: [142, 138], k2: [119, 110], f2: [139, 138],
};

const HINGE = {
  h: [144, 56], n: [134, 64], p: [104, 92],
  e1: [136, 86], w1: [137, 107], e2: [132, 86], w2: [133, 107],
  k1: [127, 114], f1: [121, 138], k2: [124, 114], f2: [117, 138],
};

const JUMP_UP = shift(STAND, 0, -18);

const QUARTER_SQUAT = {
  h: [131, 51], n: [126, 62], p: [112, 100],
  e1: [114, 82], w1: [100, 95], e2: [111, 82], w2: [97, 94],
  k1: [133, 116], f1: [121, 138], k2: [130, 117], f2: [117, 138],
};

/* ---------- one entry per exercise ---------- */

const FIGURES = {

  // W1: knee lifts high in front, then circles out and back behind you
  cars: {
    frames: [
      change(STAND, { k1: [146, 82], f1: [148, 108], e1: [137, 58], w1: [149, 68] }),
      change(STAND, { k1: [101, 103], f1: [84, 120], e1: [137, 58], w1: [149, 68] }),
    ],
    props: [{ floor: 139 }, { line: [[152, 36], [152, 139]], kind: "stick" }],
  },

  // W2: straight arm sweeps from in front, up overhead and back
  shouldercars: {
    frames: [
      change(STAND, { e1: [141, 47], w1: [161, 52], e2: [114, 62], w2: [111, 84] }),
      change(STAND, { e1: [108, 23], w1: [96, 5], e2: [114, 62], w2: [111, 84] }),
    ],
    props: [{ floor: 139 }],
  },

  // W3: from hands and knees, sit the hips back to the heels
  childpose: {
    frames: [
      { h: [157, 104], n: [146, 111], p: [104, 111],
        e1: [146, 125], w1: [146, 138], e2: [143, 125], w2: [143, 138],
        k1: [104, 138], f1: [78, 138], k2: [101, 138], f2: [75, 138] },
      { h: [134, 132], n: [124, 130], p: [86, 125],
        e1: [146, 136], w1: [168, 138], e2: [143, 136], w2: [165, 138],
        k1: [108, 138], f1: [82, 138], k2: [105, 138], f2: [79, 138] },
    ],
    props: [{ floor: 139 }],
  },

  // W4: "m" is the middle of the back, so the spine can round and sag
  catcow: {
    frames: [
      { h: [152, 120], n: [146, 111], m: [125, 96], p: [104, 111],
        e1: [146, 125], w1: [146, 138], e2: [143, 125], w2: [143, 138],
        k1: [104, 138], f1: [78, 138], k2: [101, 138], f2: [75, 138] },
      { h: [157, 99], n: [146, 109], m: [125, 119], p: [104, 109],
        e1: [146, 124], w1: [146, 138], e2: [143, 124], w2: [143, 138],
        k1: [104, 138], f1: [78, 138], k2: [101, 138], f2: [75, 138] },
    ],
    props: [{ floor: 139 }],
  },

  // 7b: standing on a board, fold forward and reach to the toes
  toetouch: {
    frames: [
      shift(STAND, 0, -4),
      { h: [157, 99], n: [146, 96], p: [106, 84],
        e1: [139, 116], w1: [129, 134], e2: [136, 116], w2: [126, 134],
        k1: [119, 108], f1: [122, 134], k2: [116, 108], f2: [118, 134] },
    ],
    props: [{ floor: 141 }, { rect: [100, 134, 40, 7], kind: "box" }, { ring: ["p", "k1"], kind: "towel" }],
  },

  // 7c: on hands and knees, one leg kicks straight back
  kickback: {
    frames: [
      { h: [157, 104], n: [146, 111], p: [104, 111],
        e1: [146, 125], w1: [146, 138], e2: [143, 125], w2: [143, 138],
        k1: [104, 138], f1: [78, 138], k2: [101, 138], f2: [75, 138] },
      { h: [157, 104], n: [146, 111], p: [104, 111],
        e1: [146, 125], w1: [146, 138], e2: [143, 125], w2: [143, 138],
        k1: [78, 106], f1: [52, 100], k2: [101, 138], f2: [75, 138] },
    ],
    props: [{ floor: 139 }],
  },

  // Rotator cuff: elbow pinned at your side, forearm turns outward
  rotator: {
    frames: [
      change(STAND, { e1: [121, 63], w1: [143, 64], e2: [116, 62], w2: [114, 84] }),
      change(STAND, { e1: [121, 63], w1: [128, 66], e2: [116, 62], w2: [114, 84] }),
    ],
    props: [{ floor: 139 }, { wall: 196 }, { band: ["w1", [196, 64]] }, { rect: [114, 58, 8, 10], kind: "object" }],
  },

  openbook: {
    frames: [
      { h: [40, 124], n: [52, 128], p: [100, 130],
        e1: [72, 118], w1: [88, 124], e2: [72, 137], w2: [92, 138],
        k1: [122, 119], f1: [142, 134], k2: [126, 136], f2: [154, 138] },
      { h: [40, 124], n: [52, 128], p: [100, 130],
        e1: [50, 107], w1: [36, 92], e2: [72, 137], w2: [92, 138],
        k1: [122, 119], f1: [142, 134], k2: [126, 136], f2: [154, 138] },
    ],
    props: [{ floor: 139 }, { circle: [122, 129, 9], kind: "roller" }],
  },

  floorslides: {
    frames: [
      change(LIE_KNEES_BENT, { e1: [46, 138], w1: [56, 126], e2: [44, 138], w2: [54, 126] }),
      change(LIE_KNEES_BENT, { e1: [30, 138], w1: [10, 138], e2: [30, 137], w2: [10, 137] }),
    ],
    props: [{ floor: 139 }, { rect: [72, 124, 14, 6], kind: "object" }],
  },

  sidebend: {
    frames: [
      { h: [114, 30], n: [114, 41], p: [114, 84],
        e1: [132, 28], w1: [118, 26], e2: [98, 30], w2: [110, 26],
        k1: [140, 86], f1: [142, 138], k2: [137, 88], f2: [138, 138] },
      { h: [97, 36], n: [103, 46], p: [114, 84],
        e1: [118, 22], w1: [104, 30], e2: [86, 40], w2: [98, 32],
        k1: [140, 86], f1: [142, 138], k2: [137, 88], f2: [138, 138] },
    ],
    props: [{ floor: 139 }, { rect: [92, 88, 48, 7], kind: "bench" },
            { line: [[98, 95], [98, 139]], kind: "bench" }, { line: [[134, 95], [134, 139]], kind: "bench" },
            { circle: [139, 81, 6], kind: "roller" }],
  },

  foamroll: {
    frames: [
      { h: [52, 104], n: [64, 114], p: [116, 122],
        e1: [66, 137], w1: [46, 138], e2: [62, 137], w2: [42, 138],
        k1: [144, 122], f1: [170, 133], k2: [142, 126], f2: [168, 137] },
      shift({ h: [52, 104], n: [64, 114], p: [116, 122],
        e1: [66, 137], w1: [46, 138], e2: [62, 137], w2: [42, 138],
        k1: [144, 122], f1: [170, 133], k2: [142, 126], f2: [168, 137] }, 16, 0),
    ],
    props: [{ floor: 139 }, { circle: [138, 130, 9], kind: "roller" }],
  },

  toeyoga: {
    frames: [
      change(STAND, { e1: [140, 52], w1: [160, 58], e2: [100, 52], w2: [80, 58],
                      f1: [131, 138], k1: [126, 111], f2: [111, 138], k2: [115, 111] }),
      change(STAND, { e1: [141, 56], w1: [161, 52], e2: [99, 48], w2: [79, 62],
                      f1: [131, 138], k1: [126, 111], f2: [111, 138], k2: [115, 111] }),
    ],
    props: [{ floor: 139 }],
  },

  wipers: {
    frames: [
      { h: [86, 80], n: [88, 92], p: [92, 134],
        e1: [80, 114], w1: [72, 136], e2: [76, 114], w2: [68, 136],
        k1: [119, 135], f1: [146, 135], k2: [119, 136], f2: [146, 136],
        t1: [148, 124] },
      { h: [86, 80], n: [88, 92], p: [92, 134],
        e1: [80, 114], w1: [72, 136], e2: [76, 114], w2: [68, 136],
        k1: [119, 135], f1: [146, 135], k2: [119, 136], f2: [146, 136],
        t1: [157, 131] },
    ],
    props: [{ floor: 139 }, { wall: 64 }],
  },

  legraise: {
    frames: [
      { h: [36, 128], n: [48, 132], p: [98, 134],
        e1: [62, 118], w1: [80, 108], e2: [60, 120], w2: [78, 110],
        k1: [106, 108], f1: [114, 82], k2: [110, 109], f2: [122, 84] },
      { h: [36, 128], n: [48, 132], p: [98, 134],
        e1: [62, 118], w1: [80, 108], e2: [60, 120], w2: [78, 110],
        k1: [106, 108], f1: [114, 82], k2: [125, 136], f2: [152, 137] },
    ],
    props: [{ floor: 139 }, { band: ["w1", "f1"] }],
  },

  hipflexor: {
    frames: [
      { h: [118, 57], n: [118, 68], p: [118, 111],
        e1: [140, 86], w1: [158, 94], e2: [112, 92], w2: [120, 106],
        k1: [145, 111], f1: [145, 138], k2: [108, 137], f2: [82, 138] },
      { h: [128, 59], n: [124, 70], p: [121, 111],
        e1: [134, 50], w1: [142, 30], e2: [128, 51], w2: [135, 31],
        k1: [146, 112], f1: [145, 138], k2: [110, 137], f2: [84, 138] },
    ],
    props: [{ floor: 139 }, { line: [[160, 90], [164, 139]], kind: "stick" }],
  },

  thrust: {
    frames: [
      { h: [56, 100], n: [70, 104], p: [96, 126],
        e1: [80, 116], w1: [90, 124], e2: [78, 114], w2: [88, 122],
        k1: [122, 108], f1: [128, 138], k2: [119, 110], f2: [124, 138] },
      { h: [56, 100], n: [70, 104], p: [100, 106],
        e1: [80, 116], w1: [92, 118], e2: [78, 114], w2: [90, 116],
        k1: [127, 106], f1: [128, 138], k2: [124, 108], f2: [124, 138] },
    ],
    props: [{ floor: 139 }, { rect: [30, 106, 46, 8], kind: "bench" },
            { line: [[36, 114], [36, 139]], kind: "bench" }, { line: [[70, 114], [70, 139]], kind: "bench" },
            { ring: ["p", "k1"], kind: "band" }],
  },

  landing: {
    frames: [QUARTER_SQUAT,
      change(JUMP_UP, { e1: [130, 6], w1: [140, -12], e2: [126, 6], w2: [136, -12] })],
    props: [{ floor: 139 }, { spot: [120, 139] }],
  },

  jump180: {
    frames: [QUARTER_SQUAT,
      mirror(change(JUMP_UP, { e1: [130, 6], w1: [140, -12], e2: [126, 6], w2: [136, -12] }), 120)],
    props: [{ floor: 139 }, { rect: [84, 128, 22, 11], kind: "box" }, { text: [150, 10, "180°"] }],
  },

  highpull: {
    frames: [HINGE,
      change(JUMP_UP, { e1: [104, 18], w1: [126, 26], e2: [101, 20], w2: [123, 27] })],
    props: [{ floor: 139 }, { bar: "w1", length: 22 }],
  },

  cleanjump: {
    frames: [HINGE,
      change(JUMP_UP, { e1: [124, 44], w1: [125, 66], e2: [116, 44], w2: [115, 66] })],
    props: [{ floor: 139 }, { dumbbell: "w1" }],
  },

  deadbug: {
    frames: [
      { h: [40, 128], n: [52, 132], p: [100, 134],
        e1: [38, 118], w1: [24, 108], e2: [38, 120], w2: [24, 110],
        k1: [102, 108], f1: [128, 108], k2: [104, 110], f2: [130, 110] },
      { h: [40, 128], n: [52, 132], p: [100, 134],
        e1: [38, 118], w1: [24, 108], e2: [38, 120], w2: [24, 110],
        k1: [125, 122], f1: [152, 126], k2: [104, 110], f2: [130, 110] },
    ],
    props: [{ floor: 139 }, { wall: 22 }],
  },

  curlup: {
    frames: [
      { h: [38, 128], n: [50, 132], p: [100, 134],
        e1: [66, 136], w1: [84, 137], e2: [64, 136], w2: [82, 137],
        k1: [127, 135], f1: [154, 135], k2: [121, 112], f2: [140, 137] },
      { h: [45, 115], n: [55, 123], p: [100, 134],
        e1: [66, 136], w1: [84, 137], e2: [64, 136], w2: [82, 137],
        k1: [127, 135], f1: [154, 135], k2: [121, 112], f2: [140, 137] },
    ],
    props: [{ floor: 139 }],
  },

  leghold: {
    frames: [
      { h: [38, 128], n: [50, 132], p: [100, 134],
        e1: [72, 137], w1: [94, 138], e2: [70, 137], w2: [92, 138],
        k1: [110, 109], f1: [120, 84], k2: [112, 110], f2: [123, 85] },
      { h: [38, 128], n: [50, 132], p: [100, 134],
        e1: [72, 137], w1: [94, 138], e2: [70, 137], w2: [92, 138],
        k1: [111, 109], f1: [122, 85], k2: [113, 110], f2: [125, 86] },
    ],
    props: [{ floor: 139 }],
  },

  situp: {
    frames: [
      change(LIE_KNEES_BENT, { e1: [64, 120], w1: [76, 112], e2: [62, 122], w2: [74, 114] }),
      change(LIE_KNEES_BENT, { h: [94, 80], n: [90, 92], e1: [108, 98], w1: [128, 92],
                               e2: [106, 100], w2: [126, 94] }),
    ],
    props: [{ floor: 139 }, { wall: 200 }, { band: ["w1", [200, 92]] }],
  },

  pulldown: {
    frames: [
      { h: [108, 46], n: [108, 57], p: [110, 100],
        e1: [114, 36], w1: [118, 15], e2: [110, 36], w2: [114, 15],
        k1: [137, 100], f1: [138, 138], k2: [134, 102], f2: [134, 138] },
      { h: [106, 46], n: [107, 57], p: [110, 100],
        e1: [100, 76], w1: [118, 60], e2: [97, 76], w2: [115, 60],
        k1: [137, 100], f1: [138, 138], k2: [134, 102], f2: [134, 138] },
    ],
    props: [{ floor: 139 }, { rect: [94, 102, 34, 6], kind: "bench" },
            { line: [[110, 108], [110, 139]], kind: "bench" },
            { rect: [130, 90, 14, 6], kind: "bench" },
            { cable: ["w1", [118, -12]] }, { bar: "w1", length: 30 }],
  },

  lunge: {
    frames: [
      { h: [116, 51], n: [116, 62], p: [116, 104],
        e1: [118, 84], w1: [119, 104], e2: [114, 84], w2: [113, 104],
        k1: [108, 130], f1: [84, 138], k2: [142, 111], f2: [142, 138] },
      { h: [164, 51], n: [164, 62], p: [164, 104],
        e1: [166, 84], w1: [167, 104], e2: [162, 84], w2: [161, 104],
        k1: [190, 111], f1: [190, 138], k2: [156, 130], f2: [142, 138] },
    ],
    props: [{ floor: 139 }, { dumbbell: "w1" }],
  },

  row: {
    frames: [
      { h: [56, 58], n: [68, 66], p: [112, 70],
        e1: [72, 88], w1: [74, 110], e2: [66, 84], w2: [64, 100],
        k1: [118, 104], f1: [122, 138], k2: [112, 100], f2: [138, 100] },
      { h: [56, 58], n: [68, 66], p: [112, 70],
        e1: [92, 56], w1: [80, 76], e2: [66, 84], w2: [64, 100],
        k1: [118, 104], f1: [122, 138], k2: [112, 100], f2: [138, 100] },
    ],
    props: [{ floor: 139 }, { rect: [56, 101, 90, 7], kind: "bench" },
            { line: [[62, 108], [62, 139]], kind: "bench" }, { line: [[106, 108], [106, 139]], kind: "bench" },
            { dumbbell: "w1" }],
  },
};


/* =====================================================================
   DRAWING - turns a figure into SVG (a drawing language browsers know)
   ===================================================================== */

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const name in attrs) el.setAttribute(name, attrs[name]);
  return el;
}

// Blend two poses: t = 0 gives pose a, t = 1 gives pose b
function blendPoses(a, b, t) {
  const out = {};
  for (const joint in a) {
    const to = b[joint] || a[joint];
    out[joint] = [a[joint][0] + (to[0] - a[joint][0]) * t,
                  a[joint][1] + (to[1] - a[joint][1]) * t];
  }
  return out;
}

// A prop point is either [x, y] or a joint name like "w1"
function point(pose, ref) {
  return typeof ref === "string" ? pose[ref] : ref;
}

// Work out a frame (viewBox) that fits every point in both poses
function fitBox(fig) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const take = ([x, y]) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const pose of fig.frames) for (const j in pose) take(pose[j]);
  minY -= 10;  // room for the head circle
  for (const prop of fig.props) {
    if (prop.circle) take([prop.circle[0], prop.circle[1] + prop.circle[2]]);
    if (prop.rect) { take([prop.rect[0], prop.rect[1]]); take([prop.rect[0] + prop.rect[2], prop.rect[1]]); }
    if (prop.wall !== undefined) take([prop.wall, maxY]);
  }
  const pad = 14;
  let w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
  // keep a 3:2 shape so every figure sits in the same size box
  if (w / h < 1.5) w = h * 1.5; else h = w / 1.5;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return [cx - w / 2, cy - h / 2, w, h];
}

function drawPose(group, pose, fig) {
  group.textContent = "";
  const line = (a, b, cls) => group.appendChild(svgEl("line", {
    x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: cls }));
  const P = (ref) => point(pose, ref);

  // props behind the body
  for (const prop of fig.props) {
    if (prop.floor !== undefined) line([-500, prop.floor], [800, prop.floor], "floor");
    if (prop.wall !== undefined) line([prop.wall, -500], [prop.wall, prop.floorY || 139], "floor");
    if (prop.rect) group.appendChild(svgEl("rect", { x: prop.rect[0], y: prop.rect[1],
      width: prop.rect[2], height: prop.rect[3], rx: 2, class: "prop " + (prop.kind || "") }));
    if (prop.line) line(prop.line[0], prop.line[1], "prop-line " + (prop.kind || ""));
    if (prop.spot) group.appendChild(svgEl("ellipse", { cx: prop.spot[0], cy: prop.spot[1],
      rx: 14, ry: 3, class: "spot" }));
    if (prop.text) { const t = svgEl("text", { x: prop.text[0], y: prop.text[1], class: "fig-text" });
      t.textContent = prop.text[2]; group.appendChild(t); }
    if (prop.cable) line(P(prop.cable[0]), P(prop.cable[1]), "cable");
  }

  // far side of the body first, so the near side draws on top
  line(pose.n, pose.e2, "limb far"); line(pose.e2, pose.w2, "limb far");
  line(pose.p, pose.k2, "limb far"); line(pose.k2, pose.f2, "limb far");
  if (pose.m) { line(pose.p, pose.m, "limb"); line(pose.m, pose.n, "limb"); }  // bendy spine
  else line(pose.n, pose.p, "limb");
  line(pose.p, pose.k1, "limb"); line(pose.k1, pose.f1, "limb");
  if (pose.t1) line(pose.f1, pose.t1, "limb");
  line(pose.n, pose.e1, "limb"); line(pose.e1, pose.w1, "limb");
  group.appendChild(svgEl("circle", { cx: pose.h[0], cy: pose.h[1], r: 9, class: "head" }));

  // props in front of the body
  for (const prop of fig.props) {
    if (prop.circle) group.appendChild(svgEl("circle", { cx: prop.circle[0], cy: prop.circle[1],
      r: prop.circle[2], class: "prop " + (prop.kind || "") }));
    if (prop.band) line(P(prop.band[0]), P(prop.band[1]), "band");
    if (prop.ring) {
      const a = P(prop.ring[0]), b = P(prop.ring[1]);
      const mx = a[0] + (b[0] - a[0]) * 0.6, my = a[1] + (b[1] - a[1]) * 0.6;
      group.appendChild(svgEl("ellipse", { cx: mx, cy: my, rx: 3, ry: 6, class: "band-ring " + (prop.kind || "") }));
    }
    if (prop.dumbbell) {
      const [x, y] = P(prop.dumbbell);
      group.appendChild(svgEl("rect", { x: x - 8, y: y - 3, width: 16, height: 6, rx: 2, class: "weight" }));
    }
    if (prop.bar) {
      const [x, y] = P(prop.bar), half = (prop.length || 20) / 2;
      line([x - half, y], [x + half, y], "bar");
    }
  }
}

// Draw a figure into a container and animate it. Returns a stop function.
function showFigure(container, key) {
  const fig = FIGURES[key];
  container.textContent = "";
  if (!fig) return () => {};
  const svg = svgEl("svg", { viewBox: fitBox(fig).join(" "), role: "img",
    "aria-label": "Stick figure demonstration" });
  const group = svgEl("g", {});
  svg.appendChild(group);
  container.appendChild(svg);

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still || fig.frames.length < 2) { drawPose(group, fig.frames[0], fig); return () => {}; }

  // One cycle: hold start, move, hold end, move back. 4 seconds total.
  let running = true;
  const cycle = 4000;
  function frame(now) {
    if (!running) return;
    const phase = (now % cycle) / cycle;
    let t;
    if (phase < 0.2) t = 0;
    else if (phase < 0.5) t = (phase - 0.2) / 0.3;
    else if (phase < 0.7) t = 1;
    else t = 1 - (phase - 0.7) / 0.3;
    t = t * t * (3 - 2 * t);   // ease in and out
    drawPose(group, blendPoses(fig.frames[0], fig.frames[1], t), fig);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return () => { running = false; };
}
