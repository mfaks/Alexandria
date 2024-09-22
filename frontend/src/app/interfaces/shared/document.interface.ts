export interface Document {
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
    uploadedBy: string;
}