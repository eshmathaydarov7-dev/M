export interface Book {
  id: string; // barcode or ISBN
  title: string;
  author: string;
  category: 'world' | 'uzbek' | 'new';
  barcode: string;
  publishedYear?: number;
  description?: string;
  coverUrl?: string;
  available: boolean;
  borrowCount: number;
  addedAt: string;
}

export interface Transaction {
  id: string;
  bookId: string;
  bookTitle: string;
  studentName: string;
  studentClass: string;
  borrowedAt: string;
  returnedAt?: string;
  status: 'active' | 'returned';
}

export interface LibraryState {
  books: Book[];
  transactions: Transaction[];
}
