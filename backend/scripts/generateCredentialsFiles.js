import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { initialStudentsDataset, deriveStudentUsername, deriveStudentPassword } from '../seed/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build complete student list with usernames and passwords
const allStudents = initialStudentsDataset.map((item, index) => {
  const padNum = String(item.id || index + 1).padStart(3, '0');
  const rollNumber = `23CS${padNum}`;
  const username = deriveStudentUsername(item.name);
  const password = deriveStudentPassword(item.name, item.department);
  const email = `student${String(item.id || index + 1).padStart(2, '0')}@college.edu`;

  return {
    sNo: index + 1,
    rollNumber,
    name: item.name,
    username,
    password,
    gender: item.gender,
    department: item.department,
    year: item.year,
    email,
    busNumber: 'Bus No-09',
    route: 'College Bus No 09',
  };
});

const boys = allStudents.filter((s) => s.gender === 'Male').map((s, idx) => ({ ...s, sNo: idx + 1 }));
const girls = allStudents.filter((s) => s.gender === 'Female').map((s, idx) => ({ ...s, sNo: idx + 1 }));

const outputDir = path.resolve(__dirname, '../../credentials_exports');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Generate Styled Excel File for a group of students
 */
const generateExcelFile = async (students, title, headerColor, filename) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Bus Attendance System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(title, {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ showGridLines: true }],
  });

  // 1. Title Banner
  sheet.mergeCells('A1:I1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `COLLEGE BUS ATTENDANCE SYSTEM - ${title.toUpperCase()}`;
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.primary } };
  sheet.getRow(1).height = 36;

  // 2. Subtitle Metadata
  sheet.mergeCells('A2:I2');
  const subCell = sheet.getCell('A2');
  subCell.value = `Bus: Bus No-09 | Route: College Bus No 09 | Total Records: ${students.length} | Generated: ${new Date().toLocaleDateString('en-GB')}`;
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FFFFFFFF' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.secondary } };
  sheet.getRow(2).height = 24;

  sheet.addRow([]); // Row 3 blank

  // 3. Table Column Headers
  const columns = [
    { header: 'S.No', key: 'sNo', width: 8 },
    { header: 'Roll Number', key: 'rollNumber', width: 14 },
    { header: 'Student Full Name', key: 'name', width: 24 },
    { header: 'Username (Login ID)', key: 'username', width: 22 },
    { header: 'Password', key: 'password', width: 20 },
    { header: 'Department', key: 'department', width: 16 },
    { header: 'Academic Year', key: 'year', width: 14 },
    { header: 'College Email', key: 'email', width: 28 },
    { header: 'Bus Number', key: 'busNumber', width: 14 },
  ];

  const headerRow = sheet.addRow(columns.map((c) => c.header));
  sheet.getRow(4).height = 26;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark slate
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } },
    };
  });

  // 4. Data Rows
  students.forEach((student, idx) => {
    const row = sheet.addRow([
      student.sNo,
      student.rollNumber,
      student.name,
      student.username,
      student.password,
      student.department,
      student.year,
      student.email,
      student.busNumber,
    ]);

    row.height = 22;
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : headerColor.zebra;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alignment rules
      if (colNumber === 1 || colNumber === 2 || colNumber === 6 || colNumber === 7 || colNumber === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      }

      // Highlight Username & Password columns
      if (colNumber === 4) {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E40AF' } }; // Indigo-800
      } else if (colNumber === 5) {
        cell.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FFB91C1C' } }; // Rose-700
      }
    });
  });

  // Column widths
  columns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width;
  });

  const filePath = path.join(outputDir, filename);
  await workbook.xlsx.writeFile(filePath);
  console.log(`[Excel Generated] ${filePath}`);
  return filePath;
};

/**
 * Generate Master Excel with Both Boys & Girls Sheets
 */
const generateCombinedExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Bus Attendance System';
  workbook.created = new Date();

  const addStudentSheet = (sheetName, students, headerColor) => {
    const sheet = workbook.addWorksheet(sheetName, {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: true }],
    });

    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `SMART BUS ATTENDANCE - ${sheetName.toUpperCase()}`;
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.primary } };
    sheet.getRow(1).height = 34;

    sheet.mergeCells('A2:I2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Bus: Bus No-09 | Route: College Bus No 09 | Total: ${students.length} Students`;
    subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FFFFFFFF' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.secondary } };
    sheet.getRow(2).height = 22;

    sheet.addRow([]);

    const columns = [
      { header: 'S.No', width: 8 },
      { header: 'Roll Number', width: 14 },
      { header: 'Student Full Name', width: 24 },
      { header: 'Username (Login ID)', width: 22 },
      { header: 'Password', width: 20 },
      { header: 'Department', width: 16 },
      { header: 'Academic Year', width: 14 },
      { header: 'College Email', width: 28 },
      { header: 'Bus Number', width: 14 },
    ];

    const hRow = sheet.addRow(columns.map((c) => c.header));
    sheet.getRow(4).height = 24;
    hRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    students.forEach((s, idx) => {
      const row = sheet.addRow([
        s.sNo,
        s.rollNumber,
        s.name,
        s.username,
        s.password,
        s.department,
        s.year,
        s.email,
        s.busNumber,
      ]);
      row.height = 20;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : headerColor.zebra },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if ([1, 2, 6, 7, 9].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        }
        if (colNumber === 4) cell.font = { bold: true, color: { argb: 'FF1E40AF' } };
        if (colNumber === 5) cell.font = { bold: true, color: { argb: 'FFB91C1C' } };
      });
    });

    columns.forEach((col, idx) => {
      sheet.getColumn(idx + 1).width = col.width;
    });
  };

  addStudentSheet('Boys Students (21)', boys, {
    primary: 'FF1E3A8A', // Blue-900
    secondary: 'FF2563EB', // Blue-600
    zebra: 'FFF0F9FF', // Sky-50
  });

  addStudentSheet('Girls Students (34)', girls, {
    primary: 'FF831843', // Pink-900
    secondary: 'FFDB2777', // Pink-600
    zebra: 'FFFDF2F8', // Pink-50
  });

  const filePath = path.join(outputDir, 'Student_Credentials_Boys_and_Girls.xlsx');
  await workbook.xlsx.writeFile(filePath);
  console.log(`[Combined Excel Generated] ${filePath}`);
  return filePath;
};

/**
 * Generate PDF File for a group of students using PDFKit
 */
const generatePDFFile = (students, title, groupName, primaryHex, filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(outputDir, filename);
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30,
      bufferPages: true,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header Banner
    doc.rect(30, 30, 782, 52).fill(primaryHex);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF').text(
      `SMART BUS ATTENDANCE SYSTEM - ${title.toUpperCase()}`,
      35,
      40,
      { align: 'center', width: 772 }
    );

    doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#E2E8F0').text(
      `College Bus No 09 | Total: ${students.length} ${groupName} | Confidential Login Credentials Document`,
      35,
      62,
      { align: 'center', width: 772 }
    );

    // Table Setup
    const startX = 30;
    let startY = 94;
    const rowHeight = 17.5;
    const cols = [
      { header: '#', width: 26, align: 'center' },
      { header: 'Roll No', width: 64, align: 'center' },
      { header: 'Student Full Name', width: 145, align: 'left' },
      { header: 'Username (Login ID)', width: 125, align: 'left' },
      { header: 'Password', width: 110, align: 'left' },
      { header: 'Dept', width: 55, align: 'center' },
      { header: 'Year', width: 58, align: 'center' },
      { header: 'College Email', width: 199, align: 'left' },
    ];

    const drawTableHeader = (y) => {
      doc.rect(startX, y, 782, 20).fill('#0F172A');
      let currentX = startX;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
      cols.forEach((col) => {
        doc.text(col.header, currentX + 3, y + 5.5, {
          width: col.width - 6,
          align: col.align,
        });
        currentX += col.width;
      });
    };

    drawTableHeader(startY);
    startY += 20;

    students.forEach((s, idx) => {
      // Check page break
      if (startY + rowHeight > 550) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        startY = 35;
        drawTableHeader(startY);
        startY += 20;
      }

      const isEven = idx % 2 === 0;
      const bgHex = isEven ? '#FFFFFF' : '#F8FAFC';
      doc.rect(startX, startY, 782, rowHeight).fill(bgHex);
      doc.rect(startX, startY, 782, rowHeight).strokeColor('#E2E8F0').lineWidth(0.5).stroke();

      let currentX = startX;

      // Draw values
      const vals = [
        String(s.sNo),
        s.rollNumber,
        s.name,
        s.username,
        s.password,
        s.department,
        s.year,
        s.email,
      ];

      vals.forEach((val, cIdx) => {
        const col = cols[cIdx];
        if (cIdx === 3) {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1D4ED8'); // Blue for username
        } else if (cIdx === 4) {
          doc.font('Courier-Bold').fontSize(8.5).fillColor('#B91C1C'); // Red courier for password
        } else {
          doc.font('Helvetica').fontSize(8).fillColor('#1E293B');
        }

        doc.text(val, currentX + 3, startY + 4.5, {
          width: col.width - 6,
          align: col.align,
          ellipsis: true,
        });
        currentX += col.width;
      });

      startY += rowHeight;
    });

    // Add footer page numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text(
        `College Bus No 09 • Student Credentials Sheet • Page ${i + 1} of ${range.count}`,
        30,
        565,
        { align: 'center', width: 782 }
      );
    }

    doc.end();
    stream.on('finish', () => {
      console.log(`[PDF Generated] ${filePath}`);
      resolve(filePath);
    });
    stream.on('error', reject);
  });
};

export const run = async () => {
  console.log('Generating separate Excel and PDF credential files...');

  // 1. Boys Excel
  await generateExcelFile(
    boys,
    'Boys Credentials (21)',
    { primary: 'FF1E3A8A', secondary: 'FF2563EB', zebra: 'FFF0F9FF' },
    'Boys_Student_Credentials.xlsx'
  );

  // 2. Girls Excel
  await generateExcelFile(
    girls,
    'Girls Credentials (34)',
    { primary: 'FF831843', secondary: 'FFDB2777', zebra: 'FFFDF2F8' },
    'Girls_Student_Credentials.xlsx'
  );

  // 3. Combined Excel with both sheets
  await generateCombinedExcel();

  // 4. Boys PDF
  await generatePDFFile(
    boys,
    'Boys Student Login Credentials (21 Boys)',
    'Boys',
    '#1E3A8A',
    'Boys_Student_Credentials.pdf'
  );

  // 5. Girls PDF
  await generatePDFFile(
    girls,
    'Girls Student Login Credentials (34 Girls)',
    'Girls',
    '#831843',
    'Girls_Student_Credentials.pdf'
  );

  console.log('All Excel and PDF credential files generated successfully in:');
  console.log(outputDir);
};

run();
