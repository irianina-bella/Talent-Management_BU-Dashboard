// Generates a SYNTHETIC test workbook (no real employee data) with the production header layout,
// including duplicated Scale/Score headers, a duplicate Personnel Number and a row without ID.
import * as XLSX from 'xlsx';
const H = ['Personnel Number','Employee Name','Company Name','Personnel Area Text','Pers. subarea text','Position Name','Talent (Last year)','Talent (Current year)','Talent Calib (Last year)','Talent Calib (Current year)','Business Unit Name','Directorate','Directorate Name','Division','Division Name','Department','Department Name','Yrs in Current Pos','Yrs in Current Gol','Average PAT','Hidden Gems','Free Rider','Low Performer Category','Low Performer','Identified as Successor','Reviewer NIK','Reviewer Name','Last Change','Year -1','Scale','Score','Year -2','Scale','Score','Year -3','Path','Education Scale','Strength','Weakness','TL Class Calibration','Talent Class 12 Box Text','Talent Cluster Text','Talent Category','C-Level'];
const boxes = [['Growing Talent','Critical Resources','Talent Pool'],['Steady Performer','Developing Contributor','Talent Pool'],['Emerging Leaders','Critical Resources','Top Talent'],['Strugglers','Under Achiever',''],['Misfits','Under Performer',''],['Solid Contributor','Key Contributor','Talent Pool'],['Future Leaders','High Potential II','Talent Pool'],['Average Workers','Developing Contributor','Talent Pool']];
const companies = ['TEST CO ALPHA','TEST CO BETA','TEST CO GAMMA'];
const scales = [['A','5'],['B+','4'],['B','3'],['C','2'],['','']];
const rows = [];
for (let i = 0; i < 60; i++) {
  const b = boxes[i % boxes.length];
  const s1 = scales[i % 5], s2 = scales[(i + 2) % 5];
  const yn = (k) => (i % k === 0 ? 'Yes' : 'No');
  rows.push([
    String(900000 + i), `Test Employee ${i + 1}`, companies[i % 3], `${companies[i % 3]} - HO`, 'Jakarta', i % 7 === 0 ? '' : `Test Position ${i % 9}`,
    yn(3), yn(2), yn(4), yn(3), i % 5 === 0 ? '' : 'TESTBU', '0', i % 2 ? 'TEST DIRECTORATE A' : '', String(6000 + (i % 4)), `TEST DIVISION ${i % 4}`, '0', i % 3 ? `TEST DEPT ${i % 5}` : '',
    `0${i % 4} YEARS 0${i % 10} MONTH`, i === 5 ? 'abc' : `01 YEARS 06 MONTH`, i === 7 ? 'x.yz' : (i % 5).toFixed(2), yn(11), yn(13), 'No', yn(17), i % 6 === 0 ? `${1 + (i % 2)} Positions` : '', '0', i % 4 ? 'Test Reviewer' : '', i % 4 ? '10/9/2026' : '',
    '2025', s1[0], s1[1], '2024', s2[0], s2[1], '2023', 'Managerial', i % 2 ? 'S1' : '', i % 4 ? 'Synthetic strength text.' : '', i % 4 ? 'Synthetic weakness text.' : '', '', b[0], b[1], b[2], i % 10 === 0 ? 'Yes' : 'No',
  ]);
}
rows.push([...rows[3]]); // duplicate Personnel Number
const noId = [...rows[4]]; noId[0] = ''; rows.push(noId); // missing Personnel Number
rows.push(H.map(() => '')); // blank row
const ws = XLSX.utils.aoa_to_sheet([H, ...rows]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, process.argv[2] || 'fixture.xlsx');
console.log('fixture rows', rows.length);
