/* =====================================================================
   exercises.js - YOUR PROGRAM, AS DATA

   This file holds every exercise. The app builds its screens from this
   list, so to change your program you only edit this file.

   Each exercise is an object { ... } with these fields:

     id         short unique name the app uses internally
     section    "front9", "power", "core" or "strength"
     label      the number shown in the circle ("W1", "7a", "3")
     name       what's shown on screen
     figure     which stick figure to draw (see figures.js)
     equipment  list of things you need
     how        instructions, in order. Read aloud as prep.
     cues       short reminders spoken during the exercise
     notes      your handwritten notes from the handout
     dose       for drills with no number to count, what to do in words

   Optional fields for counted exercises:
     sets       how many sets
     reps       { low, high, step }  Jimmy's range. low = high means fixed.
     unit       "reps", "holds" or "seconds"
     side       "each side", "each arm", "each way" (leave out if both)
     weight     { start, step }  in pounds. start: null = you enter it.
     autoWeight false = never raise the weight automatically
     rest       seconds of rest between sets (adds a rest timer)
     check      true = Jimmy didn't give this number; it's a placeholder
     added      true = not on Jimmy's sheet (added at your request)

   Optional timer:
     timer      { type: "countdown", seconds, perSide }
                { type: "countdown", useTarget: true, perSide }
                { type: "breathing", inhale, exhale, rounds }
                { type: "holds", options: [ ... ] }   (see Curl-ups)
                { type: "stopwatch" }
   ===================================================================== */

const SECTIONS = {
  front9:   { name: "Front Nine" },
  power:    { name: "Power" },
  core:     { name: "Core" },
  strength: { name: "Strength" },
};

const EXERCISES = [

  /* ------------------------ WARM-UP (W) ------------------------ */

  {
    id: "cars", section: "front9", label: "W1",
    name: "Hip CARs",
    figure: "cars",
    equipment: ["Stick or dowel"],
    dose: "Slow, controlled circles with each hip",
    how: [
      "Stand tall holding the stick. Breathe in and brace so only the hip moves.",
      "Lift the knee high in front of you.",
      "Open it out to the side.",
      "Rotate it inward as its own separate step.",
      "Reach the knee back behind you, then return. Make each circle a little bigger.",
      "A sharp pinch means skip that part of the circle.",
    ],
    cues: ["Brace. Only the hip moves.", "Keep the knee high.", "Make the inward turn its own step.", "Make the circle bigger."],
    notes: ["Keep knee high", "Make internal rotation its own step"],
  },
  {
    id: "shouldercars", section: "front9", label: "W2",
    name: "Shoulder CARs",
    figure: "shouldercars",
    equipment: [],
    dose: "Slow, controlled circles with each shoulder",
    how: [
      "Stand tall. Brace your core and keep your ribs down so only the shoulder moves.",
      "Keep the arm long with the elbow straight.",
      "Raise it in front of you, up overhead, then back and down behind you.",
      "Draw the biggest circle you can, slowly. Then reverse.",
      "A sharp pinch means skip that part of the circle.",
    ],
    cues: ["Keep the elbow straight.", "Ribs down. Only the shoulder moves.", "Biggest circle you can.", "Slow and smooth."],
    notes: ["Keep elbow straight"],
  },
  {
    id: "childpose", section: "front9", label: "W3",
    name: "Child's Pose",
    figure: "childpose",
    equipment: ["Mat"],
    dose: "Hold for 5 to 8 slow breaths",
    how: [
      "Start on hands and knees, big toes together, knees apart.",
      "Sit your hips back toward your heels.",
      "Walk your hands forward and rest your forehead down.",
      "Breathe slowly into your back.",
    ],
    cues: ["Sink your hips to your heels.", "Reach long through your fingers.", "Breathe into your back."],
    notes: [],
    added: true,
  },
  {
    id: "catcow", section: "front9", label: "W4",
    name: "Cat-Cow",
    figure: "catcow",
    equipment: ["Mat"],
    dose: "8 to 10 slow rounds",
    how: [
      "Hands under shoulders, knees under hips.",
      "Cat: breathe out, round your back up, tuck your chin and tailbone.",
      "Cow: breathe in, let your belly drop, lift your chest and look forward.",
      "Move slowly with your breath.",
    ],
    cues: ["Breathe out, round up.", "Breathe in, chest forward.", "Move with your breath."],
    notes: [],
    added: true,
  },

  /* ------------------------ FRONT NINE ------------------------- */

  {
    id: "openbook", section: "front9", label: "1",
    name: "Rib Grab to Open Book",
    figure: "openbook",
    equipment: ["Foam roller", "Mat"],
    dose: "3 slow exhales per rep, each side. Then straight-arm, then kneeling.",
    how: [
      "Lie on your side, top knee resting on the roller at 90°.",
      "Top hand grabs the lower ribs on the other side and pulls them toward the ceiling.",
      "Exhale 3 times, turning a little further with each breath.",
      "Repeat with a straight arm while the bottom arm stays down. Then do it from kneeling.",
    ],
    cues: ["Top knee stays on the roller.", "Exhale and turn further.", "Bottom arm stays down."],
    notes: [],
  },
  {
    id: "floorslides", section: "front9", label: "2",
    name: "FMT Floor Slides",
    figure: "floorslides",
    equipment: ["Stick or light object", "Mat", "Towel"],
    sets: 1, reps: { low: 10, high: 10 }, unit: "reps",
    timer: { type: "breathing", inhale: 5, exhale: 10, rounds: 6 },
    how: [
      "On your back, knees bent, light object on your belt buckle.",
      "Use the breathing timer: in through the nose for 5 s, out through the mouth for 10 s.",
      "Then put your arms on the floor at 90° and slide them overhead as you breathe out.",
      "Fists, wrists and elbows stay touching the floor.",
    ],
    cues: ["Proud shoulders.", "Wrists and elbows stay on the floor.", "Slide on the breath out."],
    notes: ["Proud shoulders", "6–7 breaths", "Bend legs before resistance band"],
  },
  {
    id: "sidebend", section: "front9", label: "3",
    name: "Seated Side Bend Rotation",
    figure: "sidebend",
    equipment: ["Bench", "Foam roller", "Club"],
    sets: 2, reps: { low: 4, high: 4 }, unit: "holds", side: "each side",
    how: [
      "Sit tall and squeeze the roller between your knees.",
      "Check your turn first with the club across your chest.",
      "Hands behind your head. Turn to your backswing side and hold for 1 breath.",
      "Breathe out fully and side bend. Sit back up and turn further. Then do the downswing side.",
    ],
    cues: ["Elbow up.", "Squeeze the roller.", "Breathe out fully, then turn further."],
    notes: ["Elbow up"],
  },
  {
    id: "foamroll", section: "front9", label: "4",
    name: "Foam Rolling Circuit",
    figure: "foamroll",
    equipment: ["Foam roller"],
    dose: "10–12 long, slow rolls per muscle",
    how: [
      "Search out the tender spots instead of the comfortable ones.",
      "Use small rolls on sore spots and try different angles.",
      "Aim for about 8 out of 10. Never so hard you hold your breath.",
    ],
    cues: ["Find the tender spots.", "About 8 out of 10.", "Keep breathing."],
    notes: [],
  },
  {
    id: "toeyoga", section: "front9", label: "5",
    name: "Toe Yoga to Heel-Toe Hold",
    figure: "toeyoga",
    equipment: ["Bare feet"],
    dose: "A few seconds per hold, both feet. Then heel-to-toe balance.",
    timer: { type: "stopwatch" },
    how: [
      "Big toe down, lift the other four. Hold, then repeat.",
      "Then the reverse: four toes down, lift the big toe.",
      "Then stand heel to toe, feet in a straight line, eyes ahead.",
      "When you're steady, close your eyes. Time the hold with the stopwatch.",
    ],
    cues: ["Big toe down, others up.", "Now the reverse.", "Eyes ahead. Try eyes closed."],
    notes: [],
  },
  {
    id: "wipers", section: "front9", label: "6",
    name: "Hip Windshield Wipers",
    figure: "wipers",
    equipment: ["Mat", "Wall"],
    sets: 1, reps: { low: 10, high: 10 }, unit: "reps", side: "each side",
    how: [
      "Sit tall with your legs straight and wide. Use your hands to keep your spine upright if you need to.",
      "Without moving the other leg or hip, turn one whole leg in as far as you can, then out as far as you can.",
      "Everything on the moving side turns: foot, ankle and thigh.",
      "Hold each end for a few seconds. Do 10, then switch sides.",
    ],
    cues: ["Sit tall.", "Toe to nose.", "Other leg stays still.", "Hold at the end."],
    notes: ["Sit upright against a wall", "Toe to nose"],
  },
  {
    id: "legraise", section: "front9", label: "7a",
    name: "Active Straight Leg Raise",
    figure: "legraise",
    equipment: ["Long band", "Mat"],
    sets: 1, reps: { low: 10, high: 10 }, unit: "reps", side: "each side",
    how: [
      "On your back, band around one foot. Stretch that hamstring first.",
      "Raise both legs, perfectly straight.",
      "Lower the free leg slowly, taking at least 12 seconds. The banded leg stays still.",
      "Reset and repeat, then switch sides.",
    ],
    cues: ["Legs dead straight.", "Lower slowly. Twelve seconds.", "Opposite leg stays still."],
    notes: ["60 s hamstring stretch", "Opposite leg flat", "Core"],
  },
  {
    id: "toetouch", section: "front9", label: "7b",
    name: "Supported Toe Touch",
    figure: "toetouch",
    equipment: ["2x4 or small board", "Towel or foam roller"],
    dose: "A few slow reps with toes raised, then with heels raised",
    how: [
      "Stand with your toes up on the board, feet close together.",
      "Squeeze a towel or roller firmly between your thighs.",
      "Reach for the ground. The more you feel the stretch, the harder you squeeze.",
      "Breathe out 3 times. On the third, bend your knees slightly to touch your toes.",
      "Repeat, then do it again with heels raised and toes down.",
    ],
    cues: ["Squeeze the towel.", "Three slow breaths out.", "Bend the knees slightly on the last one."],
    notes: [],
  },
  {
    id: "kickback", section: "front9", label: "7c",
    name: "Internal Hip Kickback",
    figure: "kickback",
    equipment: ["Mat"],
    sets: 1, reps: { low: 10, high: 10 }, unit: "reps", side: "each side", check: true,
    how: [
      "Flip over to your hands and knees.",
      "Kick one leg back with the toe pointed inward.",
      "Move slowly with your core braced, then return.",
      "This helps stabilize the new range of motion from the windshield wipers. Switch sides.",
    ],
    cues: ["Core!", "Toe pointed in.", "Hip hike. Slow down.", "Belt buckle to chin."],
    notes: ["Core!", "Hip hike", "Slow down", "Belt buckle to chin"],
  },
  {
    id: "hipflexor", section: "front9", label: "8",
    name: "Half Kneeling Hip Flexor Stretch",
    figure: "hipflexor",
    equipment: ["Mat", "Club"],
    sets: 1, reps: { low: 60, high: 90, step: 10 }, unit: "seconds", side: "each side",
    timer: { type: "countdown", useTarget: true, perSide: true },
    how: [
      "Narrow half kneeling. Belt buckle up and squeeze your glutes, with no low-back arch.",
      "Drive the front knee forward while the front heel stays down.",
      "For more: raise your arms and lean toward the front foot.",
      "Do both stretches before switching sides.",
    ],
    cues: ["Belt buckle up.", "Squeeze your glutes.", "Front heel down.", "No low-back arch."],
    notes: ["Club for stability", "Move feet forward/back to find a balanced position"],
  },
  {
    id: "thrust", section: "front9", label: "9",
    name: "Deer in Headlights to Banded Thrust",
    figure: "thrust",
    equipment: ["Mini band", "Bench"],
    sets: 3, reps: { low: 15, high: 20 }, unit: "reps", rest: 45,
    how: [
      "First, lie on your back with hands under your glutes. Squeeze one side, then the other.",
      "Then put your upper back on the bench with the band around your thighs.",
      "Press your knees out against the band, keep your weight on your heels, and drive your hips up.",
      "Squeeze your glutes at the top and lower slowly. You should never feel it in your back.",
    ],
    cues: ["Knees wider than ankles.", "Weight on your heels.", "Squeeze at the top.", "Lower slowly."],
    notes: ["Feet outside shoulder width", "Knees wider than ankles"],
  },

  /* --------------------------- POWER --------------------------- */

  {
    id: "landing", section: "power", label: "1",
    name: "Landing Mechanics",
    figure: "landing",
    equipment: ["Open floor"],
    sets: 3, reps: { low: 5, high: 7 }, unit: "reps", rest: 60, check: true,
    how: [
      "Quarter squat with your arms back.",
      "Swing your arms forward and jump as high as you can.",
      "Land softly in the same spot you took off from.",
      "If you tuck your knees, don't snap them straight on landing.",
    ],
    cues: ["Land softly.", "Land on your spot.", "Don't snap the knees straight."],
    notes: ["Land on your spot"],
  },
  {
    id: "jump180", section: "power", label: "2",
    name: "180 Jump Soft Land",
    figure: "jump180",
    equipment: ["Crash pad or low box"],
    sets: 3, reps: { low: 5, high: 5 }, unit: "reps", side: "each way", rest: 60, check: true,
    how: [
      "Stand facing away from your target with your heels against the pad or box.",
      "Jump up and turn 180° in the air.",
      "Land softly. Do 5 turning to your backswing side and 5 to your downswing side.",
    ],
    cues: ["Turn in the air.", "Land soft.", "Five each way."],
    notes: [],
  },
  {
    id: "highpull", section: "power", label: "3",
    name: "High Pull Jump",
    figure: "highpull",
    equipment: ["Dowel or broomstick"],
    sets: 3, reps: { low: 5, high: 7 }, unit: "reps", rest: 60, check: true,
    how: [
      "Hold the dowel and hinge forward with your core tight and back flat.",
      "Jump up explosively and pull the dowel to your chin.",
      "Rest and repeat.",
    ],
    cues: ["Hinge, don't squat.", "High elbows.", "Narrow hands."],
    notes: ["Narrow hands", "Hinge at the hip, not a squat", "High elbows"],
  },
  {
    id: "cleanjump", section: "power", label: "4",
    name: "Weighted Clean Jump",
    figure: "cleanjump",
    equipment: ["Dumbbells"],
    sets: 3, reps: { low: 5, high: 7 }, unit: "reps", rest: 90, check: true,
    weight: { start: null, step: 5 }, autoWeight: false,
    how: [
      "Same movement as the High Pull Jump, with a dumbbell in each hand.",
      "Start light, about 10% of your body weight, and only what feels safe to jump with.",
    ],
    cues: ["Arms straight.", "No pulling up on heavy weights.", "Land soft."],
    notes: ["Arms straight, no bend", "No pulling up on heavy weights"],
  },

  /* ---------------------------- CORE ---------------------------- */

  {
    id: "deadbug", section: "core", label: "1",
    name: "Dead Bug Assisted",
    figure: "deadbug",
    equipment: ["Wall", "Mat"],
    sets: 2, reps: { low: 8, high: 8 }, unit: "reps", side: "each side", rest: 30, check: true,
    how: [
      "On your back with your knees stacked at 90° over your hips.",
      "Hands overhead, pressing into a wall.",
      "Kick one leg out without letting your low back leave the floor.",
      "Push your belly button down, like you're juicing a lime under your low back. Switch sides.",
    ],
    cues: ["Low back down.", "Press into the wall.", "Juice the lime."],
    notes: [],
  },
  {
    id: "curlup", section: "core", label: "2",
    name: "Curl-ups: Double to Single Holds",
    figure: "curlup",
    equipment: ["Mat"],
    dose: "Set 1: 12 reps, both legs straight. Sets 2–3: 6, then 4, then 2 holds on each leg.",
    timer: {
      type: "holds",
      options: [
        { label: "12 · both legs", reps: 12, hold: 4, pause: 3, bothLegs: true },
        { label: "6 each leg", reps: 6, hold: 10, pause: 4 },
        { label: "4 each leg", reps: 4, hold: 10, pause: 4 },
        { label: "2 each leg", reps: 2, hold: 10, pause: 4 },
      ],
    },
    how: [
      "Lie on a hard surface with your hands under the arch of your low back.",
      "Set 1: both legs straight. Chin to chest, lift your shoulders slightly, hold for a breath, lower slowly. Do 12, and hold the last one longer.",
      "Sets 2 and 3: one leg straight with toes up and quad tight, the other knee bent with foot flat.",
      "Hold each curl-up 8 to 10 seconds and pause 3 to 5 seconds between reps. The timer switches legs for you.",
    ],
    cues: ["Chin to chest.", "Lower slowly.", "Keep the quad tight."],
    notes: ["Keep quad engaged"],
  },
  {
    id: "leghold", section: "core", label: "3",
    name: "Straight Leg Hold",
    figure: "leghold",
    equipment: ["Mat"],
    dose: "Hold until your form breaks down",
    timer: { type: "stopwatch", record: true },
    how: [
      "Arms by your sides, back flat.",
      "Hold your legs up, as straight as you can keep them.",
      "Push your low back into the floor.",
      "Stop the clock when your form breaks. Stop if you feel any pain.",
    ],
    cues: ["Low back into the floor.", "Legs straight.", "Stop when form breaks."],
    notes: [],
  },
  {
    id: "situp", section: "core", label: "4",
    name: "Assisted Sit-up",
    figure: "situp",
    equipment: ["FMT or long band", "Wall anchor"],
    sets: 2, reps: { low: 10, high: 10 }, unit: "reps", rest: 30, check: true,
    how: [
      "Anchor the band on the wall and hold the other end.",
      "Keep your feet flat on the floor.",
      "Sit up, using the band only as much as you need.",
      "Keep at it until you can do them with good form without the band.",
    ],
    cues: ["Feet flat.", "Use the band only as needed.", "Smooth and slow."],
    notes: ["Band chest-high on the wall"],
  },

  /* -------------------------- STRENGTH -------------------------- */

  {
    id: "pulldown", section: "strength", label: "1",
    name: "Lat Pulldown",
    figure: "pulldown",
    equipment: ["Pulldown machine with pulley assist"],
    sets: 3, reps: { low: 6, high: 8 }, unit: "reps", rest: 90,
    weight: { start: 45, step: 5 },
    how: [
      "Sit under the machine with your hands outside shoulder width.",
      "Start with your arms fully straight.",
      "Pull your shoulder blades down and back, then pull the bar to your collarbone.",
      "Squeeze your back, then let your arms all the way back up. No swinging.",
    ],
    cues: ["Shoulders down and back first.", "Bar to your collarbone.", "Bend the bar like Superman.", "No swinging."],
    notes: ["Pulley assist", "Bend the bar, like Superman"],
    benchmark: "Assessment: 90 lb × 8",
  },
  {
    id: "lunge", section: "strength", label: "2",
    name: "Lunge Transition Front to Back",
    figure: "lunge",
    equipment: ["Light dumbbells"],
    sets: 3, reps: { low: 6, high: 8 }, unit: "reps", side: "each side", rest: 90, check: true,
    weight: { start: 8, step: 2 },
    how: [
      "Hold a dumbbell in each hand. Take a big step back with your right foot and sink into the lunge.",
      "Without stopping in the middle, take a big step forward with the same foot.",
      "Your left foot stays in place the whole time. That's 1 rep.",
      "Keep your steps large and low. Stop if anything hurts.",
    ],
    cues: ["Big step, stay low.", "Don't stop in the middle.", "Adjust your foot if the knee complains."],
    notes: ["Adjust foot position for knee pain if necessary"],
  },
  {
    id: "row", section: "strength", label: "3",
    name: "Single Arm Bent Over Row",
    figure: "row",
    equipment: ["Dumbbell", "Bench"],
    sets: 3, reps: { low: 6, high: 8 }, unit: "reps", side: "each arm", rest: 90, check: true,
    weight: { start: 35, step: 5 },
    how: [
      "Right knee and right hand on the bench, left foot on the floor.",
      "The dumbbell hangs straight down from your left hand. Keep your core tight.",
      "Pull it toward your hip with the elbow close, and squeeze your shoulder blade.",
      "Lower slowly. Then switch arms.",
    ],
    cues: ["Elbow close.", "Squeeze the shoulder blade.", "Lower slowly."],
    notes: [],
  },
  {
    id: "rotator", section: "strength", label: "4",
    name: "Band External Rotation",
    figure: "rotator",
    equipment: ["Light band", "Small towel"],
    sets: 2, reps: { low: 12, high: 15 }, unit: "reps", side: "each arm", rest: 45, check: true, added: true,
    how: [
      "Anchor a light band at elbow height beside you.",
      "Hold it in the hand farther from the anchor, elbow bent at 90°, with a rolled towel between your elbow and your side.",
      "Keep the elbow pinned and rotate your forearm out, away from your body.",
      "Pause, return slowly, then turn around for the other arm.",
    ],
    cues: ["Elbow pinned to your side.", "Rotate out slowly.", "Keep the towel squeezed."],
    notes: [],
  },
];
