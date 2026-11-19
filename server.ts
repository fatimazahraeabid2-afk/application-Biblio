import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database, hashPassword, verifyPassword } from './server/db.js';
import { sendOverdueEmail, isSmtpConfigured, formatEmailContent, OverdueBookInfo } from './server/email.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

const db = Database.getInstance();

function getDaysDiff(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------

// Register Student (Self-service online signup)
app.post('/api/auth/register-student', (req: Request, res: Response) => {
  const { name, email, password, cardNumber } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();
  const cleanCard = cardNumber ? String(cardNumber).trim() : '';

  // MUST end with @usmba.ac.ma
  if (!cleanEmail.endsWith('@usmba.ac.ma')) {
    return res.status(400).json({
      error: 'L’adresse e-mail doit obligatoirement se terminer par @usmba.ac.ma.',
    });
  }

  const data = db.getData();
  const existing = data.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({
      error: 'Un compte étudiant avec cette adresse e-mail existe déjà.',
    });
  }

  // Cross-reference with mock university database if available
  const matchUniv = data.universityStudents.find(
    (us) =>
      us.email.toLowerCase() === cleanEmail ||
      (cleanCard && us.cardNumber.toLowerCase() === cleanCard.toLowerCase()) ||
      us.fullName.toLowerCase() === cleanName.toLowerCase()
  );

  const { hash, salt } = hashPassword(password);
  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    email: cleanEmail,
    cardNumber: cleanCard || matchUniv?.cardNumber || `USMBA-${Date.now().toString().slice(-4)}`,
    massarCode: matchUniv?.massarCode,
    cin: matchUniv?.cin,
    filiere: matchUniv?.filiere,
    qrPayload: matchUniv?.qrPayload || `USMBA-STUDENT:${cleanEmail}`,
    passwordHash: hash,
    salt,
    role: 'student' as const,
    createdAt: new Date().toISOString(),
    registeredBy: 'self' as const,
  };

  data.users.push(newUser);
  db.save();

  res.json({
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      cardNumber: newUser.cardNumber,
      role: newUser.role,
    },
  });
});

// Login Student
app.post('/api/auth/login-student', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const data = db.getData();
  const user = data.users.find((u) => u.email.toLowerCase() === cleanEmail && u.role === 'student');

  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ error: 'Identifiants étudiant incorrects.' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      cardNumber: user.cardNumber,
      role: user.role,
    },
  });
});

// Login Admin
app.post('/api/auth/login-admin', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const data = db.getData();
  const user = data.users.find((u) => u.email.toLowerCase() === cleanEmail && u.role === 'admin');

  if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
    return res.status(401).json({ error: 'Identifiants administrateur incorrects.' });
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ----------------------------------------------------
// UNIVERSITY MOCK DATABASE (Section 4)
// ----------------------------------------------------

// List university students
app.get('/api/university-students', (req: Request, res: Response) => {
  const data = db.getData();
  const q = String(req.query.search || '').trim().toLowerCase();

  let list = data.universityStudents;
  if (q) {
    list = list.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.massarCode.toLowerCase().includes(q) ||
        s.cin.toLowerCase().includes(q) ||
        s.cardNumber.toLowerCase().includes(q) ||
        s.filiere.toLowerCase().includes(q)
    );
  }

  // Check if each student is already registered in Biblio
  const results = list.map((s) => {
    const isRegisteredInBiblio = data.users.some(
      (u) =>
        u.role === 'student' &&
        (u.email.toLowerCase() === s.email.toLowerCase() ||
          (u.cardNumber && u.cardNumber.toLowerCase() === s.cardNumber.toLowerCase()) ||
          (u.massarCode && u.massarCode.toLowerCase() === s.massarCode.toLowerCase()))
    );
    return {
      ...s,
      isRegisteredInBiblio,
    };
  });

  res.json({ students: results });
});

// Search by QR Code payload in university database (Section 5, Method B)
app.get('/api/university-students/by-qr', (req: Request, res: Response) => {
  const payload = String(req.query.payload || '').trim();
  if (!payload) {
    return res.status(400).json({ found: false, error: 'Code QR non fourni.' });
  }

  const data = db.getData();
  const student = data.universityStudents.find(
    (s) =>
      s.qrPayload === payload ||
      s.cardNumber.toLowerCase() === payload.toLowerCase() ||
      s.massarCode.toLowerCase() === payload.toLowerCase() ||
      s.id === payload
  );

  if (!student) {
    return res.status(404).json({
      found: false,
      error: 'Code QR inconnu ou non répertorié dans la base universitaire fictive.',
    });
  }

  const isRegisteredInBiblio = data.users.some(
    (u) =>
      u.role === 'student' &&
      (u.email.toLowerCase() === student.email.toLowerCase() ||
        (u.cardNumber && u.cardNumber.toLowerCase() === student.cardNumber.toLowerCase()) ||
        (u.massarCode && u.massarCode.toLowerCase() === student.massarCode.toLowerCase()))
  );

  res.json({
    found: true,
    student,
    isRegisteredInBiblio,
  });
});

// Register student by admin (Section 5)
app.post('/api/students/register-by-admin', (req: Request, res: Response) => {
  const { fullName, massarCode, cin, filiere, email, cardNumber, qrPayload, password } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ error: 'Le nom complet et l’email sont requis.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(fullName).trim();

  if (!cleanEmail.endsWith('@usmba.ac.ma')) {
    return res.status(400).json({
      error: 'L’adresse e-mail doit obligatoirement se terminer par @usmba.ac.ma.',
    });
  }

  const data = db.getData();
  const existing = data.users.find(
    (u) =>
      u.role === 'student' &&
      (u.email.toLowerCase() === cleanEmail ||
        (cardNumber && u.cardNumber && u.cardNumber.toLowerCase() === String(cardNumber).trim().toLowerCase()) ||
        (massarCode && u.massarCode && u.massarCode.toLowerCase() === String(massarCode).trim().toLowerCase()))
  );

  if (existing) {
    return res.status(400).json({
      error: 'Cet étudiant est déjà inscrit à la bibliothèque Biblio.',
    });
  }

  const pwd = password || 'etudiant123';
  const { hash, salt } = hashPassword(pwd);

  const newUser = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    email: cleanEmail,
    cardNumber: cardNumber ? String(cardNumber).trim() : `USMBA-${Date.now().toString().slice(-4)}`,
    massarCode: massarCode ? String(massarCode).trim() : undefined,
    cin: cin ? String(cin).trim() : undefined,
    filiere: filiere ? String(filiere).trim() : undefined,
    qrPayload: qrPayload ? String(qrPayload).trim() : `USMBA-STUDENT:${cleanEmail}`,
    passwordHash: hash,
    salt,
    role: 'student' as const,
    createdAt: new Date().toISOString(),
    registeredBy: 'admin' as const,
  };

  data.users.push(newUser);
  db.save();

  res.status(201).json({
    success: true,
    user: newUser,
  });
});

// Find student in Biblio by QR code (used for physical loan/return scanning)
app.get('/api/students/by-qr', (req: Request, res: Response) => {
  const payload = String(req.query.payload || '').trim();
  if (!payload) {
    return res.status(400).json({ found: false, error: 'Code QR non fourni.' });
  }

  const data = db.getData();
  const student = data.users.find(
    (u) =>
      u.role === 'student' &&
      (u.qrPayload === payload ||
        (u.cardNumber && u.cardNumber.toLowerCase() === payload.toLowerCase()) ||
        (u.massarCode && u.massarCode.toLowerCase() === payload.toLowerCase()) ||
        u.email.toLowerCase() === payload.toLowerCase() ||
        u.id === payload)
  );

  if (!student) {
    return res.status(404).json({
      found: false,
      error: 'Étudiant introuvable dans la base Biblio. Veuillez d’abord l’inscrire.',
    });
  }

  // Active loans for this student
  const activeLoans = data.loans.filter((l) => l.studentId === student.id && l.status === 'active');

  res.json({
    found: true,
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      cardNumber: student.cardNumber,
      filiere: student.filiere,
      massarCode: student.massarCode,
      cin: student.cin,
    },
    activeLoans,
  });
});

// ----------------------------------------------------
// BOOKS ENDPOINTS (Section 7 & 8)
// ----------------------------------------------------

// Google Books online search
app.get('/api/books/search-online', async (req: Request, res: Response) => {
  const title = req.query.title as string;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Le titre est requis pour la recherche.' });
  }

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(
      title.trim()
    )}&maxResults=1`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(502).json({
        found: false,
        message: 'Impossible de joindre le service de recherche bibliographique.',
      });
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return res.json({
        found: false,
        message: 'Livre non trouvé sur Internet.',
      });
    }

    const volume = data.items[0].volumeInfo;
    const industryIdentifiers = volume.industryIdentifiers || [];
    let isbn = '';
    const isbn13 = industryIdentifiers.find((i: any) => i.type === 'ISBN_13');
    const isbn10 = industryIdentifiers.find((i: any) => i.type === 'ISBN_10');
    if (isbn13) isbn = isbn13.identifier;
    else if (isbn10) isbn = isbn10.identifier;

    const publishedYear = volume.publishedDate ? volume.publishedDate.slice(0, 4) : '';
    const author = Array.isArray(volume.authors) ? volume.authors.join(', ') : '';
    const category = Array.isArray(volume.categories) ? volume.categories[0] : '';
    const publisher = volume.publisher || '';
    const description = volume.description || '';
    let coverUrl = volume.imageLinks?.thumbnail || volume.imageLinks?.smallThumbnail || '';
    if (coverUrl && coverUrl.startsWith('http://')) {
      coverUrl = coverUrl.replace('http://', 'https://');
    }
    if (!coverUrl && isbn) {
      coverUrl = `https://books.google.com/books/content?vid=isbn:${isbn.replace(/-/g, '')}&printsec=frontcover&img=1&zoom=1`;
    }

    res.json({
      found: true,
      book: {
        title: volume.title || title,
        author,
        category,
        isbn,
        publishedYear,
        publisher,
        description,
        coverUrl,
      },
    });
  } catch (err: any) {
    console.error('Google Books API search error:', err);
    res.status(500).json({
      found: false,
      message: 'Erreur lors de la recherche sur Internet.',
    });
  }
});

// Get Books
app.get('/api/books', (_req: Request, res: Response) => {
  const data = db.getData();
  const activeBooks = data.books.filter((b) => !b.isDeleted);
  res.json({ books: activeBooks });
});

// Add Book (Admin)
app.post('/api/books', (req: Request, res: Response) => {
  const { title, author, category, isbn, publishedYear, publisher, totalCopies, coverUrl, description } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: 'Le titre et l’auteur sont obligatoires.' });
  }

  const copies = Number(totalCopies);
  if (isNaN(copies) || copies < 1) {
    return res.status(400).json({ error: 'Le nombre total d’exemplaires doit être supérieur ou égal à 1.' });
  }

  const data = db.getData();
  const newBook = {
    id: `bk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: String(title).trim(),
    author: String(author).trim(),
    category: category ? String(category).trim() : undefined,
    isbn: isbn ? String(isbn).trim() : undefined,
    publishedYear: publishedYear ? String(publishedYear).trim() : undefined,
    publisher: publisher ? String(publisher).trim() : undefined,
    totalCopies: copies,
    availableCopies: copies,
    coverUrl: coverUrl ? String(coverUrl).trim() : undefined,
    description: description ? String(description).trim() : undefined,
    createdAt: new Date().toISOString(),
    isDeleted: false,
  };

  data.books.push(newBook);
  db.save();

  res.status(201).json({ book: newBook });
});

// Update Book (Admin)
app.put('/api/books/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, author, category, isbn, publishedYear, publisher, totalCopies, coverUrl, description } = req.body;

  const data = db.getData();
  const bookIndex = data.books.findIndex((b) => b.id === id && !b.isDeleted);
  if (bookIndex === -1) {
    return res.status(404).json({ error: 'Livre non trouvé.' });
  }

  const book = data.books[bookIndex];
  const newTotal = Number(totalCopies);
  if (isNaN(newTotal) || newTotal < 1) {
    return res.status(400).json({ error: 'Nombre total d’exemplaires invalide.' });
  }

  const borrowedCopies = book.totalCopies - book.availableCopies;
  if (newTotal < borrowedCopies) {
    return res.status(400).json({
      error: `Impossible de réduire le total à ${newTotal} car ${borrowedCopies} exemplaire(s) sont actuellement empruntés.`,
    });
  }

  book.title = String(title).trim();
  book.author = String(author).trim();
  book.category = category ? String(category).trim() : undefined;
  book.isbn = isbn ? String(isbn).trim() : undefined;
  book.publishedYear = publishedYear ? String(publishedYear).trim() : undefined;
  book.publisher = publisher ? String(publisher).trim() : undefined;
  book.totalCopies = newTotal;
  book.availableCopies = newTotal - borrowedCopies;
  if (coverUrl !== undefined) book.coverUrl = coverUrl ? String(coverUrl).trim() : undefined;
  if (description !== undefined) book.description = description ? String(description).trim() : undefined;

  db.save();
  res.json({ book });
});

// Delete Book (Admin) - soft delete to preserve loan history
app.delete('/api/books/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const book = data.books.find((b) => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Livre introuvable.' });
  }

  book.isDeleted = true;
  db.save();

  res.json({ success: true });
});

// ----------------------------------------------------
// STUDENTS MANAGEMENT (Admin, Section 6)
// ----------------------------------------------------

app.get('/api/students', (_req: Request, res: Response) => {
  const data = db.getData();
  const students = data.users
    .filter((u) => u.role === 'student')
    .map((s) => {
      const activeLoansCount = data.loans.filter((l) => l.studentId === s.id && l.status === 'active').length;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        cardNumber: s.cardNumber || '—',
        massarCode: s.massarCode || '—',
        cin: s.cin || '—',
        filiere: s.filiere || '—',
        qrPayload: s.qrPayload || '',
        createdAt: s.createdAt,
        activeLoansCount,
      };
    });

  res.json({ students });
});

app.delete('/api/students/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const index = data.users.findIndex((u) => u.id === id && u.role === 'student');

  if (index === -1) {
    return res.status(404).json({ error: 'Étudiant introuvable.' });
  }

  data.users.splice(index, 1);
  db.save();

  res.json({ success: true });
});

// ----------------------------------------------------
// LOANS & RETURNS (Section 9 & 10)
// Physical loan recorded by administrator after scanning student card
// ----------------------------------------------------

app.post('/api/loans/record-by-admin', (req: Request, res: Response) => {
  const { bookId, studentId, durationDays } = req.body;

  if (!bookId || !studentId) {
    return res.status(400).json({ error: 'Livre et étudiant requis.' });
  }

  const data = db.getData();
  const book = data.books.find((b) => b.id === bookId && !b.isDeleted);
  if (!book) {
    return res.status(404).json({ error: 'Livre non trouvé.' });
  }

  const student = data.users.find((u) => u.id === studentId && u.role === 'student');
  if (!student) {
    return res.status(404).json({ error: 'Étudiant non inscrit à la bibliothèque.' });
  }

  if (book.availableCopies <= 0) {
    return res.status(400).json({
      error: 'Ce livre n’est actuellement pas disponible (aucun exemplaire restant).',
    });
  }

  const days = Number(durationDays) || data.settings?.loanDurationDays || 14;
  const today = new Date();
  const loanDate = getTodayString();
  const dueDateObj = new Date(today.getTime() + days * 24 * 3600 * 1000);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  const newLoan = {
    id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    studentCardNumber: student.cardNumber,
    loanDate,
    dueDate,
    returnedAt: null,
    status: 'active' as const,
  };

  book.availableCopies -= 1;
  data.loans.push(newLoan);
  db.save();

  res.status(201).json({ loan: newLoan, availableCopies: book.availableCopies });
});

// Student Self-Service Loan (Section 8 & 9)
app.post('/api/loans/borrow-by-student', (req: Request, res: Response) => {
  const { bookId, studentId } = req.body;

  if (!bookId || !studentId) {
    return res.status(400).json({ error: 'Livre et étudiant requis.' });
  }

  const data = db.getData();
  const book = data.books.find((b) => b.id === bookId && !b.isDeleted);
  if (!book) {
    return res.status(404).json({ error: 'Livre non trouvé.' });
  }

  const student = data.users.find((u) => u.id === studentId && u.role === 'student');
  if (!student) {
    return res.status(404).json({ error: 'Étudiant non inscrit à la bibliothèque.' });
  }

  if (book.availableCopies <= 0) {
    return res.status(400).json({
      error: 'Ce livre n’est actuellement pas disponible (aucun exemplaire disponible en rayon).',
    });
  }

  // Check if student already has this exact book borrowed and unreturned
  const alreadyBorrowed = data.loans.find(
    (l) => l.studentId === student.id && l.bookId === book.id && l.status === 'active'
  );
  if (alreadyBorrowed) {
    return res.status(400).json({
      error: 'Vous avez déjà un exemplaire actif de ce livre en cours d’emprunt.',
    });
  }

  const days = data.settings?.loanDurationDays || 14;
  const today = new Date();
  const loanDate = getTodayString();
  const dueDateObj = new Date(today.getTime() + days * 24 * 3600 * 1000);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  const newLoan = {
    id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    bookId: book.id,
    bookTitle: book.title,
    bookAuthor: book.author,
    studentId: student.id,
    studentName: student.name,
    studentEmail: student.email,
    studentCardNumber: student.cardNumber,
    loanDate,
    dueDate,
    returnedAt: null,
    status: 'active' as const,
  };

  book.availableCopies -= 1;
  data.loans.push(newLoan);
  db.save();

  res.status(201).json({ success: true, loan: newLoan, availableCopies: book.availableCopies });
});

// List Loans
app.get('/api/loans', (req: Request, res: Response) => {
  const data = db.getData();
  const status = req.query.status as string;
  const studentId = req.query.studentId as string;

  let loans = data.loans;
  if (status) {
    loans = loans.filter((l) => l.status === status);
  }
  if (studentId) {
    loans = loans.filter((l) => l.studentId === studentId);
  }
  res.json({ loans });
});

// Confirm Return (Admin, Section 10)
app.post('/api/loans/:id/return', (req: Request, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const loan = data.loans.find((l) => l.id === id);

  if (!loan) {
    return res.status(404).json({ error: 'Emprunt introuvable.' });
  }

  if (loan.status === 'returned') {
    return res.status(400).json({ error: 'Ce retour a déjà été confirmé.' });
  }

  const returnDate = getTodayString();
  loan.status = 'returned';
  loan.returnedAt = returnDate;

  // Replenish availableCopies
  const book = data.books.find((b) => b.id === loan.bookId);
  if (book) {
    book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
  }

  db.save();
  res.json({ success: true, loan });
});

// ----------------------------------------------------
// DASHBOARD: OVERDUE LISTS & EMAILS (Section 11 & 12)
// ----------------------------------------------------

interface OverdueStudentItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  maxDaysOverdue: number;
  unreturnedBooks: OverdueBookInfo[];
  loanIds: string[];
  lastAnnouncementSentAt?: string;
  daysSinceAnnouncement?: number;
}

app.get('/api/overdue/summary', (_req: Request, res: Response) => {
  const data = db.getData();
  const today = getTodayString();

  const overdueLoans = data.loans.filter((l) => l.status === 'active' && l.dueDate < today);

  const studentMap: Record<string, OverdueStudentItem> = {};

  overdueLoans.forEach((loan) => {
    const daysOverdue = Math.max(1, getDaysDiff(today, loan.dueDate));

    if (!studentMap[loan.studentId]) {
      studentMap[loan.studentId] = {
        studentId: loan.studentId,
        studentName: loan.studentName,
        studentEmail: loan.studentEmail,
        maxDaysOverdue: daysOverdue,
        unreturnedBooks: [],
        loanIds: [],
      };
    } else {
      if (daysOverdue > studentMap[loan.studentId].maxDaysOverdue) {
        studentMap[loan.studentId].maxDaysOverdue = daysOverdue;
      }
    }

    studentMap[loan.studentId].unreturnedBooks.push({
      title: loan.bookTitle,
      dueDate: loan.dueDate,
      daysOverdue,
    });
    studentMap[loan.studentId].loanIds.push(loan.id);
  });

  const list1: OverdueStudentItem[] = [];
  const list2: OverdueStudentItem[] = [];

  Object.values(studentMap).forEach((st) => {
    const announcementLogs = data.emailLogs
      .filter((l) => l.studentId === st.studentId && l.type === 'announcement' && l.status === 'sent')
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    const lastAnnouncement = announcementLogs[0];

    if (lastAnnouncement) {
      const daysSince = getDaysDiff(today, lastAnnouncement.sentAt.split('T')[0]);
      st.lastAnnouncementSentAt = lastAnnouncement.sentAt;
      st.daysSinceAnnouncement = daysSince;

      // Section 11 & 12 : Conditions pour Liste 2 (Avertissements) :
      // 1. Premier e-mail déjà envoyé
      // 2. Sept jours supplémentaires écoulés
      // 3. Livres toujours non retournés
      if (daysSince >= 7) {
        list2.push(st);
      } else {
        list1.push(st);
      }
    } else {
      list1.push(st);
    }
  });

  res.json({
    list1,
    list2,
    smtpConfigured: isSmtpConfigured(),
  });
});

app.post('/api/overdue/announce', async (req: Request, res: Response) => {
  const { studentIds, lang = 'fr' } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Aucun étudiant sélectionné.' });
  }

  const data = db.getData();
  const today = getTodayString();
  const overdueLoans = data.loans.filter((l) => l.status === 'active' && l.dueDate < today);

  const smtpOk = isSmtpConfigured();

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const sId of studentIds) {
    const studentLoans = overdueLoans.filter((l) => l.studentId === sId);
    if (studentLoans.length === 0) continue;

    const studentName = studentLoans[0].studentName;
    const studentEmail = studentLoans[0].studentEmail;

    const books: OverdueBookInfo[] = studentLoans.map((l) => ({
      title: l.bookTitle,
      dueDate: l.dueDate,
      daysOverdue: Math.max(1, getDaysDiff(today, l.dueDate)),
    }));

    const formatted = formatEmailContent({
      studentName,
      studentEmail,
      type: 'announcement',
      books,
      lang: lang === 'ar' ? 'ar' : 'fr',
    });

    let sendResult: { success: boolean; error?: string } = { success: true };
    if (smtpOk) {
      sendResult = await sendOverdueEmail({
        studentName,
        studentEmail,
        type: 'announcement',
        books,
        lang: lang === 'ar' ? 'ar' : 'fr',
      });
    }

    const log = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: sId,
      studentEmail,
      studentName,
      type: 'announcement' as const,
      loanIds: studentLoans.map((l) => l.id),
      sentAt: new Date().toISOString(),
      lang: (lang === 'ar' ? 'ar' : 'fr') as 'fr' | 'ar',
      status: (sendResult.success ? 'sent' : 'failed') as 'sent' | 'failed',
      error: sendResult.error,
      subject: formatted.subject,
      htmlBody: formatted.html,
    };
    data.emailLogs.push(log);

    if (sendResult.success) {
      sentCount++;
    } else {
      failedCount++;
      errors.push(`${studentName} (${studentEmail}): ${sendResult.error}`);
    }
  }

  db.save();

  res.json({
    success: true,
    sentCount,
    failedCount,
    errors,
    mode: smtpOk ? 'smtp' : 'demo',
  });
});

app.post('/api/overdue/warn', async (req: Request, res: Response) => {
  const { studentIds, lang = 'fr' } = req.body;
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Aucun étudiant sélectionné.' });
  }

  const data = db.getData();
  const today = getTodayString();
  const overdueLoans = data.loans.filter((l) => l.status === 'active' && l.dueDate < today);

  const smtpOk = isSmtpConfigured();

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const sId of studentIds) {
    const studentLoans = overdueLoans.filter((l) => l.studentId === sId);
    if (studentLoans.length === 0) continue;

    const studentName = studentLoans[0].studentName;
    const studentEmail = studentLoans[0].studentEmail;

    const books: OverdueBookInfo[] = studentLoans.map((l) => ({
      title: l.bookTitle,
      dueDate: l.dueDate,
      daysOverdue: Math.max(1, getDaysDiff(today, l.dueDate)),
    }));

    const formatted = formatEmailContent({
      studentName,
      studentEmail,
      type: 'warning',
      books,
      lang: lang === 'ar' ? 'ar' : 'fr',
    });

    let sendResult: { success: boolean; error?: string } = { success: true };
    if (smtpOk) {
      sendResult = await sendOverdueEmail({
        studentName,
        studentEmail,
        type: 'warning',
        books,
        lang: lang === 'ar' ? 'ar' : 'fr',
      });
    }

    const log = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: sId,
      studentEmail,
      studentName,
      type: 'warning' as const,
      loanIds: studentLoans.map((l) => l.id),
      sentAt: new Date().toISOString(),
      lang: (lang === 'ar' ? 'ar' : 'fr') as 'fr' | 'ar',
      status: (sendResult.success ? 'sent' : 'failed') as 'sent' | 'failed',
      error: sendResult.error,
      subject: formatted.subject,
      htmlBody: formatted.html,
    };
    data.emailLogs.push(log);

    if (sendResult.success) {
      sentCount++;
    } else {
      failedCount++;
      errors.push(`${studentName} (${studentEmail}): ${sendResult.error}`);
    }
  }

  db.save();

  res.json({
    success: true,
    sentCount,
    failedCount,
    errors,
    mode: smtpOk ? 'smtp' : 'demo',
  });
});

// Journal des e-mails envoyés (Section 11 & 12)
app.get('/api/email-logs', (_req: Request, res: Response) => {
  const data = db.getData();
  const sorted = [...(data.emailLogs || [])].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );
  res.json({ logs: sorted });
});


// Settings: Loan duration
app.get('/api/settings', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({
    loanDurationDays: data.settings?.loanDurationDays || 14,
  });
});

app.put('/api/settings', (req: Request, res: Response) => {
  const { loanDurationDays } = req.body;
  const days = Number(loanDurationDays);
  if (isNaN(days) || days < 1) {
    return res.status(400).json({ error: 'Durée invalide.' });
  }

  const data = db.getData();
  if (!data.settings) data.settings = { loanDurationDays: 14 };
  data.settings.loanDurationDays = days;
  db.save();

  res.json({ loanDurationDays: days });
});

// ----------------------------------------------------
// VITE DEV SERVER / STATIC SERVING
// ----------------------------------------------------

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Biblio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
