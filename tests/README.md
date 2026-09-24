# Tests de suivi-financier.html

Deux scripts Playwright, à lancer avant chaque publication :

- `audit-controles.js` : actionne chaque bouton, menu, case et champ de chaque onglet et liste ceux qui ne produisent aucun effet.
- `coherence.js` : vérifie mois par mois que Tableau de bord, Prévisionnel (horizons 6, 12 et 24 mois), Plan d'épargne, comptes d'épargne, en-tête et Mon système donnent les mêmes montants, et que le compte courant s'enchaîne d'un mois à l'autre. Avec `MUT=1`, rejoue d'abord une série d'actions (cocher, modifier, régler, relier un objectif, importer).

```
node tests/audit-controles.js tests/seed-demo.json
node tests/coherence.js tests/seed-demo.json
MUT=1 node tests/coherence.js tests/seed-demo.json
```

`seed-demo.json` ne contient que des données fictives.
