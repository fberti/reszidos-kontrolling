# Részidős jelentkezők – interaktív adattörténet

Scrollytelling dashboard a „Részidős jelentkezők – diasor_final.pptx” alapján
(felvi.hu, 2013–2026, általános eljárás, első helyes jelentkezők).

Statikus oldal, nincs build-lépés: `index.html` + `assets/` + `vendor/d3.min.js` (D3 v7.9, helyben tárolva).

## Helyi megtekintés

```bash
python3 -m http.server 8000
# majd: http://localhost:8000
```


## Szerkezet

| Fájl | Tartalom |
|---|---|
| `index.html` | A történet szövege és szerkezete (fejezetek, scrolly-lépések, KPI-csempék) |
| `assets/data.js` | Minden adat a diasor beágyazott diagramjaiból |
| `assets/app.js` | D3-diagramok, scrollytelling, tooltipek, csúszka, adattáblák |
| `assets/style.css` | A diasor szerkesztőségi designja (mélykék / narancs) |

A különbségek különbsége becslést (−29,0%, −6,6%, ≈ 19 400 fő) az `app.js` az adatokból újraszámolja.
