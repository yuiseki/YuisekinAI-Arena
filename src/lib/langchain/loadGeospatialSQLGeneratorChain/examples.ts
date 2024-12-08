export const examples: Array<{ input: string; output: string }> = [
  {
    input: "After Antarctica, which country has the largest area?",
    output: `SELECT name as name, ST_AREA(geom) as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name != 'Antarctica'
ORDER BY value DESC
LIMIT 1`,
  },
  {
    input: "Which country is closest to Japan?",
    output: `SELECT name as name, ST_DISTANCE(geom, (SELECT geom FROM countries WHERE name = 'Japan')) as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name != 'Japan'
ORDER BY value ASC
LIMIT 1`,
  },
  {
    input: "Which land area is larger, Japan or Taiwan?",
    output: `SELECT name as name, ST_AREA(geom) as value, ST_AsGeoJSON(geom) as geom
FROM countries
WHERE name = 'Japan' OR name = 'Taiwan'
ORDER BY value DESC
LIMIT 1`,
  },
];
