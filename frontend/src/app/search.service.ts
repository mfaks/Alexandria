import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Document {
  _id: string;
  title: string;
  authors: string[];
  description?: string;
  categories: string[];
  fileName: string;
  thumbnailUrl: string;
  lastUpdated: string;
  isPublic: boolean;
  user_email: string;
  similarity_score?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = 'https://alexandriadev.us';

  constructor(private http: HttpClient) { }

  searchDocuments(query: string, topK: number = 5): Observable<Document[]> {
    return this.http.post<Document[]>(`${this.apiUrl}/search_documents/`, { query, top_k: topK }, { withCredentials: true });
  }
}