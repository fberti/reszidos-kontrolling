// Adatok: „Részidős jelentkezők – diasor_final.pptx” beágyazott diagramjaiból és szövegeiből.
// Forrás: felvi.hu statisztikai export, 2013–2026, általános eljárás, első helyes jelentkezők.
// Részidős = levelező + távoktatás.
window.DATA = {
  years: [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],

  // 3. dia: összes részidős első helyes jelentkező (kulcsszámok)
  headline: {
    total2022: 29728, total2023: 48439, total2026: 57437,
    share2022: 0.30, share2023: 0.38, share2026: 0.41
  },

  // 4. dia (chart1): részidős alapképzés, első helyes jelentkezők (fő)
  alap: [14207, 17294, 16777, 19915, 20516, 21281, 22451, 13493, 18083, 16078, 32312, 31961, 33772, 36799],

  // 5. dia (chart2): index, 2019 = 100, részidős
  index: [
    { key: "alap", name: "Alapképzés", values: [63, 77, 75, 89, 91, 95, 100, 60, 81, 72, 144, 142, 150, 164] },
    { key: "mester", name: "Mesterképzés", values: [84, 102, 100, 108, 98, 103, 100, 91, 117, 107, 135, 167, 176, 198] },
    { key: "osztatlan", name: "Osztatlan", values: [62, 79, 74, 90, 117, 113, 100, 104, 120, 101, 117, 113, 112, 145] },
    { key: "foszk", name: "FOSZK", values: [50, 86, 97, 132, 88, 95, 100, 105, 148, 146, 135, 103, 77, 64] }
  ],

  // 6. dia (chart3): alapképzés, változás az előző évhez képest
  nappaliVsReszido: [
    { label: "2019 → 2020", sub: "bevezetés", reszido: -0.39900227161373703, nappali: -0.19031620918169601 },
    { label: "2022 → 2023", sub: "eltörlés", reszido: 1.0097026993407101, nappali: 0.1762934051715 }
  ],

  // 7. dia: különbségek különbsége
  did: { ban: -0.290, after: -0.066, missing: 19400, perYear: 6500, nappaliBan: -0.09, triple: -0.216 },

  // 8. dia (chart4): eseményelemzés, (alap/mester) az évben ÷ (alap/mester) 2019-ben − 1
  event: [-0.24619095601319901, -0.24401383177425101, -0.25592606523886602, -0.17567440960852099,
    -0.068220998352694504, -0.075942141231830698, 0, -0.33887178077212599, -0.30901260758162902,
    -0.32760098349494399, 0.067206934071102106, -0.14630266161883501, -0.14464199651117499, -0.172675572163284],

  // 9. dia (chart5): 280 pont alatti ponthatárú sorok aránya, részidős alapképzés
  below280: [
    { key: "allami", name: "Állami ösztöndíjas", values: [0.62546816479400802, 0.68292682926829296, 0, 0, 0, 0, 0, 0, 0, 0, 0.25406504065040703, 0.49500998003991997, 0.42330097087378599, 0.30698529411764702] },
    { key: "onkolt", name: "Önköltséges", values: [0.83157894736842097, 0.81769436997319001, 0, 0, 0, 0, 0, 0, 0, 0, 0.43055555555555602, 0.64015151515151503, 0.62752293577981699, 0.58304498269896199] }
  ],

  // 10. dia (chart6): állami ösztöndíjas részidős sorok ponthatára, 20 pontos sávok, sorok aránya
  hist: {
    bins: [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460],
    y2022: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.519582245430809, 0.0861618798955614, 0.114882506527415, 0.0704960835509138, 0.031331592689295, 0.010443864229765, 0.14621409921671, 0.0156657963446475, 0.00261096605744125, 0.00261096605744125],
    y2023: [0.0020325203252032501, 0.0020325203252032501, 0.0081300813008130107, 0.0101626016260163, 0.016260162601626, 0.0467479674796748, 0.032520325203252, 0.0548780487804878, 0.0813008130081301, 0.245934959349594, 0.126016260162602, 0.0955284552845529, 0.0731707317073171, 0.0609756097560976, 0.0528455284552846, 0.0630081300813008, 0.016260162601626, 0.0121951219512195, 0],
    stats: { 2022: { min: 280, median: 294, rows: 383 }, 2023: { min: 108, median: 299.5, rows: 492 } }
  },

  // 11. dia (chart7): felvett részidős alapképzésesek közül 280 alatti ponthatárú soron
  admittedBelow: { years: [2022, 2023, 2024, 2025, 2026], values: [0, 0.38253511297217102, 0.59544018058690695, 0.53076789738256203, 0.42811869778161898] },

  // 12. dia (chart8): placebo időben, alap/mester arány változása az előző évhez képest
  placebo: {
    years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    values: [0.0028881641263334098, -0.0157572108661354, 0.10785441053799, 0.13035311836527599, -0.0082864529738123603, 0.082183318405047306, -0.33887178077212599, 0.045163967173220201, -0.0269011795544601, 0.58716313955684796, -0.200063913448778, 0.0019452621356519401, -0.032774084696427001],
    reform: [2020, 2023]
  },

  // 13. dia: alternatív magyarázatok
  alternatives: [
    { name: "Emelt érettségi + 280 pont", timing: "pontos", pattern: "2020-ban tükörkép; a mester nem ugrik", verdict: "Fő ok", level: "main" },
    { name: "Pedagógus-béremelés", timing: "a nagy emelés 2024-ben jött", pattern: "az ugrás minden területen egyszerre", verdict: "2024-től erősít", level: "partial" },
    { name: "COVID-visszapattanás", timing: "2021–22-ben elmaradt", pattern: "2023-ban a 2019-es szint fölött", verdict: "Nem magyarázza", level: "no" },
    { name: "Finanszírozás, keretszám", timing: "nem illik", pattern: "a részidős kínálat nem nőtt", verdict: "Nem magyarázza", level: "no" }
  ]
};
