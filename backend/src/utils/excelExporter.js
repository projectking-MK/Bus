import ExcelJS from 'exceljs';

/**
 * Generates an Excel (.xlsx) workbook for college bus attendance.
 * Contains:
 * - Number of Boys Present
 * - Number of Girls Present
 * - Number of Boys Absent (with their Name and Year)
 * - Number of Girls Absent (with their Name and Year)
 * - Complete 55-Student Attendance Roster
 *
 * @param {Object} data
 * @param {Array<Object>} data.allStudents All enrolled students (55 students)
 * @param {Array<Object>} data.attendanceRecords Marked attendance records for the selected trip/date
 * @param {Object} data.trip Trip details (tripId, busNumber, routeName, date)
 * @returns {Promise<ExcelJS.Workbook>}
 */
export const generateAttendanceExcelWorkbook = async ({ allStudents, attendanceRecords, trip }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart Bus Attendance Monitoring System';
  workbook.created = new Date();

  // Create lookup for marked attendance by studentId
  const attendanceMap = new Map();
  attendanceRecords.forEach((rec) => {
    const sId = (rec.studentId?._id || rec.studentId || '').toString();
    if (sId) {
      attendanceMap.set(sId, rec);
    }
  });

  // Categorize students
  const boysPresent = [];
  const girlsPresent = [];
  const boysAbsent = [];
  const girlsAbsent = [];

  allStudents.forEach((student) => {
    const sId = student._id.toString();
    const att = attendanceMap.get(sId);
    const isMale = (student.gender || 'Male').toLowerCase() === 'male';

    if (att && (att.status === 'PRESENT' || att.status === 'LATE')) {
      if (isMale) {
        boysPresent.push({ student, attendance: att });
      } else {
        girlsPresent.push({ student, attendance: att });
      }
    } else {
      if (isMale) {
        boysAbsent.push({ student });
      } else {
        girlsAbsent.push({ student });
      }
    }
  });

  const totalStudents = allStudents.length || 55;
  const totalPresent = boysPresent.length + girlsPresent.length;
  const totalAbsent = boysAbsent.length + girlsAbsent.length;
  const attendanceRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
  const reportDate = trip?.date ? new Date(trip.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US');

  // ==========================================
  // WORKSHEET 1: Summary & Absent Students
  // ==========================================
  const wsSummary = workbook.addWorksheet('Attendance Summary & KPIs', {
    pageSetup: { paperSize: 9, orientation: 'portrait' },
  });

  // Title Banner
  wsSummary.mergeCells('A1:G1');
  const titleCell = wsSummary.getCell('A1');
  titleCell.value = 'SMART BUS ATTENDANCE MONITORING SYSTEM';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } }; // Indigo-900
  wsSummary.getRow(1).height = 36;

  // Subtitle Metadata
  wsSummary.mergeCells('A2:G2');
  const subCell = wsSummary.getCell('A2');
  const sessionText = trip?.sessionName ? ` | Session: ${trip.sessionName}` : '';
  subCell.value = `Bus: ${trip?.busNumber || 'BUS-09'} | Route: ${trip?.routeName || 'College Bus No 09'}${sessionText} | Date: ${reportDate} | Trip: ${trip?.tripId || 'ACTIVE'}`;
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FFFFFFFF' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } };
  wsSummary.getRow(2).height = 24;

  wsSummary.addRow([]); // Blank row

  // KPI Breakdown Table
  const kpiHeaderRow = wsSummary.addRow(['ATTENDANCE METRIC (GENDER-WISE)', '', 'COUNT', '', 'PERCENTAGE', '', 'STATUS']);
  wsSummary.mergeCells(`A${kpiHeaderRow.number}:B${kpiHeaderRow.number}`);
  wsSummary.mergeCells(`C${kpiHeaderRow.number}:D${kpiHeaderRow.number}`);
  wsSummary.mergeCells(`E${kpiHeaderRow.number}:F${kpiHeaderRow.number}`);

  kpiHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  kpiHeaderRow.height = 24;

  const kpis = [
    { label: 'Total Enrolled Students', count: totalStudents, pct: '100%', status: 'Target Capacity (55)', color: 'FFF8FAFC' },
    { label: 'Number of Boys Present', count: boysPresent.length, pct: `${totalStudents > 0 ? Math.round((boysPresent.length / totalStudents) * 100) : 0}%`, status: 'VERIFIED ON BUS', color: 'FFECFDF5' },
    { label: 'Number of Girls Present', count: girlsPresent.length, pct: `${totalStudents > 0 ? Math.round((girlsPresent.length / totalStudents) * 100) : 0}%`, status: 'VERIFIED ON BUS', color: 'FFECFDF5' },
    { label: 'Total Present (Boys + Girls)', count: totalPresent, pct: `${attendanceRate}%`, status: 'BOARDED', color: 'FFD1FAE5' },
    { label: 'Number of Boys Absent', count: boysAbsent.length, pct: `${totalStudents > 0 ? Math.round((boysAbsent.length / totalStudents) * 100) : 0}%`, status: 'ABSENT', color: 'FFFFF1F2' },
    { label: 'Number of Girls Absent', count: girlsAbsent.length, pct: `${totalStudents > 0 ? Math.round((girlsAbsent.length / totalStudents) * 100) : 0}%`, status: 'ABSENT', color: 'FFFFF1F2' },
    { label: 'Total Absent (Boys + Girls)', count: totalAbsent, pct: `${100 - attendanceRate}%`, status: 'NOT BOARDED', color: 'FFFEE2E2' },
  ];

  kpis.forEach((k) => {
    const row = wsSummary.addRow([k.label, '', k.count, '', k.pct, '', k.status]);
    wsSummary.mergeCells(`A${row.number}:B${row.number}`);
    wsSummary.mergeCells(`C${row.number}:D${row.number}`);
    wsSummary.mergeCells(`E${row.number}:F${row.number}`);

    row.getCell(1).font = { bold: true };
    row.getCell(3).font = { bold: true, size: 12 };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(7).font = { bold: true };

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: k.color } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  wsSummary.addRow([]); // Blank row

  // SECTION: ABSENT BOYS WITH NAME AND YEAR
  const boysAbsentHeader = wsSummary.addRow([`ABSENT BOYS LIST (${boysAbsent.length} BOYS ABSENT) - WITH NAME AND YEAR`]);
  wsSummary.mergeCells(`A${boysAbsentHeader.number}:G${boysAbsentHeader.number}`);
  boysAbsentHeader.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  boysAbsentHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } }; // Red-600
  boysAbsentHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  boysAbsentHeader.height = 26;

  const boysColHeader = wsSummary.addRow(['S.No', 'Roll Number', 'Student Name (Boy)', 'Academic Year', 'Department', 'Phone Number', 'Status']);
  boysColHeader.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    c.alignment = { horizontal: 'center' };
  });

  if (boysAbsent.length === 0) {
    const emptyRow = wsSummary.addRow(['-', 'All enrolled boys are PRESENT today', '', '', '', '', '100% Present']);
    wsSummary.mergeCells(`B${emptyRow.number}:F${emptyRow.number}`);
    emptyRow.getCell(2).alignment = { horizontal: 'center' };
  } else {
    boysAbsent.forEach((item, index) => {
      const s = item.student;
      const r = wsSummary.addRow([
        index + 1,
        s.rollNumber,
        s.name,
        s.year,
        s.department,
        s.phone || 'N/A',
        'ABSENT',
      ]);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(7).alignment = { horizontal: 'center' };
      r.getCell(7).font = { bold: true, color: { argb: 'FFDC2626' } };
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });
  }

  wsSummary.addRow([]); // Blank row

  // SECTION: ABSENT GIRLS WITH NAME AND YEAR
  const girlsAbsentHeader = wsSummary.addRow([`ABSENT GIRLS LIST (${girlsAbsent.length} GIRLS ABSENT) - WITH NAME AND YEAR`]);
  wsSummary.mergeCells(`A${girlsAbsentHeader.number}:G${girlsAbsentHeader.number}`);
  girlsAbsentHeader.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  girlsAbsentHeader.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } }; // Rose-600
  girlsAbsentHeader.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  girlsAbsentHeader.height = 26;

  const girlsColHeader = wsSummary.addRow(['S.No', 'Roll Number', 'Student Name (Girl)', 'Academic Year', 'Department', 'Phone Number', 'Status']);
  girlsColHeader.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9F1239' } };
    c.alignment = { horizontal: 'center' };
  });

  if (girlsAbsent.length === 0) {
    const emptyRow = wsSummary.addRow(['-', 'All enrolled girls are PRESENT today', '', '', '', '', '100% Present']);
    wsSummary.mergeCells(`B${emptyRow.number}:F${emptyRow.number}`);
    emptyRow.getCell(2).alignment = { horizontal: 'center' };
  } else {
    girlsAbsent.forEach((item, index) => {
      const s = item.student;
      const r = wsSummary.addRow([
        index + 1,
        s.rollNumber,
        s.name,
        s.year,
        s.department,
        s.phone || 'N/A',
        'ABSENT',
      ]);
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(7).alignment = { horizontal: 'center' };
      r.getCell(7).font = { bold: true, color: { argb: 'FFE11D48' } };
      r.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });
  }

  // Adjust column widths for Sheet 1
  wsSummary.columns = [
    { width: 8 },  // S.No
    { width: 18 }, // Roll Number
    { width: 28 }, // Name
    { width: 18 }, // Year
    { width: 32 }, // Dept
    { width: 20 }, // Phone
    { width: 20 }, // Status
  ];

  // ==========================================
  // WORKSHEET 2: Full 55 Students Roster
  // ==========================================
  const wsFull = workbook.addWorksheet('Full 55-Students Roster', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  // Title Banner
  wsFull.mergeCells('A1:K1');
  const fullTitle = wsFull.getCell('A1');
  fullTitle.value = `COMPLETE STUDENT ATTENDANCE ROSTER (${totalStudents} REGISTERED STUDENTS)`;
  fullTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  fullTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  fullTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } };
  wsFull.getRow(1).height = 30;

  const rosterHeaders = [
    'S.No',
    'Roll Number',
    'Student Name',
    'Gender',
    'Academic Year',
    'Department',
    'Attendance Status',
    'Marked Time',
    'GPS Distance (m)',
    'GPS Accuracy (m)',
    'Bound Device ID',
  ];

  const headerRow2 = wsFull.addRow(rosterHeaders);
  headerRow2.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow2.height = 24;

  allStudents.forEach((student, idx) => {
    const sId = student._id.toString();
    const att = attendanceMap.get(sId);
    const isPresent = att && (att.status === 'PRESENT' || att.status === 'LATE');
    const genderLabel = (student.gender || 'Male').toLowerCase() === 'male' ? 'Boy' : 'Girl';
    const status = isPresent ? att.status : 'ABSENT';
    const timeStr = isPresent && att.markedAt ? new Date(att.markedAt).toLocaleTimeString('en-US') : 'Not Marked';
    const distStr = isPresent && att.distanceMeters !== undefined ? `${att.distanceMeters}m` : '-';
    const accStr = isPresent && att.gpsAccuracy !== undefined ? `±${att.gpsAccuracy}m` : '-';
    const devStr = isPresent && att.deviceId ? att.deviceId : (student.deviceId || 'Unbound');

    const row = wsFull.addRow([
      idx + 1,
      student.rollNumber,
      student.name,
      genderLabel,
      student.year,
      student.department,
      status,
      timeStr,
      distStr,
      accStr,
      devStr,
    ]);

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };
    row.getCell(9).alignment = { horizontal: 'center' };
    row.getCell(10).alignment = { horizontal: 'center' };

    // Row status styling
    const statusCell = row.getCell(7);
    statusCell.font = { bold: true };
    if (status === 'PRESENT') {
      statusCell.font = { bold: true, color: { argb: 'FF059669' } }; // Green
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    } else if (status === 'LATE') {
      statusCell.font = { bold: true, color: { argb: 'FFD97706' } }; // Amber
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    } else {
      statusCell.font = { bold: true, color: { argb: 'FFDC2626' } }; // Red
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
    }

    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Adjust column widths for Sheet 2
  wsFull.columns = [
    { width: 8 },  // S.No
    { width: 16 }, // Roll Number
    { width: 26 }, // Name
    { width: 12 }, // Gender
    { width: 16 }, // Year
    { width: 32 }, // Dept
    { width: 20 }, // Status
    { width: 18 }, // Marked Time
    { width: 18 }, // Distance
    { width: 18 }, // Accuracy
    { width: 28 }, // Device
  ];

  return workbook;
};
