export interface UserSession {
  id: string;
  name: string;
  email: string;
  cardNumber?: string;
  role: 'student' | 'admin';
}

export interface UniversityStudent {
  id: string;
  fullName: string;
  massarCode: string;
  cin: string;
  filiere: string;
  email: string;
  cardNumber: string;
  qrPayload: string;
  isRegisteredInBiblio?: boolean;
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
  loanDate: string;
  dueDate: string;
  returnedAt: string | null;
  status: 'active' | 'returned';
}

export interface StudentItem {
  id: string;
  name: string;
  email: string;
  cardNumber: string;
  massarCode?: string;
  cin?: string;
  filiere?: string;
  qrPayload?: string;
  createdAt: string;
  activeLoansCount: number;
}

export interface OverdueStudentItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  maxDaysOverdue: number;
  unreturnedBooks: {
    title: string;
    dueDate: string;
    daysOverdue: number;
  }[];
  loanIds: string[];
  lastAnnouncementSentAt?: string;
  daysSinceAnnouncement?: number;
}

export interface OverdueSummary {
  list1: OverdueStudentItem[];
  list2: OverdueStudentItem[];
  smtpConfigured: boolean;
}

export interface EmailLogItem {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  type: 'announcement' | 'warning';
  loanIds: string[];
  sentAt: string;
  lang: 'fr' | 'ar';
  status: 'sent' | 'failed';
  error?: string;
  subject?: string;
  htmlBody?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Erreur serveur (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Auth
  registerStudent: (name: string, email: string, password: string, cardNumber: string) =>
    request<{ user: UserSession }>('/api/auth/register-student', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, cardNumber }),
    }),

  loginStudent: (email: string, password: string) =>
    request<{ user: UserSession }>('/api/auth/login-student', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  loginAdmin: (email: string, password: string) =>
    request<{ user: UserSession }>('/api/auth/login-admin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // University Mock Database
  getUniversityStudents: (search?: string) =>
    request<{ students: UniversityStudent[] }>(
      `/api/university-students${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),

  lookupUniversityStudentByQr: (payload: string) =>
    request<{
      found: boolean;
      student: UniversityStudent;
      isRegisteredInBiblio: boolean;
      error?: string;
    }>(`/api/university-students/by-qr?payload=${encodeURIComponent(payload)}`),

  registerStudentByAdmin: (data: {
    fullName: string;
    massarCode?: string;
    cin?: string;
    filiere?: string;
    email: string;
    cardNumber?: string;
    qrPayload?: string;
    password?: string;
  }) =>
    request<{ success: boolean; user: any }>('/api/students/register-by-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  lookupBiblioStudentByQr: (payload: string) =>
    request<{
      found: boolean;
      student: {
        id: string;
        name: string;
        email: string;
        cardNumber: string;
        filiere?: string;
        massarCode?: string;
        cin?: string;
      };
      activeLoans: Loan[];
      error?: string;
    }>(`/api/students/by-qr?payload=${encodeURIComponent(payload)}`),

  // Books
  getBooks: () => request<{ books: Book[] }>('/api/books'),

  searchOnline: (title: string) =>
    request<{
      found: boolean;
      message?: string;
      book?: {
        title: string;
        author: string;
        category: string;
        isbn: string;
        publishedYear: string;
        publisher: string;
        description?: string;
        coverUrl?: string;
      };
    }>(`/api/books/search-online?title=${encodeURIComponent(title)}`),

  addBook: (bookData: {
    title: string;
    author: string;
    category?: string;
    isbn?: string;
    publishedYear?: string;
    publisher?: string;
    totalCopies: number;
    coverUrl?: string;
    description?: string;
  }) =>
    request<{ book: Book }>('/api/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    }),

  updateBook: (
    id: string,
    bookData: {
      title: string;
      author: string;
      category?: string;
      isbn?: string;
      publishedYear?: string;
      publisher?: string;
      totalCopies: number;
      coverUrl?: string;
      description?: string;
    }
  ) =>
    request<{ book: Book }>(`/api/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookData),
    }),

  deleteBook: (id: string) =>
    request<{ success: boolean }>(`/api/books/${id}`, {
      method: 'DELETE',
    }),

  // Loans
  recordLoanByAdmin: (data: { bookId: string; studentId: string; durationDays?: number }) =>
    request<{ loan: Loan; availableCopies: number }>('/api/loans/record-by-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  borrowByStudent: (bookId: string, studentId: string) =>
    request<{ success: boolean; loan: Loan; availableCopies: number }>('/api/loans/borrow-by-student', {
      method: 'POST',
      body: JSON.stringify({ bookId, studentId }),
    }),

  getLoans: (status?: string, studentId?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (studentId) params.set('studentId', studentId);
    const qs = params.toString();
    return request<{ loans: Loan[] }>(`/api/loans${qs ? `?${qs}` : ''}`);
  },

  confirmReturn: (loanId: string) =>
    request<{ success: boolean; loan: Loan }>(`/api/loans/${loanId}/return`, {
      method: 'POST',
    }),

  getEmailLogs: () => request<{ logs: EmailLogItem[] }>('/api/email-logs'),

  // Students in Biblio
  getStudents: () => request<{ students: StudentItem[] }>('/api/students'),

  deleteStudent: (id: string) =>
    request<{ success: boolean }>(`/api/students/${id}`, {
      method: 'DELETE',
    }),

  // Overdue
  getOverdueSummary: () => request<OverdueSummary>('/api/overdue/summary'),

  announceOverdue: (studentIds: string[], lang: 'fr' | 'ar') =>
    request<{
      success: boolean;
      sentCount: number;
      failedCount: number;
      errors: string[];
    }>('/api/overdue/announce', {
      method: 'POST',
      body: JSON.stringify({ studentIds, lang }),
    }),

  warnOverdue: (studentIds: string[], lang: 'fr' | 'ar') =>
    request<{
      success: boolean;
      sentCount: number;
      failedCount: number;
      errors: string[];
    }>('/api/overdue/warn', {
      method: 'POST',
      body: JSON.stringify({ studentIds, lang }),
    }),

  // Settings
  getSettings: () => request<{ loanDurationDays: number }>('/api/settings'),

  updateSettings: (loanDurationDays: number) =>
    request<{ loanDurationDays: number }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ loanDurationDays }),
    }),
};
