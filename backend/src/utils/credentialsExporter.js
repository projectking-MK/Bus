import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { initialStudentsDataset, deriveStudentUsername, deriveStudentPassword } from '../../seed/seed.js';

export const getFormattedStudents = (filterGender = null) => {
  const students = initialStudentsDataset.map((item, index) => {
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

  if (filterGender === 'BOYS' || filterGender === 'Male') {
    return students.filter((s) => s.gender === 'Male').map((s, idx) => ({ ...s, sNo: idx + 1 }));
  }
  if (filterGender === 'GIRLS' || filterGender === 'Female') {
    return students.filter((s) => s.gender === 'Female').map((s, idx) => ({ ...s, sNo: idx + 1 }));
  }
  return students;
};

export const generateCredentialsWorkbook = ({ gender = 'ALL' }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Bus Attendance System';
  workbook.created = new Date();

  const addSheet = (sheetTitle, studentsList, headerColor) => {
    const sheet = workbook.addWorksheet(sheetTitle, {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: true }],
    });

    // 1. Title Banner
    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `COLLEGE BUS ATTENDANCE - ${sheetTitle.toUpperCase()}`;
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.primary } };
    sheet.getRow(1).height = 34;

    // 2. Subtitle Metadata
    sheet.mergeCells('A2:I2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Bus: Bus No-09 | Route: College Bus No 09 | Total: ${studentsList.length} Students | Confidential Credentials`;
    subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FFFFFFFF' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor.secondary } };
    sheet.getRow(2).height = 24;

    sheet.addRow([]);

    // 3. Columns
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

    const headerRow = sheet.addRow(columns.map((c) => c.header));
    sheet.getRow(4).height = 25;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });

    studentsList.forEach((s, idx) => {
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
      row.height = 22;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10.5 };
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

        if (colNumber === 4) cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
        if (colNumber === 5) cell.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FFB91C1C' } };
      });
    });

    columns.forEach((col, idx) => {
      sheet.getColumn(idx + 1).width = col.width;
    });
  };

  const upperGender = (gender || 'ALL').toUpperCase();

  if (upperGender === 'BOYS' || upperGender === 'MALE') {
    addSheet('Boys Credentials (21)', getFormattedStudents('BOYS'), {
      primary: 'FF1E3A8A',
      secondary: 'FF2563EB',
      zebra: 'FFF0F9FF',
    });
  } else if (upperGender === 'GIRLS' || upperGender === 'FEMALE') {
    addSheet('Girls Credentials (34)', getFormattedStudents('GIRLS'), {
      primary: 'FF831843',
      secondary: 'FFDB2777',
      zebra: 'FFFDF2F8',
    });
  } else {
    // Both sheets
    addSheet('Boys Credentials (21)', getFormattedStudents('BOYS'), {
      primary: 'FF1E3A8A',
      secondary: 'FF2563EB',
      zebra: 'FFF0F9FF',
    });
    addSheet('Girls Credentials (34)', getFormattedStudents('GIRLS'), {
      primary: 'FF831843',
      secondary: 'FFDB2777',
      zebra: 'FFFDF2F8',
    });
  }

  return workbook;
};

export const generateCredentialsPDFDoc = ({ gender = 'BOYS' }) => {
  const upperGender = (gender || 'BOYS').toUpperCase();
  const isBoys = upperGender === 'BOYS' || upperGender === 'MALE';
  const students = isBoys ? getFormattedStudents('BOYS') : getFormattedStudents('GIRLS');
  const groupTitle = isBoys ? 'Boys Student Login Credentials (21 Boys)' : 'Girls Student Login Credentials (34 Girls)';
  const primaryHex = isBoys ? '#1E3A8A' : '#831843';

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 30,
    bufferPages: true,
  });

  // Header Banner
  doc.rect(30, 30, 782, 52).fill(primaryHex);

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF').text(
    `SMART BUS ATTENDANCE SYSTEM - ${groupTitle.toUpperCase()}`,
    35,
    40,
    { align: 'center', width: 772 }
  );

  doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#E2E8F0').text(
    `College Bus No 09 | Total: ${students.length} Students | Confidential Credentials Document`,
    35,
    62,
    { align: 'center', width: 772 }
  );

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
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1D4ED8');
      } else if (cIdx === 4) {
        doc.font('Courier-Bold').fontSize(8.5).fillColor('#B91C1C');
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

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text(
      `College Bus No 09 • Student Credentials Document • Page ${i + 1} of ${range.count}`,
      30,
      565,
      { align: 'center', width: 782 }
    );
  }

  return doc;
};
