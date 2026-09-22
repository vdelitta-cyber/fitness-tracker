// Ingebouwde oefeningen database. Categorie (en voor legs: focus) bepaalt bij
// welk trainingstype een oefening in de zoekresultaten verschijnt (zie TRAINING_TYPES).

const EXERCISES = [
  // CHEST (25)
  { id: 'chest_barbell_bench_press', name: 'Barbell Bench Press', category: 'chest' },
  { id: 'chest_incline_bench_press', name: 'Incline Bench Press', category: 'chest' },
  { id: 'chest_dumbbell_bench_press', name: 'Dumbbell Bench Press', category: 'chest' },
  { id: 'chest_machine_chest_press', name: 'Machine Chest Press', category: 'chest' },
  { id: 'chest_pec_fly', name: 'Pec Fly', category: 'chest' },
  { id: 'chest_cable_fly', name: 'Cable Fly', category: 'chest' },
  { id: 'chest_incline_dumbbell_press', name: 'Incline Dumbbell Press', category: 'chest' },
  { id: 'chest_decline_bench_press', name: 'Decline Bench Press', category: 'chest' },
  { id: 'chest_chest_press_machine', name: 'Chest Press Machine', category: 'chest' },
  { id: 'chest_push_ups', name: 'Push Ups', category: 'chest' },
  { id: 'chest_dumbbell_flyes', name: 'Dumbbell Flyes', category: 'chest' },
  { id: 'chest_smith_machine_bench', name: 'Smith Machine Bench', category: 'chest' },
  { id: 'chest_hammer_strength_press', name: 'Hammer Strength Press', category: 'chest' },
  { id: 'chest_plate_loaded_chest_press', name: 'Plate Loaded Chest Press', category: 'chest' },
  { id: 'chest_close_grip_bench_press', name: 'Close Grip Bench Press', category: 'chest' },
  { id: 'chest_incline_cable_fly', name: 'Incline Cable Fly', category: 'chest' },
  { id: 'chest_decline_dumbbell_press', name: 'Decline Dumbbell Press', category: 'chest' },
  { id: 'chest_diamond_push_ups', name: 'Diamond Push Ups', category: 'chest' },
  { id: 'chest_dips_chest_focus', name: 'Dips (Chest Focus)', category: 'chest' },
  { id: 'chest_landmine_press', name: 'Landmine Press', category: 'chest' },
  { id: 'chest_floor_press', name: 'Floor Press', category: 'chest' },
  { id: 'chest_svend_press', name: 'Svend Press', category: 'chest' },
  { id: 'chest_pullover', name: 'Dumbbell Pullover', category: 'chest' },
  { id: 'chest_single_arm_cable_fly', name: 'Single Arm Cable Fly', category: 'chest' },
  { id: 'chest_incline_smith_machine_press', name: 'Incline Smith Machine Press', category: 'chest' },

  // BACK (25)
  { id: 'back_lat_pulldown', name: 'Lat Pulldown', category: 'back' },
  { id: 'back_seated_row', name: 'Seated Row', category: 'back' },
  { id: 'back_barbell_row', name: 'Barbell Row', category: 'back' },
  { id: 'back_chest_supported_row', name: 'Chest Supported Row', category: 'back' },
  { id: 'back_pull_ups', name: 'Pull Ups', category: 'back' },
  { id: 'back_assisted_pull_ups', name: 'Assisted Pull Ups', category: 'back' },
  { id: 'back_t_bar_row', name: 'T-Bar Row', category: 'back' },
  { id: 'back_machine_row', name: 'Machine Row', category: 'back' },
  { id: 'back_pendulum_row', name: 'Pendulum Row', category: 'back' },
  { id: 'back_rack_pulls', name: 'Rack Pulls', category: 'back' },
  { id: 'back_barbell_deadlift', name: 'Barbell Deadlift', category: 'back' },
  { id: 'back_romanian_deadlift', name: 'Romanian Deadlift', category: 'back' },
  { id: 'back_single_arm_lat_pulldown', name: 'Single Arm Lat Pulldown', category: 'back' },
  { id: 'back_cable_row', name: 'Cable Row', category: 'back' },
  { id: 'back_inverted_rows', name: 'Inverted Rows', category: 'back' },
  { id: 'back_wide_grip_lat_pulldown', name: 'Wide Grip Lat Pulldown', category: 'back' },
  { id: 'back_close_grip_lat_pulldown', name: 'Close Grip Lat Pulldown', category: 'back' },
  { id: 'back_straight_arm_pulldown', name: 'Straight Arm Pulldown', category: 'back' },
  { id: 'back_single_arm_dumbbell_row', name: 'Single Arm Dumbbell Row', category: 'back' },
  { id: 'back_meadows_row', name: 'Meadows Row', category: 'back' },
  { id: 'back_reverse_grip_barbell_row', name: 'Reverse Grip Barbell Row', category: 'back' },
  { id: 'back_hyperextensions', name: 'Hyperextensions', category: 'back' },
  { id: 'back_good_mornings', name: 'Good Mornings', category: 'back' },
  { id: 'back_face_pulls', name: 'Face Pulls (Back Focus)', category: 'back' },
  { id: 'back_kroc_rows', name: 'Kroc Rows', category: 'back' },

  // LEGS (25) — focus onderscheidt Legs (quad) van Lower (glute/hamstring)
  { id: 'legs_hack_squat', name: 'Hack Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_leg_press', name: 'Leg Press', category: 'legs', focus: 'quad' },
  { id: 'legs_leg_extension', name: 'Leg Extension', category: 'legs', focus: 'quad' },
  { id: 'legs_leg_curl', name: 'Leg Curl', category: 'legs', focus: 'glute' },
  { id: 'legs_barbell_squat', name: 'Barbell Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_dumbbell_lunges', name: 'Dumbbell Lunges', category: 'legs', focus: 'glute' },
  { id: 'legs_leg_extension_machine', name: 'Leg Extension Machine', category: 'legs', focus: 'quad' },
  { id: 'legs_lying_leg_curl', name: 'Lying Leg Curl', category: 'legs', focus: 'glute' },
  { id: 'legs_smith_machine_squat', name: 'Smith Machine Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_bulgarian_split_squat', name: 'Bulgarian Split Squat', category: 'legs', focus: 'glute' },
  { id: 'legs_pendulum_squat', name: 'Pendulum Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_v_squat', name: 'V-Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_calf_raises', name: 'Calf Raises', category: 'legs', focus: 'quad' },
  { id: 'legs_hip_thrust', name: 'Hip Thrust', category: 'legs', focus: 'glute' },
  { id: 'legs_seated_leg_curl', name: 'Seated Leg Curl', category: 'legs', focus: 'glute' },
  { id: 'legs_front_squat', name: 'Front Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_walking_lunges', name: 'Walking Lunges', category: 'legs', focus: 'glute' },
  { id: 'legs_goblet_squat', name: 'Goblet Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_standing_calf_raise', name: 'Standing Calf Raise', category: 'legs', focus: 'quad' },
  { id: 'legs_seated_calf_raise', name: 'Seated Calf Raise', category: 'legs', focus: 'quad' },
  { id: 'legs_glute_bridge', name: 'Glute Bridge', category: 'legs', focus: 'glute' },
  { id: 'legs_step_ups', name: 'Step Ups', category: 'legs', focus: 'glute' },
  { id: 'legs_sissy_squat', name: 'Sissy Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_belt_squat', name: 'Belt Squat', category: 'legs', focus: 'quad' },
  { id: 'legs_nordic_curl', name: 'Nordic Curl', category: 'legs', focus: 'glute' },

  // SHOULDERS (25)
  { id: 'shoulders_military_press', name: 'Military Press', category: 'shoulders' },
  { id: 'shoulders_lateral_raises', name: 'Lateral Raises', category: 'shoulders' },
  { id: 'shoulders_front_raises', name: 'Front Raises', category: 'shoulders' },
  { id: 'shoulders_machine_shoulder_press', name: 'Machine Shoulder Press', category: 'shoulders' },
  { id: 'shoulders_dumbbell_shoulder_press', name: 'Dumbbell Shoulder Press', category: 'shoulders' },
  { id: 'shoulders_pike_push_ups', name: 'Pike Push Ups', category: 'shoulders' },
  { id: 'shoulders_plate_loaded_shoulder_press', name: 'Plate Loaded Shoulder Press', category: 'shoulders' },
  { id: 'shoulders_shoulder_press_machine', name: 'Shoulder Press Machine', category: 'shoulders' },
  { id: 'shoulders_upright_rows', name: 'Upright Rows', category: 'shoulders' },
  { id: 'shoulders_cable_lateral_raises', name: 'Cable Lateral Raises', category: 'shoulders' },
  { id: 'shoulders_arnold_press', name: 'Arnold Press', category: 'shoulders' },
  { id: 'shoulders_seated_dumbbell_press', name: 'Seated Dumbbell Press', category: 'shoulders' },
  { id: 'shoulders_smith_machine_shoulder_press', name: 'Smith Machine Shoulder Press', category: 'shoulders' },
  { id: 'shoulders_cable_front_raise', name: 'Cable Front Raise', category: 'shoulders' },
  { id: 'shoulders_reverse_pec_deck', name: 'Reverse Pec Deck', category: 'shoulders' },
  { id: 'shoulders_bent_over_rear_delt_raise', name: 'Bent Over Rear Delt Raise', category: 'shoulders' },
  { id: 'shoulders_face_pulls', name: 'Face Pulls', category: 'shoulders' },
  { id: 'shoulders_cable_rear_delt_fly', name: 'Cable Rear Delt Fly', category: 'shoulders' },
  { id: 'shoulders_landmine_lateral_raise', name: 'Landmine Lateral Raise', category: 'shoulders' },
  { id: 'shoulders_behind_the_neck_press', name: 'Behind The Neck Press', category: 'shoulders' },
  { id: 'shoulders_single_arm_dumbbell_press', name: 'Single Arm Dumbbell Press', category: 'shoulders' },
  { id: 'shoulders_dumbbell_shrugs', name: 'Dumbbell Shrugs', category: 'shoulders' },
  { id: 'shoulders_barbell_shrugs', name: 'Barbell Shrugs', category: 'shoulders' },
  { id: 'shoulders_egyptian_lateral_raise', name: 'Egyptian Lateral Raise', category: 'shoulders' },
  { id: 'shoulders_y_raises', name: 'Y-Raises', category: 'shoulders' },

  // ARMS - BICEPS (14)
  { id: 'biceps_barbell_curls', name: 'Barbell Curls', category: 'biceps' },
  { id: 'biceps_dumbbell_curls', name: 'Dumbbell Curls', category: 'biceps' },
  { id: 'biceps_preacher_curls', name: 'Preacher Curls', category: 'biceps' },
  { id: 'biceps_cable_curls', name: 'Cable Curls', category: 'biceps' },
  { id: 'biceps_hammer_curls', name: 'Hammer Curls', category: 'biceps' },
  { id: 'biceps_ez_bar_curls', name: 'EZ Bar Curls', category: 'biceps' },
  { id: 'biceps_concentration_curls', name: 'Concentration Curls', category: 'biceps' },
  { id: 'biceps_incline_dumbbell_curls', name: 'Incline Dumbbell Curls', category: 'biceps' },
  { id: 'biceps_spider_curls', name: 'Spider Curls', category: 'biceps' },
  { id: 'biceps_cable_hammer_curls', name: 'Cable Hammer Curls', category: 'biceps' },
  { id: 'biceps_reverse_curls', name: 'Reverse Curls', category: 'biceps' },
  { id: 'biceps_21s', name: '21s Bicep Curls', category: 'biceps' },
  { id: 'biceps_zottman_curls', name: 'Zottman Curls', category: 'biceps' },
  { id: 'biceps_cross_body_hammer_curls', name: 'Cross Body Hammer Curls', category: 'biceps' },

  // ARMS - TRICEPS (11)
  { id: 'triceps_tricep_dips', name: 'Tricep Dips', category: 'triceps' },
  { id: 'triceps_rope_extensions', name: 'Tricep Rope Extensions', category: 'triceps' },
  { id: 'triceps_pushdowns', name: 'Tricep Pushdowns', category: 'triceps' },
  { id: 'triceps_overhead_extensions', name: 'Overhead Tricep Extensions', category: 'triceps' },
  { id: 'triceps_machine', name: 'Tricep Machine', category: 'triceps' },
  { id: 'triceps_skull_crushers', name: 'Skull Crushers', category: 'triceps' },
  { id: 'triceps_dips_machine', name: 'Dips Machine', category: 'triceps' },
  { id: 'triceps_single_arm_pushdown', name: 'Single Arm Tricep Pushdown', category: 'triceps' },
  { id: 'triceps_bench_dips', name: 'Bench Dips', category: 'triceps' },
  { id: 'triceps_jm_press', name: 'JM Press', category: 'triceps' },
  { id: 'triceps_kickbacks', name: 'Tricep Kickbacks', category: 'triceps' },
];

// Trainingstypes: key -> { label, categories (spiergroepen die de zoekresultaten filteren), legFocus }
// legFocus onderscheidt Legs (quad-dominant) van Lower (glute/hamstring-dominant) binnen de 'legs' categorie.
const TRAINING_TYPES = {
  push:  { label: 'Push',  categories: ['chest', 'shoulders', 'triceps'] },
  pull:  { label: 'Pull',  categories: ['back', 'biceps'] },
  legs:  { label: 'Legs (Quad)', categories: ['legs'], legFocus: 'quad' },
  upper: { label: 'Upper', categories: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
  lower: { label: 'Lower (Glute/Hamstring)', categories: ['legs'], legFocus: 'glute' },
};

const TRAINING_TYPE_ORDER = ['push', 'pull', 'legs', 'upper', 'lower'];

// Alleen voor de "deze week" grafiek-labels (echte kalenderdagen, los van trainingstype)
const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAY_SHORT = { monday: 'Ma', tuesday: 'Di', wednesday: 'Wo', thursday: 'Do', friday: 'Vr', saturday: 'Za', sunday: 'Zo' };

// Lokale datum als YYYY-MM-DD (voorkomt UTC-dagwissel 's avonds)
function getLocalDateStr(d = new Date()) {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

const CATEGORY_LABELS = {
  chest: 'Chest', back: 'Back', legs: 'Legs', shoulders: 'Shoulders',
  biceps: 'Biceps', triceps: 'Triceps',
};

// Gevalideerde categorische palette (dataviz skill: adjacent CVD/normal-vision/contrast — alle PASS, dark mode)
const CATEGORY_COLORS = {
  chest: '#3987e5', back: '#d95926', legs: '#199e70',
  shoulders: '#c98500', biceps: '#d55181', triceps: '#9085e9',
};
