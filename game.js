/* DEEPER v2 - a 3D spiritual sequel to Playdead's INSIDE (unofficial tribute).
   Side-on 2.5D platforming in a full 3D world: dark monochrome, amber accents,
   a boy alone, industrial dread, no dialogue, no HUD. */
(function () {
'use strict';

var params = new URLSearchParams(location.search);
var QA = params.has('qa');

// ---------------------------------------------------------------- setup
var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
document.getElementById('app').appendChild(renderer.domElement);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e14);
scene.fog = new THREE.FogExp2(0x0a0e14, 0.034);

var camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 120);

window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- lights
scene.add(new THREE.AmbientLight(0x36414f, 1.5));
var moon = new THREE.DirectionalLight(0x93a9c2, 1.15);
moon.position.set(-18, 26, 14);
scene.add(moon);
var hemi = new THREE.HemisphereLight(0x28313f, 0x090b10, 0.85);
scene.add(hemi);
var fill = new THREE.DirectionalLight(0x2e3947, 0.5);
fill.position.set(6, 4, 20);
scene.add(fill);

function amberLamp(x, y, z, intensity, dist) {
  var l = new THREE.PointLight(0xffb45e, intensity, dist, 2.0);
  l.position.set(x, y, z);
  scene.add(l);
  var bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffc27a })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);
  var halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffb45e, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  halo.position.set(x, y, z);
  scene.add(halo);
  return l;
}

// ---------------------------------------------------------------- materials
var MAT = {
  ground:  new THREE.MeshStandardMaterial({ color: 0x1c232c, roughness: 0.96, metalness: 0.0 }),
  rim:     new THREE.MeshStandardMaterial({ color: 0x39434f, roughness: 0.9 }),
  dark:    new THREE.MeshStandardMaterial({ color: 0x0c1015, roughness: 1.0 }),
  bark:    new THREE.MeshStandardMaterial({ color: 0x141a21, roughness: 1.0 }),
  wall:    new THREE.MeshStandardMaterial({ color: 0x1c232c, roughness: 0.85, metalness: 0.25 }),
  wallHi:  new THREE.MeshStandardMaterial({ color: 0x2a333e, roughness: 0.8, metalness: 0.3 }),
  crate:   new THREE.MeshStandardMaterial({ color: 0x4a5140, roughness: 0.9 }),
  crateHi: new THREE.MeshStandardMaterial({ color: 0x5d6650, roughness: 0.85 }),
  fence:   new THREE.MeshStandardMaterial({ color: 0x232a32, roughness: 0.7, metalness: 0.5 }),
  amberGlow: new THREE.MeshBasicMaterial({ color: 0xffb45e }),
  coldGlow:  new THREE.MeshBasicMaterial({ color: 0x9fb6cc })
};

// ---------------------------------------------------------------- collision world
// platforms: {x1,x2,top} walkable slabs; player z fixed at 0.
var platforms = [];
function addPlatform(x1, x2, top, thickness, mat) {
  platforms.push({ x1: x1, x2: x2, top: top });
  var w = x2 - x1, h = thickness || 3;
  var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4.2), mat || MAT.ground);
  m.position.set((x1 + x2) / 2, top - h / 2, 0);
  scene.add(m);
  // readable front-edge rim light strip
  var rim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.045, 0.05), MAT.rim);
  rim.position.set((x1 + x2) / 2, top + 0.022, 2.08);
  scene.add(rim);
  return m;
}

// level: forest floor A, pit, floor B, upper yard C (ledge), facility yard D
addPlatform(-8, 20, 0, 3);                 // A forest
addPlatform(22.2, 45, 0, 3);               // B forest/crate run
addPlatform(45, 70, 2.2, 5.2);             // C upper yard (ledge)
addPlatform(70, 98, 0, 3);                 // D facility yard

// pit visual (black throat)
(function () {
  var pit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8, 4.2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  pit.position.set(21.1, -4.05, 0);
  scene.add(pit);
})();

// ---------------------------------------------------------------- forest dressing
var seed = 7;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

var treeCount = 0;
function tree(x, z, s, matTrunk, matLeaf) {
  var g = new THREE.Group();
  var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.14 * s, 2.6 * s, 7), matTrunk || MAT.bark);
  trunk.position.y = 1.3 * s;
  g.add(trunk);
  var leaf = matLeaf || MAT.dark;
  for (var i = 0; i < 3; i++) {
    var cone = new THREE.Mesh(new THREE.ConeGeometry((1.15 - i * 0.26) * s, 1.5 * s, 8), leaf);
    cone.position.y = (2.2 + i * 0.85) * s;
    g.add(cone);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rnd() * Math.PI;
  scene.add(g);
  treeCount++;
}
// background forest wall
for (var tx = -7; tx < 44; tx += 1.6 + rnd() * 1.3) {
  tree(tx + rnd(), -4.5 - rnd() * 9, 1.5 + rnd() * 1.6);
}
// mid trees behind play plane
for (tx = -6; tx < 44; tx += 3.4 + rnd() * 2.4) {
  tree(tx + rnd(), -1.8 - rnd() * 1.2, 0.9 + rnd() * 0.5);
}
// sparse near silhouettes
for (tx = -4; tx < 42; tx += 7 + rnd() * 6) {
  tree(tx + rnd() * 2, 3.2 + rnd() * 1.6, 1.2 + rnd() * 0.8, MAT.dark, MAT.dark);
}
// forest continues behind the upper yard, sparser
for (tx = 45; tx < 70; tx += 2.6 + rnd() * 2) {
  tree(tx + rnd(), -5 - rnd() * 8, 1.4 + rnd() * 1.4);
}

// ground clutter: stones and tufts
for (var i = 0; i < 90; i++) {
  var cx = -7 + rnd() * 50, cz = (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 1.1);
  var s = 0.05 + rnd() * 0.12;
  var rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), MAT.dark);
  rock.position.set(cx, s * 0.5, cz);
  rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
  scene.add(rock);
}

// cold moon shafts in the forest
function shaft(x, z, w, h, op) {
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: 0x8fa9c4, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  m.position.set(x, h / 2 - 0.5, z);
  m.rotation.z = 0.32;
  scene.add(m);
}
shaft(4, -3, 2.2, 12, 0.045);
shaft(15, -4, 3.2, 13, 0.035);
shaft(30, -3.4, 2.6, 12, 0.05);
shaft(39, -4.2, 2.0, 11, 0.03);

// pale moon disc
(function () {
  var m = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32),
    new THREE.MeshBasicMaterial({ color: 0xbcc9d6, transparent: true, opacity: 0.32, fog: false }));
  m.position.set(14, 16, -34);
  scene.add(m);
})();

// ---------------------------------------------------------------- fence + watchtower (yard backdrop)
(function () {
  var g = new THREE.Group();
  for (var x = 45.5; x < 70; x += 2.1) {
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.6, 0.09), MAT.fence);
    post.position.set(x, 3.5, 0);
    g.add(post);
  }
  for (var r = 0; r < 4; r++) {
    var rail = new THREE.Mesh(new THREE.BoxGeometry(24.6, 0.05, 0.05), MAT.fence);
    rail.position.set(57.7, 2.5 + r * 0.62, 0);
    g.add(rail);
  }
  g.position.z = -2.6;
  scene.add(g);
  // watchtower silhouette
  var t = new THREE.Group();
  var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 6.4, 0.22), MAT.dark);
  legL.position.set(-0.9, 3.2, 0); legL.rotation.z = 0.06; t.add(legL);
  var legR = legL.clone(); legR.position.x = 0.9; legR.rotation.z = -0.06; t.add(legR);
  var cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 2.2), MAT.dark);
  cabin.position.y = 7.1; t.add(cabin);
  var roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.0, 4), MAT.dark);
  roof.position.y = 8.45; roof.rotation.y = Math.PI / 4; t.add(roof);
  var win = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.06), MAT.amberGlow);
  win.position.set(0, 7.2, 1.12); t.add(win);
  var tlight = new THREE.PointLight(0xffb45e, 5, 14, 2);
  tlight.position.set(0, 7.2, 1.4); t.add(tlight);
  t.position.set(58, 0, -7);
  scene.add(t);
})();

amberLamp(48, 5.6, -1.4, 6, 16);
amberLamp(66, 5.2, -1.2, 5, 14);

// ---------------------------------------------------------------- facility wall + door
var doorGlow;
(function () {
  var wall = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 1.4), MAT.wall);
  wall.position.set(84, 6, -4.4);
  scene.add(wall);
  for (var i = 0; i < 7; i++) {
    var panel = new THREE.Mesh(new THREE.BoxGeometry(0.14, 12, 0.1), MAT.wallHi);
    panel.position.set(71.5 + i * 4.1, 6, -3.66);
    scene.add(panel);
  }
  // glowing slit windows
  for (i = 0; i < 5; i++) {
    var w = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 0.06), MAT.amberGlow);
    w.position.set(74 + i * 4.6, 8.6 + (i % 2) * 1.1, -3.68);
    scene.add(w);
  }
  var wl = new THREE.PointLight(0xffb45e, 4, 18, 2);
  wl.position.set(82, 8.4, -2.6);
  scene.add(wl);
  // pipes along the top
  for (i = 0; i < 2; i++) {
    var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 30, 8), MAT.fence);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(84, 10.6 + i * 0.5, -3.8);
    scene.add(pipe);
  }
  // the door: recessed slab with an amber seam
  var frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.6, 0.5), MAT.dark);
  frame.position.set(93.4, 1.8, -3.4);
  scene.add(frame);
  doorGlow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xffb45e, transparent: true, opacity: 0.35 }));
  doorGlow.position.set(93.4, 1.7, -3.12);
  scene.add(doorGlow);
  // small yard props
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 12), MAT.fence);
  barrel.position.set(76.5, 0.48, -1.4);
  scene.add(barrel);
  var barrel2 = barrel.clone(); barrel2.position.set(77.5, 0.48, -1.8); barrel2.rotation.y = 1; scene.add(barrel2);
})();

amberLamp(79, 5.4, -1.6, 4.5, 13);

// ---------------------------------------------------------------- pushable crate
var CRATE = { x: 38.5, y: 0, size: 1.1, vx: 0 };
var crateMesh = (function () {
  var g = new THREE.Group();
  var body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), MAT.crate);
  g.add(body);
  var edge = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.08, 1.14), MAT.crateHi);
  edge.position.y = 0.5; g.add(edge);
  var edge2 = edge.clone(); edge2.position.y = -0.5; g.add(edge2);
  var brace = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.06, 1.12), MAT.crateHi);
  g.add(brace);
  g.position.set(CRATE.x, 0.55, 0);
  scene.add(g);
  return g;
})();

// ---------------------------------------------------------------- searchlight
var BEAM = { baseX: 81, range: 7.5, t: 0, x: 81, manualUntil: 0 };
var beamCone, beamGlow, beamSpot;
(function () {
  var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 8), MAT.fence);
  pole.position.set(BEAM.baseX, 3.1, -1.1);
  scene.add(pole);
  var head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.5), MAT.dark);
  head.position.set(BEAM.baseX, 6.3, -1.1);
  scene.add(head);
  var lens = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), MAT.amberGlow);
  lens.position.set(BEAM.baseX, 6.28, -0.84);
  scene.add(lens);

  beamSpot = new THREE.SpotLight(0xffc98a, 30, 16, 0.36, 0.45, 1.6);
  beamSpot.position.set(BEAM.baseX, 6.3, -1.1);
  beamSpot.target.position.set(BEAM.baseX, 0, 0);
  scene.add(beamSpot); scene.add(beamSpot.target);

  var len = 6.4;
  beamCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 1.55, len, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  scene.add(beamCone);
  beamGlow = new THREE.Mesh(
    new THREE.CircleGeometry(1.55, 24),
    new THREE.MeshBasicMaterial({ color: 0xffc98a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  beamGlow.rotation.x = -Math.PI / 2;
  scene.add(beamGlow);
})();

function updateBeam(dt, now) {
  BEAM.t += dt;
  var bx;
  if (now < BEAM.manualUntil) {
    bx = BEAM.x;
  } else {
    // triangle wave with eased dwell at the extremes
    var p = (BEAM.t * 0.22) % 2;
    var tri = p < 1 ? p : 2 - p;
    tri = tri * tri * (3 - 2 * tri);
    bx = BEAM.baseX - BEAM.range + tri * BEAM.range * 2;
    BEAM.x = bx;
  }
  var hx = BEAM.baseX, hy = 6.3, hz = -1.1;
  beamSpot.target.position.set(bx, 0, 0);
  beamGlow.position.set(bx, 0.06, 0);
  // aim the cone from head to ground spot
  var dx = bx - hx, dy = -hy, dz = -hz;
  var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  beamCone.scale.y = len / 6.4;
  beamCone.position.set(hx + dx / 2, hy + dy / 2, hz + dz / 2);
  beamCone.lookAt(bx, 0, 0);
  beamCone.rotateX(Math.PI / 2);
}

function beamCatches(px) {
  return Math.abs(px - BEAM.x) < 1.45;
}

// ---------------------------------------------------------------- the boy
var boy = new THREE.Group();
var limbs = {};
(function () {
  var skin = new THREE.MeshStandardMaterial({ color: 0xd8bfa6, roughness: 0.75 });
  var hair = new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.95 });
  var top  = new THREE.MeshStandardMaterial({ color: 0x9c3a2c, roughness: 0.9 });
  var legs = new THREE.MeshStandardMaterial({ color: 0x3d434d, roughness: 0.95 });

  var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.26, 6, 12), top);
  torso.position.y = 0.76;
  boy.add(torso);

  var head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 16), skin);
  head.position.y = 1.12; head.scale.set(0.92, 1.05, 0.95);
  boy.add(head);
  var cap = new THREE.Mesh(new THREE.SphereGeometry(0.158, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair);
  cap.position.set(-0.018, 1.126, 0);
  cap.rotation.z = 0.25;
  boy.add(cap);

  function limb(mat, r, len, px, py) {
    var pivot = new THREE.Group();
    pivot.position.set(px, py, 0);
    var m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, 10), mat);
    m.position.y = -len / 2 - r;
    pivot.add(m);
    boy.add(pivot);
    return pivot;
  }
  limbs.legL = limb(legs, 0.062, 0.42, 0, 0.64);
  limbs.legR = limb(legs, 0.062, 0.42, 0, 0.64);
  limbs.legL.position.z = 0.07; limbs.legR.position.z = -0.07;
  limbs.armL = limb(top, 0.042, 0.32, 0, 0.94);
  limbs.armR = limb(top, 0.042, 0.32, 0, 0.94);
  limbs.armL.position.z = 0.2; limbs.armR.position.z = -0.2;
  scene.add(boy);
})();
// soft blob shadow
var boyKey = new THREE.PointLight(0xa8bdd4, 2.6, 7, 1.8);
boyKey.position.set(2, 3, 2.5);
scene.add(boyKey);
var boyWarm = new THREE.PointLight(0xffb45e, 0.7, 4, 2.0);
boyWarm.position.set(2, 1.2, 1.5);
scene.add(boyWarm);
var blob = new THREE.Mesh(
  new THREE.CircleGeometry(0.34, 20),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false })
);
blob.rotation.x = -Math.PI / 2;
scene.add(blob);


// ---------------------------------------------------------------- the dog (v2: the chase)
var dog = new THREE.Group();
var dogLegs = [];
(function () {
  var fur = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.95 });
  var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 6, 10), fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.42;
  dog.add(body);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), fur);
  head.position.set(0.38, 0.55, 0);
  dog.add(head);
  var snout = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.18, 8), fur);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(0.5, 0.5, 0);
  dog.add(snout);
  var ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 6), fur);
  ear.position.set(0.32, 0.68, 0.05); dog.add(ear);
  var ear2 = ear.clone(); ear2.position.z = -0.05; dog.add(ear2);
  // amber eye glints
  var eyeM = new THREE.MeshBasicMaterial({ color: 0xffb45e });
  var eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeM);
  eye.position.set(0.46, 0.58, 0.07); dog.add(eye);
  var eye2 = eye.clone(); eye2.position.z = -0.07; dog.add(eye2);
  var tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.045, 0.34, 6), fur);
  tail.rotation.z = -0.9;
  tail.position.set(-0.38, 0.52, 0);
  dog.add(tail);
  for (var i = 0; i < 4; i++) {
    var pivot = new THREE.Group();
    pivot.position.set(i < 2 ? 0.2 : -0.2, 0.36, (i % 2 ? 0.09 : -0.09));
    var leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.3, 4, 8), fur);
    leg.position.y = -0.19;
    pivot.add(leg);
    dog.add(pivot);
    dogLegs.push(pivot);
  }
  dog.visible = false;
  scene.add(dog);
})();
var DOG = { x: -20, y: 0, vy: 0, active: false, givenUp: false, phase: 0, catches: 0 };

function dogGroundAt(x, y) {
  var best = -Infinity;
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    if (x >= p.x1 - 0.1 && x <= p.x2 + 0.1 && p.top <= y + 0.5 && p.top > best) best = p.top;
  }
  return best;
}

function updateDog(dt) {
  // trigger: the boy is far enough into the woods
  if (!DOG.active && !DOG.givenUp && phase === 'play' && !P.ended && P.x > 8 && P.x < 42.5) {
    DOG.active = true;
    DOG.x = Math.min(P.x - 13, P.x - 8);
    DOG.y = 0; DOG.vy = 0;
    dog.visible = true;
  }
  if (!DOG.active) return;
  // gives up: the boy reached the crate / climbed out of reach
  if (P.x > 42.5 || (P.y > 1.5 && P.grounded) || P.x >= 45) {
    DOG.active = false; DOG.givenUp = true;
    return;
  }
  var dx = P.x - DOG.x;
  var speed = 4.55;
  DOG.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
  // leap the pit
  var g = dogGroundAt(DOG.x, DOG.y + 0.5);
  if (g === -Infinity) g = -100;
  if (DOG.y <= 0.01 && DOG.x > 19.4 && DOG.x < 20.2 && P.x > 22.5) DOG.vy = 7.6;
  DOG.vy -= 22 * dt;
  DOG.y += DOG.vy * dt;
  if (DOG.vy <= 0 && DOG.y <= g) { DOG.y = g; DOG.vy = 0; }
  if (DOG.y < -4) { DOG.x = P.x - 12; DOG.y = 0; DOG.vy = 0; } // fell in: kennel sends another
  DOG.phase += dt * 11;
  // the catch
  if (Math.abs(DOG.x - P.x) < 0.5 && Math.abs(DOG.y - P.y) < 0.8 && !P.dying) {
    DOG.catches++;
    die('dog');
    DOG.x = P.x - 14; DOG.y = 0;
  }
}

function animateDog(now) {
  if (!dog.visible) return;
  var s = Math.sin(DOG.phase);
  for (var i = 0; i < 4; i++) {
    dogLegs[i].rotation.x = Math.sin(DOG.phase + (i % 2) * Math.PI + (i < 2 ? 0 : 0.9)) * 0.85;
  }
  dog.position.set(DOG.x, DOG.y + Math.abs(Math.cos(DOG.phase)) * 0.05, 0);
  dog.rotation.y = P.x >= DOG.x ? 0 : Math.PI;
  dog.rotation.z = 0.06 * s;
}

// ---------------------------------------------------------------- player state
var P = {
  x: 2, y: 0, vx: 0, vy: 0, dir: 1, grounded: true,
  runPhase: 0, coyote: 0, jumpBuf: 0,
  checkpoint: 0, deaths: 0, caught: 0, ended: false, dying: false
};
var CHECKPOINTS = [2, 30, 47, 72];
var GRAV = 22, MOVE = 4.3, JUMP_V = 8.8;

// ---------------------------------------------------------------- input
var keys = { left: false, right: false, jump: false };
var keymap = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', Space: 'jump', KeyW: 'jump'
};
var phase = QA ? 'play' : 'title';
var titleEl = document.getElementById('title');
var endEl = document.getElementById('endcard');
var fadeEl = document.getElementById('fade');

window.addEventListener('keydown', function (e) {
  if (phase === 'title') { startGame(); return; }
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (e.code === 'KeyR' && P.ended) { restart(); return; }
  var k = keymap[e.code];
  if (k) {
    keys[k] = true;
    if (k === 'jump') P.jumpBuf = 0.12;
    e.preventDefault();
  }
});
window.addEventListener('keyup', function (e) {
  var k = keymap[e.code];
  if (k) keys[k] = false;
});

function startGame() {
  if (phase !== 'title') return;
  phase = 'play';
  titleEl.style.opacity = '0';
  setTimeout(function () { titleEl.style.display = 'none'; }, 1200);
  initAudio();
}

function restart() {
  P.x = 2; P.y = 0; P.vx = 0; P.vy = 0; P.checkpoint = 0;
  P.deaths = 0; P.caught = 0; P.ended = false; P.dying = false;
  CRATE.x = 38.5;
  DOG.active = false; DOG.givenUp = false; DOG.catches = 0; dog.visible = false;
  phase = 'play';
  endEl.style.opacity = '0';
  setTimeout(function () { endEl.style.display = 'none'; }, 1100);
  fadeEl.style.opacity = '0';
}

function die(cause) {
  if (phase !== 'play' || P.dying) return;
  P.dying = true;
  if (cause === 'light') P.caught++; else P.deaths++;
  fadeEl.style.opacity = '1';
  thud();
  setTimeout(function () {
    P.x = CHECKPOINTS[P.checkpoint];
    P.y = P.checkpoint === 2 ? 2.3 : 0;
    P.vx = 0; P.vy = 0; P.dying = false;
    if (DOG.active) { DOG.x = P.x - 14; DOG.y = 0; DOG.vy = 0; }
    fadeEl.style.opacity = '0';
  }, 460);
}

// ---------------------------------------------------------------- physics
function groundAt(x, y) {
  var best = -Infinity;
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    if (x >= p.x1 - 0.2 && x <= p.x2 + 0.2 && p.top <= y + 0.42 && p.top > best) best = p.top;
  }
  // crate is a platform too
  if (Math.abs(x - CRATE.x) < 0.75 && CRATE.y + CRATE.size <= y + 0.42 && CRATE.y + CRATE.size > best) {
    best = CRATE.y + CRATE.size;
  }
  return best;
}

function wallBlocks(nx, y) {
  // sides of platforms too tall to step onto
  for (var i = 0; i < platforms.length; i++) {
    var p = platforms[i];
    if (p.top - y > 0.42) {
      if (nx > p.x1 - 0.3 && nx < p.x2 + 0.3 && y < p.top) return true;
    }
  }
  return false;
}

function update(dt) {
  if (phase !== 'play' || P.ended || P.dying) return;

  var move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (move !== 0) P.dir = move;

  // crate pushing: grounded, pressing toward crate, adjacent
  var pushing = false;
  if (P.grounded && move !== 0 && Math.abs(P.y - CRATE.y) < 0.3) {
    var edge = CRATE.x - move * (CRATE.size / 2);
    if (Math.abs(P.x - edge) < 0.42 && Math.sign(move) === Math.sign(CRATE.x - P.x)) {
      pushing = true;
    }
  }
  var speed = pushing ? 1.7 : MOVE;
  var target = move * speed;
  var accel = P.grounded ? 40 : 24;
  P.vx += Math.max(-accel * dt, Math.min(accel * dt, target - P.vx));

  var nx = P.x + P.vx * dt;
  if (pushing) {
    var newCrate = CRATE.x + P.vx * dt;
    var minX = 23.2 + CRATE.size / 2, maxX = 45 - 0.32 - CRATE.size / 2;
    if (newCrate >= minX && newCrate <= maxX) {
      CRATE.x = newCrate;
    } else {
      nx = P.x; P.vx = 0;
    }
  } else if (wallBlocks(nx, P.y)) {
    nx = P.x; P.vx = 0;
  }
  // crate blocks walking through it (unless standing on it)
  if (Math.abs(P.y - (CRATE.y + CRATE.size)) > 0.2 && Math.abs(P.y - CRATE.y) >= 0.3) {
    if (Math.abs(nx - CRATE.x) < CRATE.size / 2 + 0.26 && P.y < CRATE.y + CRATE.size - 0.2) {
      if (!pushing) { nx = P.x; if (P.grounded) P.vx = 0; }
    }
  }
  P.x = nx;

  P.vy -= GRAV * dt;
  P.y += P.vy * dt;
  var g = groundAt(P.x, P.y + 0.42);
  if (P.vy <= 0 && P.y <= g) {
    P.y = g; P.vy = 0; P.grounded = true; P.coyote = 0.1;
  } else {
    P.grounded = false;
    P.coyote = Math.max(0, P.coyote - dt);
  }

  P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  if (P.jumpBuf > 0 && (P.grounded || P.coyote > 0)) {
    P.vy = JUMP_V; P.grounded = false; P.coyote = 0; P.jumpBuf = 0;
  }
  if (!keys.jump && P.vy > 3) P.vy = 3; // variable jump height

  // checkpoints
  for (var i = P.checkpoint + 1; i < CHECKPOINTS.length; i++) {
    if (P.x >= CHECKPOINTS[i]) P.checkpoint = i;
  }

  // hazards
  if (P.y < -3.5) die('fall');
  if (P.x > 70 && P.x < 92.5 && beamCatches(P.x)) die('light');

  // the dog hunts through the woods
  updateDog(dt);

  // the door
  if (P.x > 92.6 && !P.ended) {
    P.ended = true;
    fadeEl.style.opacity = '1';
    setTimeout(function () {
      endEl.style.display = 'flex';
      requestAnimationFrame(function () { endEl.style.opacity = '1'; });
      fadeEl.style.opacity = '0';
    }, 900);
  }

  // crate mesh + door glow
  crateMesh.position.x = CRATE.x;
  doorGlow.material.opacity = 0.25 + 0.18 * Math.sin(performance.now() * 0.002);
}

// ---------------------------------------------------------------- boy animation
function animateBoy(dt, now) {
  var running = Math.abs(P.vx) > 0.25 && P.grounded;
  if (running) P.runPhase += dt * (6.5 + Math.abs(P.vx) * 1.1);
  var s = Math.sin(P.runPhase), c = Math.cos(P.runPhase);
  if (running) {
    limbs.legL.rotation.x = s * 0.72;
    limbs.legR.rotation.x = -s * 0.72;
    limbs.armL.rotation.x = -s * 0.55;
    limbs.armR.rotation.x = s * 0.55;
    boy.rotation.z = -0.1 * P.dir;
  } else if (!P.grounded) {
    limbs.legL.rotation.x = 0.35; limbs.legR.rotation.x = -0.25;
    limbs.armL.rotation.x = -0.5; limbs.armR.rotation.x = -0.6;
    boy.rotation.z = 0;
  } else {
    var b = Math.sin(now * 0.0016) * 0.035; // idle breath
    limbs.legL.rotation.x = 0; limbs.legR.rotation.x = 0;
    limbs.armL.rotation.x = b; limbs.armR.rotation.x = -b;
    boy.rotation.z = 0;
  }
  boy.position.set(P.x, P.y + (running ? Math.abs(c) * 0.045 : 0), 0);
  boyKey.position.set(P.x + 0.4, P.y + 2.6, 2.6);
  boyWarm.position.set(P.x - P.dir * 0.8, P.y + 1.1, 1.6);
  boy.rotation.y = P.dir > 0 ? 0 : Math.PI;
  var g = groundAt(P.x, P.y + 0.42);
  blob.position.set(P.x, (g > -Infinity ? g : 0) + 0.02, 0);
  var h = Math.max(0, P.y - (g > -Infinity ? g : 0));
  var sc = Math.max(0.35, 1 - h * 0.22);
  blob.scale.set(sc, sc, sc);
  blob.material.opacity = 0.42 * sc;
}

// ---------------------------------------------------------------- camera
var camX = 2, camY = 1.4;
function updateCamera(dt) {
  var lookX = P.x + P.dir * 2.1;
  camX += (lookX - camX) * Math.min(1, dt * 2.4);
  var ty = 1.5 + Math.max(0, P.y) * 0.55;
  camY += (ty - camY) * Math.min(1, dt * 2.0);
  camera.position.set(camX, camY + 0.9, 9.2);
  camera.lookAt(camX, camY, 0);
}

// ---------------------------------------------------------------- dust motes
var motes, motePos;
(function () {
  var N = 320;
  motePos = new Float32Array(N * 3);
  for (var i = 0; i < N; i++) {
    motePos[i * 3] = -10 + Math.random() * 115;
    motePos[i * 3 + 1] = Math.random() * 7;
    motePos[i * 3 + 2] = -6 + Math.random() * 9;
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  motes = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x9a8a72, size: 0.035, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(motes);
})();
function updateMotes(dt) {
  var arr = motePos, N = arr.length / 3;
  for (var i = 0; i < N; i++) {
    arr[i * 3 + 1] -= dt * 0.14;
    arr[i * 3] += Math.sin(performance.now() * 0.0004 + i) * dt * 0.05;
    if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 7;
  }
  motes.geometry.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------- audio (procedural, starts on first key)
var AC = null, master = null, muted = false, shimmer = null;
function initAudio() {
  if (AC || QA) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.14;
    master.connect(AC.destination);
    // low drone: two detuned saws through a dark lowpass
    var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170;
    lp.connect(master);
    [46, 46.6].forEach(function (f) {
      var o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      var g = AC.createGain(); g.gain.value = 0.32;
      o.connect(g); g.connect(lp); o.start();
    });
    var lfo = AC.createOscillator(); lfo.frequency.value = 0.07;
    var lfoG = AC.createGain(); lfoG.gain.value = 0.1;
    lfo.connect(lfoG); lfoG.connect(master.gain); lfo.start();
    // wind: looped noise through a wandering bandpass
    var len = AC.sampleRate * 3;
    var buf = AC.createBuffer(1, len, AC.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var noise = AC.createBufferSource(); noise.buffer = buf; noise.loop = true;
    var bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = 0.7;
    var ng = AC.createGain(); ng.gain.value = 0.05;
    noise.connect(bp); bp.connect(ng); ng.connect(master); noise.start();
    var wlfo = AC.createOscillator(); wlfo.frequency.value = 0.11;
    var wlfoG = AC.createGain(); wlfoG.gain.value = 180;
    wlfo.connect(wlfoG); wlfoG.connect(bp.frequency); wlfo.start();
    // searchlight shimmer (gain driven by proximity)
    shimmer = AC.createOscillator(); shimmer.type = 'sine'; shimmer.frequency.value = 1180;
    var sg = AC.createGain(); sg.gain.value = 0;
    shimmer.connect(sg); sg.connect(master); shimmer.start();
    shimmer._gain = sg;
  } catch (e) { AC = null; }
}
function toggleMute() {
  if (!AC) return;
  muted = !muted;
  master.gain.value = muted ? 0 : 0.14;
}
function thud() {
  if (!AC || muted) return;
  var o = AC.createOscillator(); o.frequency.setValueAtTime(90, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(34, AC.currentTime + 0.22);
  var g = AC.createGain();
  g.gain.setValueAtTime(0.5, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + 0.3);
  o.connect(g); g.connect(master);
  o.start(); o.stop(AC.currentTime + 0.32);
}
function updateAudio() {
  if (!AC || !shimmer || muted) return;
  var prox = (P.x > 66 && P.x < 96) ? Math.max(0, 1 - Math.abs(P.x - BEAM.x) / 9) : 0;
  shimmer._gain.gain.value = prox * 0.028;
}

// ---------------------------------------------------------------- debug / QA hooks
window.__scene = scene;
window.__DGsuspect = { beamCone: beamCone, beamGlow: beamGlow, beamSpot: beamSpot };
window.__DG = {
  boot: {
    meshes: scene.children.length, trees: treeCount,
    platforms: platforms.length, checkpoints: CHECKPOINTS.length, dogs: 1, qa: QA
  },
  state: function () {
    return {
      x: +P.x.toFixed(3), y: +P.y.toFixed(3), vx: +P.vx.toFixed(2),
      grounded: P.grounded, dir: P.dir, checkpoint: P.checkpoint,
      deaths: P.deaths, caught: P.caught, phase: phase, ended: P.ended,
      crateX: +CRATE.x.toFixed(3), beamX: +BEAM.x.toFixed(3),
      dying: P.dying, fps: +fpsValue.toFixed(1),
      dogX: +DOG.x.toFixed(2), dogActive: DOG.active, dogGivenUp: DOG.givenUp, dogCatches: DOG.catches
    };
  },
  teleport: function (x, y) { P.x = x; P.y = (y === undefined ? (groundAt(x, 50) || 0) : y); P.vx = 0; P.vy = 0; },
  key: function (name, down) {
    if (name === 'jump' && down) P.jumpBuf = 0.12;
    keys[name] = !!down;
  },
  beamTo: function (x, ms) { BEAM.x = x; BEAM.manualUntil = performance.now() + (ms || 4000); },
  crateTo: function (x) { CRATE.x = x; },
  die: function (cause) { die(cause || 'fall'); },
  step: function (n) { // deterministic sim stepping for QA, independent of render rate
    var now = performance.now();
    for (var i = 0; i < n; i++) { update(STEP); updateBeam(STEP, now + i * STEP * 1000); }
    animateBoy(STEP, now); animateDog(now); updateCamera(0.5); 
  }
};

// ---------------------------------------------------------------- main loop
var last = performance.now(), acc = 0;
var STEP = 1 / 60;
var fpsFrames = 0, fpsLast = performance.now(), fpsValue = 0;
function frame() {
  requestAnimationFrame(frame);
  var t = performance.now();
  var dt = Math.max(0, Math.min(0.1, (t - last) / 1000));
  last = t;
  fpsFrames++;
  if (t - fpsLast >= 1000) { fpsValue = fpsFrames * 1000 / (t - fpsLast); fpsFrames = 0; fpsLast = t; }
  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    updateBeam(STEP, t);
    acc -= STEP;
  }
  animateBoy(dt, t);
  animateDog(t);
  updateCamera(dt);
  updateMotes(dt);
  updateAudio();
  renderer.render(scene, camera);
}
if (QA) { titleEl.style.display = 'none'; }
requestAnimationFrame(frame);

})();
