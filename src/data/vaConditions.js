/**
 * VA Disability Conditions Database
 * Diagnostic codes, rating criteria, and secondary condition mappings.
 * Source: 38 CFR Part 4 — Schedule for Rating Disabilities
 */

export const CONDITIONS = [
  // Musculoskeletal
  {
    id: "5003", code: "5003", name: "Degenerative Arthritis",
    category: "Musculoskeletal", bodySystem: "Joints",
    ratings: [10, 20],
    criteria: "Rated on limitation of motion of affected joint. 10% for X-ray evidence with painful motion. 20% for two or more major/minor joint groups with occasional incapacitating episodes.",
    commonSecondary: ["5260", "5261", "5257", "8520"],
    cpTips: "Describe pain with motion, flare-ups, and functional impact. Note morning stiffness duration and activities you can no longer do.",
  },
  {
    id: "5237", code: "5237", name: "Lumbosacral Strain",
    category: "Musculoskeletal", bodySystem: "Spine",
    ratings: [10, 20, 40, 50, 100],
    criteria: "10%: forward flexion >60° but <85°. 20%: >30° but <60°. 40%: 30° or less. 50%: unfavorable ankylosis of entire thoracolumbar. 100%: unfavorable ankylosis of entire spine.",
    commonSecondary: ["5243", "8520", "8521", "7913"],
    cpTips: "Report range of motion limitations, especially forward flexion. Describe flare-ups (frequency, severity, duration). Mention radiculopathy symptoms (numbness, tingling down legs).",
  },
  {
    id: "5242", code: "5242", name: "Degenerative Disc Disease (Cervical)",
    category: "Musculoskeletal", bodySystem: "Spine",
    ratings: [10, 20, 30, 40, 100],
    criteria: "10%: forward flexion >30° but <40°. 20%: >15° but <30°. 30%: 15° or less. 40%: unfavorable ankylosis of entire cervical spine. 100%: unfavorable ankylosis of entire spine.",
    commonSecondary: ["8510", "8515", "5201"],
    cpTips: "Describe neck pain, limited head turning, headaches from cervical issues. Note any radiating pain or numbness into arms/hands.",
  },
  {
    id: "5243", code: "5243", name: "Intervertebral Disc Syndrome (IVDS)",
    category: "Musculoskeletal", bodySystem: "Spine",
    ratings: [10, 20, 40, 60],
    criteria: "Based on incapacitating episodes: 10%: at least 1 week in past 12 months. 20%: at least 2 weeks. 40%: at least 4 weeks. 60%: at least 6 weeks. An incapacitating episode requires bed rest prescribed by a physician.",
    commonSecondary: ["8520", "5237", "9434"],
    cpTips: "Track and report every incapacitating episode with dates. Get physician documentation for prescribed bed rest. Describe functional impact during episodes.",
  },
  {
    id: "5260", code: "5260", name: "Limitation of Flexion (Knee)",
    category: "Musculoskeletal", bodySystem: "Knee",
    ratings: [0, 10, 20, 30],
    criteria: "0%: flexion limited to 60°. 10%: limited to 45°. 20%: limited to 30°. 30%: limited to 15°.",
    commonSecondary: ["5261", "5257", "5003"],
    cpTips: "Describe inability to fully bend knee, difficulty with stairs, squatting, kneeling. Report flare-ups and how they further limit flexion.",
  },
  {
    id: "5261", code: "5261", name: "Limitation of Extension (Knee)",
    category: "Musculoskeletal", bodySystem: "Knee",
    ratings: [0, 10, 20, 30, 40, 50],
    criteria: "0%: extension limited to 5°. 10%: limited to 10°. 20%: limited to 15°. 30%: limited to 20°. 40%: limited to 30°. 50%: limited to 45°.",
    commonSecondary: ["5260", "5257", "5003"],
    cpTips: "Note inability to fully straighten the knee. Describe impact on walking, standing, and daily activities.",
  },
  {
    id: "5257", code: "5257", name: "Knee Instability (Recurrent Subluxation)",
    category: "Musculoskeletal", bodySystem: "Knee",
    ratings: [10, 20, 30],
    criteria: "10%: slight instability. 20%: moderate instability. 30%: severe instability.",
    commonSecondary: ["5260", "5261", "5003"],
    cpTips: "Describe episodes of knee giving way, using a brace, and how instability affects walking and standing. Report falls caused by knee instability.",
  },
  {
    id: "5201", code: "5201", name: "Limitation of Arm Motion",
    category: "Musculoskeletal", bodySystem: "Shoulder",
    ratings: [20, 30, 40],
    criteria: "20%: arm limited to shoulder level. 30%: midway between side and shoulder (dominant). 40%: limited to 25° from side (dominant).",
    commonSecondary: ["5003", "5200"],
    cpTips: "Demonstrate how high you can raise your arm. Describe impact on reaching overhead, dressing, grooming. Note dominant vs non-dominant arm.",
  },
  // Mental Health
  {
    id: "9411", code: "9411", name: "PTSD (Post-Traumatic Stress Disorder)",
    category: "Mental Health", bodySystem: "Psychiatric",
    ratings: [0, 10, 30, 50, 70, 100],
    criteria: "0%: diagnosed but symptoms controlled. 10%: mild, controlled by medication. 30%: occupational/social impairment with occasional decrease. 50%: difficulty establishing relationships, reduced reliability. 70%: deficiencies in most areas. 100%: total occupational/social impairment.",
    commonSecondary: ["9434", "7913", "5237", "7101", "8100"],
    cpTips: "Be honest about symptoms: sleep disturbance, hypervigilance, avoidance, nightmares. Describe impact on work and relationships. Mention any hospitalizations or crisis episodes.",
  },
  {
    id: "9434", code: "9434", name: "Major Depressive Disorder",
    category: "Mental Health", bodySystem: "Psychiatric",
    ratings: [0, 10, 30, 50, 70, 100],
    criteria: "Rated using the same General Rating Formula for Mental Disorders as PTSD. Based on occupational and social impairment level.",
    commonSecondary: ["9411", "8100", "7101"],
    cpTips: "Describe impact on daily functioning, motivation, concentration. Report sleep changes, appetite changes, social withdrawal. Be specific about worst days.",
  },
  {
    id: "9400", code: "9400", name: "Generalized Anxiety Disorder",
    category: "Mental Health", bodySystem: "Psychiatric",
    ratings: [0, 10, 30, 50, 70, 100],
    criteria: "Rated using the same General Rating Formula for Mental Disorders. Based on occupational and social impairment level.",
    commonSecondary: ["9411", "9434", "8100"],
    cpTips: "Describe frequency and severity of anxiety episodes, panic attacks, avoidance behaviors. Report impact on concentration and decision-making at work.",
  },
  // Neurological
  {
    id: "8520", code: "8520", name: "Sciatic Nerve (Radiculopathy)",
    category: "Neurological", bodySystem: "Peripheral Nerves",
    ratings: [10, 20, 40, 60, 80],
    criteria: "10%: mild incomplete paralysis. 20%: moderate. 40%: moderately severe. 60%: severe with marked muscular atrophy. 80%: complete paralysis.",
    commonSecondary: ["5237", "5243"],
    cpTips: "Describe numbness, tingling, burning pain down the leg. Note which leg and how far down symptoms radiate. Report impact on walking and standing.",
  },
  {
    id: "8515", code: "8515", name: "Median Nerve (Carpal Tunnel)",
    category: "Neurological", bodySystem: "Peripheral Nerves",
    ratings: [10, 30, 50, 70],
    criteria: "10%: mild incomplete paralysis. 30%: moderate (dominant). 50%: severe (dominant). 70%: complete paralysis (dominant).",
    commonSecondary: ["5003", "5242"],
    cpTips: "Describe numbness, tingling, weakness in hands. Report difficulty gripping, dropping objects. Note if it affects your dominant hand.",
  },
  {
    id: "8100", code: "8100", name: "Migraine Headaches",
    category: "Neurological", bodySystem: "Central Nervous System",
    ratings: [0, 10, 30, 50],
    criteria: "0%: less frequent attacks. 10%: characteristic prostrating attacks averaging one in 2 months. 30%: characteristic prostrating attacks once a month. 50%: very frequent completely prostrating and prolonged attacks productive of severe economic inadaptability.",
    commonSecondary: ["9411", "9434", "5242"],
    cpTips: "Keep a headache diary with dates, duration, severity. Report prostrating attacks that require lying down in a dark room. Note missed work days.",
  },
  // Respiratory
  {
    id: "6602", code: "6602", name: "Asthma (Bronchial)",
    category: "Respiratory", bodySystem: "Respiratory",
    ratings: [10, 30, 60, 100],
    criteria: "Based on FEV-1, FEV-1/FVC ratio, or frequency of physician visits/courses of systemic corticosteroids. 10%: FEV-1 71-80%. 30%: FEV-1 56-70%. 60%: FEV-1 40-55%. 100%: FEV-1 less than 40%.",
    commonSecondary: ["6600", "9434"],
    cpTips: "Bring PFT (pulmonary function test) results. Report frequency of inhaler use, ER visits, steroid courses. Describe activity limitations.",
  },
  {
    id: "6604", code: "6604", name: "Chronic Obstructive Pulmonary Disease (COPD)",
    category: "Respiratory", bodySystem: "Respiratory",
    ratings: [10, 30, 60, 100],
    criteria: "Based on PFT results similar to asthma criteria. Higher ratings for worse lung function and oxygen dependence.",
    commonSecondary: ["6602", "7101"],
    cpTips: "Ensure PFTs are current. Report supplemental oxygen use, exercise limitations, and impact on daily activities.",
  },
  // Cardiovascular
  {
    id: "7101", code: "7101", name: "Hypertension",
    category: "Cardiovascular", bodySystem: "Heart",
    ratings: [10, 20, 40, 60],
    criteria: "10%: diastolic predominantly 100+ or systolic predominantly 160+, or requires continuous medication. 20%: diastolic predominantly 110+. 40%: diastolic predominantly 120+. 60%: diastolic predominantly 130+.",
    commonSecondary: ["7005", "9411"],
    cpTips: "Track blood pressure readings daily. Report all medications and dosages. Note any side effects from medications.",
  },
  // Endocrine
  {
    id: "7913", code: "7913", name: "Diabetes Mellitus Type II",
    category: "Endocrine", bodySystem: "Endocrine",
    ratings: [10, 20, 40, 60, 100],
    criteria: "10%: manageable by diet only. 20%: requires insulin or oral hypoglycemic agent and restricted diet. 40%: requires insulin, restricted diet, and regulation of activities. 60%: also requires 1-2 hospitalizations/year or twice-monthly diabetic care visits. 100%: requires more than one daily insulin injection and more.",
    commonSecondary: ["8520", "7101", "6066"],
    cpTips: "Document all medications, dietary restrictions, and activity limitations. Report any diabetic complications (neuropathy, retinopathy, nephropathy).",
  },
  // Tinnitus / Hearing
  {
    id: "6260", code: "6260", name: "Tinnitus",
    category: "Auditory", bodySystem: "Ear",
    ratings: [10],
    criteria: "10%: recurrent tinnitus. This is the maximum schedular rating for tinnitus.",
    commonSecondary: ["6100", "9411", "8100"],
    cpTips: "Describe the ringing/buzzing — constant or intermittent? How it affects sleep and concentration. Link to noise exposure in service.",
  },
  {
    id: "6100", code: "6100", name: "Hearing Loss",
    category: "Auditory", bodySystem: "Ear",
    ratings: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    criteria: "Rated using Tables VI, VIA, and VII based on puretone audiometry and speech recognition scores. Rating depends on specific decibel levels at 1000-4000 Hz.",
    commonSecondary: ["6260", "9411"],
    cpTips: "Get a current audiogram. Describe difficulty hearing conversations, TV volume needs, impact on work communication.",
  },
  // Sleep
  {
    id: "6847", code: "6847", name: "Sleep Apnea (Obstructive)",
    category: "Respiratory", bodySystem: "Respiratory",
    ratings: [0, 30, 50, 100],
    criteria: "0%: asymptomatic with documented disorder. 30%: persistent daytime hypersomnolence. 50%: requires use of CPAP. 100%: chronic respiratory failure with carbon dioxide retention, requires tracheostomy.",
    commonSecondary: ["9411", "9434", "7101"],
    cpTips: "Bring your sleep study results. Document CPAP use (compliance data). Describe daytime fatigue impact on work and driving.",
  },
  // Skin
  {
    id: "7806", code: "7806", name: "Dermatitis / Eczema",
    category: "Skin", bodySystem: "Skin",
    ratings: [0, 10, 30, 60],
    criteria: "0%: less than 5% of body or exposed areas. 10%: 5-20% of body or requiring intermittent systemic therapy. 30%: 20-40% of body or requiring systemic therapy. 60%: more than 40% of body or constant systemic therapy.",
    commonSecondary: ["9411"],
    cpTips: "Photograph affected areas during flare-ups. Report percentage of body affected. Document all medications including topical steroids.",
  },
  // GERD
  {
    id: "7346", code: "7346", name: "GERD / Hiatal Hernia",
    category: "Digestive", bodySystem: "Digestive",
    ratings: [10, 30, 60],
    criteria: "10%: two or more symptoms of less severity. 30%: persistently recurrent epigastric distress with dysphagia, pyrosis, regurgitation, accompanied by substernal/arm/shoulder pain. 60%: symptoms of pain, vomiting, material weight loss, hematemesis or melena with moderate anemia, or other symptom combinations productive of severe impairment of health.",
    commonSecondary: ["9411", "7913"],
    cpTips: "Describe frequency of heartburn, regurgitation, difficulty swallowing. Report weight changes and impact on eating/sleeping.",
  },
  // Flat Feet
  {
    id: "5276", code: "5276", name: "Flatfoot (Pes Planus)",
    category: "Musculoskeletal", bodySystem: "Foot",
    ratings: [0, 10, 30, 50],
    criteria: "0%: mild, relieved by arch support. 10%: moderate, weight-bearing line over or medial to great toe. 30%: severe bilateral. 50%: pronounced bilateral with marked pronation and extreme tenderness.",
    commonSecondary: ["5284", "5003", "5237"],
    cpTips: "Describe foot pain with prolonged standing/walking. Report use of orthotics. Note how it affects your gait and causes secondary issues (knee, hip, back pain).",
  },
];

export const CATEGORIES = [
  "Musculoskeletal", "Mental Health", "Neurological", "Respiratory",
  "Cardiovascular", "Endocrine", "Auditory", "Skin", "Digestive",
];

/**
 * Calculate combined VA disability rating using "whole person" method.
 * @param {number[]} ratings - Array of individual disability percentages
 * @param {boolean} hasBilateral - Whether bilateral factor applies
 * @returns {{ combined: number, rounded: number, exact: number }}
 */
export function calculateCombinedRating(ratings, hasBilateral = false) {
  if (!ratings.length) return { combined: 0, rounded: 0, exact: 0 };

  // Sort highest to lowest
  const sorted = [...ratings].sort((a, b) => b - a);

  let remaining = 100;
  const steps = [];

  for (const rating of sorted) {
    const contribution = Math.round(remaining * (rating / 100));
    steps.push({ rating, remaining, contribution });
    remaining -= contribution;
  }

  let exact = 100 - remaining;

  // Apply bilateral factor if applicable
  if (hasBilateral) {
    exact = exact + (exact * 0.1);
    if (exact > 100) exact = 100;
  }

  const rounded = Math.round(exact / 10) * 10;

  return { combined: rounded, rounded, exact: Math.round(exact * 100) / 100, steps };
}

/**
 * Monthly compensation rates (2026 approximate, veteran alone)
 */
export const COMPENSATION_RATES = {
  0: 0, 10: 175.51, 20: 347.83, 30: 538.78, 40: 776.28,
  50: 1104.19, 60: 1397.52, 70: 1762.07, 80: 2048.67,
  90: 2302.41, 100: 3832.89,
};

/**
 * Dependent additions (per month, approximate 2026)
 */
export const DEPENDENT_ADDITIONS = {
  30: { spouse: 59, child: 28, parent: 44 },
  40: { spouse: 78, child: 37, parent: 59 },
  50: { spouse: 98, child: 47, parent: 74 },
  60: { spouse: 118, child: 56, parent: 89 },
  70: { spouse: 137, child: 66, parent: 103 },
  80: { spouse: 157, child: 75, parent: 118 },
  90: { spouse: 177, child: 84, parent: 133 },
  100: { spouse: 196, child: 94, parent: 148 },
};

/**
 * PACT Act presumptive conditions
 */
export const PACT_ACT = {
  burnPits: {
    label: "Burn Pit / Airborne Hazards (Post-9/11)",
    serviceLocations: ["Southwest Asia", "Afghanistan", "Syria", "Jordan", "Egypt", "Lebanon", "Yemen", "Uzbekistan"],
    conditions: [
      "Bladder cancer", "Head cancer (any type)", "Body cancer (any type)",
      "Lymphatic cancer (any type)", "Kidney cancer", "Lymphomatic cancer",
      "Melanoma", "Mesothelioma", "Pancreatic cancer",
      "Reproductive cancers", "Respiratory cancers",
      "Chronic sinusitis", "Chronic rhinitis", "Chronic laryngitis",
      "Glioblastoma", "Constrictive bronchiolitis", "Constrictive pericarditis",
      "Chronic obstructive pulmonary disease (COPD)",
    ],
  },
  agentOrange: {
    label: "Agent Orange (Vietnam Era)",
    serviceLocations: ["Vietnam", "Thailand (select bases)", "Korean DMZ (1968-1971)", "Test/storage locations"],
    conditions: [
      "AL Amyloidosis", "Bladder cancer", "Chronic B-cell leukemias",
      "Chloracne", "Diabetes mellitus type 2", "Hodgkin's disease",
      "Hypertension", "Ischemic heart disease", "Multiple myeloma",
      "Non-Hodgkin's lymphoma", "Parkinsonism", "Parkinson's disease",
      "Peripheral neuropathy (early onset)", "Porphyria cutanea tarda",
      "Prostate cancer", "Respiratory cancers", "Soft tissue sarcomas",
    ],
  },
  gulfWar: {
    label: "Gulf War Illness",
    serviceLocations: ["Southwest Asia (1990-present)", "Afghanistan"],
    conditions: [
      "Chronic fatigue syndrome", "Fibromyalgia",
      "Functional gastrointestinal disorders (IBS)",
      "Undiagnosed chronic multi-symptom illness",
    ],
  },
};
