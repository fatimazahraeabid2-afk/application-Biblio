import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UniversityStudent {
  id: string;
  fullName: string;
  massarCode: string;
  cin: string;
  filiere: string;
  email: string;
  cardNumber: string;
  qrPayload: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  cardNumber?: string;
  massarCode?: string;
  cin?: string;
  filiere?: string;
  qrPayload?: string;
  passwordHash: string;
  salt: string;
  role: 'student' | 'admin';
  createdAt: string;
  registeredBy?: 'self' | 'admin';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category?: string;
  isbn?: string;
  publishedYear?: string | number;
  publisher?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  isDeleted?: boolean;
  coverUrl?: string;
  description?: string;
}

export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentCardNumber?: string;
  loanDate: string; // YYYY-MM-DD
  dueDate: string;  // YYYY-MM-DD
  returnedAt: string | null;
  status: 'active' | 'returned';
}

export interface EmailLog {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  type: 'announcement' | 'warning';
  loanIds: string[];
  sentAt: string; // ISO
  lang: 'fr' | 'ar';
  status: 'sent' | 'failed';
  error?: string;
  subject?: string;
  htmlBody?: string;
}

export interface DatabaseSchema {
  universityStudents: UniversityStudent[];
  users: User[];
  books: Book[];
  loans: Loan[];
  emailLogs: EmailLog[];
  settings: {
    loanDurationDays: number;
  };
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'library_db.json');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, s, 64).toString('hex');
  return { hash, salt: s };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const calculated = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculated, 'hex'));
  } catch {
    return false;
  }
}

export const INITIAL_UNIVERSITY_STUDENTS: UniversityStudent[] = [
  {
    id: 'univ-std-1',
    fullName: 'BENYAMINA WISSAL',
    massarCode: 'S136377425',
    cin: 'Z719781',
    filiere: 'Ingénierie Logicielle',
    email: 'wissal.benyamina@usmba.ac.ma',
    cardNumber: 'USMBA-2024-8841',
    qrPayload: 'USMBA-STUDENT:S136377425:Z719781:BENYAMINA_WISSAL',
  },
  {
    id: 'univ-std-2',
    fullName: 'EL AMRANI AMINE',
    massarCode: 'S134298112',
    cin: 'Z654321',
    filiere: 'Génie Informatique',
    email: 'amine.elamrani@usmba.ac.ma',
    cardNumber: 'USMBA-2024-1042',
    qrPayload: 'USMBA-STUDENT:S134298112:Z654321:EL_AMRANI_AMINE',
  },
  {
    id: 'univ-std-3',
    fullName: 'TAHIRI FATIMA ZAHRA',
    massarCode: 'S139012345',
    cin: 'Z789012',
    filiere: 'Sciences Mathématiques et Informatique',
    email: 'fatima.tahiri@usmba.ac.ma',
    cardNumber: 'USMBA-2024-2195',
    qrPayload: 'USMBA-STUDENT:S139012345:Z789012:TAHIRI_FATIMA_ZAHRA',
  },
  {
    id: 'univ-std-4',
    fullName: 'BERRADA YOUSSEF',
    massarCode: 'S131876543',
    cin: 'Z543210',
    filiere: 'Intelligence Artificielle et Données',
    email: 'youssef.berrada@usmba.ac.ma',
    cardNumber: 'USMBA-2024-3310',
    qrPayload: 'USMBA-STUDENT:S131876543:Z543210:BERRADA_YOUSSEF',
  },
  {
    id: 'univ-std-5',
    fullName: 'CHAMI OMAR',
    massarCode: 'S135678901',
    cin: 'Z612345',
    filiere: 'Génie Industriel',
    email: 'omar.chami@usmba.ac.ma',
    cardNumber: 'USMBA-2024-4420',
    qrPayload: 'USMBA-STUDENT:S135678901:Z612345:CHAMI_OMAR',
  },
  {
    id: 'univ-std-6',
    fullName: 'IDRISSI MERIEM',
    massarCode: 'S138901234',
    cin: 'Z701234',
    filiere: 'Bio-Ingénierie',
    email: 'meriem.idrissi@usmba.ac.ma',
    cardNumber: 'USMBA-2024-5531',
    qrPayload: 'USMBA-STUDENT:S138901234:Z701234:IDRISSI_MERIEM',
  },
];

function getInitialDatabase(): DatabaseSchema {
  const adminPwd = hashPassword('Admin@Usmba2026');
  const student1Pwd = hashPassword('etudiant123');
  const student2Pwd = hashPassword('etudiant123');
  const student3Pwd = hashPassword('etudiant123');

  const now = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const dMinus10 = new Date(now.getTime() - 10 * 24 * 3600 * 1000);
  const dMinus24 = new Date(now.getTime() - 24 * 24 * 3600 * 1000);

  const dMinus4 = new Date(now.getTime() - 4 * 24 * 3600 * 1000);
  const dMinus18 = new Date(now.getTime() - 18 * 24 * 3600 * 1000);

  const dMinus15 = new Date(now.getTime() - 15 * 24 * 3600 * 1000);
  const dMinus29 = new Date(now.getTime() - 29 * 24 * 3600 * 1000);

  const announcementDateStudent3 = new Date(now.getTime() - 8 * 24 * 3600 * 1000).toISOString();

  return {
    universityStudents: INITIAL_UNIVERSITY_STUDENTS,
    users: [
      {
        id: 'usr-admin-1',
        name: 'Fatimazahrae Abid',
        email: 'fatimazahrae.abid2@usmba.ac.ma',
        passwordHash: adminPwd.hash,
        salt: adminPwd.salt,
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-admin-alias',
        name: 'Fatimazahrae Abid (Administratrice principale)',
        email: 'admin@usmba.ac.ma',
        passwordHash: adminPwd.hash,
        salt: adminPwd.salt,
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-stud-1',
        name: 'EL AMRANI AMINE',
        email: 'amine.elamrani@usmba.ac.ma',
        cardNumber: 'USMBA-2024-1042',
        massarCode: 'S134298112',
        cin: 'Z654321',
        filiere: 'Génie Informatique',
        qrPayload: 'USMBA-STUDENT:S134298112:Z654321:EL_AMRANI_AMINE',
        passwordHash: student1Pwd.hash,
        salt: student1Pwd.salt,
        role: 'student',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-stud-2',
        name: 'TAHIRI FATIMA ZAHRA',
        email: 'fatima.tahiri@usmba.ac.ma',
        cardNumber: 'USMBA-2024-2195',
        massarCode: 'S139012345',
        cin: 'Z789012',
        filiere: 'Sciences Mathématiques et Informatique',
        qrPayload: 'USMBA-STUDENT:S139012345:Z789012:TAHIRI_FATIMA_ZAHRA',
        passwordHash: student2Pwd.hash,
        salt: student2Pwd.salt,
        role: 'student',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr-stud-3',
        name: 'BERRADA YOUSSEF',
        email: 'youssef.berrada@usmba.ac.ma',
        cardNumber: 'USMBA-2024-3310',
        massarCode: 'S131876543',
        cin: 'Z543210',
        filiere: 'Intelligence Artificielle et Données',
        qrPayload: 'USMBA-STUDENT:S131876543:Z543210:BERRADA_YOUSSEF',
        passwordHash: student3Pwd.hash,
        salt: student3Pwd.salt,
        role: 'student',
        createdAt: new Date().toISOString(),
      },
    ],
    books: [
      {
        id: 'bk-1',
        title: 'Algorithmique et Programmation en C',
        author: 'Jean-Michel Léry',
        category: 'Informatique',
        isbn: '9782744073380',
        publishedYear: '2020',
        publisher: 'Pearson',
        totalCopies: 4,
        availableCopies: 2,
        coverUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80',
        description: 'Manuel fondamental d’initiation aux structures algorithmiques, tableaux, pointeurs et à la programmation en langage C pour les étudiants en sciences et ingénierie.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-2',
        title: 'Bases de Données et Systèmes d’Information',
        author: 'Georges Gardarin',
        category: 'Informatique',
        isbn: '9782100072897',
        publishedYear: '2021',
        publisher: 'Dunod',
        totalCopies: 3,
        availableCopies: 1,
        coverUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=600&q=80',
        description: 'Conception des bases de données relationnelles, algèbre relationnelle, modélisation entité-association, langage SQL et architecture des systèmes d’information universitaires.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-3',
        title: 'Probabilités et Statistique pour les Sciences',
        author: 'Sheldon M. Ross',
        category: 'Mathématiques',
        isbn: '9782804171247',
        publishedYear: '2019',
        publisher: 'De Boeck Supérieur',
        totalCopies: 5,
        availableCopies: 4,
        coverUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80',
        description: 'Introduction rigoureuse aux probabilités discrètes et continues, lois de distribution, estimation, tests d’hypothèses et applications aux sciences expérimentales.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-4',
        title: 'Physique Générale : Mécanique et Thermodynamique',
        author: 'Douglas C. Giancoli',
        category: 'Physique',
        isbn: '9782804155872',
        publishedYear: '2022',
        publisher: 'De Boeck',
        totalCopies: 2,
        availableCopies: 0,
        coverUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80',
        description: 'Ouvrage de référence couvrant la cinématique, la dynamique newtonienne, le travail et l’énergie, les lois de conservation et les principes fondamentaux de la thermodynamique.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-5',
        title: 'Réseaux et Télécommunications',
        author: 'Andrew Tanenbaum, David Wetherall',
        category: 'Réseaux',
        isbn: '9782744075216',
        publishedYear: '2021',
        publisher: 'Pearson Education',
        totalCopies: 3,
        availableCopies: 3,
        coverUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
        description: 'Le cours de référence mondial présentant le modèle OSI, la couche Internet TCP/IP, le routage, la sécurité réseau et les protocoles sans fil modernes.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-6',
        title: 'Clean Code : A Handbook of Agile Software Craftsmanship',
        author: 'Robert C. Martin',
        category: 'Informatique et programmation',
        isbn: '9782744023279',
        publishedYear: '2019',
        publisher: 'Pearson',
        totalCopies: 5,
        availableCopies: 5,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780132350884-M.jpg',
        description: 'Guide essentiel sur les bonnes pratiques de codage, la lisibilité, le réusinage et les principes de conception logicielle propre pour les développeurs professionnels.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-7',
        title: "Python Crash Course : Le guide d'apprentissage pratique",
        author: 'Eric Matthes',
        category: 'Informatique et programmation',
        isbn: '9781593279288',
        publishedYear: '2020',
        publisher: 'No Starch Press',
        totalCopies: 4,
        availableCopies: 4,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9781593279288-M.jpg',
        description: 'Une introduction complète au langage Python couvrant les variables, listes, fonctions, classes, ainsi que trois projets pratiques : jeu vidéo, visualisation de données et application web.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-8',
        title: 'Deep Learning avec Python et Keras',
        author: 'François Chollet',
        category: 'Intelligence artificielle',
        isbn: '9782212675641',
        publishedYear: '2021',
        publisher: 'Eyrolles',
        totalCopies: 3,
        availableCopies: 3,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9781617294433-M.jpg',
        description: "Écrit par le créateur de Keras, ce livre présente les principes fondamentaux de l'apprentissage profond, des réseaux de neurones circonvolutifs et récurrents avec des exemples pratiques.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-9',
        title: 'Intelligence Artificielle : Une approche moderne',
        author: 'Stuart Russell, Peter Norvig',
        category: 'Intelligence artificielle',
        isbn: '9782326002494',
        publishedYear: '2021',
        publisher: 'Pearson',
        totalCopies: 4,
        availableCopies: 4,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780134610993-M.jpg',
        description: "L'ouvrage de référence académique incontournable couvrant les agents intelligents, la recherche heuristique, la logique, le traitement du langage naturel et l'apprentissage automatique.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-10',
        title: 'Sécurité Informatique et Réseaux : Cours et Exercices',
        author: 'Solange Ghernaouti',
        category: 'Réseaux informatiques',
        isbn: '9782100812974',
        publishedYear: '2022',
        publisher: 'Dunod',
        totalCopies: 3,
        availableCopies: 3,
        coverUrl: 'https://books.google.com/books/content?vid=isbn:9782100812974&printsec=frontcover&img=1&zoom=1',
        description: "Une synthèse approfondie sur la cybersécurité, les cryptosystèmes, les pare-feux, la sécurité des protocoles IP et l'analyse des vulnérabilités réseau.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-11',
        title: 'SQL pour les Systèmes de Bases de Données Relationnelles',
        author: 'Alan Beaulieu',
        category: 'Bases de données',
        isbn: '9782412059340',
        publishedYear: '2020',
        publisher: "O'Reilly / First",
        totalCopies: 4,
        availableCopies: 4,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9781491952788-M.jpg',
        description: "Guide complet d'apprentissage du langage SQL : requêtes complexes, jointures, sous-requêtes, transactions, indexation et optimisation de requêtes relationnelles.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-12',
        title: 'Algèbre Linéaire et ses Applications',
        author: 'David C. Lay',
        category: 'Mathématiques',
        isbn: '9782744075834',
        publishedYear: '2017',
        publisher: 'Pearson',
        totalCopies: 5,
        availableCopies: 5,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780321982384-M.jpg',
        description: 'Cours de référence en algèbre linéaire avec applications concrètes : espaces vectoriels, matrices, valeurs propres, diagonalisation et transformations linéaires.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-13',
        title: 'Analyse Mathématique pour la Licence',
        author: 'Jean-Pierre Ramis, André Warusfel',
        category: 'Mathématiques',
        isbn: '9782100778737',
        publishedYear: '2018',
        publisher: 'Dunod',
        totalCopies: 4,
        availableCopies: 4,
        coverUrl: 'https://books.google.com/books/content?vid=isbn:9782100778737&printsec=frontcover&img=1&zoom=1',
        description: 'Manuel fondamental couvrant les suites, séries numériques, intégration de Riemann, équations différentielles et calcul différentiel pour les étudiants en sciences.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-14',
        title: "L'Étranger",
        author: 'Albert Camus',
        category: 'Romans',
        isbn: '9782070360024',
        publishedYear: '1972',
        publisher: 'Gallimard',
        totalCopies: 6,
        availableCopies: 6,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780307827418-M.jpg',
        description: "Chef-d'œuvre de la littérature du XXe siècle décrivant la vie de Meursault en Algérie et explorant le sentiment d'absurdité et la condition humaine.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-15',
        title: '1984',
        author: 'George Orwell',
        category: 'Romans',
        isbn: '9782070368228',
        publishedYear: '2008',
        publisher: 'Gallimard',
        totalCopies: 5,
        availableCopies: 5,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780451524935-M.jpg',
        description: "Roman d'anticipation dystopique majeur mettant en scène la surveillance d'État totale incarnée par Big Brother et la résistance de Winston Smith.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-16',
        title: 'La Boîte à Merveilles',
        author: 'Ahmed Sefrioui',
        category: 'Littérature',
        isbn: '9789954000000',
        publishedYear: '1954',
        publisher: 'Editions Le Fennec',
        totalCopies: 6,
        availableCopies: 6,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9782020014021-M.jpg',
        description: "Roman autobiographique incontournable de la littérature marocaine francophone décrivant la vie quotidienne et les souvenirs d'un enfant dans l'ancienne médina de Fès.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-17',
        title: "Le Chapelet de l'Ambre",
        author: 'Ahmed Sefrioui',
        category: 'Littérature',
        isbn: '9789981836105',
        publishedYear: '1964',
        publisher: 'Editions du Rocher',
        totalCopies: 3,
        availableCopies: 3,
        coverUrl: 'https://books.google.com/books/content?vid=isbn:9789981836105&printsec=frontcover&img=1&zoom=1',
        description: 'Recueil de nouvelles captivantes dépeignant la spiritualité, les traditions populaires et les contes traditionnels de la culture marocaine.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-18',
        title: 'Une brève histoire du temps',
        author: 'Stephen Hawking',
        category: 'Sciences et développement personnel',
        isbn: '9782081404434',
        publishedYear: '2018',
        publisher: 'Flammarion',
        totalCopies: 4,
        availableCopies: 4,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780553380163-M.jpg',
        description: 'Un voyage fascinant à la découverte de la cosmologie, de la théorie de la relativité générale, de la mécanique quantique et des trous noirs expliqué au grand public.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-19',
        title: "Les 7 Habitudes de ceux qui réalisent tout ce qu'ils entreprennent",
        author: 'Stephen R. Covey',
        category: 'Sciences et développement personnel',
        isbn: '9782290041246',
        publishedYear: '2017',
        publisher: "J'ai Lu",
        totalCopies: 5,
        availableCopies: 5,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9781982137274-M.jpg',
        description: "Guide classique sur l'efficacité personnelle et professionnelle, la proactivité, la gestion des priorités et le leadership basé sur des principes universels.",
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
      {
        id: 'bk-20',
        title: 'Atomic Habits : Un rien peut tout changer',
        author: 'James Clear',
        category: 'Sciences et développement personnel',
        isbn: '9782290230305',
        publishedYear: '2019',
        publisher: "Éditions d'Organisation",
        totalCopies: 4,
        availableCopies: 4,
        coverUrl: 'https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg',
        description: 'Méthode concrète basée sur les sciences comportementales pour construire des habitudes bénéfiques au quotidien et éliminer progressivement les mauvaises habitudes.',
        createdAt: new Date().toISOString(),
        isDeleted: false,
      },
    ],
    loans: [
      {
        id: 'loan-1',
        bookId: 'bk-1',
        bookTitle: 'Algorithmique et Programmation en C',
        bookAuthor: 'Jean-Michel Léry',
        studentId: 'usr-stud-1',
        studentName: 'EL AMRANI AMINE',
        studentEmail: 'amine.elamrani@usmba.ac.ma',
        studentCardNumber: 'USMBA-2024-1042',
        loanDate: formatDate(dMinus18),
        dueDate: formatDate(dMinus4),
        returnedAt: null,
        status: 'active',
      },
      {
        id: 'loan-2',
        bookId: 'bk-2',
        bookTitle: 'Bases de Données et Systèmes d’Information',
        bookAuthor: 'Georges Gardarin',
        studentId: 'usr-stud-2',
        studentName: 'TAHIRI FATIMA ZAHRA',
        studentEmail: 'fatima.tahiri@usmba.ac.ma',
        studentCardNumber: 'USMBA-2024-2195',
        loanDate: formatDate(dMinus18),
        dueDate: formatDate(dMinus4),
        returnedAt: null,
        status: 'active',
      },
      {
        id: 'loan-3',
        bookId: 'bk-4',
        bookTitle: 'Physique Générale : Mécanique et Thermodynamique',
        bookAuthor: 'Douglas C. Giancoli',
        studentId: 'usr-stud-3',
        studentName: 'BERRADA YOUSSEF',
        studentEmail: 'youssef.berrada@usmba.ac.ma',
        studentCardNumber: 'USMBA-2024-3310',
        loanDate: formatDate(dMinus29),
        dueDate: formatDate(dMinus15),
        returnedAt: null,
        status: 'active',
      },
      {
        id: 'loan-4',
        bookId: 'bk-1',
        bookTitle: 'Algorithmique et Programmation en C',
        bookAuthor: 'Jean-Michel Léry',
        studentId: 'usr-stud-3',
        studentName: 'BERRADA YOUSSEF',
        studentEmail: 'youssef.berrada@usmba.ac.ma',
        studentCardNumber: 'USMBA-2024-3310',
        loanDate: formatDate(dMinus24),
        dueDate: formatDate(dMinus10),
        returnedAt: null,
        status: 'active',
      },
    ],
    emailLogs: [
      {
        id: 'log-initial-1',
        studentId: 'usr-stud-3',
        studentEmail: 'youssef.berrada@usmba.ac.ma',
        studentName: 'BERRADA YOUSSEF',
        type: 'announcement',
        loanIds: ['loan-3', 'loan-4'],
        sentAt: announcementDateStudent3,
        lang: 'fr',
        status: 'sent',
      },
    ],
    settings: {
      loanDurationDays: 14,
    },
  };
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;

  private constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);

        // Ensure universityStudents table exists
        if (!Array.isArray(this.data.universityStudents) || this.data.universityStudents.length === 0) {
          this.data.universityStudents = INITIAL_UNIVERSITY_STUDENTS;
          this.save();
        }

        // Ensure admin Fatimazahrae Abid exists
        const hasAdmin = this.data.users.some(
          (u) =>
            u.role === 'admin' &&
            (u.email === 'fatimazahrae.abid2@usmba.ac.ma' || u.name.includes('Fatimazahrae Abid'))
        );
        if (!hasAdmin) {
          const adminPwd = hashPassword('Admin@Usmba2026');
          this.data.users.unshift({
            id: 'usr-admin-fatima',
            name: 'Fatimazahrae Abid',
            email: 'fatimazahrae.abid2@usmba.ac.ma',
            passwordHash: adminPwd.hash,
            salt: adminPwd.salt,
            role: 'admin',
            createdAt: new Date().toISOString(),
          });
          this.save();
        }
      } catch (e) {
        console.error('Error parsing library_db.json, reinitializing initial database', e);
        this.data = getInitialDatabase();
        this.save();
      }
    } else {
      this.data = getInitialDatabase();
      this.save();
    }
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public save(): void {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }
}
