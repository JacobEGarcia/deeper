/* DEEPER v7 - a 3D spiritual sequel to Playdead's INSIDE (unofficial tribute).
   Side-on 2.5D platforming in a full 3D world: dark monochrome, amber accents,
   a boy alone, industrial dread, no dialogue, no HUD. */
(function () {
'use strict';

var params = new URLSearchParams(location.search);
var QA = params.has('qa');

// ---------------------------------------------------------------- setup
var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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


// ---------------------------------------------------------------- the truck + the masked man (v3)
var truck = new THREE.Group();
var truckLights = [];
(function () {
  var body = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.9 });
  var cargo = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 1.9), body);
  cargo.position.set(-1.1, 1.55, 0);
  truck.add(cargo);
  var cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.8), body);
  cab.position.set(1.6, 1.3, 0);
  truck.add(cab);
  var wheelM = new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 1 });
  [[-2.3, 0], [-0.6, 0], [1.7, 0]].forEach(function (w) {
    var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), wheelM);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(w[0], 0.42, 0.75);
    truck.add(wheel);
  });
  // headlights: two cold-amber cones lancing ahead along the ground
  for (var i = 0; i < 2; i++) {
    var cone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 1.1, 7, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    cone.rotation.z = Math.PI / 2 + 0.06;
    cone.position.set(2.3 + 3.5, 0.75, i ? 0.55 : -0.55);
    truck.add(cone);
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
    lamp.position.set(2.36, 0.85, i ? 0.55 : -0.55);
    truck.add(lamp);
  }
  var glow = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(6.2, 0.05, 0);
  truck.add(glow);
  var spot = new THREE.SpotLight(0xffd9a0, 14, 12, 0.5, 0.5, 1.8);
  spot.position.set(2.4, 0.9, 0);
  spot.target.position.set(8, 0.2, 0);
  truck.add(spot); truck.add(spot.target);
  truck.visible = false;
  scene.add(truck);
})();
var TRUCK = { x: -30, active: false };

var man = new THREE.Group();
var manLegs = {};
(function () {
  var coat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.95 });
  var mask = new THREE.MeshBasicMaterial({ color: 0xd8d3c6 });
  var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.5, 6, 10), coat);
  torso.position.y = 1.0;
  man.add(torso);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), coat);
  head.position.y = 1.52;
  man.add(head);
  var face = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), mask);
  face.position.set(0.12, 1.52, 0);
  face.rotation.y = Math.PI / 2;
  man.add(face);
  function limb(r, len, px, py) {
    var pivot = new THREE.Group();
    pivot.position.set(px, py, 0);
    var m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), coat);
    m.position.y = -len / 2 - r;
    pivot.add(m);
    man.add(pivot);
    return pivot;
  }
  manLegs.legL = limb(0.06, 0.5, 0, 0.78); manLegs.legL.position.z = 0.08;
  manLegs.legR = limb(0.06, 0.5, 0, 0.78); manLegs.legR.position.z = -0.08;
  manLegs.armL = limb(0.05, 0.4, 0, 1.28); manLegs.armL.position.z = 0.22;
  manLegs.armR = limb(0.05, 0.4, 0, 1.28); manLegs.armR.position.z = -0.22;
  // flashlight: held forward, amber cone + ground pool
  var torch = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.6, metalness: 0.4 }));
  torch.rotation.z = Math.PI / 2;
  torch.position.set(0.3, 1.05, 0.24);
  man.add(torch);
  var fcone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.7, 4.5, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffcf8e, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  fcone.rotation.z = Math.PI / 2 + 0.12;
  fcone.position.set(0.4 + 2.25, 0.85, 0.24);
  man.add(fcone);
  var fglow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 16),
    new THREE.MeshBasicMaterial({ color: 0xffcf8e, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  fglow.rotation.x = -Math.PI / 2;
  fglow.position.set(3.1, 0.05 - 1.0, 0.24); // relative: man group origin at feet
  man.add(fglow);
  var fspot = new THREE.SpotLight(0xffcf8e, 8, 8, 0.55, 0.5, 1.8);
  fspot.position.set(0.35, 1.05, 0.24);
  fspot.target.position.set(4, 0, 0.24);
  man.add(fspot); man.add(fspot.target);
  man.visible = false;
  scene.add(man);
})();
var MAN = { x: -30, y: 0, vy: 0, active: false, gaveUp: false, phase: 0, catches: 0 };

function updateHunters(dt) {
  if (DOG.active && !TRUCK.active) { TRUCK.active = true; truck.visible = true; TRUCK.x = Math.min(DOG.x - 6, P.x - 18); }
  if (DOG.active && !MAN.active && !MAN.gaveUp) { MAN.active = true; man.visible = true; MAN.x = DOG.x - 4; }
  // truck paces the chase but cannot cross the pit
  if (TRUCK.active) {
    var target = Math.min(P.x - 9.5, 18.6);
    TRUCK.x += Math.max(-6 * dt, Math.min(6 * dt, target - TRUCK.x));
    truck.position.set(TRUCK.x, 0, -1.6);
    if (DOG.givenUp) { TRUCK.active = false; truck.visible = false; }
  }
  if (!MAN.active) return;
  if (P.x > 42.5 || (P.y > 1.5 && P.grounded) || P.x >= 45) {
    MAN.active = false; MAN.gaveUp = true; man.visible = false;
    return;
  }
  var dx = P.x - MAN.x;
  MAN.x += Math.sign(dx) * Math.min(Math.abs(dx), 4.45 * dt);
  var g = dogGroundAt(MAN.x, MAN.y + 0.5);
  if (g === -Infinity) g = -100;
  if (MAN.y <= 0.01 && MAN.x > 19.4 && MAN.x < 20.2 && P.x > 22.2) MAN.vy = 7.8;
  MAN.vy -= 22 * dt;
  MAN.y += MAN.vy * dt;
  if (MAN.vy <= 0 && MAN.y <= g) { MAN.y = g; MAN.vy = 0; }
  if (MAN.y < -4) { MAN.x = P.x - 15; MAN.y = 0; MAN.vy = 0; }
  MAN.phase += dt * 8;
  if (Math.abs(MAN.x - P.x) < 0.5 && Math.abs(MAN.y - P.y) < 0.9 && !P.dying) {
    MAN.catches++;
    die('man');
    MAN.x = P.x - 15; MAN.y = 0;
  }
  man.position.set(MAN.x, MAN.y, 0);
  var s = Math.sin(MAN.phase);
  manLegs.legL.rotation.x = s * 0.8; manLegs.legR.rotation.x = -s * 0.8;
  manLegs.armL.rotation.x = -s * 0.6; manLegs.armR.rotation.x = s * 0.6;
  man.rotation.y = P.x >= MAN.x ? 0 : Math.PI;
}


// ---------------------------------------------------------------- the helmet + husks (v4)
var HELMET = { on: false, mode: 'boy' };
var GATE = { x: 62, open: 0, held: false, baseY: 2.2 };
var PLATE = { x: 58, pressed: 0 };
var pedestal, gateMesh, plateMesh, plateRing, helmetMesh;

(function () {
  // pedestal with the helmet, amber glow
  var ped = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.9, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.7, metalness: 0.4 }));
  ped.position.set(50, 2.65, -1.1);
  scene.add(ped);
  helmetMesh = new THREE.Group();
  var dome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
    new THREE.MeshStandardMaterial({ color: 0x3a4149, roughness: 0.35, metalness: 0.7 }));
  helmetMesh.add(dome);
  var led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffb45e }));
  led.position.set(0, 0.14, 0);
  helmetMesh.add(led);
  helmetMesh.position.set(50, 3.2, -1.1);
  scene.add(helmetMesh);
  var pl = new THREE.PointLight(0xffb45e, 2.2, 5, 2);
  pl.position.set(50, 3.4, -0.4);
  scene.add(pl);
  pedestal = ped;

  // pressure plate
  plateMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.6, metalness: 0.5 }));
  plateMesh.position.set(PLATE.x, 2.25, 0);
  scene.add(plateMesh);
  plateRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 20),
    new THREE.MeshBasicMaterial({ color: 0xffb45e, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  plateRing.rotation.x = -Math.PI / 2;
  plateRing.position.set(PLATE.x, 2.32, 0);
  scene.add(plateRing);

  // the gate: a heavy slab that slides up out of the yard wall
  gateMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.4, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.7, metalness: 0.5 }));
  gateMesh.position.set(GATE.x, GATE.baseY + 1.7, 0);
  scene.add(gateMesh);
  var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 3.42), MAT.amberGlow);
  stripe.position.y = -1.5;
  gateMesh.add(stripe);
})();

// the husks: pale workers, arms slack, heads bowed
var HUSKS = [];
function makeHusk(x) {
  var g = new THREE.Group();
  var skin = new THREE.MeshStandardMaterial({ color: 0x8f8d86, roughness: 0.95 });
  var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 6, 10), skin);
  torso.position.y = 0.86; torso.rotation.z = 0.1;
  g.add(torso);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 12), skin);
  head.position.set(0.08, 1.26, 0);
  g.add(head);
  var armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.4, 4, 8), skin);
  armL.position.set(0.05, 0.82, 0.21); armL.rotation.x = 0.12;
  g.add(armL);
  var armR = armL.clone(); armR.position.z = -0.21;
  g.add(armR);
  var legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.44, 4, 8), skin);
  legL.position.set(0, 0.42, 0.08);
  g.add(legL);
  var legR = legL.clone(); legR.position.z = -0.08;
  g.add(legR);
  g.position.set(x, GATE.baseY, 0);
  scene.add(g);
  return { mesh: g, x: x, dir: 1, phase: Math.random() * 6 };
}
HUSKS.push(makeHusk(54.6));
HUSKS.push(makeHusk(55.6));

function huskWalk(h, dx) {
  h.x += dx;
  h.x = Math.max(46, Math.min(69.4, h.x));
  if (dx !== 0) h.dir = Math.sign(dx);
}

function updateHelmetGate(dt) {
  // plate held by the boy or any husk
  var held = false;
  if (Math.abs(P.x - PLATE.x) < 0.7 && Math.abs(P.y - GATE.baseY) < 0.3) held = true;
  for (var i = 0; i < HUSKS.length; i++) {
    if (Math.abs(HUSKS[i].x - PLATE.x) < 0.7) held = true;
  }
  GATE.held = held;
  var target = held ? 1 : 0;
  var rate = held ? 2.5 : 2.0; // slams shut in half a second
  GATE.open += Math.max(-rate * dt, Math.min(rate * dt, target - GATE.open));
  gateMesh.position.y = GATE.baseY + 1.7 + GATE.open * 3.0;
  plateMesh.position.y = 2.25 - (held ? 0.05 : 0);
  plateRing.material.opacity = held ? 0.75 : 0.25;
  if (helmetMesh && !HELMET.on) {
    helmetMesh.position.y = 3.2 + Math.sin(performance.now() * 0.003) * 0.05;
    helmetMesh.position.z = -1.1;
    helmetMesh.rotation.y += dt;
  }
}

function handleAction() {
  if (phase !== 'play' || P.ended) return;
  if (!HELMET.on && Math.abs(P.x - 50) < 1.4 && Math.abs(P.y - GATE.baseY) < 0.4) {
    HELMET.on = true;
    helmetMesh.visible = false;
    boyHelmet.visible = true;
    return;
  }
  if (HELMET.on) {
    HELMET.mode = HELMET.mode === 'boy' ? 'husks' : 'boy';
  }
}

// the helmet on the boy's head (hidden until picked up)
var boyHelmet = new THREE.Group();
(function () {
  var dome = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x3a4149, roughness: 0.35, metalness: 0.7 }));
  boyHelmet.add(dome);
  var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6),
    new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.5, metalness: 0.6 }));
  ant.position.set(-0.05, 0.2, 0);
  boyHelmet.add(ant);
  var tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffb45e }));
  tip.position.set(-0.05, 0.29, 0);
  boyHelmet.add(tip);
  boyHelmet.position.set(0, 1.16, 0);
  boyHelmet.visible = false;
  boy.add(boyHelmet);
})();


// ---------------------------------------------------------------- the interior (v5): shaft, flooded basement, elevator
var WATER = { x1: 100, x2: 122, surface: -3.9 };
var ripples = [], debris = [], cables = [];

// floors: shaft bottom / flooded hall
addPlatform(100, 123.2, -5, 3); // hall floor ends at the elevator shaft
// shaft walls
(function () {
  var wallM = MAT.wall;
  var wl = new THREE.Mesh(new THREE.BoxGeometry(0.6, 9.5, 4.2), wallM);
  wl.position.set(99.4, -0.4, 0); scene.add(wl);
  // interior back wall + ceiling
  var back = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 1.2), MAT.wall);
  back.position.set(112, -0.5, -3.4); scene.add(back);
  var ceil = new THREE.Mesh(new THREE.BoxGeometry(28, 1.2, 8), MAT.dark);
  ceil.position.set(112, 3.9, -0.5); scene.add(ceil);
  // amber strip lights along the hall
  for (var i = 0; i < 3; i++) {
    var strip = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.06), MAT.amberGlow);
    strip.position.set(104 + i * 7, 2.9, -2.75);
    scene.add(strip);
    var sl = new THREE.PointLight(0xffb45e, 2.5, 9, 2);
    sl.position.set(104 + i * 7, 2.6, -1.6);
    scene.add(sl);
  }
  // pipes down the shaft
  var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 9, 8), MAT.fence);
  pipe.position.set(99.75, -0.5, -1.5); scene.add(pipe);
})();

// the door from the yard now opens inward and stays open (ending moved to the elevator)
// water surface
var waterMesh;
(function () {
  waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(WATER.x2 - WATER.x1, 4.0, 40, 1),
    new THREE.MeshStandardMaterial({ color: 0x22303e, roughness: 0.18, metalness: 0.6, transparent: true, opacity: 0.78 })
  );
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set((WATER.x1 + WATER.x2) / 2, WATER.surface, 0);
  scene.add(waterMesh);
  // ripple pool
  for (var i = 0; i < 10; i++) {
    var r = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 20),
      new THREE.MeshBasicMaterial({ color: 0x9fb6cc, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    r.rotation.x = -Math.PI / 2;
    r.position.y = WATER.surface + 0.02;
    scene.add(r);
    ripples.push({ mesh: r, t: 99 });
  }
  // floating debris
  for (i = 0; i < 3; i++) {
    var d = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), MAT.crate);
    d.position.set(104 + i * 6, WATER.surface + 0.02, -0.6 + i * 0.5);
    d.rotation.y = i * 1.1;
    scene.add(d);
    debris.push(d);
  }
  // hanging cables
  for (i = 0; i < 7; i++) {
    var cx = 101.5 + i * 3.1, z = -1.8 + (i % 3) * 0.9;
    var pts = [];
    for (var k = 0; k <= 6; k++) {
      var u = k / 6;
      pts.push(new THREE.Vector3(cx + Math.sin(u * Math.PI) * (0.3 - i * 0.03), 3.3 - u * (4.2 + (i % 2)), z));
    }
    var tube = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.022, 5, false),
      new THREE.MeshStandardMaterial({ color: 0x141920, roughness: 0.9 }));
    scene.add(tube);
    cables.push({ mesh: tube, x: cx, i: i });
  }
})();

// the elevator at the far end
(function () {
  var frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.4, 0.4), MAT.wallHi);
  frame.position.set(124.8, -3.3, -1.9);
  scene.add(frame);
  var glow = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.9, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffcf8e, transparent: true, opacity: 0.85 }));
  glow.position.set(124.8, -3.45, -1.68);
  scene.add(glow);

})();

var hallWash = new THREE.PointLight(0x8fa6bd, 3.2, 22, 1.5);
hallWash.position.set(110, 0.8, 1.8);
scene.add(hallWash);
var rippleTimer = 0, splash = { t: 9 };
function inWater(x, y) { return x > WATER.x1 && x < WATER.x2 && y < WATER.surface; }

function updateWater(dt) {
  // surface undulation
  var pos = waterMesh.geometry.attributes.position;
  var now = performance.now() * 0.001;
  for (var i = 0; i < pos.count; i++) {
    pos.setZ(i, Math.sin(now * 1.4 + pos.getX(i) * 1.1) * 0.03);
  }
  pos.needsUpdate = true;
  for (i = 0; i < ripples.length; i++) {
    var r = ripples[i];
    r.t += dt;
    if (r.t < 1.2) {
      var u = r.t / 1.2;
      r.mesh.scale.setScalar(1 + u * 3.2);
      r.mesh.material.opacity = 0.4 * (1 - u);
    } else r.mesh.material.opacity = 0;
  }
  for (i = 0; i < debris.length; i++) {
    debris[i].position.y = WATER.surface + 0.02 + Math.sin(now * 1.2 + i * 2.1) * 0.035;
    debris[i].rotation.z = Math.sin(now * 0.9 + i) * 0.05;
  }
  for (i = 0; i < cables.length; i++) {
    cables[i].mesh.rotation.z = Math.sin(now * 0.45 + cables[i].i * 1.3) * 0.035;
  }
  splash.t += dt;
  // wading ripples
  if (inWater(P.x, P.y) && Math.abs(P.vx) > 0.3) {
    rippleTimer -= dt;
    if (rippleTimer <= 0) {
      rippleTimer = 0.33;
      var best = ripples[0];
      for (i = 0; i < ripples.length; i++) if (ripples[i].t > best.t) best = ripples[i];
      best.t = 0;
      best.mesh.position.set(P.x, WATER.surface + 0.02, 0);
      best.mesh.scale.setScalar(1);
    }
  }
}



// ---------------------------------------------------------------- the descent (v8): elevator ride to the deep levels
var RIDE = { phase: 'none', t: 0, carY: -5, targetY: -45, door: 1, locked: false, flick: 0 };
var carGroup, carLight, carGlowM, doorsL = [], doorsR = [];
(function () {
  carGroup = new THREE.Group();
  var carM = new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.8, metalness: 0.35 });
  var carDark = new THREE.MeshStandardMaterial({ color: 0x11161c, roughness: 0.95 });
  var floor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 2.8), carM);
  floor.position.y = -0.11; carGroup.add(floor);
  var ceil = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 2.8), carDark);
  ceil.position.y = 3.05; carGroup.add(ceil);
  var back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.2, 0.16), carDark);
  back.position.set(0, 1.5, -1.35); carGroup.add(back);
  // corner posts
  [[-1.22, -1.28], [1.22, -1.28], [-1.22, 1.28], [1.22, 1.28]].forEach(function (pz) {
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), carM);
    post.position.set(pz[0], 1.5, pz[1]); carGroup.add(post);
  });
  // grate bars on the camera side
  for (var i = 0; i < 7; i++) {
    var bar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 3.0, 0.045), carM);
    bar.position.set(-1.05 + i * 0.35, 1.5, 1.32); carGroup.add(bar);
  }
  // sliding door panels: left face (top landing) and right face (deep landing)
  function mkDoor(x) {
    var arr = [];
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      var p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.0, 0.72), carM);
      p.position.set(x, 1.5, s2 * 0.38);
      p.userData.s = s2;
      carGroup.add(p); arr.push(p);
    }
    return arr;
  }
  doorsL = mkDoor(-1.28); doorsR = mkDoor(1.28);
  // interior glow strip + light
  carGlowM = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.75 });
  var strip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.07), carGlowM);
  strip.position.set(0, 2.94, 0); carGroup.add(strip);
  carLight = new THREE.PointLight(0xffd9a0, 4.5, 7, 2);
  carLight.position.set(0, 2.6, 0.3); carGroup.add(carLight);
  carGroup.position.set(124.8, -5, -0.2);
  scene.add(carGroup);

  // the shaft: back wall, side walls below the hall floor, ring beams, pin lights
  var shaftM = new THREE.MeshStandardMaterial({ color: 0x151a21, roughness: 0.95 });
  var sb = new THREE.Mesh(new THREE.BoxGeometry(3.6, 52, 0.8), shaftM);
  sb.position.set(124.8, -20.5, -2.5); scene.add(sb);
  var sw1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 41.5, 3.2), shaftM);
  sw1.position.set(123.05, -25.75, -0.9); scene.add(sw1);
  var sw2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 41.5, 3.2), shaftM);
  sw2.position.set(126.55, -25.75, -0.9); scene.add(sw2);
  for (var y = -8; y > -44; y -= 4.5) {
    var ring = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.26, 3.0), carDark);
    ring.position.set(124.8, y, -0.9); scene.add(ring);
  }
  for (y = -10; y > -44; y -= 8.5) {
    var pin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xffb45e, transparent: true, opacity: 0.5 }));
    pin.position.set(123.6, y, -2.0); scene.add(pin);
  }
  // someone standing on a ledge in the shaft, watching the car pass
  var ledge = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.9), shaftM);
  ledge.position.set(122.8, -21.6, 0.9); scene.add(ledge);
  var watcher = new THREE.Group();
  var wm = new THREE.MeshStandardMaterial({ color: 0x0a0d11, roughness: 1 });
  var wbody = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.85, 4, 8), wm);
  wbody.position.y = 0.62; watcher.add(wbody);
  var whead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.9 }));
  whead.position.y = 1.28; watcher.add(whead);
  watcher.position.set(122.8, -21.5, 0.9);
  watcher.rotation.y = 0.7;
  scene.add(watcher);

  // ---------------- the deep level: corridor at y=-45, extended in v9 to the tank drop
  addPlatform(122.5, 157.5, -45, 3);
  var dwall = new THREE.Mesh(new THREE.BoxGeometry(33, 8.5, 1.2), MAT.wall);
  dwall.position.set(138, -41.6, -3.4); scene.add(dwall);
  var dceil = new THREE.Mesh(new THREE.BoxGeometry(33, 1.2, 8), MAT.dark);
  dceil.position.set(138, -37.6, -0.5); scene.add(dceil);
  // cold strip lights, sparser and colder than the hall above
  for (var i = 0; i < 3; i++) {
    var ds = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xaac6dd, transparent: true, opacity: 0.7 }));
    ds.position.set(131 + i * 8, -38.35, -2.75); scene.add(ds);
    // visible cone + floor pool so the cold light reads
    var cone = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 6.2),
      new THREE.MeshBasicMaterial({ color: 0x9fc0d8, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.set(131 + i * 8, -41.6, -2.5); scene.add(cone);
    var pool = new THREE.Mesh(new THREE.CircleGeometry(1.7, 20),
      new THREE.MeshBasicMaterial({ color: 0x9fc0d8, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(131 + i * 8, -44.95, -0.6); scene.add(pool);
  }
  var deepWash = new THREE.PointLight(0x8fa6bd, 3.8, 26, 1.5);
  deepWash.position.set(138, -40.5, 2.0); scene.add(deepWash);
  // a faint cold glint on the shaft watcher's ledge
  var ledgeLight = new THREE.PointLight(0x9fc0d8, 1.4, 3.5, 2);
  ledgeLight.position.set(122.9, -20.2, 2.0); scene.add(ledgeLight);
  // pipes along the deep back wall
  for (i = 0; i < 3; i++) {
    var dp = new THREE.Mesh(new THREE.CylinderGeometry(0.07 + i * 0.025, 0.07 + i * 0.025, 30, 8), MAT.fence);
    dp.rotation.z = Math.PI / 2;
    dp.position.set(138, -39.2 - i * 0.45, -2.85); scene.add(dp);
  }
  // still puddles on the deep floor
  for (i = 0; i < 2; i++) {
    var pud = new THREE.Mesh(new THREE.PlaneGeometry(2.2 - i * 0.7, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1a2631, roughness: 0.15, metalness: 0.55, transparent: true, opacity: 0.8 }));
    pud.rotation.x = -Math.PI / 2;
    pud.position.set(133 + i * 9, -44.97, 0.3); scene.add(pud);
  }
  // the way on: a black doorway with one thin slit of light
  var dframe = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.4, 0.5), MAT.wallHi);
  dframe.position.set(152.6, -43.3, -1.9); scene.add(dframe);
  var slit = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.6, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xdfeaf2, transparent: true, opacity: 0.85 }));
  slit.position.set(152.6, -43.55, -1.62); scene.add(slit);
  var dl2 = new THREE.PointLight(0xcfe0ee, 3.5, 8, 2);
  dl2.position.set(152.4, -43.2, -0.6); scene.add(dl2);
})();

function updateRide(dt) {
  RIDE.locked = RIDE.phase !== 'none' && RIDE.phase !== 'done';
  if (!RIDE.locked) return;
  RIDE.t += dt;
  if (RIDE.phase === 'board') {
    // the boy steps into the car on his own
    var dx = 124.8 - P.x;
    P.x += Math.sign(dx) * Math.min(Math.abs(dx), 1.6 * dt);
    P.dir = 1; P.vx = 0; P.vy = 0; P.grounded = true;
    RIDE.door = Math.max(0, RIDE.door - dt / 0.7);
    if (Math.abs(dx) < 0.04 && RIDE.door <= 0) { RIDE.phase = 'shut'; RIDE.t = 0; thud(); }
  } else if (RIDE.phase === 'shut') {
    P.vx = 0; P.vy = 0;
    if (RIDE.t > 0.6) { RIDE.phase = 'down'; RIDE.t = 0; }
  } else if (RIDE.phase === 'down') {
    var sp = Math.min(2.6, 0.4 + RIDE.t * 3.2);
    RIDE.carY = Math.max(RIDE.targetY, RIDE.carY - sp * dt);
    P.y = RIDE.carY; P.vx = 0; P.vy = 0; P.grounded = true;
    // sway + flicker
    carGroup.position.x = 124.8 + Math.sin(RIDE.t * 7.3) * 0.012;
    RIDE.flick = (Math.sin(RIDE.t * 13.7) > 0.965 || Math.sin(RIDE.t * 5.1 + 2) > 0.985) ? 0.25 : 1;
    if (RIDE.carY <= RIDE.targetY) { RIDE.phase = 'open'; RIDE.t = 0; thud(); }
  } else if (RIDE.phase === 'open') {
    RIDE.door = Math.min(1, RIDE.door + dt / 0.8);
    P.vx = 0; P.vy = 0;
    if (RIDE.door >= 1) { RIDE.phase = 'done'; RIDE.locked = false; }
  }
  // car follows, doors slide
  carGroup.position.y = RIDE.carY;
  if (RIDE.phase === 'down') P.y = RIDE.carY;
  var lo = (RIDE.phase === 'open' || RIDE.phase === 'done') ? RIDE.door : 0;
  // left doors: open at top (phase none), closed during ride
  var lOpen = (RIDE.phase === 'none') ? 1 : 0;
  doorsL.forEach(function (d) { d.position.z = d.userData.s * (0.38 + lOpen * 0.75); });
  doorsR.forEach(function (d) { d.position.z = d.userData.s * (0.38 + lo * 0.75); });
  var fl = RIDE.flick;
  carLight.intensity = 4.5 * fl;
  carGlowM.opacity = 0.75 * fl;
}


// ---------------------------------------------------------------- the tank (v9): open water, she hunts
var TANK = { x1: 154, x2: 200, surface: -40, floor: -58 };
function inTank(x, y) { return x > TANK.x1 && x < TANK.x2 && y < TANK.surface; }
var tankRipples = [], bubbles = [];
var G2 = { x: 190, open: 0, crank: 0 };
var HER = { x: 170, y: -52, active: false, catches: 0, lunge: 0, cd: 0, lvx: 0, lvy: 0, orbA: 0 };
var herMesh, herFace, herHair = [];
var PYLONS = [166, 184];
(function () {
  // entry ledge continues past the doorway, then open water
  // the chamber: vast back wall, sunken structures, the tank floor
  var twall = new THREE.Mesh(new THREE.BoxGeometry(50, 27, 1.2), MAT.wall);
  twall.position.set(177, -45.5, -3.6); scene.add(twall);
  addPlatform(154, 200, -58, 2);
  // wall below the entry ledge
  var uw1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 13.5, 3.2), MAT.wall);
  uw1.position.set(155.4, -51.7, -0.9); scene.add(uw1);
  // two great dark windows, faint green glow behind the glass
  for (var wi = 0; wi < 2; wi++) {
    var wf = new THREE.Mesh(new THREE.BoxGeometry(6.5, 9, 0.7), MAT.wallHi);
    wf.position.set(168 + wi * 16, -48, -3.0); scene.add(wf);
    var wg = new THREE.Mesh(new THREE.BoxGeometry(5.6, 8.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x46686e, transparent: true, opacity: 0.55 }));
    wg.position.set(168 + wi * 16, -48, -2.6); scene.add(wg);

  }
  // sunken catwalk wreck on the floor
  var wreck = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 1.6), MAT.dark);
  wreck.position.set(172, -57.2, -0.5); wreck.rotation.z = 0.09; scene.add(wreck);
  var wreck2 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.4, 0.25), MAT.dark);
  wreck2.position.set(169, -55.6, -0.5); wreck2.rotation.z = 0.22; scene.add(wreck2);
  // light pylons she will not cross: warm columns from the dark above into the water
  for (var pi = 0; pi < PYLONS.length; pi++) {
    var px = PYLONS[pi];
    var rod = new THREE.Mesh(new THREE.BoxGeometry(0.14, 10.5, 0.14), MAT.fence);
    rod.position.set(px, -39.7, -0.6); scene.add(rod);
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffcf8e }));
    lamp.position.set(px, -44.9, -0.6); scene.add(lamp);
    var pl = new THREE.PointLight(0xffb45e, 3.0, 11, 2);
    pl.position.set(px, -45.5, -0.2); scene.add(pl);
    var pcone = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 13.5),
      new THREE.MeshBasicMaterial({ color: 0xffb45e, transparent: true, opacity: 0.085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    pcone.position.set(px, -46.7, -0.9); scene.add(pcone);
    var ppool = new THREE.Mesh(new THREE.CircleGeometry(1.8, 20),
      new THREE.MeshBasicMaterial({ color: 0xffb45e, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
    ppool.rotation.x = -Math.PI / 2;
    ppool.position.set(px, -57.9, -0.6); scene.add(ppool);
  }
  // the mid platform: concrete block to climb out and breathe
  addPlatform(172, 176, -39.1, 3);
  var mp = new THREE.Mesh(new THREE.BoxGeometry(4, 19.5, 3.4), MAT.wall);
  mp.position.set(174, -48.85, -0.9); scene.add(mp);
  // the crank gate: barred door, floor to above the surface, rises as you crank
  var gm = new THREE.MeshStandardMaterial({ color: 0x2b333e, roughness: 0.8, metalness: 0.45 });
  var gate = new THREE.Group();
  for (var gi = 0; gi < 6; gi++) {
    var gb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 18.5, 0.09), gm);
    gb.position.set(0, 0, -0.75 + gi * 0.3); gate.add(gb);
  }
  var gt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 1.8), gm);
  gt.position.set(0, 9.1, 0); gate.add(gt);
  var gb2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.3, 1.8), gm);
  gb2.position.set(0, -9.1, 0); gate.add(gb2);
  gate.position.set(G2.x, -48.75, -0.4);
  scene.add(gate);
  G2.mesh = gate;
  // gate frame + the wheel
  var gf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 19.5, 0.4), MAT.wallHi);
  gf.position.set(G2.x, -48.6, -1.35); scene.add(gf);
  var wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0x4a5260, roughness: 0.5, metalness: 0.7 }));
  wheel.position.set(189.2, -52, 0.35); scene.add(wheel);
  G2.wheel = wheel;
  // the far rim: climb out, walk to the black stair down
  addPlatform(197.5, 200, -39.1, 3);
  var rim = new THREE.Mesh(new THREE.BoxGeometry(2.6, 19.5, 3.4), MAT.wall);
  rim.position.set(198.7, -48.85, -0.9); scene.add(rim);
  var stairDark = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.3), MAT.dark);
  stairDark.position.set(199.4, -37.8, -1.2); scene.add(stairDark);

  // tank water surface
  var tw = new THREE.Mesh(
    new THREE.PlaneGeometry(TANK.x2 - TANK.x1, 4.0, 40, 1),
    new THREE.MeshStandardMaterial({ color: 0x1c2a36, roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.82 })
  );
  tw.rotation.x = -Math.PI / 2;
  tw.position.set((TANK.x1 + TANK.x2) / 2, TANK.surface, 0);
  scene.add(tw);
  TANK.mesh = tw;
  for (var ri = 0; ri < 6; ri++) {
    var rr = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 20),
      new THREE.MeshBasicMaterial({ color: 0x9fb6cc, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    rr.rotation.x = -Math.PI / 2;
    rr.position.y = TANK.surface + 0.02;
    scene.add(rr);
    tankRipples.push({ mesh: rr, t: 99 });
  }
  // bubbles
  for (var bi = 0; bi < 10; bi++) {
    var bb = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8),
      new THREE.MeshBasicMaterial({ color: 0xbfd4e4, transparent: true, opacity: 0, depthWrite: false }));
    scene.add(bb);
    bubbles.push({ mesh: bb, t: 99, x: 0, y: 0 });
  }

  // her, in open water: full body, pale face, trailing hair
  herMesh = new THREE.Group();
  var hbM = new THREE.MeshStandardMaterial({ color: 0x070a0d, roughness: 1 });
  var hb = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 1.3, 6, 10), hbM);
  hb.rotation.z = Math.PI / 2;
  herMesh.add(hb);
  herFace = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xc7cfd6, roughness: 0.6, transparent: true, opacity: 0 }));
  herFace.position.set(0.75, 0.08, 0); herMesh.add(herFace);
  for (var hi = 0; hi < 3; hi++) {
    var hh = new THREE.Mesh(new THREE.PlaneGeometry(1.1 - hi * 0.2, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x8a97a3, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    hh.position.set(-0.85 - hi * 0.15, 0.10 + hi * 0.07, 0);
    herMesh.add(hh);
    herHair.push(hh);
  }
  var herRim = new THREE.PointLight(0x9fb6cc, 0.9, 4.5, 2);
  herRim.position.set(0, 0.5, 0.8); herMesh.add(herRim);
  herMesh.position.set(HER.x, HER.y, -0.4);
  scene.add(herMesh);
})();

var tankRippleTimer = 0, wasInTank = false, bubTimer = 0;
function boyInPylonLight() {
  if (P.y > TANK.surface + 0.05) return false;
  for (var i = 0; i < PYLONS.length; i++) if (Math.abs(P.x - PYLONS[i]) < 1.7) return PYLONS[i];
  return false;
}
function updateHer(dt) {
  var inT = inTank(P.x, P.y) && P.y < TANK.surface + 0.05;
  if (!HER.active) {
    herMesh.visible = inT || HER.catches > 0;
    if (inT && !P.ended && P.x > 156.5) { HER.active = true; HER.cd = Math.max(HER.cd, 1.0); }
    else return;
  }
  if (P.ended) { HER.active = false; }
  var dx = P.x - HER.x, dy = (P.y + 0.2) - HER.y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (HER.lunge > 0) {
    if (boyInPylonLight() !== false) { HER.lunge = 0; HER.cd = 1.4; }
    else {
      HER.lunge -= dt;
      HER.x += HER.lvx * dt; HER.y += HER.lvy * dt;
    }
  } else {
    HER.cd -= dt;
    var lit = boyInPylonLight();
    if (!inT) {
      // he climbed out: she sinks and drifts beneath him
      var ty2 = TANK.floor + 2.5;
      HER.x += Math.sign(P.x - HER.x) * Math.min(Math.abs(P.x - HER.x), 1.2 * dt);
      HER.y += Math.sign(ty2 - HER.y) * Math.min(Math.abs(ty2 - HER.y), 1.2 * dt);
    } else if (lit !== false) {
      // held at the edge of the light: she keeps a 2.7-wide berth, tracking his depth
      var oy3 = Math.max(TANK.floor + 1, Math.min(TANK.surface - 0.8, P.y));
      var side = (HER.x - lit) === 0 ? 1 : Math.sign(HER.x - lit);
      var tx3 = lit + side * 2.7;
      HER.x += Math.sign(tx3 - HER.x) * Math.min(Math.abs(tx3 - HER.x), 1.9 * dt);
      HER.y += Math.sign(oy3 - HER.y) * Math.min(Math.abs(oy3 - HER.y), 1.4 * dt);
    } else if (d < 6 && HER.cd <= 0) {
      HER.lunge = 0.9; HER.cd = 2.6;
      HER.lvx = dx / d * 4.3; HER.lvy = dy / d * 4.3;
    } else if (d > 0.01) {
      HER.x += dx / d * 1.75 * dt; HER.y += dy / d * 1.75 * dt;
    }
  }
  HER.x = Math.max(155.5, Math.min(199, HER.x));
  HER.y = Math.max(TANK.floor + 0.8, Math.min(TANK.surface - 0.15, HER.y));
  // the catch
  if (inT && d < 0.7 && !P.dying && boyInPylonLight() === false) {
    HER.catches++;
    die('she');
    HER.x = 170; HER.y = TANK.floor + 6; HER.active = false; HER.lunge = 0; HER.cd = 1.5;
  }
  // presentation
  var moving = HER.lunge > 0 || true;
  var ang = Math.atan2(HER.lunge > 0 ? HER.lvy : dy, HER.lunge > 0 ? HER.lvx : dx);
  herMesh.rotation.z = ang;
  herMesh.position.set(HER.x, HER.y, -0.4);
  var faceOp = Math.max(0, Math.min(0.95, 1 - d / 12));
  herFace.material.opacity = faceOp;
  for (var hi = 0; hi < herHair.length; hi++) {
    herHair[hi].material.opacity = faceOp * 0.8;
    herHair[hi].rotation.z = Math.sin(performance.now() * 0.003 + hi * 1.4) * 0.18;
  }
  herMesh.visible = HER.active || d < 14;
}

function updateTank(dt) {
  // surface undulation
  var pos = TANK.mesh.geometry.attributes.position;
  var now = performance.now() * 0.001;
  for (var i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(now * 1.2 + pos.getX(i) * 0.9) * 0.04);
  pos.needsUpdate = true;
  for (i = 0; i < tankRipples.length; i++) {
    var r = tankRipples[i];
    r.t += dt;
    if (r.t < 1.2) { var u = r.t / 1.2; r.mesh.scale.setScalar(1 + u * 3.4); r.mesh.material.opacity = 0.4 * (1 - u); }
    else r.mesh.material.opacity = 0;
  }
  for (i = 0; i < bubbles.length; i++) {
    var b = bubbles[i];
    b.t += dt;
    if (b.t < 1.6) {
      b.y += 1.3 * dt;
      b.mesh.position.set(b.x + Math.sin(now * 5 + i) * 0.05, b.y, 0.3);
      b.mesh.material.opacity = 0.5 * (1 - b.t / 1.6);
    } else b.mesh.material.opacity = 0;
  }
  var inT = inTank(P.x, P.y);
  // entry splash
  if (inT && !wasInTank) {
    var br = tankRipples[0];
    for (i = 0; i < tankRipples.length; i++) if (tankRipples[i].t > br.t) br = tankRipples[i];
    br.t = 0; br.mesh.position.set(P.x, TANK.surface + 0.02, 0); br.mesh.scale.setScalar(1.7);
  }
  wasInTank = inT;
  // surface ripples while swimming at the top
  if (inT && P.y > TANK.surface - 0.7 && Math.abs(P.vx) > 0.3) {
    tankRippleTimer -= dt;
    if (tankRippleTimer <= 0) {
      tankRippleTimer = 0.36;
      var sr = tankRipples[0];
      for (i = 0; i < tankRipples.length; i++) if (tankRipples[i].t > sr.t) sr = tankRipples[i];
      sr.t = 0; sr.mesh.position.set(P.x, TANK.surface + 0.02, 0); sr.mesh.scale.setScalar(1);
    }
  }
  // bubbles while submerged and moving
  if (inT && P.y < TANK.surface - 0.6 && (Math.abs(P.vx) > 0.4 || Math.abs(P.vy) > 0.4)) {
    bubTimer -= dt;
    if (bubTimer <= 0) {
      bubTimer = 0.22;
      var bb2 = bubbles[0];
      for (i = 0; i < bubbles.length; i++) if (bubbles[i].t > bb2.t) bb2 = bubbles[i];
      bb2.t = 0; bb2.x = P.x - P.dir * 0.15; bb2.y = P.y + 0.55;
    }
  }
  // the crank wheel
  if (!P.ended && G2.open < 1 && keys.action && Math.abs(P.x - 189.2) < 1.0 && Math.abs(P.y - -52) < 1.3) {
    G2.crank += dt;
    G2.open = Math.min(1, G2.crank / 2.5);
  }
  G2.mesh.position.y = -48.75 + G2.open * 18;
  G2.wheel.rotation.z += (keys.action && Math.abs(P.x - 189.2) < 1.0 && G2.open < 1 ? dt * 3 : 0);
}

// ---------------------------------------------------------------- the huddle (v10): containment, the merge, the breakout, the shore
var BLOB = { mode: 'none', t: 0, vx: 0, walls: 0, glassBroken: false, locked: false, restT: 0, smashT: 0 };
var blobMesh, blobCore, blobArm, glassMesh, alarmLight;
var BWALLS = [], shards = [], fleeSci = [];
(function () {
  // the containment chamber (x200-218), tall, lit like a lab
  addPlatform(200, 224.3, -39.1, 3);
  var cw = new THREE.Mesh(new THREE.BoxGeometry(19, 17, 1.2), MAT.wall);
  cw.position.set(209, -31.4, -3.4); scene.add(cw);
  var cc = new THREE.Mesh(new THREE.BoxGeometry(19, 1.2, 8), MAT.dark);
  cc.position.set(209, -23.1, -0.5); scene.add(cc);
  var cl1 = new THREE.PointLight(0x9fc0d8, 3.4, 16, 2);
  cl1.position.set(209, -26, -1.0); scene.add(cl1);
  var cstrip = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xaac6dd, transparent: true, opacity: 0.7 }));
  cstrip.position.set(204, -24.4, -2.75); scene.add(cstrip);
  var cstrip2 = cstrip.clone(); cstrip2.position.set(214, -24.4, -2.75); scene.add(cstrip2);
  for (var ci = 0; ci < 2; ci++) {
    var ccone = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 13.5),
      new THREE.MeshBasicMaterial({ color: 0x9fc0d8, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ccone.position.set(204 + ci * 10, -31.2, -2.5); scene.add(ccone);
    var cpool = new THREE.Mesh(new THREE.CircleGeometry(1.8, 20),
      new THREE.MeshBasicMaterial({ color: 0x9fc0d8, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
    cpool.rotation.x = -Math.PI / 2;
    cpool.position.set(204 + ci * 10, -39.05, -0.6); scene.add(cpool);
  }
  // the sphere glows the same pale green as the tank windows
  var sphereGlow = new THREE.PointLight(0x51767c, 1.6, 8, 2);
  sphereGlow.position.set(209, -36, 0.6); scene.add(sphereGlow);
  // alarm light, off until the glass breaks
  alarmLight = new THREE.PointLight(0xff7a4a, 0, 16, 2);
  alarmLight.position.set(209, -25, 0.5); scene.add(alarmLight);

  // the glass sphere and what is inside it
  glassMesh = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 18),
    new THREE.MeshStandardMaterial({ color: 0x6f969e, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.24 }));
  glassMesh.position.set(209, -36.3, -0.6); scene.add(glassMesh);
  var gbase = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.3, 0.5, 20), MAT.wallHi);
  gbase.position.set(209, -38.85, -0.6); scene.add(gbase);

  blobMesh = new THREE.Group();
  var blobM = new THREE.MeshStandardMaterial({ color: 0xa89a94, roughness: 0.95 });
  var blobM2 = new THREE.MeshStandardMaterial({ color: 0xbfb0aa, roughness: 0.9 });
  blobCore = new THREE.Mesh(new THREE.SphereGeometry(1.35, 18, 14), blobM);
  blobMesh.add(blobCore);
  for (var li = 0; li < 9; li++) {
    var lump = new THREE.Mesh(new THREE.CapsuleGeometry(0.28 + (li % 3) * 0.06, 0.6 + (li % 4) * 0.18, 4, 8), li % 2 ? blobM2 : blobM);
    var la = li * 2.4, lr = 1.15;
    lump.position.set(Math.cos(la) * lr * Math.cos(li), Math.sin(li * 1.7) * 0.9, Math.sin(la) * lr * 0.6);
    lump.rotation.set(li * 0.9, la, li * 1.3);
    blobMesh.add(lump);
  }
  // the boy's arm, still reaching out of the mass
  blobArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.55, 4, 6),
    new THREE.MeshStandardMaterial({ color: 0xc7a48a, roughness: 0.85 }));
  blobArm.position.set(0.25, 1.35, 0.2); blobArm.rotation.z = -0.5;
  blobMesh.add(blobArm);
  blobMesh.position.set(209, -37.6, -0.4);
  scene.add(blobMesh);

  // two scientists tending the tank; they flee when it breaks
  for (var si = 0; si < 2; si++) {
    var sc = new THREE.Group();
    var sb2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.8, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a4148, roughness: 0.95 }));
    sb2.position.y = 0.6; sc.add(sb2);
    var sh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x9aa4ac, roughness: 0.8 }));
    sh.position.y = 1.24; sc.add(sh);
    sc.position.set(211.5 + si * 1.4, -39.1, -0.2);
    scene.add(sc);
    fleeSci.push({ mesh: sc, x: 211.5 + si * 1.4, fleeing: false, gone: false, phase: si * 2 });
  }

  // breakable walls: the containment door and the facility's outer wall
  function mkWall(x, w, h, y) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x272e37, roughness: 0.85, metalness: 0.3 }));
    m.position.set(x, y, -0.6); scene.add(m);
    var seams = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.12, 2.66),
      new THREE.MeshStandardMaterial({ color: 0x11161c, roughness: 0.9 }));
    seams.position.set(x, y + h * 0.2, -0.6); scene.add(seams);
    BWALLS.push({ x: x, broken: false, mesh: m, seam: seams, h: h, y: y });
  }
  mkWall(214.5, 0.9, 5.2, -36.5);
  mkWall(224, 0.9, 7.5, -35.4);

  // shard pool for glass + wall breaks
  for (var shi = 0; shi < 26; shi++) {
    var sh2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x9fb6c4, roughness: 0.3, transparent: true, opacity: 0 }));
    scene.add(sh2);
    shards.push({ mesh: sh2, t: 99, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0 });
  }

  // outside: the night hillside down to the water
  for (var hi2 = 0; hi2 < 8; hi2++) {
    addPlatform(224 + hi2 * 2, 226.2 + hi2 * 2, -40.6 - 1.5 * hi2, 3);
    var grass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x131a16, roughness: 1 }));
    grass.position.set(225.1 + hi2 * 2, -40.75 - 1.5 * hi2, -0.6);
    scene.add(grass);
  }
  addPlatform(238, 244, -50.6, 3); // the shore
  var sky = new THREE.Mesh(new THREE.PlaneGeometry(40, 26),
    new THREE.MeshBasicMaterial({ color: 0x0d1420, fog: false }));
  sky.position.set(233, -38, -6); scene.add(sky);
  var moon = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xcfd9e2, transparent: true, opacity: 0.5, fog: false }));
  moon.position.set(237, -31, -5.9); scene.add(moon);
  var sea = new THREE.Mesh(new THREE.PlaneGeometry(24, 5),
    new THREE.MeshStandardMaterial({ color: 0x1a2836, roughness: 0.2, metalness: 0.5, transparent: true, opacity: 0.85 }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(236, -49.9, -0.4); scene.add(sea);
  BLOB.sea = sea;
})();

function burstShards(x, y, z, n, col) {
  var made = 0;
  for (var i = 0; i < shards.length && made < n; i++) {
    var sh = shards[i];
    if (sh.t < 3) continue;
    sh.t = 0; made++;
    sh.mesh.material.color.setHex(col || 0x9fb6c4);
    sh.mesh.position.set(x + (Math.random() - 0.5) * 0.8, y + (Math.random() - 0.5) * 1.2, z + (Math.random() - 0.5) * 0.8);
    sh.vx = (Math.random() - 0.3) * 5; sh.vy = 2.5 + Math.random() * 3.5; sh.vz = (Math.random() - 0.5) * 2;
    sh.rx = (Math.random() - 0.5) * 9; sh.rz = (Math.random() - 0.5) * 9;
    sh.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  }
}

function updateBlob(dt) {
  BLOB.locked = BLOB.mode === 'waking';
  // breathing, always
  var br = 1 + Math.sin(performance.now() * 0.0018) * 0.03;
  blobCore.scale.setScalar(br);
  if (BLOB.mode === 'none') {
    if (P.x > 207.5 && P.y > -40 && !P.ended) { BLOB.mode = 'waking'; BLOB.t = 0; }
    return;
  }
  if (BLOB.mode === 'waking') {
    BLOB.t += dt;
    P.vx = 0; P.vy = 0;
    // the mass stirs, the glass crazes, then it goes
    if (BLOB.t > 0.6 && !BLOB.glassBroken) {
      glassMesh.material.opacity = 0.34 + Math.sin(BLOB.t * 30) * 0.06;
    }
    if (BLOB.t > 1.4 && !BLOB.glassBroken) {
      BLOB.glassBroken = true;
      glassMesh.visible = false;
      burstShards(209, -36.3, -0.6, 12, 0x9fb6c4);
      alarmLight.intensity = 2.6;
      thud();
      for (var fi = 0; fi < fleeSci.length; fi++) fleeSci[fi].fleeing = true;
    }
    if (BLOB.glassBroken) {
      // the boy is drawn in
      var dx = 209 - P.x, dy = -37.4 - P.y;
      var dd = Math.sqrt(dx * dx + dy * dy);
      if (dd > 0.15) { P.x += dx / dd * Math.min(dd, 2.4 * dt); P.y += dy / dd * Math.min(dd, 2.4 * dt); }
    }
    if (BLOB.t > 3.1) {
      BLOB.mode = 'blob';
      boy.visible = false;
      P.x = 209; P.y = groundAt(209, -36); P.vx = 0; P.vy = 0;
    }
    return;
  }
  // shards fly + settle
  for (var i = 0; i < shards.length; i++) {
    var sh = shards[i];
    if (sh.t >= 3) { sh.mesh.material.opacity = 0; continue; }
    sh.t += dt;
    sh.vy -= 16 * dt;
    sh.mesh.position.x += sh.vx * dt;
    sh.mesh.position.y += sh.vy * dt;
    sh.mesh.position.z += sh.vz * dt;
    sh.mesh.rotation.x += sh.rx * dt; sh.mesh.rotation.z += sh.rz * dt;
    var fl = groundAt(sh.mesh.position.x, sh.mesh.position.y + 0.1);
    if (sh.mesh.position.y < fl + 0.06) { sh.t = 3; sh.mesh.position.y = fl + 0.05; }
    sh.mesh.material.opacity = Math.min(0.85, sh.t * 3) * (sh.t > 2 ? Math.max(0, 1 - (sh.t - 2)) : 1);
  }
  // the scientists run
  for (i = 0; i < fleeSci.length; i++) {
    var f = fleeSci[i];
    if (!f.fleeing || f.gone) continue;
    f.phase += dt * 9;
    var blocked = false;
    for (var wi = 0; wi < BWALLS.length; wi++) {
      var w = BWALLS[wi];
      if (!w.broken && f.x > w.x - 0.8 && f.x < w.x + 0.8) blocked = true;
    }
    if (!blocked) f.x += 4.2 * dt;
    f.mesh.position.x = f.x;
    f.mesh.position.y = groundAt(f.x, -30) + Math.abs(Math.sin(f.phase)) * 0.06;
    f.mesh.rotation.y = Math.PI / 2;
    if (f.x > 230) { f.gone = true; f.mesh.visible = false; }
  }
  // alarm pulse
  if (BLOB.glassBroken) alarmLight.intensity = 1.6 + Math.sin(performance.now() * 0.012) * 1.2;

  BLOB.smashT = Math.max(0, BLOB.smashT - dt);
  if (BLOB.mode !== 'blob') return;
  // -------- controlling the mass
  blobMesh.position.set(P.x, P.y + 0.15 + Math.sin(performance.now() * 0.004) * 0.04, -0.4);
  blobMesh.rotation.z -= P.vx * dt / 1.2;
  blobArm.rotation.z = -0.5 + Math.sin(performance.now() * 0.003) * 0.15;
  // coming to rest on the shore
  if (P.x > 235 && P.grounded && Math.abs(P.vx) < 0.9) {
    BLOB.restT += dt;
    if (BLOB.restT > 2.5 && !P.ended) {
      BLOB.mode = 'rest';
      P.ended = true;
      fadeEl.style.opacity = '1';
      setTimeout(function () {
        endEl.style.display = 'flex';
        requestAnimationFrame(function () { endEl.style.opacity = '1'; });
        fadeEl.style.opacity = '0';
      }, 1400);
    }
  } else BLOB.restT = 0;
  BLOB.sea.position.y = -49.9 + Math.sin(performance.now() * 0.0012) * 0.05;
}

function updateBlobMove(dt) {
  var move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (move === 0 && P.grounded && P.x > 223 && P.x < 238) move = 0.55; // the hillside takes it
  if (move !== 0) P.dir = move;
  var accel = P.grounded ? 5.5 : 3;
  P.vx += Math.max(-accel * dt, Math.min(accel * dt, move * 2.6 - P.vx));
  var nx = P.x + P.vx * dt;
  // smash through
  for (var wi = 0; wi < BWALLS.length; wi++) {
    var w = BWALLS[wi];
    if (!w.broken && Math.abs(nx - w.x) < 1.5 && Math.abs(P.vx) > 0.8) {
      w.broken = true; BLOB.walls++;
      w.mesh.visible = false; w.seam.visible = false;
      burstShards(w.x, w.y + 1, -0.4, 8, 0x39424d);
      BLOB.smashT = 0.5; thud();
    }
  }
  var blocked = false;
  for (wi = 0; wi < BWALLS.length; wi++) {
    var w2 = BWALLS[wi];
    if (!w2.broken && Math.abs(nx - w2.x) < 1.35 && P.y < w2.y + w2.h / 2) blocked = true;
  }
  if (blocked) { nx = P.x; P.vx *= 0.4; }
  if (nx > 241.5) { nx = 241.5; P.vx = Math.min(P.vx, 0); } // the sea takes its momentum
  P.x = nx;
  P.vy -= GRAV * dt;
  P.y += P.vy * dt;
  var g = groundAt(P.x, P.y + 0.42);
  if (P.vy <= 0 && P.y <= g) { P.y = g; P.vy = 0; P.grounded = true; }
  else P.grounded = false;
  P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  if (P.jumpBuf > 0 && P.grounded) { P.vy = 5.2; P.grounded = false; P.jumpBuf = 0; thud(); }
}

// ---------------------------------------------------------------- the thing in the water (v6)
var SHE = { x: 108, active: false, catches: 0, phase: 0 };
var sheMesh, sheFace;
(function () {
  sheMesh = new THREE.Group();
  var bodyM = new THREE.MeshStandardMaterial({ color: 0x06090c, roughness: 1 });
  var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 6, 10), bodyM);
  body.rotation.z = Math.PI / 2;
  sheMesh.add(body);
  // hair: trailing dark strands
  for (var i = 0; i < 5; i++) {
    var strand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.05, 0.9, 5), bodyM);
    strand.rotation.z = Math.PI / 2 + 0.35 + i * 0.12;
    strand.position.set(-0.7 - i * 0.08, 0.05 * Math.sin(i), -0.12 + i * 0.06);
    sheMesh.add(strand);
  }
  // the pale face, only lit when close
  sheFace = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xc9cdc2, transparent: true, opacity: 0 }));
  sheFace.position.set(0.62, 0.08, 0);
  sheMesh.add(sheFace);
  sheMesh.position.set(SHE.x, WATER.surface - 0.55, 0);
  sheMesh.visible = false;
  scene.add(sheMesh);
})();

function updateShe(dt) {
  if (P.x > 124) { SHE.active = false; sheMesh.visible = false; return; }
  var boyIn = inWater(P.x, P.y);
  if (!SHE.active && boyIn && P.x > WATER.x1 + 1 && phase === 'play' && !P.ended) {
    SHE.active = true;
    SHE.x = P.x - 9;
    sheMesh.visible = true;
  }
  if (!SHE.active) return;
  if (!boyIn) { sheMesh.visible = false; SHE.active = false; return; }
  SHE.phase += dt;
  // she drifts toward the ripples - faster when the boy moves
  var dx = P.x - SHE.x;
  var speed = 1.1 + Math.min(0.55, Math.abs(P.vx) * 0.3);
  SHE.x += Math.sign(dx) * Math.min(Math.abs(dx), speed * dt);
  SHE.x = Math.max(WATER.x1 - 4, Math.min(WATER.x2 - 0.5, SHE.x));
  sheMesh.position.set(SHE.x, WATER.surface - 0.55 + Math.sin(SHE.phase * 0.9) * 0.06, 0);
  sheMesh.rotation.y = dx >= 0 ? 0 : Math.PI;
  // the face pales as she closes in
  var dist = Math.abs(dx);
  sheFace.material.opacity = Math.max(0, 1 - dist / 5) * 0.95;
  if (dist < 0.55 && !P.dying) {
    SHE.catches++;
    die('water');
    SHE.active = false; sheMesh.visible = false;
  }
}


// ---------------------------------------------------------------- the watchers (v7): lab window, gantry line, her hair
var scientists = [];
(function () {
  // observation window: cold lit glass in the back wall, dark figures behind it
  var win = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 0.08),
    new THREE.MeshBasicMaterial({ color: 0xbfd3e2, transparent: true, opacity: 0.5 }));
  win.position.set(110, 0.05, -2.72);
  scene.add(win);
  var wl = new THREE.PointLight(0xbfd3e2, 2.2, 8, 2);
  wl.position.set(110, 0.2, -2.0);
  scene.add(wl);
  var fig = new THREE.MeshStandardMaterial({ color: 0x0a0d11, roughness: 1 });
  for (var i = 0; i < 4; i++) {
    var g = new THREE.Group();
    var torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.5, 5, 8), fig);
    torso.position.y = 0.45;
    g.add(torso);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), fig);
    head.position.y = 0.92;
    g.add(head);
    g.position.set(108.9 + i * 0.75, -0.62, -2.85);
    scene.add(g);
    scientists.push({ mesh: g, head: head });
  }
})();

// the husk line on the gantry
var gantryHusks = [];
(function () {
  var rail = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.6), MAT.fence);
  rail.position.set(116, 1.1, -2.6);
  scene.add(rail);
  for (var i = 0; i < 6; i++) {
    var h = makeHusk(112.5 + i * 1.4);
    h.mesh.position.set(h.x, 1.14, -2.6);
    h.gantry = true;
    gantryHusks.push(h);
  }
})();

// her hair breaks the surface when she is close
var hairTip;
(function () {
  hairTip = new THREE.Group();
  var m = new THREE.MeshStandardMaterial({ color: 0x0a0d11, roughness: 1 });
  for (var i = 0; i < 3; i++) {
    var t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 6), m);
    t.position.set(-0.08 + i * 0.08, 0.12, -0.05 + i * 0.04);
    t.rotation.z = -0.25 + i * 0.2;
    hairTip.add(t);
  }
  hairTip.visible = false;
  scene.add(hairTip);
})();

var gantryDir = 1, gantryT = 0;
function updateWatchers(dt) {
  // scientists track the boy while he wades past
  for (var i = 0; i < scientists.length; i++) {
    var sc = scientists[i];
    var dx = P.x - sc.mesh.position.x;
    var want = Math.abs(dx) < 7 && P.x > 100 ? Math.max(-0.5, Math.min(0.5, dx * 0.09)) : 0;
    sc.head.rotation.y += (want - sc.head.rotation.y) * Math.min(1, dt * 3);
  }
  // the gantry line marches back and forth, slow and tireless
  gantryT += dt * 0.35 * gantryDir;
  if (gantryT > 1.6) gantryDir = -1;
  if (gantryT < -0.2) gantryDir = 1;
  for (i = 0; i < gantryHusks.length; i++) {
    var h = gantryHusks[i];
    h.phase += dt * 5;
    h.mesh.position.x = h.x + gantryT;
    h.mesh.position.y = 1.14 + Math.abs(Math.cos(h.phase)) * 0.02;
    h.mesh.rotation.z = 0.06 + Math.sin(h.phase) * 0.07;
    h.mesh.rotation.y = gantryDir > 0 ? 0 : Math.PI;
  }
  // her hair tips the surface when she is nearly on him
  if (SHE.active && Math.abs(P.x - SHE.x) < 1.6) {
    hairTip.visible = true;
    hairTip.position.set(SHE.x + (P.x >= SHE.x ? 0.3 : -0.3), WATER.surface + 0.05, 0);
  } else {
    hairTip.visible = false;
  }
}

// ---------------------------------------------------------------- player state
var P = {
  x: 2, y: 0, vx: 0, vy: 0, dir: 1, grounded: true,
  runPhase: 0, coyote: 0, jumpBuf: 0,
  checkpoint: 0, deaths: 0, caught: 0, ended: false, dying: false
};
var CHECKPOINTS = [2, 30, 47, 72, 99, 128, 156, 174];
var CHECKPOINT_Y = { 2: 2.3, 5: -45, 6: -45, 7: -39.1 };
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
  if (e.code === 'KeyE') { keys.action = true; handleAction(); return; }
  if (e.code === 'KeyR' && P.ended) { restart(); return; }
  var k = keymap[e.code];
  if (k) {
    keys[k] = true;
    if (k === 'jump') P.jumpBuf = 0.12;
    e.preventDefault();
  }
});
window.addEventListener('keyup', function (e) {
  if (e.code === 'KeyE') { keys.action = false; return; }
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
  MAN.active = false; MAN.gaveUp = false; MAN.catches = 0; man.visible = false;
  HELMET.on = false; HELMET.mode = 'boy'; boyHelmet.visible = false; helmetMesh.visible = true;
  SHE.active = false; SHE.catches = 0; sheMesh.visible = false;
  HUSKS[0].x = 54.6; HUSKS[1].x = 55.6;
  TRUCK.active = false; truck.visible = false;
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
    P.y = CHECKPOINT_Y[P.checkpoint] !== undefined ? CHECKPOINT_Y[P.checkpoint] : 0;
    P.vx = 0; P.vy = 0; P.dying = false;
    if (DOG.active) { DOG.x = P.x - 14; DOG.y = 0; DOG.vy = 0; }
    if (MAN.active) { MAN.x = P.x - 15; MAN.y = 0; MAN.vy = 0; }
    if (HER.active) { HER.x = 170; HER.y = TANK.floor + 6; HER.active = false; HER.lunge = 0; HER.cd = 1.5; }
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

function tryMantle(nx, move) {
  for (var mi = 0; mi < platforms.length; mi++) {
    var mpf = platforms[mi];
    var rise = mpf.top - P.y;
    if (rise > 0 && rise < 1.9 && nx > mpf.x1 - 0.4 && nx < mpf.x2 + 0.4 &&
        Math.sign(move) === Math.sign((mpf.x1 + mpf.x2) / 2 - P.x)) {
      P.y = mpf.top; P.x = nx; P.vy = 0; P.grounded = true; return true;
    }
  }
  return false;
}
function wallBlocks(nx, y) {
  // the tank gate until it is cranked up
  if (G2.open < 0.95 && nx > G2.x - 0.35 && nx < G2.x + 0.35 && y < -58 + G2.open * 18 + 1.3) return true;
  // the helmet gate while it is shut
  if (GATE.open < 0.85 && nx > GATE.x - 0.55 && nx < GATE.x + 0.55 && y < GATE.baseY + 2.9) return true;
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

  updateRide(dt);
  updateBlob(dt);
  if (BLOB.mode === 'blob') { updateBlobMove(dt); }
  else if (!RIDE.locked && !BLOB.locked) {
  var move = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (move !== 0) P.dir = move;
  if (HELMET.on && HELMET.mode === 'husks') {
    for (var hi = 0; hi < HUSKS.length; hi++) huskWalk(HUSKS[hi], move * 3.4 * dt);
    move = 0;
  }

  // crate pushing: grounded, pressing toward crate, adjacent
  var pushing = false;
  if (P.grounded && move !== 0 && Math.abs(P.y - CRATE.y) < 0.3) {
    var edge = CRATE.x - move * (CRATE.size / 2);
    if (Math.abs(P.x - edge) < 0.42 && Math.sign(move) === Math.sign(CRATE.x - P.x)) {
      pushing = true;
    }
  }
  var wading = inWater(P.x, P.y) || (inTank(P.x, P.y) && P.y >= TANK.surface - 0.7);
  var swimming = inTank(P.x, P.y) && P.y < TANK.surface - 0.35;
  if (swimming) {
    var swimSpd = 2.2;
    P.vx += Math.max(-14 * dt, Math.min(14 * dt, move * swimSpd - P.vx));
    var vtarget = keys.jump ? 1.9 : -0.55;
    P.vy += Math.max(-10 * dt, Math.min(10 * dt, vtarget - P.vy));
    if (move !== 0) P.dir = move;
    var snx = P.x + P.vx * dt;
    if (wallBlocks(snx, P.y) && !tryMantle(snx, move)) { snx = P.x; P.vx = 0; }
    P.x = snx;
    P.y += P.vy * dt;
    if (P.y > TANK.surface - 0.35) { P.y = TANK.surface - 0.35; P.vy = 0; }
    var tf2 = groundAt(P.x, P.y + 0.42);
    if (tf2 > -Infinity && P.y < tf2) { P.y = tf2; P.vy = 0; }
    P.grounded = false; P.coyote = 0; P.jumpBuf = 0;
  } else {
  var speed = pushing ? 1.7 : MOVE;
  if (wading) speed *= 0.45;
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
  } else if (wallBlocks(nx, P.y) && !tryMantle(nx, move)) {
    nx = P.x; P.vx = 0;
  }
  // crate blocks walking through it (unless standing on it)
  if (Math.abs(P.y - (CRATE.y + CRATE.size)) > 0.2 && Math.abs(P.y - CRATE.y) >= 0.3) {
    if (Math.abs(nx - CRATE.x) < CRATE.size / 2 + 0.26 && P.y < CRATE.y + CRATE.size - 0.2) {
      if (!pushing) { nx = P.x; if (P.grounded) P.vx = 0; }
    }
  }
  P.x = nx;

  var wasDry = !inWater(P.x, P.y);
  P.vy -= GRAV * dt;
  if (inWater(P.x, P.y) && P.vy < -2.2) P.vy = -2.2; // water catches the fall
  P.y += P.vy * dt;
  if (wasDry && inWater(P.x, P.y) && P.vy <= 0) { splash.t = 0; }
  var g = groundAt(P.x, P.y + 0.42);
  if (P.vy <= 0 && P.y <= g) {
    P.y = g; P.vy = 0; P.grounded = true; P.coyote = 0.1;
  } else {
    P.grounded = false;
    P.coyote = Math.max(0, P.coyote - dt);
  }

  P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  if (P.jumpBuf > 0 && (P.grounded || P.coyote > 0)) {
    P.vy = wading ? 4.4 : JUMP_V; P.grounded = false; P.coyote = 0; P.jumpBuf = 0;
  }
  if (!keys.jump && P.vy > 3) P.vy = 3; // variable jump height
  } // end walk/wade branch
  } // end walk branch dispatch

  // checkpoints
  for (var i = P.checkpoint + 1; i < CHECKPOINTS.length; i++) {
    if (P.x >= CHECKPOINTS[i]) P.checkpoint = i;
  }

  // hazards
  if (P.y < -3.5 && P.x < 98) die('fall');
  if (P.x > 70 && P.x < 92.5 && beamCatches(P.x)) die('light');

  // the dog hunts through the woods
  updateDog(dt);
  updateHunters(dt);
  updateHelmetGate(dt);
  updateWater(dt);
  updateShe(dt);
  updateWatchers(dt);
  updateTank(dt);
  updateHer(dt);

  // board the elevator at the end of the flooded hall
  if (P.x > 122.9 && P.y < -4 && P.y > -6 && RIDE.phase === 'none' && !P.ended) {
    RIDE.phase = 'board'; RIDE.t = 0;
  }


  // splash ripple on entry
  if (splash.t < 0.05) {
    var br = ripples[0];
    for (var ri = 0; ri < ripples.length; ri++) if (ripples[ri].t > br.t) br = ripples[ri];
    br.t = 0; br.mesh.position.set(P.x, WATER.surface + 0.02, 0); br.mesh.scale.setScalar(1.6);
    splash.t = 9;
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
var camZ = 9.2, camX = 2, camY = 1.4;
function updateCamera(dt) {
  var lookX = (RIDE.locked || RIDE.phase === 'done' && P.x < 126) ? 124.8 : P.x + P.dir * 2.1; // center the car during the descent
  camX += (lookX - camX) * Math.min(1, dt * 2.4);
  var ty = 1.5 + (P.y > 0 ? P.y * 0.55 : P.y * 0.8);
  if (P.y < -6) ty = P.y + 2.3; // deep sections: keep the boy framed
  camY += (ty - camY) * Math.min(1, dt * 2.0);
  var targetZ = (BLOB.mode === 'blob' || BLOB.mode === 'rest') ? 12.5 : 9.2;
  camZ += (targetZ - camZ) * Math.min(1, dt * 1.6);
  camera.position.set(camX, camY + 0.9, camZ);
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
var rumble = null;
function updateAudio() {
  if (!AC || muted) { return; }
  if (!rumble && AC) {
    try {
      rumble = AC.createOscillator(); rumble.type = 'square'; rumble.frequency.value = 31;
      var rg = AC.createGain(); rg.gain.value = 0;
      var lp2 = AC.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 90;
      rumble.connect(lp2); lp2.connect(rg); rg.connect(master); rumble.start();
      rumble._gain = rg;
    } catch (e) { rumble = null; }
  }
  if (rumble) rumble._gain.gain.value = ((TRUCK.active || RIDE.phase === 'down' || BLOB.smashT > 0) && !muted) ? 0.05 : 0;
  if (!shimmer) return;
  var prox = (P.x > 66 && P.x < 96) ? Math.max(0, 1 - Math.abs(P.x - BEAM.x) / 9) : 0;
  var herProx = HER.active ? Math.max(0, 1 - Math.abs(P.x - HER.x) / 8) : 0;
  shimmer._gain.gain.value = Math.max(prox * 0.028, herProx * 0.05);
}

// ---------------------------------------------------------------- debug / QA hooks
window.__scene = scene;
window.__DGsuspect = { beamCone: beamCone, beamGlow: beamGlow, beamSpot: beamSpot };
window.__DG = {
  boot: {
    meshes: scene.children.length, trees: treeCount,
    platforms: platforms.length, checkpoints: CHECKPOINTS.length, dogs: 1, men: 1, trucks: 1, husks: HUSKS.length, cables: cables.length, her: 1, watchers: scientists.length, gantry: gantryHusks.length, car: 1, tankHer: 1, pylons: PYLONS.length, blob: 1, qa: QA
  },
  state: function () {
    return {
      x: +P.x.toFixed(3), y: +P.y.toFixed(3), vx: +P.vx.toFixed(2),
      grounded: P.grounded, dir: P.dir, checkpoint: P.checkpoint,
      deaths: P.deaths, caught: P.caught, phase: phase, ended: P.ended,
      crateX: +CRATE.x.toFixed(3), beamX: +BEAM.x.toFixed(3),
      dying: P.dying, fps: +fpsValue.toFixed(1),
      dogX: +DOG.x.toFixed(2), dogActive: DOG.active, dogGivenUp: DOG.givenUp, dogCatches: DOG.catches,
      manX: +MAN.x.toFixed(2), manActive: MAN.active, manCatches: MAN.catches, truckX: +TRUCK.x.toFixed(2),
      wading: inWater(P.x, P.y), sheX: +SHE.x.toFixed(2), sheActive: SHE.active, sheCatches: SHE.catches,
      hairOut: hairTip.visible, gantry0: +gantryHusks[0].mesh.position.x.toFixed(2), sciYaw0: +scientists[0].head.rotation.y.toFixed(3),
      ridePhase: RIDE.phase, carY: +RIDE.carY.toFixed(2), rideLocked: RIDE.locked,
      swimming: inTank(P.x, P.y) && P.y < TANK.surface - 0.35,
      herX: +HER.x.toFixed(2), herY: +HER.y.toFixed(2), herActive: HER.active, herCatches: HER.catches,
      gate2: +G2.open.toFixed(2), crank: +G2.crank.toFixed(2), inLight: boyInPylonLight() !== false,
      blobMode: BLOB.mode, blobWalls: BLOB.walls, glassBroken: BLOB.glassBroken,
      sciGone: fleeSci.filter(function (f) { return f.gone; }).length,
      helmet: HELMET.on, mode: HELMET.mode, gateOpen: +GATE.open.toFixed(2), plateHeld: GATE.held,
      husk0: +HUSKS[0].x.toFixed(2), husk1: +HUSKS[1].x.toFixed(2)
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
  action: function () { handleAction(); },
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
  for (var hai = 0; hai < HUSKS.length; hai++) {
    var hk = HUSKS[hai];
    var driving = HELMET.on && HELMET.mode === 'husks';
    hk.phase += dt * (driving ? 7 : 1.2);
    hk.mesh.position.x = hk.x;
    hk.mesh.rotation.y = hk.dir > 0 ? 0 : Math.PI;
    hk.mesh.rotation.z = 0.06 + Math.sin(hk.phase) * (driving ? 0.09 : 0.02);
    hk.mesh.position.y = GATE.baseY + (driving ? Math.abs(Math.cos(hk.phase)) * 0.03 : 0);
  }
  updateCamera(dt);
  updateMotes(dt);
  updateAudio();
  renderer.render(scene, camera);
}
if (QA) { titleEl.style.display = 'none'; }
requestAnimationFrame(frame);

})();
