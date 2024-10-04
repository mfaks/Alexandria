import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { ChatMessage } from '../interfaces/chat-message.interface'

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, PdfViewerModule]
})
export class ChatComponent implements OnInit {
  chatMessages: ChatMessage[] = [];
  newMessage: string = '';
  documentId: string = '';
  pdfSrc: string | Uint8Array = '';
  isLoading: boolean = false;
  context: string = '';

  constructor(
    private http: HttpClient, 
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.documentId = params['id'];
      this.loadPdf();
    });
  }

  loadPdf() {
    const url = `https://alexandriadev.us/download_document/${this.documentId}`;
    this.http.get(url, { responseType: 'arraybuffer', withCredentials: true }).subscribe(
      (data: ArrayBuffer) => {
        this.pdfSrc = new Uint8Array(data);
      },
      (error: HttpErrorResponse) => {
        console.error('Error fetching PDF:', error);
      }
    );
  }

  sendMessage() {
    if (this.newMessage.trim() && !this.isLoading) {
      this.isLoading = true;
      const userMessage: ChatMessage = { role: 'user', content: this.newMessage };
      this.chatMessages.push(userMessage);
      
      const url = `https://alexandriadev.us/chat_with_pdf/${this.documentId}`;
      const body = { messages: this.chatMessages };
      
      let assistantMessage: ChatMessage = { role: 'assistant', content: '' };
      this.chatMessages.push(assistantMessage);

      this.http.post(url, body, {
        responseType: 'text',
        withCredentials: true
      }).subscribe({
        next: (response: string) => {
          const reader = new ReadableStreamDefaultReader(new Response(response).body!);
          this.readStream(reader, assistantMessage);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error sending message:', error);
          assistantMessage.content = `An error occurred: ${error.message}`;
          this.isLoading = false;
        }
      });

      this.newMessage = '';
    }
  }

  private async readStream(reader: ReadableStreamDefaultReader<Uint8Array>, message: ChatMessage) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              this.isLoading = false;
            } else {
              const parsedData = JSON.parse(data);
              if (parsedData.type === 'context') {
                this.context = parsedData.content;
              } else if (parsedData.type === 'answer') {
                message.content += parsedData.content;
              }
            }
          }
        });
      }
    } catch (error) {
      console.error('Error reading stream:', error);
      message.content += `\nError reading stream: ${error}`;
      this.isLoading = false;
    }
  }

  onError(error: any) {
    console.error('PDF error:', error);
  }
}